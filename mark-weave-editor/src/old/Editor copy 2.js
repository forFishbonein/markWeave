/*
 * @FilePath: Editor copy 2.js
 * @Author: Aron
 * @Date: 2025-02-23 20:29:45
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-02-23 23:43:01
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
/**
 * Editor.js
 * 完全使用自定义 CRDT（方案B）：用户输入的变更通过 dispatchTransaction 被转换为 CRDT 操作，
 * 然后通过 convertCRDTToProseMirrorDoc() 重建 ProseMirror 文档。
 */

import React, { useEffect, useRef } from "react";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, Slice, Fragment } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { toggleMark } from "prosemirror-commands";
import {
  ydoc,
  ychars,
  yformatOps,
  insertChar,
  deleteChar,
  addBold,
} from "../components/CRDT";
import "./editer.css";

// 定义 ProseMirror Schema
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
  marks: {
    strong: {
      parseDOM: [{ tag: "strong" }],
      toDOM() {
        return ["strong", 0];
      },
    },
    em: {
      parseDOM: [{ tag: "i" }, { tag: "em" }],
      toDOM() {
        return ["em", 0];
      },
    },
  },
});

// 定义快捷键，仅处理斜体和加粗等常规操作
const richTextKeymap = keymap({
  "Mod-b": toggleMark(schema.marks.strong),
  "Mod-i": toggleMark(schema.marks.em),
  // 此处如果希望调用自定义 addBold，可在此绑定
  // "Mod-B": (state, dispatch) => { addBold(...); return true; },
});

// 自定义函数：从 CRDT 数据生成 ProseMirror 文档
function convertCRDTToProseMirrorDoc() {
  // 将 ychars 和 yformatOps 转为普通数组，并生成文档节点
  const paragraphContent = ychars
    .toArray()
    .map((char) => {
      // 过滤掉被删除的字符
      if (char.deleted) return null;
      // 获取此字符适用的 mark
      const marks = yformatOps
        .toArray()
        .filter((op) => isCharWithinMark(char, op))
        .map((op) => schema.marks[op.markType]?.create())
        .filter((m) => m);
      // 生成文本节点；如果 char.ch 为空字符串，则返回 null（或你可以返回一个空格）
      if (char.ch === "") return null;
      return schema.text(char.ch, marks);
    })
    .filter((node) => node !== null);

  // 如果没有内容，则生成一个空格，防止空段落
  // if (paragraphContent.length === 0) {
  //   paragraphContent.push(schema.text(" "));
  // }

  return schema.node("doc", null, [
    schema.node("paragraph", null, paragraphContent),
  ]);
}

// 判断一个字符是否处于某个 mark 操作的区间内
function isCharWithinMark(char, op) {
  return op.start.opId <= char.opId && char.opId <= op.end.opId;
}

// 同步 CRDT 数据到 ProseMirror：完全依靠 ydoc 的更新事件
function syncToProseMirror(view) {
  function updateEditor() {
    const newDoc = convertCRDTToProseMirrorDoc();
    if (!newDoc || !newDoc.type) {
      console.error(
        "🚨 convertCRDTToProseMirrorDoc() 返回无效的 Node:",
        newDoc
      );
      return;
    }
    console.log("✅ 更新后的 ProseMirror Doc:", newDoc.toJSON());
    // 使用 replaceWith 替换整个文档：注意替换范围从 0 到 doc.nodeSize
    const tr = view.state.tr;
    console.log(
      "view",
      view,
      view.state.doc.content.size, //大 2
      view.state.doc.nodeSize, // 大 4
      newDoc.content
    );
    console.log("tr", tr);
    // console.log(
    //   "Fragment.fromArray(newDoc.content)",
    //   Fragment.fromArray(newDoc.content),
    //   view.state.doc.content.content.length
    // );
    // tr.replaceWith(
    //   0,
    //   view.state.doc.content.content.length,
    //   Fragment.fromArray(newDoc.content)
    // );
    // 替换范围改为 [1, doc.nodeSize - 1]
    // tr.replaceWith(
    //   1,
    //   view.state.doc.nodeSize - 1,
    //   Fragment.from(newDoc.content)
    // );
    tr.replaceWith(0, view.state.doc.content.size, newDoc.content);
    console.log("after tr", tr);
    if (tr.curSelectionFor !== 0) {
      view.dispatch(tr);
    }
  }

  // 这些代码不需要！
  // ydoc.on("update", updateEditor);
  // 或者直接监听 ychars 及 yformatOps 深度变化
  // ychars.observeDeep(() => updateEditor());
  // yformatOps.observeDeep(() => updateEditor());
}

const Editor = () => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    // 注意：不使用 ySyncPlugin！我们自己管理 CRDT 同步
    // 初始化一个空的 ProseMirror 文档（可以先从 CRDT 中生成，如果为空则会自动填充空格）
    const initialDoc = convertCRDTToProseMirrorDoc();
    const state = EditorState.create({
      schema,
      doc: initialDoc,
      plugins: [richTextKeymap],
    });

    if (editorRef.current) {
      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(tr) {
          if (!viewRef.current) return;
          console.log("📝 监听到 ProseMirror 变更:", tr);
          // 应用用户输入到当前 state
          let newState = viewRef.current.state.apply(tr);
          viewRef.current.updateState(newState);
          // 处理每个 transaction 中的步骤
          tr.steps.forEach((step) => {
            if (step.slice && step.slice.content.size > 0) {
              // 这是一个插入操作，即使 step.from === step.to
              // const insertedText = newState.doc.textBetween(step.from, step.to);
              // 或者直接从 slice 中读取文本：
              console.log("step.slice.content", step.slice.content);
              const text = step.slice.content.textBetween(
                0,
                step.slice.content.size
              );
              console.log("text", text);
              insertChar(null, text);
            }
          });
        },
      });
      viewRef.current = view;
      syncToProseMirror(view);
    }

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
      ydoc.off("update");
    };
  }, []);

  return <div ref={editorRef} className='ProseMirror' />;
};

export default Editor;
