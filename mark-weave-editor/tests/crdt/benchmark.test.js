const makeClient = require("../helpers/makeClientWithRealLogic");
const { performance } = require("perf_hooks");

console.log("\n" + "=".repeat(80));
console.log("🚀 CRDT Performance Benchmark Test Suite - benchmark.test.js");
console.log("=".repeat(80));

// ------------------------------------------------------------
// 性能基准
// 3 个客户端 × 1000 次随机 insert/delete，同步过程中实时交换 diff。
// 统计总耗时、吞吐量（ops/ms）以及最终文本长度，输出到 console。
// 目标：提供可量化的 CRDT 执行效率，可与 OT 实现对比。
// ------------------------------------------------------------

/**
 * 基准测试：3 个客户端，各执行 1000 次随机插入/删除并同步。
 * 打印总耗时、操作数、最终文本长度与前 120 字符示例。
 */

test("CRDT 基准性能", () => {
  const OPE_PER_CLIENT = 300;
  const TOTAL_OPS = OPE_PER_CLIENT * 3;

  const clients = [0, 1, 2].map((i) => makeClient(i));
  const randChar = () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26));

  const t0 = performance.now();

  for (let cIdx = 0; cIdx < clients.length; cIdx++) {
    const cl = clients[cIdx];

    for (let j = 0; j < OPE_PER_CLIENT; j++) {
      const len = cl.ychars.length;
      const isInsert = Math.random() < 0.7 || len === 0; // 70% 插入，30% 删除

      if (isInsert) {
        cl.insertText(null, randChar()); // 统一追加
      } else {
        const pos = Math.floor(Math.random() * len);
        cl.deleteChars(pos + 1, pos + 2);
      }

      // 广播 diff
      const diff = cl.encode();
      clients.forEach((other, idx) => idx !== cIdx && other.apply(diff));
    }
  }

  const ms = performance.now() - t0;

  const finalText = clients[0].snapshot();
  console.log("--- CRDT 基准结果 ---");
  console.log("总操作数:", TOTAL_OPS);
  console.log("耗时 (ms):", ms.toFixed(2));
  console.log("操作 / 毫秒:", (TOTAL_OPS / ms).toFixed(2));
  console.log("最终文本长度:", finalText.length);
  console.log("文本前 120 字符:", finalText.slice(0, 120));

  // 一致性断言
  expect(clients[1].snapshot()).toBe(finalText);
  expect(clients[2].snapshot()).toBe(finalText);
});
