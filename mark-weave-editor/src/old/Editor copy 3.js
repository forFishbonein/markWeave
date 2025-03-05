/*
 * @FilePath: Editor copy 3.js
 * @Author: Aron
 * @Date: 2025-03-04 22:27:28
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 22:56:47
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
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
import "./editer.css";
import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket"; // 引入 WebSocket Provider
import debounce from "lodash.debounce";
//我们不用ySyncPlugin的Y.XmlFragment同步，而是自己定义了数据结构！
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from "y-prosemirror";
import { UndoManager } from "yjs";
import "prosemirror-view/style/prosemirror.css";
import Toolbar from "../components/Toolbar";
import UserList from "../components/UserList";
import { v4 as uuidv4 } from "uuid";

// import { cursorPlugin, createDecorations } from "./cursor-plugin";

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
    bold: {
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
    link: {
      attrs: {
        href: { default: "" },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom) {
            return { href: dom.getAttribute("href") };
          },
        },
      ],
      toDOM(node) {
        return ["a", { href: node.attrs.href, class: "link" }, 0];
      },
    },
    // comment: {
    //   attrs: {
    //     id: {},
    //   },
    //   inclusive: false,
    //   parseDOM: [
    //     {
    //       tag: "span.comment",
    //       getAttrs(dom) {
    //         return { id: dom.getAttribute("data-id") };
    //       },
    //     },
    //   ],
    //   toDOM(node) {
    //     return ["span", { "data-id": node.attrs.id, class: "comment" }, 0];
    //   },
    // },
  },
});

// 定义快捷键，仅处理斜体和加粗等常规操作
const richTextKeymap = keymap({
  // 此处如果希望调用自定义 addBold，可在此绑定
  // "Mod-b": toggleMark(schema.marks.bold),
  "Mod-b": (state, dispatch) => {
    console.log("🔥 Cmd + B 被按下");
    const { from, to, empty } = state.selection;
    console.log("empty", empty);
    if (from === to) {
      console.warn("⚠️ 不能在空选区加粗！");
      return false;
    }
    const chars = ychars.toArray();
    // 获取选区开始和结束对应的 opId
    const startId = chars[from - 1]?.opId || null;
    const endId =
      chars[to - 1]?.opId ||
      (chars.length > 0 ? chars[chars.length - 1]?.opId : null);
    console.log(`🔵 触发 Bold 操作, startId: ${startId}, endId: ${endId}`);
    // if (startId && endId) {
    //   // 这里你可以根据一些判断条件来决定是添加 bold 还是取消 bold，
    //   // 例如，假设我们总是切换操作（这里简单地先调用 removeBold，然后调用 toggleMark）
    //   // 你可以实现更细粒度的逻辑：如果当前选区已经是 bold，则调用 removeBold，否则调用 addBold。

    //   // 示例：先调用 removeBold（假设当前选区已经 bold）
    //   removeBold(startId, endId);

    //   // 再调用内置 toggleMark 来立即显示效果（如果需要）
    //   return toggleMark(schema.marks.bold)(state, dispatch);
    // }
    // console.log("state.doc.content.size", state.doc.content.size - 1, to);
    // 判断是否在文档末尾
    const isAtEnd = to === state.doc.content.size - 1; //-1 就是末尾的索引了！
    console.log("isAtEnd", isAtEnd);
    // 如果在末尾，我们希望结束边界包含该字符，即 "after"
    const boundaryType = isAtEnd ? "after" : "before";
    // 使用辅助函数判断当前选区是否已经是 bold
    if (markActive(state, schema.marks.bold)) {
      console.log("🔵 当前选区已经加粗，调用 removeBold");
      removeBold(startId, endId, boundaryType);
    } else {
      console.log("🔵 当前选区未加粗，调用 addBold");
      addBold(startId, endId, boundaryType);
      // addBold("1@client", "2@client"); // test data
    }
    // 最后调用内置 toggleMark 立即更新 UI
    return toggleMark(schema.marks.bold)(state, dispatch);
    // return true;
  },
  "Mod-i": (state, dispatch) => {
    console.log("🔥 Cmd + I 被按下");
    const { from, to, empty } = state.selection;
    if (from === to) {
      console.warn("⚠️ 不能在空选区斜体！");
      return false;
    }
    const chars = ychars.toArray();
    const startId = chars[from - 1]?.opId || null;
    const endId =
      chars[to - 1]?.opId ||
      (chars.length > 0 ? chars[chars.length - 1]?.opId : null);
    console.log(`🔵 触发 Italic 操作, startId: ${startId}, endId: ${endId}`);
    // 判断是否在文档末尾
    const isAtEnd = to === state.doc.content.size - 1; //-1 就是末尾的索引了！
    console.log("isAtEnd", isAtEnd);
    // 如果在末尾，我们希望结束边界包含该字符，即 "after"
    const boundaryType = isAtEnd ? "after" : "before";
    if (markActive(state, schema.marks.em)) {
      console.log("🔵 当前选区已经斜体，调用 removeEm");
      removeEm(startId, endId, boundaryType);
    } else {
      console.log("🔵 当前选区未斜体，调用 addEm");
      addEm(startId, endId, boundaryType);
    }
    return toggleMark(schema.marks.em)(state, dispatch);
  },
  "Mod-k": (state, dispatch) => {
    console.log("🔥 Cmd + K 被按下");
    const { from, to, empty } = state.selection;
    if (from === to) {
      console.warn("⚠️ 不能在空选区设置链接！");
      return false;
    }
    // 提示用户输入链接地址
    let href = "";
    if (!markActive(state, schema.marks.link)) {
      href = prompt("请输入链接地址:");
      if (!href) return false;
    }

    const chars = ychars.toArray();
    // 获取选区开始和结束对应的 opId（注意 ProseMirror 位置是 1-based，而 ychars 是 0-based）
    const startId = chars[from - 1]?.opId || null;
    const endId =
      chars[to - 1]?.opId ||
      (chars.length > 0 ? chars[chars.length - 1]?.opId : null);
    console.log(`🔵 Link 操作, startId: ${startId}, endId: ${endId}`);
    // 判断是否在文档末尾
    const isAtEnd = to === state.doc.content.size - 1; //-1 就是末尾的索引了！
    console.log("isAtEnd", isAtEnd);
    // 如果在末尾，我们希望结束边界包含该字符，即 "after"
    const boundaryType = isAtEnd ? "after" : "before";
    // 根据当前选区是否已有链接，决定调用 removeLink 或 addLink
    if (markActive(state, schema.marks.link)) {
      console.log("🔵 当前选区已有链接，调用 removeLink");
      removeLink(startId, endId, boundaryType);
    } else {
      console.log("🔵 当前选区没有链接，调用 addLink", href);
      addLink(startId, endId, href, boundaryType);
    }
    return toggleMark(schema.marks.link)(state, dispatch);
  },
  "Mod-z": (state, dispatch) => {
    console.log("🔥 Cmd+Z 被按下");
    // 调用 UndoManager.undo() 撤销操作
    undoManager.undo();
    return true;
  },
  "Mod-Shift-z": (state, dispatch) => {
    console.log("🔥 Cmd+Shift+Z 被按下");
    // 调用 UndoManager.redo() 重做操作
    undoManager.redo();
    return true;
  },
});
// 辅助函数：判断选区是否已经包含指定 mark
function markActive(state, type) {
  const { from, to, empty } = state.selection;

  if (empty) {
    // ✅ 处理光标位置（单字符）
    return !!(state.storedMarks || state.selection.$from.marks()).find(
      (mark) => mark.type === type
    );
  } else {
    // ✅ 处理选区
    let hasNonMark = false;
    let hasMark = false;

    state.doc.nodesBetween(from, to, (node) => {
      if (node.isText) {
        if (node.marks.some((mark) => mark.type === type)) {
          hasMark = true;
        } else {
          hasNonMark = true;
        }
      }
    });

    // 🚀 如果选区中有至少一个非指定 mark，则返回 false（意味着应该 apply）
    return hasNonMark ? false : hasMark;
  }
}

// 自定义函数：从 CRDT 数据生成 ProseMirror 文档
// function convertCRDTToProseMirrorDoc() {
//   // 扁平化 yformatOps 数组，得到所有的 mark 操作对象
//   const allFormatOps = yformatOps.toArray().flat();
//   const paragraphContent = ychars
//     .toArray()
//     .map((char) => {
//       if (char.deleted) return null;

//       // 按 markType 分组
//       const markOpsByType = {};
//       allFormatOps.forEach((op) => {
//         if (isCharWithinMark(char, op)) {
//           if (!markOpsByType[op.markType]) {
//             markOpsByType[op.markType] = [];
//           }
//           markOpsByType[op.markType].push(op);
//         }
//       });

//       const effectiveMarks = [];
//       // 对每个 markType，采用 remove-wins 策略
//       for (const markType in markOpsByType) {
//         const ops = markOpsByType[markType];
//         // 如果存在 removeMark 操作，则取消该 mark
//         const hasRemove = ops.some((op) => op.action === "removeMark");
//         if (!hasRemove) {
//           if (schema.marks[markType]) {
//             // 如果是 link，则需要传入 attrs，例如 href
//             if (markType === "link") {
//               // 这里假设最后一个 addMark 操作生效
//               const lastOp = ops[ops.length - 1];
//               const attrs = lastOp.attrs || {};
//               effectiveMarks.push(schema.marks[markType].create(attrs));
//             } else {
//               effectiveMarks.push(schema.marks[markType].create());
//             }
//           } else {
//             console.warn(`⚠️ 未知的 markType: ${markType}`);
//           }
//         }
//       }

//       // 如果字符内容为空，则返回 null（也可以改成空格）
//       if (char.ch === "") return null;

//       return schema.text(char.ch, effectiveMarks);
//     })
//     .filter((node) => node !== null);

//   console.log("✅ 生成的段落:", paragraphContent);
//   return schema.node("doc", null, [
//     schema.node("paragraph", null, paragraphContent),
//   ]);
// }
function convertCRDTToProseMirrorDoc(docId) {
  console.log(
    "🔥 convertCRDTToProseMirrorDoc 被调用：",
    yformatOps.toArray(),
    ychars.toArray(),
    yformatOps.toArray().length,
    ychars.toArray().length
  );
  // tODO  因为这里convertCRDTToProseMirrorDoc会执行两次，而最开始ychars和yformatOps都为 0，会导致意外执行，所以利用事件循环放到set Timeout 里面执行就可以很轻松解决了！
  //达到了只在文档没有内容，刚刚初始化的时候进行数据获取，而不是每次都和 ws 里面的数据合并导致每次数据翻倍了！！！——> 这样就是先等 ws 数据放进来，然后我们看有没有数据，没有数据再去获取
  setTimeout(() => {
    if (
      docId &&
      ychars.toArray().length === 0 &&
      yformatOps.toArray().length === 0
    ) {
      loadInitialData(docId);
    }
  }, 0);
  const allFormatOps = yformatOps.toArray().flat();
  const paragraphContent = ychars
    .toArray()
    .map((char) => {
      if (char.deleted) return null;

      // 按 markType 分组
      const markOpsByType = {};
      allFormatOps.forEach((op) => {
        if (isCharWithinMark(char, op)) {
          if (!markOpsByType[op.markType]) {
            markOpsByType[op.markType] = [];
          }
          markOpsByType[op.markType].push(op);
        }
      });
      // console.log("markOpsByType", markOpsByType);
      const effectiveMarks = [];
      for (const markType in markOpsByType) {
        const ops = markOpsByType[markType];

        // 选出最后一个 `addMark` 和 `removeMark` 操作
        const lastAddOp = ops
          .filter((op) => op.action === "addMark")
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        const lastRemoveOp = ops
          .filter((op) => op.action === "removeMark")
          .sort((a, b) => b.timestamp - a.timestamp)[0];

        // **remove-wins 逻辑**
        if (
          !lastRemoveOp ||
          (lastAddOp && lastAddOp.timestamp > lastRemoveOp.timestamp)
        ) {
          if (schema.marks[markType]) {
            if (markType === "link") {
              const attrs = lastAddOp.attrs || {};
              effectiveMarks.push(schema.marks[markType].create(attrs));
            } else {
              effectiveMarks.push(schema.marks[markType].create()); //大多数走的是这里
            }
          } else {
            console.warn(`⚠️ 未知的 markType: ${markType}`);
          }
        }
      }

      if (char.ch === "") return null;
      return schema.text(char.ch, effectiveMarks);
    })
    .filter((node) => node !== null);

  console.log("✅ 生成的段落:", paragraphContent);
  return schema.node("doc", null, [
    schema.node("paragraph", null, paragraphContent),
  ]);
}

// ✅ 判断当前字符是否在 `addBold` 作用的范围内
// function isCharWithinMark(char, op) {
//   // 假设 op.start.type 应该是 "before"（即标记从该字符前开始生效）
//   // op.end.type 为 "after" 表示标记到该字符结束，但新字符在此位置不应继承标记
//   if (op.end && op.end.type === "after") {
//     // 改为 <=，让最后一个字符包含在范围内
//     return op.start.opId <= char.opId && char.opId <= op.end.opId;
//   }
//   return op.start.opId <= char.opId && char.opId <= op.end.opId;
// }
function isCharWithinMark(char, op) {
  // 如果没有显式的 type，默认 start 用 "before"，end 用 "after"
  const startType = op.start?.type || "before";
  const endType = op.end?.type || "after";

  // 判断是否满足“起始”边界
  let inStart = false;
  if (startType === "before") {
    // “before”表示从此字符之前开始 → 包含该字符 //按 字典序 进行比较（因为字符串里面都是数字，而@client 这部分是相同的，在实际比较时，它不会影响最终结果）
    inStart = char.opId >= op.start.opId;
  } else {
    // “after”表示从此字符之后开始 → 不包含该字符
    inStart = char.opId > op.start.opId;
  }

  // 判断是否满足“结束”边界
  let inEnd = false;
  if (endType === "before") {
    // “before”表示在此字符之前结束 → 不包含该字符
    inEnd = char.opId < op.end.opId;
  } else {
    // “after”表示在此字符之后结束 → 包含该字符
    inEnd = char.opId <= op.end.opId;
  }

  return inStart && inEnd;
}

// 同步 CRDT 数据到 ProseMirror：完全依靠 ydoc 的更新事件，也就是说利用 ydoc.on("update") 来触发更新
function syncToProseMirror(view, docId) {
  const updateEditor = debounce(() => {
    const newDoc = convertCRDTToProseMirrorDoc();
    fetch("http://localhost:1235/api/doc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: docId,
        content: ydoc,
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
}
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
const Editor = () => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [editorView, setEditorView] = useState(null);
  const [awareness, setAwareness] = useState(null);

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
  console.log("当前文档ID:", docId);
  useEffect(() => {
    // if (sessionStorage.getItem("needIntial")) {
    // }
    // 使用 WebsocketProvider 实现多人同步
    // const provider = new WebsocketProvider(
    //   "wss://demos.yjs.dev",
    //   "my-room-id",
    //   ydoc
    // );
    // const provider = new WebsocketProvider(
    //   "ws://localhost:1234",
    //   "room1",
    //   ydoc
    // );
    const provider = new WebsocketProvider(
      "ws://localhost:1235", // 如果使用 HTTPS，则改为 wss://your-backend-domain.com:1234
      // "room1",
      docId,
      ydoc
    );
    // 可选：设置 Awareness 信息，用于显示多用户光标
    // const awareness = new Awareness(ydoc);
    // provider.awareness = awareness;
    // 假设 provider.awareness 是你的 awareness 对象
    provider.awareness.setLocalStateField("removeTimeout", 1000); // 设置为 1 秒（示例值）

    const aw = provider.awareness;
    // 设置当前用户状态
    // aw.setLocalStateField("user", {
    //   name: "User" + Math.floor(Math.random() * 100),
    //   color: "#ffa500",
    // });
    // const user = getOrCreateUser();
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
    // awareness.setLocalStateField("user", {
    //   name: "User" + Math.floor(Math.random() * 100),
    //   color: "#ffa500",
    // });
    console.log("awareness", aw);
    provider.on("status", (event) => {
      // console.log("✅ WebSocket 连接成功，注册 yCursorPlugin");
      console.log("✅ WebSocket状态：", event.status);
    });
    // 创建 UndoManager，监听 ychars 和 yformatOps
    undoManager = new UndoManager([ychars, yformatOps]);
    if (editorRef.current && !viewRef.current) {
      // 注意：不使用 ySyncPlugin！我们自己管理 CRDT 同步
      // 初始化一个空的 ProseMirror 文档（可以先从 CRDT 中生成，如果为空则会自动填充空格）
      const initialDoc = convertCRDTToProseMirrorDoc(docId);
      console.log("initialDoc：", initialDoc);
      const state = EditorState.create({
        schema,
        doc: initialDoc,
        // plugins: [richTextKeymap, cursorPlugin(awareness)],
        plugins: [richTextKeymap],
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

                // ✅ 传递 afterId，在正确的位置插入字符
                // insertChar(afterId, text);
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
                // for (let i = step.from; i < step.to; i++) {
                //   const charIndex = i - 1; // ProseMirror 位置是 1-based，而 ychars 是 0-based
                //   const chars = ychars.toArray();
                //   if (charIndex >= 0 && charIndex < chars.length) {
                //     console.log("🗑️ 删除字符:", chars[charIndex]);
                //     deleteChar(chars[charIndex].opId);
                //   }
                // }
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
      setEditorView(view);
      // console.log("view111", view);
      syncToProseMirror(view, docId);
      // syncCursorToProseMirror(awareness, view);
    }
    //自己管理 awareness 里的光标，不需要 yCursorPlugin

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
      ydoc.off("update");
      provider.destroy();
      // 等待连接状态为 "connected" 或 "disconnected" 后再销毁
      // if (provider.ws && provider.ws.readyState === WebSocket.CONNECTING) {
      //   setTimeout(() => {
      //     try {
      //       provider.destroy();
      //     } catch (error) {
      //       console.warn("销毁 provider 时发生错误：", error);
      //     }
      //   }, 1000);
      // } else {
      //   try {
      //     provider.destroy();
      //   } catch (error) {
      //     console.warn("销毁 provider 时发生错误：", error);
      //   }
      // }
    };
  }, []);
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
  // return <div ref={editorRef} className='ProseMirror' />;
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
};

export default Editor;
