/*
 * @FilePath: cursor-plugin.js
 * @Author: Aron
 * @Date: 2025-02-25 21:32:58
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-02-25 21:32:59
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// 🟢 生成光标装饰
export function createDecorations(state, awareness) {
  const decorations = [];

  awareness.getStates().forEach((userState, clientID) => {
    if (!userState || !userState.cursor) return;

    const { pos, color, name } = userState.cursor;

    console.log(
      `🎯 创建光标装饰 - 用户: ${name}, 位置: ${pos}, 颜色: ${color}`
    );

    // **确保 pos 在合法范围内**
    const docSize = state.doc.content.size;
    if (pos < 0 || pos > docSize) {
      console.warn(`⚠️ 光标位置超出范围: ${pos}, 文档大小: ${docSize}`);
      return;
    }

    // **创建光标装饰**
    decorations.push(
      Decoration.widget(pos, () => {
        const cursorEl = document.createElement("span");
        cursorEl.className = "user-cursor";
        cursorEl.style.borderLeft = `2px solid ${color}`;
        cursorEl.style.marginLeft = "-1px";
        cursorEl.style.paddingLeft = "1px";
        cursorEl.style.position = "absolute";
        cursorEl.style.height = "100%";
        return cursorEl;
      })
    );
  });

  return DecorationSet.create(state.doc, decorations);
}

// 🟢 创建 ProseMirror 插件
export function cursorPlugin(awareness) {
  return new Plugin({
    state: {
      init(_, state) {
        return createDecorations(state, awareness);
      },
      apply(tr, oldDecoSet, oldState, newState) {
        const cursorDecorations = tr.getMeta("cursorDecorations");
        return cursorDecorations || oldDecoSet;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}
