/*
 * @FilePath: crdtUtils.js
 * @Author: Aron
 * @Date: 2025-03-04 22:28:16
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-13 02:26:06
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// src/crdt/crdtUtils.js
import { schema } from "../plugins/schema"; // 也可从 Editor 文件中拆分出来
import { getYChars, getYFormatOps } from "./index";

// 统一获取属性，兼容普通对象与 Y.Map
const getProp = (obj, key) =>
  typeof obj?.get === "function" ? obj.get(key) : obj[key];

/**
 * 将 CRDT 中的 ychars、yformatOps 转换为 ProseMirror 的 doc node
 */
// 自定义函数：从 CRDT 数据生成 ProseMirror 文档
export function convertCRDTToProseMirrorDoc(docId) {
  const ychars = getYChars();
  const yformatOps = getYFormatOps();
  
  console.log("🔥 convertCRDTToProseMirrorDoc 被调用");
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
  // TODO  因为这里convertCRDTToProseMirrorDoc会执行两次，而最开始ychars和yformatOps都为 0，会导致意外执行，所以利用事件循环放到set Timeout 里面执行就可以很轻松解决了！
  //达到了只在文档没有内容，刚刚初始化的时候进行数据获取，而不是每次都和 ws 里面的数据合并导致每次数据翻倍了！！！——> 这样就是先等 ws 数据放进来，然后我们看有没有数据，没有数据再去获取
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
      if (getProp(char, "deleted")) return null;

      const chVal = getProp(char, "ch");
      if (!chVal) return null; // 跳过空字符

      // 按 markType 分组
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

        // 选出最后一个 `addMark` 和 `removeMark` 操作
        const lastAddOp = ops
          .filter((op) => op.action === "addMark")
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        const lastRemoveOp = ops
          .filter((op) => op.action === "removeMark")
          .sort((a, b) => b.timestamp - a.timestamp)[0];

        // **remove-wins 逻辑**
        if (
          !lastRemoveOp ||
          (lastAddOp && lastAddOp.timestamp > lastRemoveOp.timestamp)
        ) {
          if (schema.marks[markType]) {
            if (markType === "link") {
              const attrs = lastAddOp.attrs || {};
              effectiveMarks.push(schema.marks[markType].create(attrs));
            } else {
              effectiveMarks.push(schema.marks[markType].create()); //大多数走的是这里
            }
          } else {
            console.warn(`⚠️ 未知的 markType: ${markType}`);
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

// ✅ 判断当前字符是否在 `addBold` 作用的范围内
// function isCharWithinMark(char, op) {
//   // 假设 op.start.type 应该是 "before"（即标记从该字符前开始生效）
//   // op.end.type 为 "after" 表示标记到该字符结束，但新字符在此位置不应继承标记
//   if (op.end && op.end.type === "after") {
//     // 改为 <=，让最后一个字符包含在范围内
//     return op.start.opId <= char.opId && char.opId <= op.end.opId;
//   }
//   return op.start.opId <= char.opId && char.opId <= op.end.opId;
// }
export function isCharWithinMark(char, op) {
  // 如果没有显式的 type，默认 start 用 "before"，end 用 "after"
  const startType = op.start?.type || "before";
  const endType = op.end?.type || "after";

  // 判断是否满足“起始”边界
  let inStart = false;
  if (startType === "before") {
    // “before”表示从此字符之前开始 → 包含该字符 //按 字典序 进行比较（因为字符串里面都是数字，而@client 这部分是相同的，在实际比较时，它不会影响最终结果）
    inStart = char.opId >= op.start.opId;
  } else {
    // “after”表示从此字符之后开始 → 不包含该字符
    inStart = char.opId > op.start.opId;
  }

  // 判断是否满足“结束”边界
  let inEnd = false;
  if (endType === "before") {
    // “before”表示在此字符之前结束 → 不包含该字符
    inEnd = char.opId < op.end.opId;
  } else {
    // “after”表示在此字符之后结束 → 包含该字符
    inEnd = char.opId <= op.end.opId;
  }

  return inStart && inEnd;
}
// 如果有其他导出，比如 loadInitialData、undoManager，也可以放在这里
export async function loadInitialData(docId) {
  const ychars = getYChars();
  const yformatOps = getYFormatOps();
  
  //先等 ws 数据放进来，在这里才可以获得最新的数据，然后我们看有没有数据，没有数据再去获取
  if (ychars.toArray().length === 0 && yformatOps.toArray().length === 0) {
    try {
      // 这里请求一个接口，接口地址根据实际情况设置
      const response = await fetch(
        `http://localhost:1234/api/initial?docId=${docId}`
      );
      if (!response.ok) {
        throw new Error("网络响应错误");
      }
      let data = await response.json();
      console.log(
        "获取到初始数据:",
        data,
        ychars.toArray().length, // 如果有数据，这里不是 0
        yformatOps.toArray().length
      );
      data = data.content;
      // 清空当前数组（如果已有内容）——> 不能清空
      // ychars.delete(0, ychars.length);
      // yformatOps.delete(0, yformatOps.length);
      // 将获取到的 chars 数据写入 ychars
      if (
        data?.chars &&
        Array.isArray(data.chars) &&
        ychars.toArray().length === 0
      ) {
        data.chars.forEach((item) => {
          // 注意：这里我们使用 push 将每个对象放入 Y.Array 中
          ychars.push([item]);
        });
      }

      // 将获取到的 formatOps 数据写入 yformatOps
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
      console.log("初始数据加载完成:", ychars.toArray(), yformatOps.toArray());
    } catch (err) {
      console.error("加载初始数据失败:", err);
    }
  } else {
    console.error("存在数据，不需要去数据库加载！");
  }
}
