/*
 * @FilePath: index.js
 * @Author: Aron
 * @Date: 2025-03-04 22:28:33
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-05 21:47:50
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/crdt/index.js
import * as Y from "yjs";

export const ydoc = new Y.Doc();
export const ychars = ydoc.getArray("chars");
export const yformatOps = ydoc.getArray("formatOps");
