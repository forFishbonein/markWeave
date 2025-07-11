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
 * 创建一个"真实"客户端：使用 src/crdt 下的 insertChar/insertText/deleteChars 等 API，
 * 且每个客户端拥有自身独立的 Y.Doc（通过 jest.isolateModules + resetYDoc）。
 */
module.exports = function makeClient(id) {
  let crdtIndex;
  let crdtActions;

  jestIsolate(() => {
    crdtIndex = require("../../src/crdt"); // index.js，含 ydoc/ychars/resetYDoc
    crdtActions = require("../../src/crdt/crdtActions");
    crdtIndex.resetYDoc(); // 保证干净
  });

  const { ydoc, ychars } = crdtIndex;
  const {
    insertChar,
    insertText,
    deleteChars,
    addBold,
    removeBold,
    addEm,
    removeEm,
    addLink,
    removeLink,
  } = crdtActions;

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
