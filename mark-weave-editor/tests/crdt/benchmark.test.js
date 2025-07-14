const makeClient = require("../helpers/makeClientWithRealLogic");
const { performance } = require("perf_hooks");

console.log("\n" + "=".repeat(80));
console.log("🚀 CRDT Performance Benchmark Test Suite - benchmark.test.js");
console.log("=".repeat(80));

// ------------------------------------------------------------
// Performance benchmark
// 3 clients × 1000 random insert/delete, real-time diff exchange during sync.
// Statistics: total time, throughput (ops/ms), final text length, output to console.
// Goal: Provide scalable CRDT execution efficiency, comparable to OT implementation.
// ------------------------------------------------------------

/**
 * Benchmark test: 3 clients, each performs 1000 random insert/delete and sync.
 * Print total time, operation count, final text length and first 120 chars as example.
 */

test("CRDT benchmark performance", () => {
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
      const isInsert = Math.random() < 0.7 || len === 0; // 70% insert, 30% delete

      if (isInsert) {
        cl.insertText(null, randChar()); // always append
      } else {
        const pos = Math.floor(Math.random() * len);
        cl.deleteChars(pos + 1, pos + 2);
      }

      // broadcast diff
      const diff = cl.encode();
      clients.forEach((other, idx) => idx !== cIdx && other.apply(diff));
    }
  }

  const ms = performance.now() - t0;

  const finalText = clients[0].snapshot();
  console.log("--- CRDT Benchmark Result ---");
  console.log("Total operations:", TOTAL_OPS);
  console.log("Time elapsed (ms):", ms.toFixed(2));
  console.log("Operations / ms:", (TOTAL_OPS / ms).toFixed(2));
  console.log("Final text length:", finalText.length);
  console.log("First 120 chars of text:", finalText.slice(0, 120));

  // Consistency assertion
  expect(clients[1].snapshot()).toBe(finalText);
  expect(clients[2].snapshot()).toBe(finalText);
});
