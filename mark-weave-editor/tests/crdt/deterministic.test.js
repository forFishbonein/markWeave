// ------------------------------------------------------------
// 确定性场景 01
// A、B 两个模拟客户端各自本地插入一串字符，再交换 diff（乱序）。
// 目标：验证你的 insertText / insertChar / deleteChars 等逻辑在最简单
//      的并发情况下依旧可收敛到同一字符串。
// ------------------------------------------------------------

const makeClient = require("../helpers/makeClientWithRealLogic");

test("两个客户端并发插入后状态一致", () => {
  const A = makeClient("A");
  const B = makeClient("B");

  // A、B 并发插入各自文本（使用 insertText，afterId=null → 追加到末尾）
  A.insertText(null, "abc");
  B.insertText(null, "XYZ");

  // 模拟网络广播（乱序）
  B.apply(A.encode());
  A.apply(B.encode());

  expect(A.snapshot()).toBe(B.snapshot());
});
