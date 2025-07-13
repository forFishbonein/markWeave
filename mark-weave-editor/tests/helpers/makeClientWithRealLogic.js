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
  // 为每个客户端创建独立的模块实例
  let ydoc, ychars;
  let insertChar, insertText, deleteChars;
  let addBold, removeBold, addEm, removeEm, addLink, removeLink;

  jestIsolate(() => {
    // 清除模块缓存以获得独立的实例
    delete require.cache[require.resolve("../../src/crdt/index.cjs")];
    delete require.cache[require.resolve("../../src/crdt/crdtActions.cjs")];
    
    const crdtIndex = require("../../src/crdt/index.cjs");
    const { createCRDTActions } = require("../../src/crdt/crdtActions.cjs");
    
    // 重置Y.Doc以确保独立性
    const { ydoc: newYdoc, ychars: newYchars, yformatOps: newYformatOps } = crdtIndex.resetYDoc();
    
    ydoc = newYdoc;
    ychars = newYchars;
    
    // 使用工厂函数创建绑定到特定Y.Doc的操作函数
    const actions = createCRDTActions(newYchars, newYformatOps);
    
    // 重置计数器确保测试隔离
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
