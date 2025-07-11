/*
 * @FilePath: keymap.js
 * @Author: Aron
 * @Date: 2025-03-04 22:34:02
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-12 01:43:24
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import { keymap } from "prosemirror-keymap";
import { toggleMark } from "prosemirror-commands";
import { schema } from "./schema"; // 也可以拆出 schema
import {
  addBold,
  removeBold,
  addEm,
  removeEm,
  addLink,
  removeLink,
} from "../crdt/crdtActions";
import { ychars } from "../crdt";
import { markActive } from "./utils";
// 定义快捷键，仅处理斜体和加粗等常规操作
// 这里把 undoManager 作为参数
export function createKeymap(undoManager) {
  return keymap({
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
}
