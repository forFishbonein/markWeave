/*
 * @FilePath: crdtUtils.js
 * @Author: Aron
 * @Date: 2025-03-04 22:28:16
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-09-22 16:48:46
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/crdt/crdtUtils.js
import { schema } from "../plugins/schema"; // Can also be split from Editor file
import { getYChars, getYFormatOps } from "./index";

// Unified property access, compatible with plain objects and Y.Map
const getProp = (obj, key) =>
  typeof obj?.get === "function" ? obj.get(key) : obj[key];

/**
 * Convert ychars and yformatOps from CRDT to ProseMirror doc node
 */
// Custom function: generate ProseMirror document from CRDT data
export function convertCRDTToProseMirrorDoc(docId) {
  const ychars = getYChars();
  const yformatOps = getYFormatOps();

  console.log("🔥 convertCRDTToProseMirrorDoc called");
  console.log(
    "the newest yformatOps: ",
    yformatOps.toArray()
    // yformatOps.toArray().length
  );
  console.log(
    "the newest ychars",
    ychars.toArray()
    // ychars.toArray().length
  );
  // TODO: Because convertCRDTToProseMirrorDoc executes twice, and initially ychars and yformatOps are both 0, causing unexpected execution, using event loop in setTimeout can easily solve this!
  // Achieved data fetching only when document has no content and just initialized, instead of merging with ws data every time causing data doubling! ——> This way we wait for ws data to come in first, then check if we have data, if no data then fetch
  setTimeout(() => {
    //  alert(111);
    if (
      docId &&
      ychars.toArray().length === 0 &&
      yformatOps.toArray().length === 0
    ) {
      // alert(111);
      loadInitialData(docId);
    }
  }, 0);
  const allFormatOps = yformatOps.toArray().flat();
  const paragraphContent = ychars
    .toArray()
    .map((char) => {
      // 如果被删除了就直接返回
      if (getProp(char, "deleted")) return null;

      //获取ch字段
      const chVal = getProp(char, "ch");
      if (!chVal) return null; // Skip empty characters

      // Group by markType
      const markOpsByType = {};
      allFormatOps.forEach((op) => {
        if (isCharWithinMark(char, op)) {
          if (!markOpsByType[op.markType]) {
            markOpsByType[op.markType] = [];
          }
          markOpsByType[op.markType].push(op);
        }
      });
      // console.log("markOpsByType", markOpsByType);
      const effectiveMarks = [];
      for (const markType in markOpsByType) {
        const ops = markOpsByType[markType];

        // Select the last `addMark` and `removeMark` operations
        const lastAddOp = ops
          .filter((op) => op.action === "addMark")
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        const lastRemoveOp = ops
          .filter((op) => op.action === "removeMark")
          .sort((a, b) => b.timestamp - a.timestamp)[0];

        //todo 实现remove-wins的逻辑 **remove-wins logic**
        // 按时间戳排序：分别找到最后的 addMark 和 removeMark 操作
        // Remove-Wins 策略：如果没有删除操作，或者添加操作的时间戳更新，则应用格式
        if (
          !lastRemoveOp ||
          (lastAddOp && lastAddOp.timestamp > lastRemoveOp.timestamp)
        ) {
          if (schema.marks[markType]) {
            if (markType === "link") {
              const attrs = lastAddOp.attrs || {};
              effectiveMarks.push(schema.marks[markType].create(attrs));
            } else {
              effectiveMarks.push(schema.marks[markType].create()); // Most cases go here
            }
          } else {
            console.warn(`⚠️ Unknown markType: ${markType}`);
          }
        }
      }

      if (chVal === "") return null;
      return schema.text(chVal, effectiveMarks);
    })
    .filter((node) => node !== null);

  console.log("✅ Generated paragraph:", paragraphContent);
  return schema.node("doc", null, [
    schema.node("paragraph", null, paragraphContent),
  ]);
}

// ✅ Determine if current character is within `addBold` scope
// function isCharWithinMark(char, op) {
//   // Assume op.start.type should be "before" (mark starts taking effect before this character)
//   // op.end.type being "after" means mark ends at this character, but new characters at this position should not inherit the mark
//   if (op.end && op.end.type === "after") {
//     // Change to <=, let last character be included in range
//     return op.start.opId <= char.opId && char.opId <= op.end.opId;
//   }
//   return op.start.opId <= char.opId && char.opId <= op.end.opId;
// }
export function isCharWithinMark(char, op) {
  const ychars = getYChars();
  const charArray = ychars.toArray();

  // Find actual position index of character in CRDT array
  const charIndex = charArray.findIndex(
    (c) => getProp(c, "opId") === getProp(char, "opId")
  );
  const startIndex = charArray.findIndex(
    (c) => getProp(c, "opId") === op.start.opId
  );
  const endIndex = charArray.findIndex(
    (c) => getProp(c, "opId") === op.end.opId
  );

  // If any index is not found, return false
  if (charIndex === -1 || startIndex === -1 || endIndex === -1) {
    return false;
  }

  // If no explicit type, default start uses "before", end uses "after"
  const startType = op.start?.type || "before";
  const endType = op.end?.type || "after";

  // Determine if "start" boundary is satisfied
  let inStart = false;
  if (startType === "before") {
    // "before" means start before this character → include this character
    inStart = charIndex >= startIndex;
  } else {
    // "after" means start after this character → exclude this character
    inStart = charIndex > startIndex;
  }

  // Determine if "end" boundary is satisfied
  let inEnd = false;
  if (endType === "before") {
    // "before" means end before this character → exclude this character
    inEnd = charIndex < endIndex;
  } else {
    // "after" means end after this character → include this character
    inEnd = charIndex <= endIndex;
  }

  return inStart && inEnd;
}
// If there are other exports like loadInitialData, undoManager, they can also be placed here
export async function loadInitialData(docId) {
  const ychars = getYChars();
  const yformatOps = getYFormatOps();

  // Wait for ws data to come in first, only here can we get the latest data, then check if we have data, if no data then fetch
  if (ychars.toArray().length === 0 && yformatOps.toArray().length === 0) {
    try {
      // Request an interface here, interface address set according to actual situation
      const response = await fetch(
        `http://localhost:1234/api/initial?docId=${docId}`
      );
      if (!response.ok) {
        throw new Error("Network response error");
      }
      let data = await response.json();
      console.log(
        "Retrieved initial data:",
        data,
        ychars.toArray().length, // If there's data, this is not 0
        yformatOps.toArray().length
      );
      data = data.content;
      // Clear current arrays (if content exists) ——> Cannot clear
      // ychars.delete(0, ychars.length);
      // yformatOps.delete(0, yformatOps.length);
      // Write retrieved chars data to ychars
      if (
        data?.chars &&
        Array.isArray(data.chars) &&
        ychars.toArray().length === 0
      ) {
        data.chars.forEach((item) => {
          // Note: Here we use push to put each object into Y.Array
          ychars.push([item]);
        });
      }

      // Write retrieved formatOps data to yformatOps
      if (
        data?.formatOps &&
        Array.isArray(data.formatOps) &&
        yformatOps.toArray().length === 0
      ) {
        data.formatOps.forEach((item) => {
          yformatOps.push([item]);
        });
      }
      // sessionStorage.setItem("needIntial", false);
      console.log(
        "Initial data loading completed:",
        ychars.toArray(),
        yformatOps.toArray()
      );
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  } else {
    console.error("Data exists, no need to load from database!");
  }
}
