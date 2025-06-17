/*
 * @FilePath: useYjsEditor.js
 * @Author: Aron
 * @Date: 2025-03-04 22:35:56
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-06-02 20:16:44
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
export function useYjsEditor(docId, editorRef) {
  const viewRef = useRef(null);
  const [editorView, setEditorView] = useState(null);
  const [awareness, setAwareness] = useState(null);

  console.log("当前文档ID:", docId);
  useEffect(() => {
    const provider = new WebsocketProvider(
      "ws://localhost:1235",
      // "room1",
      docId,
      ydoc
    );
    provider.awareness.setLocalStateField("removeTimeout", 1000); // 设置为 1 秒（示例值）

    const aw = provider.awareness;
    let user = sessionStorage.getItem("myEditorUser");
    if (!user) {
      // 如果没有，创建新的用户身份
      user = {
        name: "User" + Math.floor(Math.random() * 100),
        color: "#ffa500", // 或者生成随机颜色
      };
      sessionStorage.setItem("myEditorUser", JSON.stringify(user));
      aw.setLocalStateField("user", user);
    } else {
      aw.setLocalStateField("user", JSON.parse(user));
    }
    setAwareness(aw);
    console.log("awareness", aw);
    provider.on("status", (event) => {
      console.log("✅ WebSocket状态：", event.status);
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
        // plugins: [richTextKeymap, cursorPlugin(awareness)],
        plugins: [myKeymapPlugin],
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

      // setTimeout(() => {
      //   console.log(
      //     "setTimeout：",
      //     ychars.toArray().length,
      //     yformatOps.toArray().length
      //   );
      // if (
      //   docId &&
      //   ychars.toArray().length === 0 &&
      //   yformatOps.toArray().length === 0
      // ) {
      //   console.log("!!!!执行函数了！！");
      //   loadInitialData(docId);
      // }
      //   loadInitialData(docId);
      // }, 10);
      // tODO  因为这里convertCRDTToProseMirrorDoc会执行两次，而最开始ychars和yformatOps都为 0，会导致意外执行，所以利用事件循环放到setTimeout 里面执行就可以很轻松解决了！
      //达到了只在文档没有内容，刚刚初始化的时候进行数据获取，而不是每次都和 ws 里面的数据合并导致每次数据翻倍了！！！——> 这样就是先等 ws 数据放进来，然后我们看有没有数据，没有数据再去获取
      //下面这个不能放开，否则会每次翻倍！
      // setTimeout(() => {
      //   loadInitialData(docId);
      // }, 0);
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
    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
      ydoc.off("update");
      provider.destroy();
      // clearInterval(intervalId);
    };
  }, []);

  return [editorView, awareness];
}
