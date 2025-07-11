// ------------------------------------------------------------
// 删除区间并发场景
// 初始文本 "abcdef"，两个客户端同时执行重叠/相邻删除：
//   • Client1 deleteChars(2,5) -> 删除 b c d
//   • Client2 deleteChars(4,7) -> 删除 d e f
// 合并后应只剩下 "a"。
// ------------------------------------------------------------

const makeClient = require("../helpers/makeClientWithRealLogic");

test("重叠/相邻删除后最终一致", () => {
  const C1 = makeClient("C1");
  const C2 = makeClient("C2");

  // 初始化文本
  C1.insertText(null, "abcdef");
  // 把初始状态同步给 C2（此时两个客户端视图一致）
  C2.apply(C1.encode());

  // 并发删除（基于同一快照）
  C1.deleteChars(2, 5); // 删除索引 2(b) 到 4(d) 共 3 个字符
  C2.deleteChars(4, 7); // 删除索引 4(d) 到 6(f) 共 3 个字符

  // 互相广播 diff
  const upd1 = C1.encode();
  const upd2 = C2.encode();
  C1.apply(upd2);
  C2.apply(upd1);

  expect(C1.snapshot()).toBe("a");
  expect(C2.snapshot()).toBe("a");
});
