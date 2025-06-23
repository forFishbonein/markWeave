/*
 * @FilePath: Editor.jsx
 * @Author: Aron
 * @Date: 2025-03-04 22:38:04
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-06-24 02:30:57
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
      // 模拟触发 Cmd+B
      toggleMark(schema.marks.bold)(editorView.state, editorView.dispatch);
    }
  };

  const handleItalic = () => {
    if (editorView) {
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
