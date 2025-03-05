/*
 * @FilePath: crdtActions.js
 * @Author: Aron
 * @Date: 2025-03-04 22:28:27
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 23:06:29
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/crdt/crdtActions.js
import { ydoc, ychars, yformatOps } from "./index"; // ychars, yformatOps 都从统一出口导入

// 2️⃣ 插入字符
export function insertChar(afterId, ch) {
  const opId = `${Date.now()}@client`;
  // num += 1;
  // const opId = `${num}@client`;
  const newChar = { opId, ch, deleted: false };
  console.log("📝 插入字符:", newChar); // 🚀 打印看看是否执行了
  console.log("📝 afterId:", afterId);
  // const index = afterId
  //   ? ychars.toArray().findIndex((c) => c.opId === afterId) + 1
  //   : 0;
  let index;
  if (afterId) {
    index = ychars.toArray().findIndex((c) => c.opId === afterId) + 1;
  } else {
    index = ychars.length; // ✅ 统一默认行为：插入到末尾
  }
  console.log(`📝 插入字符 "${ch}" 在索引 ${index}`);
  ychars.insert(index, [newChar]);
  console.log("✅ ychars 现在的内容:", ychars.toArray()); // 🚀 检查是否成功存入
}
let localCounter = 0; // 用于确保同一毫秒插入多个字符时仍然有序
export function insertText(afterId, text) {
  // 将文本拆分成单个字符
  const charsArr = text.split("");
  let currentAfterId = afterId;
  // const insertedOps = [];

  for (let ch of charsArr) {
    // 生成一个唯一的 opId，这里可以用 Date.now() 加上随机数防止同一毫秒重复 ——> 随机数方案不行，会影响这个 opId 的时间含义，失去可比性
    // const opId = `${Date.now()}_${Math.random()}@client`;

    // 生成唯一 opId，使用时间戳 + 递增 counter，保证唯一且可排序
    const opId = `${Date.now()}_${localCounter}@client`;
    localCounter += 1; // 递增计数，保证同一毫秒内的字符仍然可排序

    const newChar = { opId, ch, deleted: false };

    // 计算插入位置
    let index;
    const currentArray = ychars.toArray();
    if (currentAfterId) {
      index = currentArray.findIndex((c) => c.opId === currentAfterId) + 1;
    } else {
      index = currentArray.length; // 默认插入到数组末尾
    }

    // 插入当前字符操作
    ychars.insert(index, [newChar]);
    // insertedOps.push(newChar);

    // 更新当前的 afterId 为新插入字符的 opId
    currentAfterId = opId;
  }
  console.log("✅ insertText ychars 现在的内容:", ychars.toArray()); // 🚀 检查是否成功存入
  // console.log("✅ insertText 插入的操作:", insertedOps);
  // return insertedOps;
}

export function deleteChars(from, to) {
  const chars = ychars.toArray();

  // 计算起始索引（ProseMirror 位置是 1-based，ychars 是 0-based）
  const startIndex = from - 1;
  const count = to - from; // 删除的字符数量

  if (startIndex >= 0 && count > 0 && startIndex + count <= chars.length) {
    console.log(`🗑️ 批量删除 ${count} 个字符，从索引 ${startIndex} 开始`);

    ychars.delete(startIndex, count); // 一次性删除多个字符

    console.log("✅ ychars 现在的内容:", ychars.toArray());
  } else {
    console.warn("⚠️ 删除操作超出范围，未执行", { from, to, chars });
  }
}

// 4️⃣ 添加格式（加粗）
export function addBold(startId, endId, boundaryType = "after") {
  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "addMark",
    markType: "bold",
    start: { type: "before", opId: startId },
    // 当 boundaryType 为 "before" 时，结束边界不包含该字符；否则包含
    end: { type: boundaryType, opId: endId },
    timestamp, // 记录操作的时间戳
  };
  yformatOps.push([markOp]);
  console.log("🔄 Bold addMark:", yformatOps.toArray());
}

//取消的时候在中间是before，否则会导致多取消一个，在末尾才是after
export function removeBold(startId, endId, boundaryType = "before") {
  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "removeMark",
    markType: "bold",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    timestamp, // 记录操作的时间戳
  };
  // 注意：如果你的 CRDT 需要 push([markOp])，那就这样写
  yformatOps.push([markOp]);
  console.log("🔄 Bold 已取消:", yformatOps.toArray());
}
// CRDT.js 中的辅助函数：添加斜体标记（em）
export function addEm(startId, endId, boundaryType = "after") {
  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "addMark",
    markType: "em",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    timestamp, // 记录操作的时间戳
  };
  // 由于你必须使用 push([markOp])，这里保持此写法
  yformatOps.push([markOp]);
  console.log("🔄 Italic addMark:", yformatOps.toArray());
}

// CRDT.js 中的辅助函数：取消斜体标记（em）
export function removeEm(startId, endId, boundaryType = "before") {
  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "removeMark",
    markType: "em",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    timestamp, // 记录操作的时间戳
  };
  yformatOps.push([markOp]);
  console.log("🔄 Italic removeMark:", yformatOps.toArray());
}
// 添加链接操作：记录 addMark，附带 href 属性
export function addLink(startId, endId, href, boundaryType = "after") {
  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "addMark",
    markType: "link",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    attrs: { href }, // 链接的 URL 存在这里
    timestamp, // 记录操作的时间戳
  };
  // 因为你需要用 yformatOps.push([markOp])（即数组包装），所以：
  yformatOps.push([markOp]);
  console.log("🔄 Link addMark:", yformatOps.toArray());
}

// 取消链接操作：记录 removeMark
export function removeLink(startId, endId, boundaryType = "before") {
  const opId = `${Date.now()}@client`;
  const timestamp = Date.now();
  const markOp = {
    opId,
    action: "removeMark",
    markType: "link",
    start: { type: "before", opId: startId },
    end: { type: boundaryType, opId: endId },
    // 通常不需要 attrs，因为取消链接只需标识操作范围即可
    timestamp, // 记录操作的时间戳
  };
  yformatOps.push([markOp]);
  console.log("🔄 Link removeMark:", yformatOps.toArray());
}
// 5️⃣ 监听变更
// ychars.observe(() => console.log("字符变更:", ychars.toArray()));
// yformatOps.observe(() => console.log("格式变更:", yformatOps.toArray()));

export { ydoc, ychars, yformatOps };
