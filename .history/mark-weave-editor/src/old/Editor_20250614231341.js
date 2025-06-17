/**
 * Editor.js
 * 完全使用自定义 CRDT（方案B）：用户输入的变更通过 dispatchTransaction 被转换为 CRDT 操作，
 * 然后通过 convertCRDTToProseMirrorDoc() 重建 ProseMirror 文档。
 */

import React, { useEffect, useRef, useState } from "react";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { Schema, Slice, Fragment } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { toggleMark } from "prosemirror-commands";
import {
  ydoc,
  ychars,
  yformatOps,
  insertChar,
  insertText,
  // deleteChar,
  deleteChars,
  addBold,
  removeBold,
  addEm,
  removeEm,
  addLink,
  removeLink,
  loadInitialData,
} from "./CRDT";

import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket"; // 引入 WebSocket Provider
import debounce from "lodash.debounce";
//我们不用ySyncPlugin的Y.XmlFragment同步，而是自己定义了数据结构！
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from "y-prosemirror";
import { UndoManager } from "yjs";
import "prosemirror-view/style/prosemirror.css";
import "./editer.css";
import Toolbar from "../components/Toolbar";
import UserList from "../components/UserList";
import { v4 as uuidv4 } from "uuid";

// import { cursorPlugin, createDecorations } from "./cursor-plugin";

// 定义 ProseMirror Schema

// 辅助函数：判断选区是否已经包含指定 mark

// function syncCursorToProseMirror(awareness, view) {
//   // awareness.on("update", () => {
//   //   const decorations = [];
//   //   awareness.getStates().forEach((state, clientId) => {
//   //     if (state.cursor && state.cursor.anchor !== undefined) {
//   //       const pos = state.cursor.anchor;
//   //       decorations.push(
//   //         Decoration.widget(pos, () => {
//   //           const cursor = document.createElement("span");
//   //           cursor.classList.add("remote-cursor");
//   //           cursor.style.backgroundColor = state.user.color;
//   //           return cursor;
//   //         })
//   //       );
//   //     }
//   //   });

//   //   // 使用 ProseMirror 的装饰 API 更新光标
//   //   const decoSet = DecorationSet.create(view.state.doc, decorations);
//   //   view.dispatch(view.state.tr.setMeta("cursorDecorations", decoSet));
//   // });
//   function updateCursors() {
//     if (!view) return;

//     const decoSet = createDecorations(view.state, awareness);

//     console.log("✨ 更新 cursorDecorations:", decoSet);

//     // 🚀 这里是关键！确保 meta 里有 `cursorDecorations`
//     view.dispatch(view.state.tr.setMeta("cursorDecorations", decoSet));
//   }

//   // **监听 awareness 变化**
//   awareness.on("change", updateCursors);
// }
function getOrCreateUser() {
  // 尝试从 sessionStorage 获取用户身份
  let user = sessionStorage.getItem("myEditorUser");
  if (user) {
    return JSON.parse(user);
  }
  // 如果没有，创建新的用户身份
  user = {
    name: "User" + Math.floor(Math.random() * 100),
    color: "#ffa500", // 或者生成随机颜色
  };
  sessionStorage.setItem("myEditorUser", JSON.stringify(user));
  return user;
}

let undoManager; // 全局变量，用于撤销/重做

export default Editor;
