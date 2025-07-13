/*
 * CommonJS wrapper for CRDT actions module
 * Used by tests to properly isolate Y.Doc instances
 */
const Y = require("yjs");

// 🔧 统一获取属性，兼容普通对象与 Y.Map
function getProp(obj, key) {
  return typeof obj?.get === "function" ? obj.get(key) : obj[key];
}

// 创建一个工厂函数，接受 ychars 和 yformatOps 作为参数
function createCRDTActions(ychars, yformatOps) {
  let localCounter = 0; // 用于确保同一毫秒插入多个字符时仍然有序

  // 2️⃣ 插入字符
  function insertChar(afterId, ch) {
    // 使用正常时间戳，让后插入的排在后面
    const opId = `${Date.now()}@client`;
    const newChar = new Y.Map();
    newChar.set("opId", opId);
    newChar.set("ch", ch);
    newChar.set("deleted", false);

    let index;
    if (afterId) {
      // 找到afterId字符的位置
      const afterIndex = ychars.toArray().findIndex((c) => getProp(c, "opId") === afterId);
      if (afterIndex === -1) {
        console.warn(`⚠️ afterId ${afterId} 未找到，插入到开头`);
        index = 0;
      } else {
        // 在afterId后插入，直接插入在afterId+1的位置
        index = afterIndex + 1;
      }
    } else {
      // afterId为null时，插入到开头，但要考虑时间戳排序
      const currentTimestamp = parseInt(opId.split('@')[0]);
      const chars = ychars.toArray();
      let insertIndex = 0;
      
      // 向后查找，直到找到时间戳更大的字符
      while (insertIndex < chars.length) {
        const nextChar = chars[insertIndex];
        const nextOpId = getProp(nextChar, "opId");
        const nextTimestamp = parseInt(nextOpId.split('@')[0]);
        
        // 如果下一个字符的时间戳更大，则插入在它之前
        if (nextTimestamp > currentTimestamp) {
          break;
        }
        insertIndex++;
      }
      
      index = insertIndex;
    }

    ychars.insert(index, [newChar]);
  }

  function insertText(afterId, text) {
    // 将文本拆分成单个字符
    const charsArr = text.split("");
    let currentAfterId = afterId;

    for (let i = 0; i < charsArr.length; i++) {
      const ch = charsArr[i];
      
      // 生成唯一 opId，使用正常时间戳 + 递增 counter，保证唯一且可排序
      const opId = `${Date.now()}_${localCounter}@client`;
      localCounter += 1; // 递增计数，保证同一毫秒内的字符仍然可排序

      const newChar = new Y.Map();
      newChar.set("opId", opId);
      newChar.set("ch", ch);
      newChar.set("deleted", false);

      // 计算插入位置 - 简化逻辑
      let index;
      if (currentAfterId) {
        // 找到afterId字符的位置
        const afterIndex = ychars.toArray().findIndex((c) => getProp(c, "opId") === currentAfterId);
        if (afterIndex === -1) {
          console.warn(`⚠️ afterId ${currentAfterId} 未找到，插入到开头`);
          index = 0;
        } else {
          // 在afterId后插入
          index = afterIndex + 1;
        }
      } else {
        // afterId为null时，插入到开头
        index = 0;
      }
      
      // 插入当前字符操作
      ychars.insert(index, [newChar]);

      // 更新当前的 afterId 为新插入字符的 opId
      currentAfterId = opId;
    }
  }

  function deleteChars(from, to) {
    // ProseMirror 采用 1-based，删除区间 [from, to)（end 不含）
    const startVis = from - 1;
    const endVis = to - 1;
    if (startVis < 0 || endVis < startVis) {
      console.warn("⚠️ deleteChars 参数非法", { from, to });
      return;
    }

    // 获取当前时刻的快照
    const snapshot = ychars.toArray();
    let visIdx = 0;
    let count = 0;
    const toDelete = [];

    // 首先找出要删除的字符索引
    for (let i = 0; i < snapshot.length; i++) {
      const char = snapshot[i];
      const isMap = typeof char?.get === "function";
      const isDel = isMap ? char.get("deleted") : char.deleted;

      // 跳过已删除的字符（墓碑），不计入可见索引
      if (isDel) continue;

      // 检查当前可见字符是否在删除范围内
      if (visIdx >= startVis && visIdx < endVis) {
        toDelete.push(i);
      }

      visIdx += 1;
    }

    // 然后从后往前删除，避免索引变化
    for (let i = toDelete.length - 1; i >= 0; i--) {
      const idx = toDelete[i];
      const char = snapshot[idx];
      const isMap = typeof char?.get === "function";

      if (isMap) {
        char.set("deleted", true);
      } else {
        // 对于普通对象，需要转换为Y.Map
        const m = new Y.Map();
        m.set("opId", char.opId);
        m.set("ch", char.ch);
        m.set("deleted", true);
        ychars.delete(idx, 1);
        ychars.insert(idx, [m]);
      }
      count += 1;
    }
  }

  // Stub implementations for format operations
  function addBold(startId, endId, boundaryType = "after") {
    const opId = `${Date.now()}@client`;
    const timestamp = Date.now();
    const markOp = {
      opId,
      action: "addMark",
      markType: "bold",
      start: { type: "before", opId: startId },
      end: { type: boundaryType, opId: endId },
      timestamp,
    };
    yformatOps.push([markOp]);
  }

  function removeBold(startId, endId, boundaryType = "before") {
    const opId = `${Date.now()}@client`;
    const timestamp = Date.now();
    const markOp = {
      opId,
      action: "removeMark",
      markType: "bold",
      start: { type: "before", opId: startId },
      end: { type: boundaryType, opId: endId },
      timestamp,
    };
    yformatOps.push([markOp]);
  }

  function addEm(startId, endId, boundaryType = "after") {
    const opId = `${Date.now()}@client`;
    const timestamp = Date.now();
    const markOp = {
      opId,
      action: "addMark",
      markType: "em",
      start: { type: "before", opId: startId },
      end: { type: boundaryType, opId: endId },
      timestamp,
    };
    yformatOps.push([markOp]);
  }

  function removeEm(startId, endId, boundaryType = "before") {
    const opId = `${Date.now()}@client`;
    const timestamp = Date.now();
    const markOp = {
      opId,
      action: "removeMark",
      markType: "em",
      start: { type: "before", opId: startId },
      end: { type: boundaryType, opId: endId },
      timestamp,
    };
    yformatOps.push([markOp]);
  }

  function addLink(startId, endId, href, boundaryType = "after") {
    const opId = `${Date.now()}@client`;
    const timestamp = Date.now();
    const markOp = {
      opId,
      action: "addMark",
      markType: "link",
      start: { type: "before", opId: startId },
      end: { type: boundaryType, opId: endId },
      attrs: { href },
      timestamp,
    };
    yformatOps.push([markOp]);
  }

  function removeLink(startId, endId, boundaryType = "before") {
    const opId = `${Date.now()}@client`;
    const timestamp = Date.now();
    const markOp = {
      opId,
      action: "removeMark",
      markType: "link",
      start: { type: "before", opId: startId },
      end: { type: boundaryType, opId: endId },
      timestamp,
    };
    yformatOps.push([markOp]);
  }

  return {
    insertChar,
    insertText,
    deleteChars,
    addBold,
    removeBold,
    addEm,
    removeEm,
    addLink,
    removeLink
  };
}

module.exports = { createCRDTActions };