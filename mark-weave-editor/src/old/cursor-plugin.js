/*
 * @FilePath: cursor-plugin.js
 * @Author: Aron
 * @Date: 2025-02-25 21:32:58
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-08 22:01:44
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

    // **创建光标装饰（带用户名气泡）**
    decorations.push(
      Decoration.widget(
        pos,
        () => {
          const wrapper = document.createElement("span");
          wrapper.style.position = "relative";
          // 用户名气泡
          const label = document.createElement("span");
          label.className = "user-cursor-label";
          label.textContent = name || "User";
          label.style.background = color;
          label.style.color = "#fff";
          label.style.fontSize = "12px";
          label.style.padding = "2px 8px";
          label.style.borderRadius = "8px";
          label.style.position = "absolute";
          label.style.left = "6px";
          label.style.top = "-1.6em";
          label.style.whiteSpace = "nowrap";
          label.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
          label.style.pointerEvents = "none";
          // 仅显示用户名气泡，不显示竖线光标
          wrapper.appendChild(label);
          return wrapper;
        },
        { key: `cursor-${clientID}` }
      )
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
