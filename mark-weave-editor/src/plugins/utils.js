/*
 * @FilePath: utils.js
 * @Author: Aron
 * @Date: 2025-03-04 22:45:06
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 22:45:15
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// 辅助函数：判断选区是否已经包含指定 mark
export function markActive(state, type) {
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
