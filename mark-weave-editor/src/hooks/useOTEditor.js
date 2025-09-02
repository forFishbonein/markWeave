/*
 * @FilePath: useOTEditor.js
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: OT version ProseMirror editor Hook, integrated with ShareDB - multi-window sync version
 */

import { useEffect, useRef, useState } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "../plugins/schema";
import { keymap } from "prosemirror-keymap";
import { toggleMark } from "prosemirror-commands";
import OTClient from "../services/otClient";
import { useAuth } from "../contexts/AuthContext";

/**
 * OT version ProseMirror editor Hook - multi-window sync version
 * Reference useYjsEditor implementation, add multi-window collaboration capability
 * @param {string} docId Document ID
 * @param {string} collection Collection name
 * @param {React.RefObject} editorRef Editor DOM reference
 * @returns {[EditorView, OTClient, boolean, object]} [Editor view, OT client, connection status, utility functions]
 */
export function useOTEditor(docId, collection = "documents", editorRef) {
  const [editorView, setEditorView] = useState(null);
  const [otClient, setOtClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userStates, setUserStates] = useState(new Map());

  const viewRef = useRef(null);
  const otClientRef = useRef(null);
  const isInitializedRef = useRef(false);
  const { user: authUser } = useAuth();

  useEffect(() => {
    console.log(
      "🔧 [OT] Current document ID:",
      docId,
      "Collection:",
      collection
    );

    if (!docId || isInitializedRef.current) return;

    console.log("🚀 [OT] Initialize OT editor", { docId, collection });
    initializeOTEditor();
    isInitializedRef.current = true;

    return () => {
      cleanupEditor();
    };
  }, [docId, collection, authUser]);

  const cleanupEditor = () => {
    console.log("🧹 [OT] Cleaning up editor resources");

    // Clean up periodic sync
    if (window.otSyncInterval) {
      clearInterval(window.otSyncInterval);
      window.otSyncInterval = null;
    }

    // Clean up user state
    clearUserState();

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    if (otClientRef.current) {
      otClientRef.current.disconnect();
      otClientRef.current = null;
    }

    setEditorView(null);
    setOtClient(null);
    setIsConnected(false);
    setUserStates(new Map());
    isInitializedRef.current = false;
  };

  const initializeOTEditor = async () => {
    try {
      // Create OT client
      const client = new OTClient();
      otClientRef.current = client;
      setOtClient(client);

      // Set user info
      const setUserInfo = () => {
        if (authUser) {
          const userInfo = {
            name: authUser.username || authUser.email || "Unknown User",
            email: authUser.email,
            userId: authUser.userId,
            color: "#1890ff", // OT uses blue theme
            timestamp: Date.now(),
            online: true,
            clientId: client.connectionId || `ot_${Date.now()}`,
          };

          // Store to localStorage for multi-window sync
          const userKey = `ot_user_${userInfo.clientId}`;
          localStorage.setItem(userKey, JSON.stringify(userInfo));

          console.log("✅ [OT] Set user info:", userInfo);

          // Update local state
          setUserStates((prev) => {
            const newStates = new Map(prev);
            newStates.set(userInfo.clientId, userInfo);
            return newStates;
          });
        } else {
          const fallbackUser = {
            name: "OTGuest" + Math.floor(Math.random() * 100),
            color: "#1890ff",
            timestamp: Date.now(),
            online: true,
            clientId: client.connectionId || `ot_guest_${Date.now()}`,
          };

          const userKey = `ot_user_${fallbackUser.clientId}`;
          localStorage.setItem(userKey, JSON.stringify(fallbackUser));

          console.log("⚠️ [OT] Set guest info:", fallbackUser);

          setUserStates((prev) => {
            const newStates = new Map(prev);
            newStates.set(fallbackUser.clientId, fallbackUser);
            return newStates;
          });
        }
      };

      // Connect to OT server
      console.log("🔌 [OT] Starting connection to OT server...");
      await client.connect("ws://localhost:1235");
      console.log("✅ [OT] Connection request sent");

      // Register connection event listeners
      client.on("connected", (data) => {
        console.log("✅ [OT] Client connection successful", data);
        setIsConnected(true);

        // Set user info after successful connection
        setUserInfo();

        // Subscribe to document
        setTimeout(() => {
          client.subscribeDocument(collection, docId);
        }, 100);
      });

      client.on("disconnect", (data) => {
        console.log("🔌 [OT] Client connection disconnected", data);
        setIsConnected(false);
        clearUserState();
      });

      client.on("docUpdate", (data) => {
        console.log("📄 [OT] Received document update", data);
        updateEditorFromOT(data);
      });

      client.on("operation", (data) => {
        console.log("⚡ [OT] Received operation", data);
        updateEditorFromOT(data);
      });

      client.on("error", (error) => {
        console.error("❌ [OT] Client error:", error);
        setIsConnected(false);

        // Try to reconnect after connection failed
        setTimeout(() => {
          if (!isConnected && otClientRef.current) {
            console.log("🔄 [OT] Attempting to reconnect...");
            otClientRef.current.reconnect();
          }
        }, 3000);
      });

      // Listen to localStorage changes for multi-window sync
      window.addEventListener("storage", handleStorageChange);

      // 🔥 Remove simulated delay - use real connection timing
      console.log("🔌 [OT] Connecting to OT server: ws://localhost:1235");

      // Add retry logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await client.connect("ws://localhost:1235");
          break; // Connection successful, exit retry loop
        } catch (error) {
          retryCount++;
          console.error(
            `❌ [OT] Connection failed (${retryCount}/${maxRetries}):`,
            error
          );

          if (retryCount < maxRetries) {
            const retryDelay = 1000 * retryCount; // Incremental delay
            console.log(`🔄 [OT] Retrying connection in ${retryDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          } else {
            console.error(
              "❌ [OT] Connection failed, reached maximum retry attempts"
            );
            setIsConnected(false);
          }
        }
      }

      // Create ProseMirror editor
      createProseMirrorEditor(client);
    } catch (error) {
      console.error("❌ [OT] Editor initialization failed:", error);
      setIsConnected(false);
    }
  };

  const handleStorageChange = (event) => {
    if (event.key && event.key.startsWith("ot_user_")) {
      // User state changes from other windows
      try {
        if (event.newValue) {
          const userInfo = JSON.parse(event.newValue);
          console.log("👥 [OT] Detected user from other window:", userInfo);

          setUserStates((prev) => {
            const newStates = new Map(prev);
            newStates.set(userInfo.clientId, userInfo);
            return newStates;
          });
        } else if (event.oldValue) {
          // User left
          const oldUserInfo = JSON.parse(event.oldValue);
          console.log("👋 [OT] User left:", oldUserInfo);

          setUserStates((prev) => {
            const newStates = new Map(prev);
            newStates.delete(oldUserInfo.clientId);
            return newStates;
          });
        }
      } catch (error) {
        console.warn("[OT] Failed to handle user state change:", error);
      }
    }
  };

  const cleanupExpiredUsers = () => {
    const now = Date.now();
    const expireTime = 10000; // 10 seconds expiration

    // Clean expired users from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("ot_user_")) {
        try {
          const userInfo = JSON.parse(localStorage.getItem(key));
          if (now - userInfo.lastSeen > expireTime) {
            localStorage.removeItem(key);
            console.log("🗑️ [OT] Cleaning expired user:", userInfo.name);
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      }
    });

    // Update local state
    setUserStates((prev) => {
      const newStates = new Map();
      prev.forEach((user, clientId) => {
        if (now - user.lastSeen <= expireTime) {
          newStates.set(clientId, user);
        }
      });
      return newStates;
    });
  };

  const clearUserState = () => {
    if (otClientRef.current) {
      const clientId = otClientRef.current.connectionId;
      if (clientId) {
        const userKey = `ot_user_${clientId}`;
        localStorage.removeItem(userKey);
        console.log("🧹 [OT] Cleaning user state");
      }
    }
  };

  const createProseMirrorEditor = (client) => {
    if (!editorRef.current || viewRef.current) return;

    console.log("📝 [OT] Creating ProseMirror editor");

    try {
      // Create empty initial document
      const initialDoc = schema.nodes.doc.create(
        null,
        schema.nodes.paragraph.create()
      );

      // Create editor state
      const state = EditorState.create({
        schema,
        doc: initialDoc,
        plugins: [
          keymap({
            "Mod-b": toggleMark(schema.marks.bold),
            "Mod-i": toggleMark(schema.marks.em),
          }),
        ],
      });

      // Create editor view
      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(tr) {
          if (!viewRef.current) return;

          try {
            // Check if transaction is from OT sync
            if (tr.getMeta("fromOT")) {
              const newState = viewRef.current.state.apply(tr);
              viewRef.current.updateState(newState);
              return;
            }

            // Apply user input
            const newState = viewRef.current.state.apply(tr);
            viewRef.current.updateState(newState);

            // Process user operations, convert to OT operations
            if (tr.docChanged && client && client.isConnected) {
              processUserOperations(tr, client);
            }
          } catch (error) {
            console.error("[OT] Failed to process editor transaction:", error);
          }
        },
      });

      viewRef.current = view;
      setEditorView(view);

      console.log("✅ [OT] ProseMirror editor created successfully");
    } catch (error) {
      console.error("❌ [OT] Failed to create ProseMirror editor:", error);
    }
  };

  const processUserOperations = (tr, client) => {
    try {
      // 🔥 New: Get current document state info
      const currentDoc = viewRef.current.state.doc;
      const currentLength = currentDoc.textContent.length;
      const currentContent = currentDoc.textContent;

      console.log("🔥 [OT] Processing user operations", {
        docChanged: tr.docChanged,
        steps: tr.steps.length,
        isConnected: client.isConnected,
        clientId: client.connectionId,
        currentDocLength: currentLength,
        currentContentPreview:
          currentContent.substring(0, 30) + (currentLength > 30 ? "..." : ""),
        docVersion: client.documents.get(`${collection}/${docId}`)?.version,
      });

      if (!tr.docChanged || !client || !client.isConnected) {
        return;
      }

      // Handle each step
      tr.steps.forEach((step, index) => {
        console.log(`🔥 [OT] Processing step ${index}:`, {
          stepType: step.constructor.name,
          from: step.from,
          to: step.to,
        });

        if (step.slice && step.slice.content.size > 0) {
          // Insert operation - support rich text format
          console.log(`🔤 [OT] Processing insert operation at position ${step.from}`);

          // 🔥 Fix: Validate insertion position validity
          const insertPos = step.from;
          const docSize = currentDoc.content.size;

          if (insertPos > docSize) {
            console.error(
              `❌ [OT] Insert position exceeds document range: ${insertPos} > ${docSize}, skipping operation`
            );
            return; // Skip invalid operation
          }

          // 🔥 Fix: Dynamically adjust retain position based on current document's real length
          const actualRetain = Math.min(insertPos, docSize);

          // Build standard Delta operation format (send operation array directly, not wrapped in ops object)
          const deltaOps = [];
          if (actualRetain > 0) {
            deltaOps.push({ retain: actualRetain });
          }

          // Handle rich text formatting - extract text and format info
          step.slice.content.forEach((node) => {
            if (node.isText) {
              const text = node.text;
              const marks = node.marks || [];

              if (marks.length > 0) {
                // Formatted text
                const attributes = {};

                marks.forEach((mark) => {
                  switch (mark.type.name) {
                    case "bold":
                      attributes.bold = true;
                      break;
                    case "em":
                      attributes.italic = true;
                      break;
                    // Can add more formats
                  }
                });

                // rich-text format: {insert: text, attributes: {...}}
                deltaOps.push({ insert: text, attributes });
                console.log(`📝 [OT] Inserting formatted text: "${text}"`, attributes);
              } else {
                // Plain text
                deltaOps.push({ insert: text });
                console.log(`📝 [OT] Inserting plain text: "${text}"`);
              }
            }
          });

          // ShareDB rich-text expects direct Delta array, not {ops: [...]} format
          const op = deltaOps;

          console.log("🔍 [DEBUG] Prepared operation for submission:", {
            isArray: Array.isArray(op),
            opType: typeof op,
            op: op,
            opLength: Array.isArray(op) ? op.length : "N/A",
          });

          try {
            client.submitOperation(collection, docId, op);
            console.log("✅ [OT] Rich text insert operation submitted successfully");
          } catch (error) {
            console.error("❌ [OT] Rich text insert operation submission failed:", error);
          }
        } else if (step.from !== step.to && step.slice?.content.size === 0) {
          // Delete operation
          const deleteLength = step.to - step.from;
          console.log(
            `🗑️ [OT] Deleting ${deleteLength} characters from position ${step.from}`
          );

          // Build standard Delta delete operation format
          const deltaOps = [];
          if (step.from > 0) {
            deltaOps.push({ retain: step.from });
          }
          deltaOps.push({ delete: deleteLength });

          // ShareDB rich-text expects direct Delta array
          const op = deltaOps;

          try {
            client.submitOperation(collection, docId, op);
            console.log("✅ [OT] Delete operation submitted successfully");
          } catch (error) {
            console.error("❌ [OT] Delete operation submission failed:", error);
          }
        } else if (step.constructor.name === "AddMarkStep") {
          // Add formatting (like bold, italic, etc.)
          const { from, to, mark } = step;

          // 🔧 Fix: More precise position calculation in multi-window environment
          // Ensure position is based on latest document state
          const currentDoc = viewRef.current.state.doc;
          const actualFrom = Math.max(
            0,
            Math.min(from, currentDoc.content.size)
          );
          const actualTo = Math.max(
            actualFrom,
            Math.min(to, currentDoc.content.size)
          );

          const deltaOps = [];
          if (actualFrom > 0) deltaOps.push({ retain: actualFrom });

          const attrs = {};
          switch (mark.type.name) {
            case "bold":
              attrs.bold = true;
              break;
            case "em":
              attrs.italic = true;
              break;
            default:
              break;
          }

          if (Object.keys(attrs).length === 0) {
            // Unsupported format, skip
            return;
          }

          // 🔥 Fix: Use standard Delta format, don't add extra properties
          const retainLength = actualTo - actualFrom;
          if (retainLength > 0) {
            deltaOps.push({
              retain: retainLength,
              attributes: attrs, // Only keep standard attributes
            });
          }

          const op = deltaOps;
          try {
            client.submitOperation(collection, docId, op);
            console.log("✅ [OT] Format add operation submitted successfully (multi-window optimized)", {
              from: actualFrom,
              to: actualTo,
              markType: mark.type.name,
              op,
            });
          } catch (error) {
            console.error("❌ [OT] Format add operation submission failed:", error);
          }
        } else if (step.constructor.name === "RemoveMarkStep") {
          // Remove formatting
          const { from, to, mark } = step;

          // 🔧 Fix: More precise position calculation in multi-window environment
          // Ensure position is based on latest document state
          const currentDoc = viewRef.current.state.doc;
          const actualFrom = Math.max(
            0,
            Math.min(from, currentDoc.content.size)
          );
          const actualTo = Math.max(
            actualFrom,
            Math.min(to, currentDoc.content.size)
          );

          const deltaOps = [];
          if (actualFrom > 0) deltaOps.push({ retain: actualFrom });

          const attrs = {};
          switch (mark.type.name) {
            case "bold":
              attrs.bold = null;
              break;
            case "em":
              attrs.italic = null;
              break;
            default:
              break;
          }

          if (Object.keys(attrs).length === 0) {
            return;
          }

          // 🔥 Fix: Use standard Delta format, don't add extra properties
          const retainLength = actualTo - actualFrom;
          if (retainLength > 0) {
            deltaOps.push({
              retain: retainLength,
              attributes: attrs, // Only keep standard attributes
            });
          }

          const op = deltaOps;
          try {
            client.submitOperation(collection, docId, op);
            console.log("✅ [OT] Format remove operation submitted successfully (multi-window optimized)", {
              from: actualFrom,
              to: actualTo,
              markType: mark.type.name,
              op,
            });
          } catch (error) {
            console.error("❌ [OT] Format remove operation submission failed:", error);
          }
        }
      });
    } catch (error) {
      console.error("❌ [OT] processUserOperations failed:", error);
    }
  };

  // Helper function to rebuild ShareDB document content
  const reconstructDocumentFromShareDB = (shareDBData) => {
    try {
      console.log("🔧 [OT] Starting to rebuild ShareDB document:", shareDBData);

      if (!shareDBData) {
        console.log("📄 [OT] ShareDB data is empty");
        return [];
      }

      // ShareDB rich-text document's data field contains ops array
      let operations = [];

      if (Array.isArray(shareDBData)) {
        operations = shareDBData;
      } else if (shareDBData.ops && Array.isArray(shareDBData.ops)) {
        operations = shareDBData.ops;
      } else if (shareDBData && typeof shareDBData === "object") {
        // If it's directly an operation object, wrap in array
        operations = [shareDBData];
      }

      console.log(`🔧 [OT] Found ${operations.length} operations`);

      const textNodes = [];

      operations.forEach((op, index) => {
        console.log(`🔧 [OT] Handle operation ${index}:`, op);

        if (op && typeof op === "object") {
          if (
            op.insert &&
            typeof op.insert === "string" &&
            op.insert.length > 0
          ) {
            // Insert text operation
            const text = op.insert;
            const attributes = op.attributes || {};

            const marks = [];
            if (attributes.bold) marks.push(schema.marks.bold.create());
            if (attributes.italic) marks.push(schema.marks.em.create());

            textNodes.push(schema.text(text, marks));
            console.log(`📝 [OT] Adding text node: "${text}"`, attributes);
          } else if (op.retain) {
            // Retain operation - usually ignored during document rebuild
            console.log(`📍 [OT] Skipping retain operation: ${op.retain}`);
          } else if (op.delete) {
            // Delete operation - Ignore during document rebuild
            console.log(`🗑️ [OT] Skipping delete operation: ${op.delete}`);
          }
        } else if (typeof op === "string" && op.length > 0) {
          // Plain text
          textNodes.push(schema.text(op));
          console.log(`📝 [OT] Adding plain text: "${op}"`);
        }
      });

      console.log(`✅ [OT] Rebuild completed, generated ${textNodes.length} text nodes`);
      return textNodes;
    } catch (error) {
      console.error("❌ [OT] Failed to rebuild ShareDB document:", error);
      return [];
    }
  };

  const updateEditorFromOT = (data) => {
    if (!viewRef.current || !data) return;

    try {
      console.log("🔄 [OT] Updating editor from OT", data);

      // 🔥 Fix: Check if operation was sent by self
      if (data._clientId) {
        const clientId = otClientRef.current?.connectionId;
        if (data._clientId === clientId) {
          console.log("🔄 [OT] Skipping self-sent operation (editor layer)", {
            messageClientId: data._clientId,
            myClientId: clientId,
            messageId: data._messageId,
          });
          return;
        }
      }

      // Handle operation type data
      if (data.op) {
        console.log("⚡ [OT] Handle operation update:", data.op);

        // Apply rich-text formatted OT operations to editor
        const tr = viewRef.current.state.tr.setMeta("fromOT", true);
        let pos = 0;

        // ShareDB rich-text returns standard Delta array format:
        // - {retain: number}: retain character count
        // - {insert: text, attributes?: {}}: insert text
        // - {delete: number}: delete character count
        // data.op is directly a Delta array
        const ops = Array.isArray(data.op) ? data.op : [data.op];
        ops.forEach((op, index) => {
          console.log(`🔧 [OT] Handle operation ${index}:`, op);

          if (op.retain) {
            // Retain operation - move position
            pos += op.retain;
            console.log(`📍 [OT] Retaining ${op.retain} characters, position moved to ${pos}`);
            // Handle format attribute changes
            if (op.attributes) {
              const start = pos - op.retain;
              const end = pos;
              const { bold, italic } = op.attributes;

              // 🔧 Fix: format sync optimization in multi-window environment
              // Ensure position boundary correctness
              const docSize = viewRef.current.state.doc.content.size;
              const actualStart = Math.max(0, Math.min(start, docSize));
              const actualEnd = Math.max(actualStart, Math.min(end, docSize));

              console.log(
                `🎨 [OT] Applying format attribute changes: [${actualStart}, ${actualEnd}]`,
                op.attributes
              );

              if (bold !== undefined && actualEnd > actualStart) {
                if (bold) {
                  tr.addMark(
                    actualStart,
                    actualEnd,
                    schema.marks.bold.create()
                  );
                  console.log(
                    `✅ [OT] Adding bold format: [${actualStart}, ${actualEnd}]`
                  );
                } else {
                  tr.removeMark(actualStart, actualEnd, schema.marks.bold);
                  console.log(
                    `❌ [OT] Removing bold format: [${actualStart}, ${actualEnd}]`
                  );
                }
              }
              if (italic !== undefined && actualEnd > actualStart) {
                if (italic) {
                  tr.addMark(actualStart, actualEnd, schema.marks.em.create());
                  console.log(
                    `✅ [OT] Adding italic format: [${actualStart}, ${actualEnd}]`
                  );
                } else {
                  tr.removeMark(actualStart, actualEnd, schema.marks.em);
                  console.log(
                    `❌ [OT] Removing italic format: [${actualStart}, ${actualEnd}]`
                  );
                }
              }
            }
          } else if (op && typeof op === "object" && op.insert) {
            // Insert formatted text
            const text = op.insert;
            const attributes = op.attributes || {};

            console.log(
              `➕ [OT] At position ${pos} inserting formatted text: "${text}"`,
              attributes
            );

            if (
              text &&
              pos >= 0 &&
              pos <= viewRef.current.state.doc.content.size
            ) {
              // Create formatted text node
              const marks = [];

              if (attributes.bold) {
                marks.push(schema.marks.bold.create());
              }
              if (attributes.italic) {
                marks.push(schema.marks.em.create());
              }

              // Insert formatted text
              if (marks.length > 0) {
                const textNode = schema.text(text, marks);
                tr.insert(pos, textNode);
              } else {
                tr.insertText(text, pos);
              }

              pos += text.length;
            }
          } else if (op.delete) {
            // Delete operation
            const deleteLength = op.delete;
            console.log(`➖ [OT] From position ${pos} deleting ${deleteLength} characters`);

            if (
              deleteLength > 0 &&
              pos >= 0 &&
              pos + deleteLength <= viewRef.current.state.doc.content.size
            ) {
              tr.delete(pos, pos + deleteLength);
            }
          }
        });

        // Only dispatch when transaction actually changed document
        if (tr.docChanged) {
          console.log("✅ [OT] Applied operation update to editor");
          viewRef.current.dispatch(tr);
        } else {
          console.log("ℹ️ [OT] Operation did not change document content");
        }
      }

      // Handle document state type data
      else if (data.data !== undefined) {
        console.log("📄 [OT] Processing document state update:", data.data);
        console.log(
          "📄 [OT] Data type:",
          typeof data.data,
          "is array:",
          Array.isArray(data.data)
        );

        // 🔥 New: Detect document state inconsistency
        const currentContent = viewRef.current.state.doc.textContent;
        const expectedContent = extractTextFromShareDBData(data.data);

        if (currentContent !== expectedContent) {
          console.warn("⚠️ [OT] Detected document state inconsistency", {
            current: currentContent.length,
            expected: expectedContent.length,
            currentPreview: currentContent.substring(0, 50),
            expectedPreview: expectedContent.substring(0, 50),
            requiresRebuild:
              Math.abs(currentContent.length - expectedContent.length) > 5,
          });

          // If difference is large, force rebuild document
          if (Math.abs(currentContent.length - expectedContent.length) > 5) {
            console.log("🔄 [OT] Large difference, force rebuilding document");
            forceDocumentRebuild(data.data);
            return;
          }
        }

        // Try to rebuild document content
        const reconstructedContent = reconstructDocumentFromShareDB(data.data);

        if (reconstructedContent && reconstructedContent.length > 0) {
          console.log("🔄 [OT] Rebuilt document content:", reconstructedContent);

          // Create new document containing rebuilt content
          const newDoc = schema.nodes.doc.create(
            null,
            schema.nodes.paragraph.create(null, reconstructedContent)
          );

          // Apply to editor
          const tr = viewRef.current.state.tr
            .setMeta("fromOT", true)
            .replaceWith(
              0,
              viewRef.current.state.doc.content.size,
              newDoc.content
            );

          viewRef.current.dispatch(tr);
          console.log("✅ [OT] Document content rebuild completed");

          // Calculate rebuilt text content for logging
          const reconstructedText = reconstructedContent
            .map((node) => node.textContent || node.text || "")
            .join("");
          console.log(`📄 [OT] Rebuilt text content: "${reconstructedText}"`);
        } else {
          console.log("ℹ️ [OT] Unable to rebuild document content or content is empty");
        }
      } else {
        console.log("⚠️ [OT] Unknown data format:", data);
      }
    } catch (error) {
      console.error("[OT] Failed to update editor from OT:", error);
    }
  };

  // 🔥 New: Extract plain text content from ShareDB data
  const extractTextFromShareDBData = (shareDBData) => {
    try {
      let operations = [];

      if (Array.isArray(shareDBData)) {
        operations = shareDBData;
      } else if (shareDBData.ops && Array.isArray(shareDBData.ops)) {
        operations = shareDBData.ops;
      } else if (shareDBData && typeof shareDBData === "object") {
        operations = [shareDBData];
      }

      let text = "";
      operations.forEach((op) => {
        if (
          op &&
          typeof op === "object" &&
          op.insert &&
          typeof op.insert === "string"
        ) {
          text += op.insert;
        } else if (typeof op === "string") {
          text += op;
        }
      });

      return text;
    } catch (error) {
      console.error("❌ [OT] Failed to extract text content:", error);
      return "";
    }
  };

  // 🔥 New: Force rebuild document
  const forceDocumentRebuild = (shareDBData) => {
    try {
      console.log("🔄 [OT] Starting to force rebuild document state");

      const reconstructedContent = reconstructDocumentFromShareDB(shareDBData);

      if (reconstructedContent && reconstructedContent.length > 0) {
        const newDoc = schema.nodes.doc.create(
          null,
          schema.nodes.paragraph.create(null, reconstructedContent)
        );

        const tr = viewRef.current.state.tr
          .setMeta("fromOT", true)
          .setMeta("forceRebuild", true)
          .replaceWith(
            0,
            viewRef.current.state.doc.content.size,
            newDoc.content
          );

        viewRef.current.dispatch(tr);
        console.log("✅ [OT] Document state force sync completed");

        // Calculate text content after rebuild
        const reconstructedText = reconstructedContent
          .map((node) => node.textContent || node.text || "")
          .join("");
        console.log(`📄 [OT] Text content after rebuild: "${reconstructedText}"`);
      } else {
        console.log("ℹ️ [OT] Unable to rebuild document content or content is empty");
      }
    } catch (error) {
      console.error("❌ [OT] Failed to force rebuild document:", error);
    }
  };

  // Get collaboration state
  const getCollaborationState = () => {
    return {
      userStates: Array.from(userStates.values()),
      activeUsers: userStates.size,
    };
  };

  // Provide reconnection functionality
  const reconnect = () => {
    if (otClientRef.current) {
      console.log("🔄 [OT] Manually reconnecting to OT server");
      otClientRef.current.reconnect();
    }
  };

  // Cleanup function
  const cleanup = () => {
    window.removeEventListener("storage", handleStorageChange);
    if (window.otSyncInterval) {
      clearInterval(window.otSyncInterval);
      window.otSyncInterval = null;
    }
    clearUserState();
  };

  // Cleanup when page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearUserState();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanup();
    };
  }, []);

  return [
    editorView,
    otClient,
    isConnected,
    {
      reconnect,
      getCollaborationState,
      cleanup,
      userStates: Array.from(userStates.values()),
      activeUsers: userStates.size,
    },
  ];
}
