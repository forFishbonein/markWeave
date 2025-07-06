/*
 * @FilePath: crdtSync.js
 * @Author: Aron
 * @Date: 2025-03-04 22:59:57
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-07 04:02:50
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import debounce from "lodash.debounce";
import { convertCRDTToProseMirrorDoc } from "./crdtUtils";
import { ydoc } from "./index";
import * as Y from "yjs";
import { Buffer } from "buffer";
// 同步 CRDT 数据到 ProseMirror：完全依靠 ydoc 的更新事件，也就是说利用 ydoc.on("update") 来触发更新
export function syncToProseMirror(view, docId) {
  const updateEditor = debounce(() => {
    const newDoc = convertCRDTToProseMirrorDoc();
    const update = Y.encodeStateAsUpdate(ydoc); // Uint8Array
    const updateB64 = Buffer.from(update).toString("base64");
    //这里把变化传入后端，但是只作为持久化存储，方便下一次打开的时候文档还在，但是不作为向其他用户的同步
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
        console.log("服务器响应：", data);
      })
      .catch((error) => {
        console.error("请求错误：", error);
      });
    if (!newDoc || !newDoc.type) {
      console.error(
        "🚨 convertCRDTToProseMirrorDoc() 返回无效的 Node:",
        newDoc
      );
      return;
    }
    // 如果文档没变化，也可直接 return 避免多余 dispatch
    if (view.state.doc.eq(newDoc)) {
      console.log("文档内容相同，跳过 dispatch");
      return;
    }
    console.log(
      "📝 newDoc:",
      newDoc.toJSON(),
      JSON.stringify(newDoc.toJSON(), null, 2)
    ); // 🚀 检查 newDoc 的内容

    const tr = view.state.tr;
    console.log(
      "🔍 替换前的文档内容:",
      view.state.doc.toJSON(),
      view.state.doc.content.size,
      view.state.tr,
      newDoc.content
    ); // 🚀 看看 ProseMirror 现在的状态
    // console.log("🔍 新的文档内容:", newDoc.content.content[0]);

    tr.replaceWith(0, view.state.doc.content.size, newDoc.content);

    // 设置 meta 表示此交易来自 CRDT 同步
    tr.setMeta("fromSync", true);

    console.log("🔍 替换后的 Transaction:", tr);
    // if (tr.curSelectionFor !== 0) {
    view.dispatch(tr);
    console.log("最新的ydoc", ydoc);

    // }
  }, 50);

  // 监听整个 ydoc 的更新，以及 ychars 和 yformatOps 的深层变化
  ydoc.on("update", updateEditor);
  // ychars.observeDeep(updateEditor); //如果远程增加了字符，会触发这个
  // yformatOps.observeDeep(updateEditor); //如果远程增加了操作符，会触发这个

  // 🔄 初始化时立即同步一次，防止错过早期的远程更新
  // updateEditor();
}
