/*
 * @FilePath: keymap.js
 * @Author: Aron
 * @Date: 2025-03-04 22:34:02
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-09-03 04:07:05
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import { keymap } from "prosemirror-keymap";
import { toggleMark } from "prosemirror-commands";
import { schema } from "./schema"; // Can also extract schema
import {
  addBold,
  removeBold,
  addEm,
  removeEm,
  addLink,
  removeLink,
  getVisibleCharOpIds,
  deleteChars,
} from "../crdt/crdtActions";
import { markActive } from "./utils";
// Define shortcuts, only handle italic and bold general operations
// Pass undoManager as parameter here
export function createKeymap(undoManager) {
  return keymap({
    // If you want to call custom addBold, you can bind it here
    // "Mod-b": toggleMark(schema.marks.bold),
    "Mod-b": (state, dispatch) => {
      console.log("🔥 Cmd + B was pressed");
      const { from, to, empty } = state.selection;
      console.log("empty", empty);
      if (from === to) {
        console.warn("⚠️ Cannot bold empty selection!");
        return false;
      }
      // ✅ Use correct visible index conversion method
      const { startId, endId } = getVisibleCharOpIds(from - 1, to);
      console.log(`🔵 Trigger Bold operation, startId: ${startId}, endId: ${endId}`);
      // if (startId && endId) {
      //   // Here you can decide whether to add bold or cancel bold based on some conditions,
      //   // For example, assuming we always toggle operations (here simply call removeBold first, then call toggleMark)
      //   // You can implement more fine-grained logic: if current selection is already bold, call removeBold, otherwise call addBold.

      //   // Example: first call removeBold (assuming current selection is already bold)
      //   removeBold(startId, endId);

      //   // Then call built-in toggleMark to immediately show effect (if needed)
      //   return toggleMark(schema.marks.bold)(state, dispatch);
      // }
      // console.log("state.doc.content.size", state.doc.content.size - 1, to);
      // Determine if at document end
      const isAtEnd = to === state.doc.content.size - 1; //-1 is the end index!
      console.log("isAtEnd", isAtEnd);
      // If at end, we want end boundary to include that character, i.e. "after"
      const boundaryType = isAtEnd ? "after" : "before";
      // Use helper function to check if current selection is already bold
      if (markActive(state, schema.marks.bold)) {
        console.log("🔵 Current selection is already bold, calling removeBold");
        removeBold(startId, endId, boundaryType);
      } else {
        console.log("🔵 Current selection is not bold, calling addBold");
        addBold(startId, endId, boundaryType);
        // addBold("1@client", "2@client"); // test data
      }
      // Finally call built-in toggleMark to immediately update UI
      return toggleMark(schema.marks.bold)(state, dispatch);
      // return true;
    },
    "Mod-i": (state, dispatch) => {
      console.log("🔥 Cmd + I was pressed");
      const { from, to, empty } = state.selection;
      if (from === to) {
        console.warn("⚠️ Cannot italicize empty selection!");
        return false;
      }
      // ✅ Use correct visible index conversion method
      const { startId, endId } = getVisibleCharOpIds(from - 1, to);
      console.log(`🔵 Trigger Italic operation, startId: ${startId}, endId: ${endId}`);
      // Determine if at document end
      const isAtEnd = to === state.doc.content.size - 1; //-1 is the end index!
      console.log("isAtEnd", isAtEnd);
      // If at end, we want end boundary to include that character, i.e. "after"
      const boundaryType = isAtEnd ? "after" : "before";
      if (markActive(state, schema.marks.em)) {
        console.log("🔵 Current selection is already italic, calling removeEm");
        removeEm(startId, endId, boundaryType);
      } else {
        console.log("🔵 Current selection is not italic, calling addEm");
        addEm(startId, endId, boundaryType);
      }
      return toggleMark(schema.marks.em)(state, dispatch);
    },
    "Mod-k": (state, dispatch) => {
      console.log("🔥 Cmd + K was pressed");
      const { from, to, empty } = state.selection;
      if (from === to) {
        console.warn("⚠️ Cannot set link on empty selection!");
        return false;
      }
      // Prompt user to input link address
      let href = "";
      if (!markActive(state, schema.marks.link)) {
        href = prompt("Please enter link address:");
        if (!href) return false;
      }

      // ✅ Use correct visible index conversion method
      const { startId, endId } = getVisibleCharOpIds(from - 1, to);
      console.log(`🔵 Link operation, startId: ${startId}, endId: ${endId}`);
      // Determine if at document end
      const isAtEnd = to === state.doc.content.size - 1; //-1 is the end index!
      console.log("isAtEnd", isAtEnd);
      // If at end, we want end boundary to include that character, i.e. "after"
      const boundaryType = isAtEnd ? "after" : "before";
      // Based on whether current selection has link, decide to call removeLink or addLink
      if (markActive(state, schema.marks.link)) {
        console.log("🔵 Current selection has link, call removeLink");
        removeLink(startId, endId, boundaryType);
      } else {
        console.log("🔵 Current selection has no link, call addLink", href);
        addLink(startId, endId, href, boundaryType);
      }
      return toggleMark(schema.marks.link)(state, dispatch);
    },
    "Mod-z": (state, dispatch) => {
      console.log("🔥 Cmd+Z was pressed");
      // Call UndoManager.undo() to undo operation
      undoManager.undo();
      return true;
    },
    "Mod-Shift-z": (state, dispatch) => {
      console.log("🔥 Cmd+Shift+Z was pressed");
      // Call UndoManager.redo() to redo operation
      undoManager.redo();
      return true;
    },
    Backspace: (state, dispatch) => {
      const { from, to } = state.selection;

      // If has selection, normally delete selection content
      if (from !== to) {
        deleteChars(from, to);
        return false; // Let ProseMirror continue processing
      }

      // Single character deletion (cursor position)
      if (from > 1) {
        // Delete one character before cursor
        deleteChars(from - 1, from);
        return false; // Let ProseMirror continue processing
      } else {
        // At document start position, cannot delete
        return true; // Prevent ProseMirror default behavior
      }
    },
    Delete: (state, dispatch) => {
      const { from, to } = state.selection;

      // If has selection, normally delete selection content
      if (from !== to) {
        deleteChars(from, to);
        return false; // Let ProseMirror continue processing
      }

      // singlecharacterdelete（光标位置后）
      const docSize = state.doc.content.size;
      if (from < docSize) {
        // delete光标后的一characters
        deleteChars(from, from + 1);
        return false; // Let ProseMirror continue processing
      } else {
        // atDocumentsend，不能delete
        return true; // Prevent ProseMirror default behavior
      }
    },
  });
}
