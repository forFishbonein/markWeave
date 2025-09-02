/*
 * @FilePath: crdtActions.js
 * @Author: Aron
 * @Date: 2025-03-04 22:28:27
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-08-05 23:12:24
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/crdt/crdtActions.js
import { getYDoc, getYChars, getYFormatOps } from "./index";
import * as Y from "yjs";

// 🔧 Unified property access, compatible with plain objects and Y.Map
function getProp(obj, key) {
  return typeof obj?.get === "function" ? obj.get(key) : obj[key];
}

let localCounter = 0; // To ensure multiple characters inserted in same millisecond remain ordered
let formatOpCounter = 0; // To ensure uniqueness of format operations

// 🔧 Add opId parsing and comparison functions
function parseOpId(opId) {
  const parts = opId.split("@");
  const timestampPart = parts[0];
  const userId = parts[1] || "client";

  // Parse timestamp and counter
  const timestampParts = timestampPart.split("_");
  const timestamp = parseInt(timestampParts[0]);
  const counter = timestampParts.length > 1 ? parseInt(timestampParts[1]) : 0;

  return { timestamp, counter, userId };
}

function compareOpIds(opId1, opId2) {
  // Check if it's old format (no underscore)
  const isOldFormat1 = !opId1.includes("_");
  const isOldFormat2 = !opId2.includes("_");

  if (isOldFormat1 && isOldFormat2) {
    // Both old format, use simple timestamp comparison
    const timestamp1 = parseInt(opId1.split("@")[0]);
    const timestamp2 = parseInt(opId2.split("@")[0]);
    return timestamp1 - timestamp2;
  }

  if (isOldFormat1 || isOldFormat2) {
    // Mixed format, old format takes priority (backward compatibility)
    return isOldFormat1 ? -1 : 1;
  }

  // Both new format, use complete parsing
  const parsed1 = parseOpId(opId1);
  const parsed2 = parseOpId(opId2);

  if (parsed1.timestamp !== parsed2.timestamp) {
    return parsed1.timestamp - parsed2.timestamp;
  }

  if (parsed1.counter !== parsed2.counter) {
    return parsed1.counter - parsed2.counter;
  }

  return parsed1.userId.localeCompare(parsed2.userId);
}

// 2️⃣ Insert character
export function insertChar(afterId, ch, awareness = null) {
  const ychars = getYChars();

  // Get user identifier
  let userId = "unknown";
  if (awareness) {
    const localState = awareness.getLocalState();
    userId = localState?.user?.id || localState?.user?.name || "unknown";
  }

  const opId = `${Date.now()}_${localCounter}@${userId}`;
  localCounter += 1; // Increment counter to ensure characters in same millisecond remain sortable

  const newChar = new Y.Map();
  newChar.set("opId", opId);
  newChar.set("ch", ch);
  newChar.set("deleted", false);
  newChar.set("userId", userId);

  let index;
  if (afterId) {
    // Find position of afterId character
    const afterIndex = ychars
      .toArray()
      .findIndex((c) => getProp(c, "opId") === afterId);
    if (afterIndex === -1) {
      console.warn(`⚠️ afterId ${afterId} not found, inserting at beginning`);
      index = 0;
    } else {
      // Insert after afterId, directly insert at afterId+1 position
      index = afterIndex + 1;
    }
  } else {
    // When afterId is null, insert at beginning but consider timestamp ordering
    const currentOpId = opId;
    const chars = ychars.toArray();
    let insertIndex = 0;

    // Search backward until finding character with larger opId
    while (insertIndex < chars.length) {
      const nextChar = chars[insertIndex];
      const nextOpId = getProp(nextChar, "opId");

      // Use intelligent comparison function
      if (compareOpIds(nextOpId, currentOpId) > 0) {
        break;
      }
      insertIndex++;
    }

    index = insertIndex;
  }

  ychars.insert(index, [newChar]);
}

export function insertText(afterId, text, awareness = null) {
  const ychars = getYChars();

  // Get user identifier
  let userId = "unknown";
  if (awareness) {
    const localState = awareness.getLocalState();
    userId = localState?.user?.id || localState?.user?.name || "unknown";
  }

  // Split text into individual characters
  const charsArr = text.split("");
  let currentAfterId = afterId;

  for (let i = 0; i < charsArr.length; i++) {
    const ch = charsArr[i];

    // Generate unique opId, use normal timestamp + increment counter, ensure unique and sortable
    const opId = `${Date.now()}_${localCounter}@${userId}`;
    localCounter += 1; // Increment counter to ensure characters in same millisecond remain sortable

    const newChar = new Y.Map();
    newChar.set("opId", opId);
    newChar.set("ch", ch);
    newChar.set("deleted", false);
    newChar.set("userId", userId);

    // Calculate insertion position
    let index;
    if (currentAfterId) {
      // Find position of afterId character
      const afterIndex = ychars
        .toArray()
        .findIndex((c) => getProp(c, "opId") === currentAfterId);
      if (afterIndex === -1) {
        console.warn(
          `⚠️ afterId ${currentAfterId} not found, inserting at beginning`
        );
        index = 0;
      } else {
        // Insert after afterId
        index = afterIndex + 1;
      }
    } else {
      // When afterId is null, use intelligent comparison for sorting
      const currentOpId = opId;
      const chars = ychars.toArray();
      let insertIndex = 0;

      while (insertIndex < chars.length) {
        const nextChar = chars[insertIndex];
        const nextOpId = getProp(nextChar, "opId");

        if (compareOpIds(nextOpId, currentOpId) > 0) {
          break;
        }
        insertIndex++;
      }

      index = insertIndex;
    }

    // Insert current character operation
    ychars.insert(index, [newChar]);

    // 🔥 Critical fix: update currentAfterId to new inserted character's opId
    // This way next character will be inserted after current character, maintaining string order
    currentAfterId = opId;
  }
}

export function deleteChars(from, to) {
  const ychars = getYChars();

  // ProseMirror uses 1-based, delete range [from, to) (end not included)
  const startVis = from - 1;
  const endVis = to - 1;
  if (startVis < 0 || endVis < startVis) {
    console.warn("⚠️ deleteChars invalid parameters", { from, to });
    return;
  }

  // Get snapshot at current moment
  const snapshot = ychars.toArray();
  let visIdx = 0;
  let count = 0;
  const toDelete = [];

  // First find character indices to delete
  for (let i = 0; i < snapshot.length; i++) {
    const char = snapshot[i];
    const isMap = typeof char?.get === "function";
    const isDel = isMap ? char.get("deleted") : char.deleted;

    // Skip deleted characters (tombstones), don't count in visible index
    if (isDel) continue;

    // Check if current visible character is within delete range
    if (visIdx >= startVis && visIdx < endVis) {
      toDelete.push(i);
    }

    visIdx += 1;
  }

  // Then delete from back to front to avoid index changes
  for (let i = toDelete.length - 1; i >= 0; i--) {
    const idx = toDelete[i];
    const char = snapshot[idx];
    const isMap = typeof char?.get === "function";

    if (isMap) {
      char.set("deleted", true);
    } else {
      // For plain objects, need to convert to Y.Map
      const m = new Y.Map();
      m.set("opId", char.opId);
      m.set("ch", char.ch);
      m.set("deleted", true);
      ychars.delete(idx, 1);
      ychars.insert(idx, [m]);
    }
    count += 1;
  }
  // console.log("📝 deleteChars");
  // console.log(`🗑️ deleteChars logically deleted ${count} characters`, { from, to });
}

// 4️⃣ Add formatting (bold)
export function addBold(startId, endId, boundaryType = "after") {
  const yformatOps = getYFormatOps();

  // Enhance timestamp uniqueness, avoid multi-window timestamp conflicts
  const timestamp = Date.now();
  const opId = `${timestamp}_${formatOpCounter}_${Math.random()
    .toString(36)
    .substr(2, 9)}@client`;
  formatOpCounter += 1;

  // 🔧 Fix: simplify boundary type handling, avoid range errors from dynamic adjustments
  // Directly use passed boundaryType to ensure accurate format range
  const adjustedBoundaryType = boundaryType;

  const markOp = {
    opId,
    action: "addMark",
    markType: "bold",
    start: { type: "before", opId: startId },
    // Use adjusted boundary type
    end: { type: adjustedBoundaryType, opId: endId },
    timestamp, // Record operation timestamp
  };
  yformatOps.push([markOp]);
  console.log("🔄 Bold addMark:", { opId, boundaryType: adjustedBoundaryType });
}

// When canceling, use "before" in middle to avoid canceling one extra, use "after" only at end
export function removeBold(startId, endId, boundaryType = "before") {
  const yformatOps = getYFormatOps();

  // Enhance timestamp uniqueness, avoid multi-window timestamp conflicts
  const timestamp = Date.now();
  const opId = `${timestamp}_${formatOpCounter}_${Math.random()
    .toString(36)
    .substr(2, 9)}@client`;
  formatOpCounter += 1;

  // 🔧 Fix: Simplify boundary type handling, avoid range errors from dynamic adjustments
  // Use passed boundaryType directly to ensure accurate format range
  const adjustedBoundaryType = boundaryType;

  const markOp = {
    opId,
    action: "removeMark",
    markType: "bold",
    start: { type: "before", opId: startId },
    end: { type: adjustedBoundaryType, opId: endId },
    timestamp, // Record operation timestamp
  };
  // Note: If your CRDT needs push([markOp]), write it this way
  yformatOps.push([markOp]);
  console.log("🔄 Bold removeMark:", {
    opId,
    boundaryType: adjustedBoundaryType,
  });
}
// Helper function in CRDT.js: add italic mark (em)
export function addEm(startId, endId, boundaryType = "after") {
  const yformatOps = getYFormatOps();

  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "addMark",
    markType: "em",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    timestamp, // Record operation timestamp
  };
  // Since you must use push([markOp]), keep this syntax
  yformatOps.push([markOp]);
  // console.log("🔄 Italic addMark:", yformatOps.toArray());
  // console.log("📝 addEm");
}

// Helper function in CRDT.js: remove italic mark (em)
export function removeEm(startId, endId, boundaryType = "before") {
  const yformatOps = getYFormatOps();

  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "removeMark",
    markType: "em",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    timestamp, // Record operation timestamp
  };
  yformatOps.push([markOp]);
  // console.log("🔄 Italic removeMark:", yformatOps.toArray());
  // console.log("📝 removeEm");
}
// Add link operation: record addMark with href attribute
export function addLink(startId, endId, href, boundaryType = "after") {
  const yformatOps = getYFormatOps();

  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "addMark",
    markType: "link",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    attrs: { href }, // Link URL stored here
    timestamp, // Record operation timestamp
  };
  // Because you need to use yformatOps.push([markOp]) (array wrapping):
  yformatOps.push([markOp]);
  console.log("🔄 Link addMark:", yformatOps.toArray());
}

// Remove link operation: record removeMark
export function removeLink(startId, endId, boundaryType = "before") {
  const yformatOps = getYFormatOps();

  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "removeMark",
    markType: "link",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    // Usually no attrs needed, as removing link only needs to identify operation range
    timestamp, // Record operation timestamp
  };
  yformatOps.push([markOp]);
  console.log("🔄 Link removeMark:", yformatOps.toArray());
}

// 🔧 New helper function: convert visible index to character opId
export function getVisibleCharOpId(visibleIndex) {
  const ychars = getYChars();
  const chars = ychars.toArray();
  let visibleCount = 0;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const isDeleted =
      typeof char?.get === "function" ? char.get("deleted") : char.deleted;

    // Skip deleted characters (tombstones)
    if (isDeleted) continue;

    // Find corresponding visible character
    if (visibleCount === visibleIndex) {
      return typeof char?.get === "function" ? char.get("opId") : char.opId;
    }

    visibleCount++;
  }

  return null; // Index out of range
}

// 🔧 Batch get visible character opId range
export function getVisibleCharOpIds(fromIndex, toIndex) {
  const ychars = getYChars();
  const chars = ychars.toArray();
  let visibleCount = 0;
  const result = { startId: null, endId: null };

  console.log(
    `🔍 getVisibleCharOpIds searching range: [${fromIndex}, ${toIndex})`
  );
  console.log(`🔍 Current CRDT character array length: ${chars.length}`);

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const isDeleted =
      typeof char?.get === "function" ? char.get("deleted") : char.deleted;
    const opId = typeof char?.get === "function" ? char.get("opId") : char.opId;
    const ch = typeof char?.get === "function" ? char.get("ch") : char.ch;

    // Skip deleted characters (tombstones)
    if (isDeleted) {
      // console.log(`🔍 Skip deleted character: ${ch} (opId: ${opId})`);
      continue;
    }

    // console.log(`🔍 Visible character ${visibleCount}: ${ch} (opId: ${opId})`);

    // Find start position
    if (visibleCount === fromIndex) {
      result.startId = opId;
      console.log(`✅ Found start position ${fromIndex}: opId=${opId}`);
    }

    // Find end position (toIndex is exclusive, so actually need to find toIndex-1 character)
    if (visibleCount === toIndex - 1) {
      result.endId = opId;
      console.log(`✅ Found end position ${toIndex - 1}: opId=${opId}`);
    }

    visibleCount++;

    // If start and end positions are found, can exit early
    if (result.startId && result.endId) {
      break;
    }
  }

  console.log(
    `🔍 Final result: startId=${result.startId}, endId=${result.endId}`
  );
  return result;
}

// 5️⃣ Listen to changes
// ychars.observe(() => console.log("Character changes:", ychars.toArray()));
// yformatOps.observe(() => console.log("Format changes:", yformatOps.toArray()));

export { getYDoc as ydoc, getYChars as ychars, getYFormatOps as yformatOps };
