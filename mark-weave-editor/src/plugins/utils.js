/*
 * @FilePath: utils.js
 * @Author: Aron
 * @Date: 2025-03-04 22:45:06
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 22:45:15
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// Helper function: determine if selection already contains specified mark
export function markActive(state, type) {
  const { from, to, empty } = state.selection;

  if (empty) {
    // ✅ Handle cursor position (single character)
    return !!(state.storedMarks || state.selection.$from.marks()).find(
      (mark) => mark.type === type
    );
  } else {
    // ✅ Handle selection
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

    // 🚀 If selection has at least one non-specified mark, return false (means should apply)
    return hasNonMark ? false : hasMark;
  }
}
