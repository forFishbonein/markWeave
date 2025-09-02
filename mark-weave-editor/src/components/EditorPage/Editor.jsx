/*
 * @FilePath: Editor.jsx
 * @Author: Aron
 * @Date: 2025-03-04 22:38:04
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-09-03 04:02:37
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

// Receive docId as props
export default function Editor({ docId }) {
  const editorRef = useRef(null);

  // If no docId passed, generate a new one
  if (!docId) {
    docId = uuidv4();
    console.warn("No docId provided, generating new docId:", docId);
  }

  console.log("Editor component using docId:", docId);

  // Call custom Hook to get editorView
  const [editorView, awareness] = useYjsEditor(docId, editorRef);

  // Business logic: handling Bold/Italic/Link etc. can be placed inside Toolbar
  // Can also pass editorView here to call toggleMark etc.
  const handleBold = () => {
    if (editorView) {
      const state = editorView.state;
      const { from, to } = state.selection;

      console.log("🔥 Bold button clicked");

      if (from === to) {
        console.warn("⚠️ Cannot bold empty selection!");
        return;
      }

      // ✅ Use correct visible index conversion method
      // ProseMirror uses 1-based index [from, to), convert to 0-based [from-1, to-1)
      const { startId, endId } = getVisibleCharOpIds(from - 1, to - 1);

      console.log(`🔵 Bold button operation, ProseMirror position: [${from}, ${to}), converted: [${from - 1}, ${to - 1}), startId: ${startId}, endId: ${endId}`);

      // Use helper function to check if current selection is already bold
      if (markActive(state, schema.marks.bold)) {
        console.log("🔵 Current selection is already bold, calling removeBold");
        // Use "before" when removeBold to avoid canceling one extra character
        removeBold(startId, endId, "before");
      } else {
        console.log("🔵 Current selection is not bold, calling addBold");
        // Use "after" when addBold to ensure all characters in selection are included
        addBold(startId, endId, "after");
      }

      // Call ProseMirror operation to update UI
      toggleMark(schema.marks.bold)(editorView.state, editorView.dispatch);
    }
  };

  const handleItalic = () => {
    if (editorView) {
      const state = editorView.state;
      const { from, to } = state.selection;

      console.log("🔥 Italic button clicked");

      if (from === to) {
        console.warn("⚠️ Cannot italicize empty selection!");
        return;
      }

      // ✅ Use correct visible index conversion method
      // ProseMirror uses 1-based index [from, to), convert to 0-based [from-1, to-1)
      const { startId, endId } = getVisibleCharOpIds(from - 1, to - 1);

      console.log(`🔵 Italic button operation, ProseMirror position: [${from}, ${to}), converted: [${from - 1}, ${to - 1}), startId: ${startId}, endId: ${endId}`);

      if (markActive(state, schema.marks.em)) {
        console.log("🔵 Current selection is already italic, calling removeEm");
        // Use "before" when removeEm to avoid canceling one extra character
        removeEm(startId, endId, "before");
      } else {
        console.log("🔵 Current selection is not italic, calling addEm");
        // Use "after" when addEm to ensure all characters in selection are included
        addEm(startId, endId, "after");
      }

      // Call ProseMirror operation to update UI
      toggleMark(schema.marks.em)(editorView.state, editorView.dispatch);
    }
  };

  const handleLink = () => {
    if (editorView) {
      const url = prompt("Enter link URL:");
      // You can customize link handling logic here
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
