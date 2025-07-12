/*
 * @FilePath: Editor.jsx
 * @Author: Aron
 * @Date: 2025-03-04 22:38:04
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-12 01:45:01
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/components/Editor.jsx
import React, { useRef } from "react";
import { useYjsEditor } from "../../hooks/useYjsEditor";
import Toolbar from "../Toolbar";
import UserList from "../UserList";
import "prosemirror-view/style/prosemirror.css";
import "./editer.css";
import { v4 as uuidv4 } from "uuid";
import { toggleMark } from "prosemirror-commands";
import { schema } from "../../plugins/schema";
import { addBold, removeBold, addEm, removeEm, getVisibleCharOpIds } from "../../crdt/crdtActions";
import { markActive } from "../../plugins/utils";

// 接收docId作为props
export default function Editor({ docId }) {
  const editorRef = useRef(null);

  // 如果没有传入docId，则生成一个新的
  if (!docId) {
    docId = uuidv4();
    console.warn("没有提供docId，生成新的docId:", docId);
  }

  console.log("Editor组件使用的docId:", docId);

  // 调用自定义 Hook 获取 editorView
  const [editorView, awareness] = useYjsEditor(docId, editorRef);

  // 业务逻辑：处理 Bold / Italic / Link 等可以放在 Toolbar 内部
  // 也可以在这里通过 editorView 调用 toggleMark 等
  const handleBold = () => {
    if (editorView) {
      const state = editorView.state;
      const { from, to } = state.selection;

      console.log("🔥 Bold按钮被点击");

      if (from === to) {
        console.warn("⚠️ 不能在空选区加粗！");
        return;
      }

      // ✅ 使用正确的可见索引转换方法
      // ProseMirror使用1-based索引[from, to)，转换为0-based [from-1, to-1)
      const { startId, endId } = getVisibleCharOpIds(from - 1, to - 1);

      console.log(`🔵 Bold按钮操作, ProseMirror位置: [${from}, ${to}), 转换后: [${from-1}, ${to-1}), startId: ${startId}, endId: ${endId}`);

      // 使用辅助函数判断当前选区是否已经是 bold
      if (markActive(state, schema.marks.bold)) {
        console.log("🔵 当前选区已经加粗，调用 removeBold");
        // removeBold时使用"before"避免多取消一个字符
        removeBold(startId, endId, "before");
      } else {
        console.log("🔵 当前选区未加粗，调用 addBold");
        // addBold时使用"after"确保包含选区内的所有字符
        addBold(startId, endId, "after");
      }

      // 调用ProseMirror操作更新UI
      toggleMark(schema.marks.bold)(editorView.state, editorView.dispatch);
    }
  };

  const handleItalic = () => {
    if (editorView) {
      const state = editorView.state;
      const { from, to } = state.selection;

      console.log("🔥 Italic按钮被点击");

      if (from === to) {
        console.warn("⚠️ 不能在空选区斜体！");
        return;
      }

      // ✅ 使用正确的可见索引转换方法
      // ProseMirror使用1-based索引[from, to)，转换为0-based [from-1, to-1)
      const { startId, endId } = getVisibleCharOpIds(from - 1, to - 1);

      console.log(`🔵 Italic按钮操作, ProseMirror位置: [${from}, ${to}), 转换后: [${from-1}, ${to-1}), startId: ${startId}, endId: ${endId}`);

      if (markActive(state, schema.marks.em)) {
        console.log("🔵 当前选区已经斜体，调用 removeEm");
        // removeEm时使用"before"避免多取消一个字符
        removeEm(startId, endId, "before");
      } else {
        console.log("🔵 当前选区未斜体，调用 addEm");
        // addEm时使用"after"确保包含选区内的所有字符
        addEm(startId, endId, "after");
      }

      // 调用ProseMirror操作更新UI
      toggleMark(schema.marks.em)(editorView.state, editorView.dispatch);
    }
  };

  const handleLink = () => {
    if (editorView) {
      const url = prompt("Enter link URL:");
      // 这里你可以自定义处理链接逻辑
      toggleMark(schema.marks.link)(editorView.state, editorView.dispatch);
    }
  };

  return (
    <div>
      {awareness && <UserList awareness={awareness} />}
      <Toolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onLink={handleLink}
      />
      <div ref={editorRef} className='ProseMirror' />
    </div>
  );
}
