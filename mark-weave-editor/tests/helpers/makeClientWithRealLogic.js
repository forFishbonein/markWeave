/*
 * @FilePath: makeClientWithRealLogic.js
 * @Author: Aron
 * @Date: 2025-07-12 01:47:13
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-12 02:06:18
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
const Y = require("yjs");
const jestIsolate =
  (global.jest && global.jest.isolateModules) || ((fn) => fn());

/**
 * Create a "real" client: use insertChar/insertText/deleteChars APIs from src/crdt,
 * and each client has its own independent Y.Doc (via jest.isolateModules + resetYDoc).
 */
module.exports = function makeClient(id) {
  // Create independent module instance for each client
  let ydoc, ychars;
  let insertChar, insertText, deleteChars;
  let addBold, removeBold, addEm, removeEm, addLink, removeLink;

  jestIsolate(() => {
    // Clear module cache to get independent instance
    delete require.cache[require.resolve("../../src/crdt/index.cjs")];
    delete require.cache[require.resolve("../../src/crdt/crdtActions.cjs")];

    const crdtIndex = require("../../src/crdt/index.cjs");
    const { createCRDTActions } = require("../../src/crdt/crdtActions.cjs");

    // Reset Y.Doc to ensure independence
    const {
      ydoc: newYdoc,
      ychars: newYchars,
      yformatOps: newYformatOps,
    } = crdtIndex.resetYDoc();

    ydoc = newYdoc;
    ychars = newYchars;

    // Use factory function to create operation functions bound to specific Y.Doc
    const actions = createCRDTActions(newYchars, newYformatOps);

    // Reset counter to ensure test isolation
    actions.resetCounters();

    insertChar = actions.insertChar;
    insertText = actions.insertText;
    deleteChars = actions.deleteChars;
    addBold = actions.addBold;
    removeBold = actions.removeBold;
    addEm = actions.addEm;
    removeEm = actions.removeEm;
    addLink = actions.addLink;
    removeLink = actions.removeLink;
  });

  return {
    id,
    ydoc,
    ychars,
    insertChar,
    insertText,
    deleteChars,
    addBold,
    removeBold,
    addEm,
    removeEm,
    addLink,
    removeLink,
    encode: () => Y.encodeStateAsUpdate(ydoc),
    apply: (u) => Y.applyUpdate(ydoc, u),
    snapshot: () =>
      ychars
        .toArray()
        .filter((c) => {
          const del =
            typeof c?.get === "function" ? c.get("deleted") : c.deleted;
          return !del;
        })
        .map((c) => (typeof c?.get === "function" ? c.get("ch") : c.ch))
        .join(""),
  };
};
