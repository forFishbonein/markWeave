/*
 * @FilePath: index.js
 * @Author: Aron
 * @Date: 2025-03-04 22:28:33
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-12 01:27:14
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/crdt/index.js
import * as Y from "yjs";

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

// 内部变量
let _ydoc = new Y.Doc();
let _ychars = _ydoc.getArray("chars");
let _yformatOps = _ydoc.getArray("formatOps");

// 导出 getter 函数确保总是返回最新的实例
export const getYDoc = () => _ydoc;
export const getYChars = () => _ychars;
export const getYFormatOps = () => _yformatOps;

// 为了兼容现有代码，保留原有导出方式，但使用 Proxy 确保方法调用正确代理
export const ydoc = new Proxy(() => {}, {
  get: (target, prop) => {
    const value = _ydoc[prop];
    // 如果是函数，需要绑定正确的 this 上下文
    if (typeof value === 'function') {
      return value.bind(_ydoc);
    }
    return value;
  },
  set: (target, prop, value) => { 
    _ydoc[prop] = value; 
    return true; 
  },
  has: (target, prop) => prop in _ydoc,
  ownKeys: () => Object.getOwnPropertyNames(_ydoc),
  getOwnPropertyDescriptor: (target, prop) => Object.getOwnPropertyDescriptor(_ydoc, prop),
  apply: (target, thisArg, args) => _ydoc.apply(thisArg, args),
  construct: (target, args) => new _ydoc(...args)
});

export const ychars = new Proxy({}, {
  get: (target, prop) => _ychars[prop],
  set: (target, prop, value) => { _ychars[prop] = value; return true; },
  has: (target, prop) => prop in _ychars,
  ownKeys: () => Object.getOwnPropertyNames(_ychars),
  getOwnPropertyDescriptor: (target, prop) => Object.getOwnPropertyDescriptor(_ychars, prop)
});

export const yformatOps = new Proxy({}, {
  get: (target, prop) => _yformatOps[prop],
  set: (target, prop, value) => { _yformatOps[prop] = value; return true; },
  has: (target, prop) => prop in _yformatOps,
  ownKeys: () => Object.getOwnPropertyNames(_yformatOps),
  getOwnPropertyDescriptor: (target, prop) => Object.getOwnPropertyDescriptor(_yformatOps, prop)
});

/**
 * 重新创建一个全新的 Y.Doc，并更新全局绑定。
 * 在打开新文档时调用，确保不同文档之间内容互不污染。
 */
export function resetYDoc() {
  _ydoc = new Y.Doc();
  _ychars = _ydoc.getArray("chars");
  _yformatOps = _ydoc.getArray("formatOps");
  
  // 通知其他模块更新引用
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ydoc: _ydoc, ychars: _ychars, yformatOps: _yformatOps, resetYDoc };
  }
  
  return { ydoc: _ydoc, ychars: _ychars, yformatOps: _yformatOps };
}
