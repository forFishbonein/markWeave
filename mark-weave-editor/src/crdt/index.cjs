/*
 * CommonJS wrapper for CRDT index module
 * Used by tests to properly isolate Y.Doc instances
 */
const Y = require("yjs");

// 🔧 兼容旧代码：让 Y.Map 实例可直接通过 .opId/.ch/.deleted 访问字段
["opId", "ch", "deleted"].forEach((k) => {
  if (!Object.getOwnPropertyDescriptor(Y.Map.prototype, k)) {
    Object.defineProperty(Y.Map.prototype, k, {
      get() {
        return this.get(k);
      },
      set(v) {
        this.set(k, v);
      },
    });
  }
});

// 使用 let 以便在切换文档时重新创建
let ydoc = new Y.Doc();
let ychars = ydoc.getArray("chars");
let yformatOps = ydoc.getArray("formatOps");

/**
 * 重新创建一个全新的 Y.Doc，并更新全局绑定。
 * 在打开新文档时调用，确保不同文档之间内容互不污染。
 */
function resetYDoc() {
  ydoc = new Y.Doc();
  ychars = ydoc.getArray("chars");
  yformatOps = ydoc.getArray("formatOps");
  
  return { ydoc, ychars, yformatOps };
}

module.exports = {
  get ydoc() { return ydoc; },
  get ychars() { return ychars; },
  get yformatOps() { return yformatOps; },
  resetYDoc
};