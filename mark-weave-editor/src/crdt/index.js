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

// 🔧 Compatibility with old code: let Y.Map instances directly access .opId/.ch/.deleted fields
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

// Internal variables
let _ydoc = new Y.Doc();
let _ychars = _ydoc.getArray("chars");
let _yformatOps = _ydoc.getArray("formatOps");

// Export getter functions to ensure always return latest instance
export const getYDoc = () => _ydoc;
export const getYChars = () => _ychars;
export const getYFormatOps = () => _yformatOps;

// For compatibility with existing code, keep original export method but use Proxy to ensure correct method call delegation
export const ydoc = new Proxy(() => {}, {
  get: (target, prop) => {
    const value = _ydoc[prop];
    // If it's a function, need to bind correct this context
    if (typeof value === "function") {
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
  getOwnPropertyDescriptor: (target, prop) =>
    Object.getOwnPropertyDescriptor(_ydoc, prop),
  apply: (target, thisArg, args) => _ydoc.apply(thisArg, args),
  construct: (target, args) => new _ydoc(...args),
});

export const ychars = new Proxy(
  {},
  {
    get: (target, prop) => _ychars[prop],
    set: (target, prop, value) => {
      _ychars[prop] = value;
      return true;
    },
    has: (target, prop) => prop in _ychars,
    ownKeys: () => Object.getOwnPropertyNames(_ychars),
    getOwnPropertyDescriptor: (target, prop) =>
      Object.getOwnPropertyDescriptor(_ychars, prop),
  }
);

export const yformatOps = new Proxy(
  {},
  {
    get: (target, prop) => _yformatOps[prop],
    set: (target, prop, value) => {
      _yformatOps[prop] = value;
      return true;
    },
    has: (target, prop) => prop in _yformatOps,
    ownKeys: () => Object.getOwnPropertyNames(_yformatOps),
    getOwnPropertyDescriptor: (target, prop) =>
      Object.getOwnPropertyDescriptor(_yformatOps, prop),
  }
);

/**
 * Recreate a brand new Y.Doc and update global bindings.
 * Called when opening new documents to ensure content isolation between different documents.
 */
export function resetYDoc() {
  _ydoc = new Y.Doc();
  _ychars = _ydoc.getArray("chars");
  _yformatOps = _ydoc.getArray("formatOps");

  // Notify other modules to update references
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      ydoc: _ydoc,
      ychars: _ychars,
      yformatOps: _yformatOps,
      resetYDoc,
    };
  }

  return { ydoc: _ydoc, ychars: _ychars, yformatOps: _yformatOps };
}
