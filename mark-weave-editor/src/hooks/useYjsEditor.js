/*
 * @FilePath: useYjsEditor.js
 * @Author: Aron
 * @Date: 2025-03-04 22:35:56
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-02 03:32:31
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/hooks/useYjsEditor.js
import { useEffect, useRef, useState } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { WebsocketProvider } from "y-websocket";
import { UndoManager } from "yjs";

import { ydoc, ychars, yformatOps } from "../crdt";
import {
  convertCRDTToProseMirrorDoc,
  loadInitialData,
} from "../crdt/crdtUtils";
import { syncToProseMirror } from "../crdt/crdtSync";
// import { richTextKeymap } from "../plugins/keymap";
import { schema } from "../plugins/schema";
import { createKeymap } from "../plugins/keymap"; // ← 注意引用
import { insertChar, insertText, deleteChars } from "../crdt/crdtActions";
import { cursorPlugin } from "../old/cursor-plugin";
import { useAuth } from "../contexts/AuthContext";

export function useYjsEditor(docId, editorRef) {
  const viewRef = useRef(null);
  const [editorView, setEditorView] = useState(null);
  const [awareness, setAwareness] = useState(null);
  const [provider, setProvider] = useState(null);
  const { user: authUser } = useAuth(); // 获取真实登录用户

  console.log("当前文档ID:", docId);
  useEffect(() => {
    const wsProvider = new WebsocketProvider(
      "ws://localhost:1234",
      docId,
      ydoc
    );
    setProvider(wsProvider);
    // 设置用户状态保持时间，避免过快清理
    // 注意：这个设置要在设置用户信息之前

    const aw = wsProvider.awareness;

    // 获取当前登录用户的ID用于判断是否为本人
    const currentUserId = authUser?.userId;

    // 设置用户信息 - 立即生效
    const setUserInfo = () => {
      // 使用真实登录用户信息
      if (authUser) {
        const userInfo = {
          name: authUser.username || authUser.email || "Unknown User",
          email: authUser.email,
          userId: authUser.userId,
          color: "#2563eb",
          timestamp: Date.now(),
          online: true, // 明确标记在线状态
        };

        aw.setLocalStateField("user", userInfo);
        console.log("✅ 立即设置用户信息:", userInfo);

        // 强制触发awareness同步 - 这是关键！
        setTimeout(() => {
          aw.setLocalStateField("trigger", Date.now());
          console.log("🔄 强制触发awareness同步");
        }, 100);
      } else {
        const fallbackUser = {
          name: "访客" + Math.floor(Math.random() * 100),
          color: "#10b981",
          timestamp: Date.now(),
          online: true,
        };
        aw.setLocalStateField("user", fallbackUser);
        console.log("⚠️ 设置访客信息:", fallbackUser);

        // 同样强制触发同步
        setTimeout(() => {
          aw.setLocalStateField("trigger", Date.now());
          console.log("🔄 强制触发awareness同步(访客)");
        }, 100);
      }
    };

    // WebSocket状态监听
    wsProvider.on("status", (event) => {
      console.log("🔌 WebSocket状态:", event.status);
      if (event.status === "connected") {
        console.log("✅ WebSocket已连接");
        // WebSocket连接后重新设置用户信息并强制同步
        setUserInfo();

        // 额外的强制同步措施
        setTimeout(() => {
          console.log("🚀 WebSocket连接后强制同步用户状态");
          aw.setLocalStateField("forceSync", Date.now());

          // 发送一个空的文档更新来触发同步
          ydoc.transact(() => {
            // 这会触发WebSocket同步
          });
        }, 200);
      }
    });

    // 立即设置用户信息
    setUserInfo();

    // 定期强制同步awareness状态，确保其他客户端能看到
    const syncInterval = setInterval(() => {
      if (aw.getLocalState().user) {
        // 更新时间戳触发awareness变化
        aw.setLocalStateField("lastSeen", Date.now());
        console.log("⏰ 定期同步用户在线状态");
      }
    }, 3000); // 每3秒同步一次

    setAwareness(aw);
    console.log("awareness", aw);
    wsProvider.on("status", (event) => {
      console.log("🔌 WebSocket状态变化：", event.status);
      if (event.status === "connected") {
        console.log("✅ WebSocket已连接，用户可以开始协作");
      } else if (event.status === "disconnected") {
        console.log("❌ WebSocket连接断开");
      }
    });

    // 监听awareness变化 - 实时同步
    wsProvider.awareness.on("change", (changes) => {
      console.log("👥 Awareness状态变化:", {
        added: changes.added,
        updated: changes.updated,
        removed: changes.removed,
        totalUsers: Array.from(wsProvider.awareness.getStates().values())
          .length,
      });

      // 强制触发awareness状态更新
      if (changes.added.length > 0 || changes.removed.length > 0) {
        console.log("🔄 用户加入/离开，强制同步状态");
      }
    });
    // 创建 UndoManager，监听 ychars 和 yformatOps
    // 1. 创建 UndoManager
    const undoManager = new UndoManager([ychars, yformatOps]);

    // 2. 创建 keymap 插件，传入 undoManager
    const myKeymapPlugin = createKeymap(undoManager);
    if (editorRef.current && !viewRef.current) {
      // 注意：不使用 ySyncPlugin！我们自己管理 CRDT 同步
      // 初始化一个空的 ProseMirror 文档（可以先从 CRDT 中生成，如果为空则会自动填充空格）
      const initialDoc = convertCRDTToProseMirrorDoc();
      console.log("initialDoc：", initialDoc, ydoc);
      const state = EditorState.create({
        schema,
        doc: initialDoc,
        plugins: [myKeymapPlugin, cursorPlugin(aw)],
      });
      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(tr) {
          if (!viewRef.current) return;
          console.log("📝 监听到 ProseMirror 变更:", tr);
          try {
            if (tr.getMeta("fromSync")) {
              // console.log("🚀 fromSync newState:", newState);
              //一旦这里updateState了，那么页面上的内容自然就会跟随改变了，跟下面的 steps 没有关系的！
              const newState = viewRef.current.state.apply(tr);
              viewRef.current.updateState(newState);
              return;
            }

            // 应用用户输入到当前 state
            let newState = viewRef.current.state.apply(tr);
            console.log("🚀newState", newState);
            viewRef.current.updateState(newState);
            // 处理每个 transaction 中的步骤
            tr.steps.forEach((step) => {
              if (step.slice && step.slice.content.size > 0) {
                // 🚀 获取插入位置
                const insertPos = step.from; // ProseMirror 文档中的插入位置
                console.log(`📝 文字插入到位置 ${insertPos}`);

                // 🚀 获取插入位置前一个字符的 opId
                let afterId = null;
                if (insertPos > 1) {
                  const chars = ychars.toArray();
                  console.log("222222", chars);
                  const charIndex = insertPos - 2; // -2 因为 ProseMirror 是 1-based，ychars 是 0-based
                  if (charIndex >= 0 && charIndex < chars.length) {
                    afterId = chars[charIndex].opId; // 找到插入点前的字符 ID
                  }
                }
                console.log(`📝 afterId: ${afterId}`);

                // 🚀 直接从 slice 中读取文本
                console.log(
                  "step.slice.content",
                  step.slice.content,
                  step.from,
                  step.to
                );
                // const text = newState.doc.textBetween(step.from, step.to); //这个好像不对
                const text = step.slice.content.textBetween(
                  0,
                  step.slice.content.size
                );
                console.log("text", text); //取出本次要插入的内容
                // 根据文本长度决定调用 insertText 或 insertChar
                if (text.length > 1) {
                  insertText(afterId, text);
                } else {
                  insertChar(afterId, text);
                }
              } else if (
                step.from !== step.to &&
                step.slice?.content.size === 0
              ) {
                // 🚀 这里处理删除操作
                // console.log("❌ 发现删除操作:", step);
                deleteChars(step.from, step.to); // 🔥 直接调用批量删除
              }
            });
          } catch (e) {
            //因为这里如果新的newState和原来的一样，会报错Applying a mismatched transaction，我们要避免这个报错
            console.log("error", e);
            return;
          }
        },
      });
      viewRef.current = view;

      // --- 实时同步本地光标到awareness ---
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
      // 初始化时同步一次
      setTimeout(updateCursorAwareness, 100);

      setEditorView(view);
      syncToProseMirror(view, docId);
    }
    //自己管理 awareness 里的光标，不需要 yCursorPlugin

    setTimeout(() => {
      // console.log(
      //   "12121",
      //   ychars.toArray(),
      //   ychars.toArray()[ychars.toArray().length - 1]?.opId
      // );
      //todo 进行同步测试的
      /**
       * 我的理解：这里测试感觉没啥用，因为不能得到最新的数据，得不到合适的插入位置
       * 但是如果用户自己手动数据那肯定是可以拿到插入位置的，既然有插入位置那么一定就是符合合并要求的，因为就只需要根据插入位置来就可以了！
       *
       * 至于格式的合并，因为我们有 wins 策略，自然也是可以应付过来的！
       * 可以再在这里测试一下格式的合并，需要先构造数据然后我们手动去调用那个函数，回头试一下！
       */
      // if (user && JSON.parse(user).name === "User71") {
      //   insertText(ychars.toArray()[ychars.toArray().length - 1]?.opId, "你好");
      // } else {
      //   insertText(
      //     ychars.toArray()[ychars.toArray().length - 1]?.opId,
      //     "hello"
      //   );
      // }
    }, 0);
    // const intervalId = setInterval(() => {
    //   window.location.reload();
    // }, 2000); // 每 5000 毫秒（5 秒）刷新一次页面
    // 页面卸载时清理用户状态
    const handleBeforeUnload = () => {
      aw.setLocalStateField("user", null);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // 清理定期同步
      clearInterval(syncInterval);

      // 离开时立即清理用户状态
      aw.setLocalStateField("user", null);

      viewRef.current?.destroy();
      viewRef.current = null;
      ydoc.off("update");
      wsProvider.destroy();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // clearInterval(intervalId);
    };
  }, [docId, authUser]); // 添加authUser依赖

  return [editorView, awareness, provider];
}
