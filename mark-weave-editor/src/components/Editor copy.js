/*
 * @FilePath: Editor copy.js
 * @Author: Aron
 * @Date: 2025-02-23 19:10:10
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-02-23 19:10:11
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
/*
 * @FilePath: Editor.js
 * @Author: Aron
 * @Date: 2025-02-21 14:05:52
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-02-23 19:03:30
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import React, { useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import {
  ydoc,
  ychars,
  yformatOps,
  insertChar,
  deleteChar,
  addBold,
} from "./CRDT";
import { keymap } from "prosemirror-keymap";
import { toggleMark } from "prosemirror-commands";
import { ySyncPlugin, yCursorPlugin } from "y-prosemirror";
import { Awareness } from "y-protocols/awareness";
import { Slice, Fragment } from "prosemirror-model";
import "./editer.css";

// 1️⃣ ProseMirror Schema
// const schema = new Schema({
//   nodes: {
//     doc: { content: "paragraph+" },
//     paragraph: { content: "text*", group: "block" },
//     text: { group: "inline" },
//   },
//   marks: {
//     bold: {},
//   },
// });
const awareness = new Awareness(ydoc); // ✅ 确保 ydoc 作为参数传入
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "text*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() {
        return ["p", 0];
      },
    },
    text: { group: "inline" },
  },
  // marks: {
  //   bold: {
  //     parseDOM: [{ tag: "strong" }],
  //     toDOM() {
  //       return ["strong", 0];
  //     },
  //   },
  // },
  marks: {
    strong: { parseDOM: [{ tag: "strong" }], toDOM: () => ["strong", 0] },
    em: { parseDOM: [{ tag: "i" }, { tag: "em" }], toDOM: () => ["em", 0] },
  },
});
const richTextKeymap = keymap({
  "Mod-b": (state, dispatch) => {
    // 假设你能从当前选区中获取起始和结束的标识符
    // 这里简单地使用硬编码的示例；实际应根据选区计算
    addBold("startOpId", "endOpId");
    return true;
  }, // ⌘B / Ctrl+B -> 加粗
  "Mod-i": toggleMark(schema.marks.em), // ⌘I / Ctrl+I -> 斜体
});
// 2️⃣ 监听 Yjs 变更，并同步到 ProseMirror
function syncToProseMirror(view) {
  // function updateEditor() {
  //   const newDoc = convertCRDTToProseMirrorDoc();
  //   if (!newDoc || !newDoc.type) {
  //     console.error("🚨 convertCRDTToProseMirrorDoc() 返回了无效的 Node:", newDoc);
  //     return;
  //   }
  //   console.log("✅ ProseMirror 更新:", newDoc.toJSON());

  //   // 创建一个 transaction 替换整个文档（从位置 0 到 doc.nodeSize）
  //   const tr = view.state.tr;
  //   // 用 Fragment.from(newDoc.content) 得到新文档的 Fragment
  //   tr.replaceWith(0, view.state.doc.nodeSize, Fragment.from(newDoc.content));
  //   view.dispatch(tr);
  // }

  // function updateEditor() {
  //   const newDoc = convertCRDTToProseMirrorDoc();
  //   if (!newDoc || !newDoc.type) {
  //     console.error(
  //       "🚨 convertCRDTToProseMirrorDoc() 返回了无效的 Node:",
  //       newDoc
  //     );
  //     return;
  //   }
  //   console.log("✅ ProseMirror 更新:", newDoc.toJSON());

  //   // 直接创建一个新的 EditorState
  //   const newState = EditorState.create({
  //     doc: newDoc,
  //     plugins: view.state.plugins,
  //   });
  //   view.updateState(newState);
  // }
  function updateEditor() {
    const newDoc = convertCRDTToProseMirrorDoc();
    if (!newDoc || !newDoc.type) {
      console.error(
        "🚨 convertCRDTToProseMirrorDoc() 返回了无效的 Node:",
        newDoc
      );
      return;
    }
    console.log("✅ ProseMirror 更新:", newDoc.toJSON());
    console.log("✅ ProseMirror 更新2:", view);

    // 创建一个 transaction 替换整个文档（从位置 0 到 doc.nodeSize）
    const tr = view.state.tr;
    // 用 Fragment.from(newDoc.content) 得到新文档的 Fragment
    tr.replaceWith(
      0,
      view.state.doc.content.size,
      Fragment.from(newDoc.content)
    );
    view.dispatch(tr);
  }

  // 监听 ydoc 的全局变更（不仅仅是 ychars 和 yformatOps）
  ydoc.on("update", updateEditor);
  ychars.observe(updateEditor);
  // ychars.observeDeep(() => console.log("🟢 ychars.observeDeep() 触发"));
  yformatOps.observe(updateEditor);
}

// 3️⃣ 将 CRDT 转换为 ProseMirror 文档
function convertCRDTToProseMirrorDoc() {
  // console.log("🔄 将 CRDT 转换为 ProseMirror 文档", ychars);
  console.log(
    "11112121",
    ychars,
    ychars.toArray(),
    console.log(Object.prototype.toString.call(ychars)),
    console.log(Object.prototype.toString.call(ychars.toArray()))
  );
  const paragraphContent = ychars
    .toArray()
    .map((char) => {
      console.log("111", char);
      if (char.deleted) return null;

      const marks = yformatOps
        .toArray()
        .filter((op) => isCharWithinMark(char, op))
        .map((op) => schema.marks[op.markType]?.create())
        .filter((m) => m);

      return schema.text(char.ch, marks);
    })
    .filter((node) => node);

  // 🚀 **如果 paragraphContent 为空，添加一个空格，防止 ProseMirror 报错**
  // if (paragraphContent.length === 0) {
  //   paragraphContent.push(schema.text(" "));
  // }

  return schema.node("doc", null, [
    schema.node("paragraph", null, paragraphContent),
  ]);
}

function isCharWithinMark(char, op) {
  return op.start.opId <= char.opId && char.opId <= op.end.opId;
}

// 4️⃣ React 组件
const Editor = () => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    const yXmlFragment = ydoc.getXmlFragment("prosemirror");
    const state = EditorState.create({
      schema,
      plugins: [
        ySyncPlugin(yXmlFragment), // Yjs 同步插件
        yCursorPlugin(awareness), // Yjs 光标插件
        richTextKeymap, // ✅ 绑定快捷键
      ],
    });
    if (editorRef.current) {
      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(tr) {
          if (!viewRef.current) return;
          // const newState = viewRef.current.state.apply(tr);
          // viewRef.current.updateState(newState);
          try {
            const newState = viewRef.current.state.apply(tr);
            if (newState.schema !== viewRef.current.state.schema) {
              console.error(
                "🚨 Transaction schema 不匹配:",
                newState.schema,
                viewRef.current.state.schema
              );
              return;
            }
            viewRef.current.updateState(newState);
            console.log("📝 监听到 ProseMirror 变更:", tr);

            tr.steps.forEach((step) => {
              if (step.from !== step.to) {
                // 说明是插入文本
                const text = newState.doc.textBetween(step.from, step.to);
                insertChar(null, text); // ✅ 存入 ychars
              }
            });

            console.log("🚀 现在的 ychars:", ychars.toArray());
          } catch (err) {
            console.error("🚨 Transaction 应用失败:", err);
          }
        },
      });
      viewRef.current = view;
      syncToProseMirror(view);
    }

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
      ydoc.off("update", syncToProseMirror); // 清理监听器
    };
  }, []);

  return <div ref={editorRef} className='ProseMirror' />;
};

export default Editor;
