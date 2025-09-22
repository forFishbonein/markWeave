/*
 * @FilePath: useYjsEditor.js
 * @Author: Aron
 * @Date: 2025-03-04 22:35:56
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-09-22 12:35:52
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/hooks/useYjsEditor.js
import { useEffect, useRef, useState } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { WebsocketProvider } from "y-websocket";
import { UndoManager } from "yjs";
import * as Y from "yjs";

import { ydoc, ychars, yformatOps, resetYDoc, getYDoc } from "../crdt";

import {
  convertCRDTToProseMirrorDoc,
  loadInitialData,
} from "../crdt/crdtUtils";
import { syncToProseMirror } from "../crdt/crdtSync";
// import { richTextKeymap } from "../plugins/keymap";
import { schema } from "../plugins/schema";
import { createKeymap } from "../plugins/keymap"; // ← Note reference
import { insertChar, insertText, deleteChars } from "../crdt/crdtActions";
import { cursorPlugin, createDecorations } from "../plugins/cursor-plugin";
import { useAuth } from "../contexts/AuthContext";

// Unified property reading, compatible with plain objects and Y.Map
const getProp = (obj, key) =>
  typeof obj?.get === "function" ? obj.get(key) : obj[key];

export function useYjsEditor(docId, editorRef) {
  const viewRef = useRef(null);
  // Additional reference for access in outer cleanup
  const providerRef = useRef(null);
  const awarenessRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const ydocRef = useRef(null); // Add ydoc reference

  const [editorView, setEditorView] = useState(null);
  const [awareness, setAwareness] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnected, setIsConnected] = useState(false); // Add connection status state
  const { user: authUser } = useAuth();

  console.log("Current document ID:", docId);

  useEffect(() => {
    let cleanup = () => {};

    // Create independent Y.Doc for each document to avoid cross-document data pollution
    console.log("🔄 For document", docId, "creating new Y.Doc");
    resetYDoc();
    const newYDoc = getYDoc(); // Use getter to get actual Y.Doc instance
    ydocRef.current = newYDoc; // Store in ref
    ydocRef.current = newYDoc; // Store in ref

    const fetchInitialState = async () => {
      try {
        const res = await fetch(
          `http://localhost:1234/api/initial?docId=${docId}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.update) {
            // Use atob and Uint8Array instead of Buffer in browser environment
            const binaryString = atob(data.update);
            const uint8 = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              uint8[i] = binaryString.charCodeAt(i);
            }
            newYDoc.transact(() => {
              Y.applyUpdate(newYDoc, uint8);
            });
            console.log("✅ Applied initial Yjs state update successfully");
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to get initial Yjs state:", err);
      }
    };

    // First sync the latest complete state from database
    fetchInitialState().finally(() => {
      // Then connect WebSocket to avoid duplicate increments
      console.log("🔍 Debug: newYDoc instance:", newYDoc);
      console.log("🔍 Debug: newYDoc type:", typeof newYDoc);
      console.log("🔍 Debug: newYDoc.on exists:", typeof newYDoc?.on);
      console.log("🔍 Debug: newYDoc constructor:", newYDoc?.constructor?.name);

      const wsProvider = new WebsocketProvider(
        "ws://localhost:1234",
        docId,
        newYDoc,
        { disableBc: true } // Key: disable BroadcastChannel, force WebSocket
      );
      setProvider(wsProvider);

      // Save to ref for outer cleanup
      providerRef.current = wsProvider;

      const aw = wsProvider.awareness;

      // Get current logged-in user ID to determine if it's self
      const currentUserId = authUser?.userId;

      // Set user info - immediate effect
      const setUserInfo = () => {
        // Use real logged-in user info
        if (authUser) {
          const userInfo = {
            name: authUser.username || authUser.email || "Unknown User",
            email: authUser.email,
            userId: authUser.userId,
            color: "#2563eb",
            timestamp: Date.now(),
            online: true, // Explicitly mark online status
          };

          aw.setLocalStateField("user", userInfo);
          console.log("✅ Immediately set user info:", userInfo);

          // Force trigger awareness sync - this is key!
          setTimeout(() => {
            aw.setLocalStateField("trigger", Date.now());
            // console.log("🔄 Force trigger awareness sync");
          }, 100);
        } else {
          const fallbackUser = {
            name: "Guest" + Math.floor(Math.random() * 100),
            color: "#10b981",
            timestamp: Date.now(),
            online: true,
          };
          aw.setLocalStateField("user", fallbackUser);
          console.log("⚠️ Setting guest info:", fallbackUser);

          // Also force trigger sync
          setTimeout(() => {
            aw.setLocalStateField("trigger", Date.now());
            // console.log("🔄 Force trigger awareness sync (Guest)");
          }, 100);
        }
      };

      // WebSocket status monitoring
      wsProvider.on("status", (event) => {
        console.log("🔌 WebSocket status:", event.status);
        setIsConnected(event.status === "connected"); // Update connection status
        if (event.status === "connected") {
          // console.log("✅ WebSocket connected");
          // Reset user info and force sync after WebSocket connection
          setUserInfo();

          // Additional forced sync measures
          setTimeout(() => {
            // console.log("🚀 Force sync user state after WebSocket connection");
            aw.setLocalStateField("forceSync", Date.now());

            // Send empty document update to trigger sync
            newYDoc.transact(() => {
              // This will trigger WebSocket sync
            });
          }, 200);
        }
      });

      // Immediately set user info
      setUserInfo();

      // Remove periodic sync, only update state on actual user activity
      // const syncInterval = setInterval(() => {
      //   if (aw.getLocalState().user) {
      //     // Update timestamp to trigger awareness change
      //     aw.setLocalStateField("lastSeen", Date.now());
      //     // TODO
      //     // console.log("⏰ Periodic sync of user online status");
      //   }
      // }, 3000); // Sync every 3 seconds

      setAwareness(aw);
      // Store in ref for outer cleanup
      awarenessRef.current = aw;
      // syncIntervalRef.current = syncInterval; // No longer needed because timer was removed

      wsProvider.on("status", (event) => {
        console.log("🔌 WebSocket status change:", event.status);
        if (event.status === "connected") {
          console.log("✅ WebSocket connected, users can start collaborating");
        } else if (event.status === "disconnected") {
          console.log("❌ WebSocket disconnected");
        }
      });

      // Listen to awareness changes - real-time sync
      wsProvider.awareness.on("change", (changes) => {
        // console.log("👥 Awareness state change:", {
        //   added: changes.added,
        //   updated: changes.updated,
        //   removed: changes.removed,
        //   totalUsers: Array.from(wsProvider.awareness.getStates().values())
        //     .length,
        // });

        // Force trigger awareness state update
        if (changes.added.length > 0 || changes.removed.length > 0) {
          console.log("🔄 User joined/left, forcing state sync");
        }
      });
      // Create UndoManager, listen to ychars and yformatOps
      // 1. Create UndoManager
      const undoManager = new UndoManager([ychars, yformatOps]);

      // 2. Create keymap plugin, pass undoManager
      const myKeymapPlugin = createKeymap(undoManager);
      if (editorRef.current && !viewRef.current) {
        // Note: don't use ySyncPlugin! We manage CRDT sync ourselves
        // Initialize empty ProseMirror document (can generate from CRDT first, auto-fill with spaces if empty)
        const initialDoc = convertCRDTToProseMirrorDoc();
        console.log("initialDoc：", initialDoc, newYDoc);
        const state = EditorState.create({
          schema,
          doc: initialDoc,
          plugins: [myKeymapPlugin, cursorPlugin(aw)],
        });
        const view = new EditorView(editorRef.current, {
          state,
          dispatchTransaction(tr) {
            if (!viewRef.current) return;
            // console.log("📝 Detected ProseMirror change:", tr);
            try {
              if (tr.getMeta("fromSync")) {
                // console.log("🚀 fromSync newState:", newState);
                // Once updateState here, page content will naturally follow changes, unrelated to steps below!
                const newState = viewRef.current.state.apply(tr);
                viewRef.current.updateState(newState);
                return;
              }

              // Apply user input to current state
              let newState = viewRef.current.state.apply(tr);
              // console.log("🚀newState", newState);
              viewRef.current.updateState(newState);
              // Process each step in transaction
              // todo 把用户输入转化到 CRDT 的 Ychars
              tr.steps.forEach((step) => {
                if (step.slice && step.slice.content.size > 0) {
                  // 🚀 Get insertion position
                  const insertPos = step.from; // Insertion position in ProseMirror document
                  console.log(`📝 Text inserted at position ${insertPos}`);

                  // 🚀 Get opId of character before insertion position
                  let afterId = null;
                  if (insertPos > 1) {
                    const chars = ychars.toArray();
                    let visIdx = 0;
                    const targetVis = insertPos - 2;
                    for (const c of chars) {
                      if (getProp(c, "deleted")) continue;
                      if (visIdx === targetVis) {
                        afterId = getProp(c, "opId");
                        break;
                      }
                      visIdx += 1;
                    }
                  }
                  console.log(`📝 afterId: ${afterId}`);

                  // 🚀 Read text directly from slice
                  console.log(
                    "step.slice.content",
                    insertPos,
                    afterId,
                    step.slice.content.content[0].text,
                    step.from,
                    step.to
                  );
                  // const text = newState.doc.textBetween(step.from, step.to); // This seems wrong
                  const text = step.slice.content.textBetween(
                    0,
                    step.slice.content.size
                  );
                  console.log("text", text); // Extract content to be inserted this time
                  // Decide to call insertText or insertChar based on text length
                  if (text.length > 1) {
                    insertText(afterId, text, aw);
                  } else {
                    insertChar(afterId, text, aw);
                  }
                } else if (
                  step.from !== step.to &&
                  step.slice?.content.size === 0
                ) {
                  // 🚀 Handle delete operation here
                  // console.log("❌ Found delete operation:", step);
                  deleteChars(step.from, step.to); // 🔥 Call batch delete directly
                }
              });
            } catch (e) {
              // Because if newState is same as original, will error "Applying a mismatched transaction", we need to avoid this error
              console.log("error", e);
              return;
            }
          },
        });
        viewRef.current = view;

        // --- Real-time sync local cursor to awareness ---  ——> This is key for cursor appearance
        view.dom.addEventListener("mouseup", updateCursorAwareness);
        view.dom.addEventListener("keyup", updateCursorAwareness);
        function updateCursorAwareness() {
          const sel = view.state.selection;
          if (!sel) return;
          const user = aw.getLocalState().user;
          aw.setLocalStateField("cursor", {
            pos: sel.anchor,
            name: user?.name || "User",
            color: user?.color || "#ffa500",
          });
        }
        // Sync once on initialization
        // setTimeout(updateCursorAwareness, 100);

        // Listen to awareness changes, real-time update cursor decorations, avoid accumulation ——> This is key for cursor movement
        aw.on("change", () => {
          const decoSet = createDecorations(view.state, aw);
          view.dispatch(view.state.tr.setMeta("cursorDecorations", decoSet));
        });

        setEditorView(view);
        syncToProseMirror(view, docId);
      }
      // Manage cursor in awareness ourselves, no need for yCursorPlugin

      setTimeout(() => {
        // console.log(
        //   "12121",
        //   ychars.toArray(),
        //   ychars.toArray()[ychars.toArray().length - 1]?.opId
        // );
        // TODO: for sync testing
        /**
         * My understanding: this test seems useless because it cannot get the latest data or suitable insertion position
         * But if users manually input data, they can definitely get the insertion position. Since there is an insertion position, it must meet merge requirements, because you only need to follow the insertion position!
         *
         * As for format merging, since we have wins strategy, we can naturally handle it!
         * Can test format merging here, need to construct data first then manually call that function, try it later!
         */
        // if (user && JSON.parse(user).name === "User71") {
        //   insertText(ychars.toArray()[ychars.toArray().length - 1]?.opId, "Hello");
        // } else {
        //   insertText(
        //     ychars.toArray()[ychars.toArray().length - 1]?.opId,
        //     "hello"
        //   );
        // }
      }, 0);
      // const intervalId = setInterval(() => {
      //   window.location.reload();
      // }, 2000); // Refresh page every 5000 milliseconds (5 seconds)
      // Clean up user state when page unloads
      const handleBeforeUnload = () => {
        aw.setLocalStateField("user", null);
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      // Define cleanup logic and store in outer variable
      cleanup = () => {
        // clearInterval(syncInterval); // No longer needed because timer was removed

        aw.setLocalState(null);

        window.removeEventListener("beforeunload", handleBeforeUnload);

        if (viewRef.current) {
          viewRef.current.destroy();
          viewRef.current = null;
        }

        newYDoc.off("update");

        wsProvider.destroy();
        setIsConnected(false);
      };
    });

    // Outermost cleanup — React ensures call when component unmounts
    return () => {
      cleanup();
    };
  }, [docId, authUser]); // Add authUser dependency

  return [editorView, awareness, provider, isConnected, ydocRef.current]; // Add ydoc to return values
}
