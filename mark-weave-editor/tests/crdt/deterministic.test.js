console.log("\n" + "=".repeat(80));
console.log("🎯 CRDT Deterministic Test Suite - deterministic.test.js");
console.log("=".repeat(80));

// ------------------------------------------------------------
// Deterministic scenario 01
// A and B, two simulated clients, each insert a string locally, then exchange diff (out of order).
// Goal: Verify your insertText / insertChar / deleteChars logic can always converge to the same string under the simplest concurrency.
// ------------------------------------------------------------

const makeClient = require("../helpers/makeClientWithRealLogic");

test("two clients converge after concurrent insert", () => {
  console.log("📋 Test scenario: two clients concurrently insert text");

  const A = makeClient("A");
  const B = makeClient("B");

  // A and B concurrently insert their respective texts (using insertText, afterId=null → append to end)
  A.insertText(null, "abc");
  B.insertText(null, "XYZ");

  console.log("Status after insertion:");
  console.log("A:", A.snapshot());
  console.log("B:", B.snapshot());

  // Simulate network broadcast (out of order)
  B.apply(A.encode());
  A.apply(B.encode());

  const finalA = A.snapshot();
  const finalB = B.snapshot();

  console.log("🎯 Final result after synchronization:");
  console.log("A:", finalA);
  console.log("B:", finalB);
  console.log(
    "✅ State consistency verification:",
    finalA === finalB ? "Passed" : "Failed"
  );

  expect(A.snapshot()).toBe(B.snapshot());
});
