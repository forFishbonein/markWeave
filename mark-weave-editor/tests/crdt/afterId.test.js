const makeClient = require("../helpers/makeClientWithRealLogic");

// ------------------------------------------------------------
// afterId 顺序插入验证
// 步骤：
// 1. A 写入 "ab"；将 diff 推给 B。
// 2. B 获取字符 a 的 opId，调用 insertChar(afterId,'X')。
// 3. 交换 diff → 期望文本变成 aXb。
// 目的：检验你的 afterId 定位逻辑是否正确。
// ------------------------------------------------------------

test("afterId 顺序插入应产生 aXb", () => {
  const A = makeClient("A");
  const B = makeClient("B");

  // A 先写 "ab"
  A.insertText(null, "ab");

  // 把 A 的修改同步到 B
  B.apply(A.encode());

  // 现在 B 已拥有字符数组，找到 'a' 的 opId
  const firstCharId = B.ychars.toArray()[0].opId;

  // B 在 'a' 后插入 X
  B.insertChar(firstCharId, "X");

  // 互相同步
  const updB = B.encode();
  A.apply(updB);

  expect(A.snapshot()).toBe("aXb");
  expect(B.snapshot()).toBe("aXb");
});
