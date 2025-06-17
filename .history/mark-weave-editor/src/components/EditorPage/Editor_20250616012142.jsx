/*
 * @FilePath: Editor.jsx
 * @Author: Aron
 * @Date: 2025-03-04 22:38:04
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-06-16 01:21:42
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
import Sidebar from "../DocumentList/Sidebar";
import { useNavigate } from 'react-router-dom';

// 这里假设我们从 URL 参数或外部 props 中获取 docId
export default function Editor() {
  const editorRef = useRef(null);
  const navigate = useNavigate();

  // 从 URL 参数中获取 docId
  const urlParams = new URLSearchParams(window.location.search);
  let docId = urlParams.get("docId");

  // 如果 URL 中没有 docId，则生成一个新的，并更新 URL（不刷新页面）
  if (!docId) {
    docId = uuidv4();
    urlParams.set("docId", docId);
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }

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

  // 侧边栏点击跳转
  const handleMenuClick = (key) => {
    if (key === 'documents') navigate('/documents');
    if (key === 'members') navigate('/team-settings'); // 或其他页面
    // ... 其他跳转
  };

  return (
    <div className="editorpage-layout">
      {awareness && <UserList awareness={awareness} />}
      <Toolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onLink={handleLink}
      />
      <div ref={editorRef} className='ProseMirror' />
      <Sidebar activeTab="documents" onMenuClick={handleMenuClick} />
    </div>
  );
}
