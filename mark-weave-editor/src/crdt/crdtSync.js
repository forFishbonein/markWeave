/*
 * @FilePath: crdtSync.js
 * @Author: Aron
 * @Date: 2025-03-04 22:59:57
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-09-03 04:37:13
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import debounce from "lodash.debounce";
import { convertCRDTToProseMirrorDoc } from "./crdtUtils";
import { getYDoc } from "./index";
import * as Y from "yjs";
import { Buffer } from "buffer";
// Sync CRDT data to ProseMirror: completely rely on ydoc update events, using ydoc.on("update") to trigger updates
export function syncToProseMirror(view, docId) {
  const updateEditor = debounce(() => {
    const ydoc = getYDoc();
    const newDoc = convertCRDTToProseMirrorDoc();
    const update = Y.encodeStateAsUpdate(ydoc); // Uint8Array
    const updateB64 = Buffer.from(update).toString("base64");
    // Pass changes to backend, but only for persistent storage, so documents are still there next time opened, not for sync to other users
    fetch("http://localhost:1234/api/doc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: docId,
        // content: ydoc,
        content: updateB64,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Server response:", data);
      })
      .catch((error) => {
        console.error("Request error:", error);
      });
    if (!newDoc || !newDoc.type) {
      console.error(
        "🚨 convertCRDTToProseMirrorDoc() returned invalid Node:",
        newDoc
      );
      return;
    }
    // If document unchanged, can return directly to avoid unnecessary dispatch
    if (view.state.doc.eq(newDoc)) {
      console.log("Document content same, skipping dispatch");
      return;
    }
    // TODO: This output is most valuable for reference!
    console.log(
      "📝 the newDoc (from generated paragraph):",
      newDoc.toJSON()
      // JSON.stringify(newDoc.toJSON(), null, 2)
    ); // 🚀 Check newDoc content

    const tr = view.state.tr;
    // console.log(
    //   "🔍 Document content before replacement:",
    //   view.state.doc.toJSON(),
    //   view.state.doc.content.size,
    //   view.state.tr,
    //   newDoc.content
    // ); // 🚀 See current ProseMirror state
    // console.log("🔍 New document content:", newDoc.content.content[0]);

    tr.replaceWith(0, view.state.doc.content.size, newDoc.content);

    // Set meta to indicate this transaction comes from CRDT sync
    tr.setMeta("fromSync", true);

    // console.log("🔍 Transaction after replacement:", tr);
    // if (tr.curSelectionFor !== 0) {
    view.dispatch(tr);
    // console.log("Latest ydoc", ydoc);
    // }
  }, 50);

  // Listen to entire ydoc updates, as well as deep changes in ychars and yformatOps
  const ydoc = getYDoc();
  ydoc.on("update", updateEditor);
  // ychars.observeDeep(updateEditor); // This will be triggered if remote adds characters
  // yformatOps.observeDeep(updateEditor); // This will be triggered if remote adds operators

  // 🔄 Sync immediately on initialization to prevent missing early remote updates
  // updateEditor();
}
