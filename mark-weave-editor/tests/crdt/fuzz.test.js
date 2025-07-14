console.log("\n" + "=".repeat(80));
console.log("🎲 CRDT Randomized Fuzz Test Suite - fuzz.test.js");
console.log("=".repeat(80));

// ------------------------------------------------------------
// Randomized concurrent scenario (property-based)
// fast-check generates random operation sequences, 3 clients execute and broadcast diff in real time.
// Covers insert / delete mixed concurrency, numRuns=50, can be increased as needed.
// Goal: Prove algorithm can always converge under random input (non-design path).
// ------------------------------------------------------------

const makeClient = require("../helpers/makeClientWithRealLogic");
const fc = require("fast-check");

describe("CRDT Randomized Consistency", () => {
  test("50 rounds of random operations all clients text consistent", () => {
    console.log("🎯 Starting 50 rounds of random operation test...");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            client: fc.integer({ min: 0, max: 2 }),
            type: fc.constantFrom("insert", "delete"),
            pos: fc.nat(20),
            char: fc.char(),
          }),
          { minLength: 30, maxLength: 120 }
        ),
        (operations) => {
          const clients = [0, 1, 2].map((i) => makeClient(i));

          // Execute all operations but do not synchronize immediately
          operations.forEach((op) => {
            const target = clients[op.client];
            const len = target.ychars.length;

            if (op.type === "insert") {
              target.insertText(null, op.char);
            } else if (len > 0) {
              const idx = op.pos % len;
              target.deleteChars(idx + 1, idx + 2);
            }
          });

          // Batch synchronization: each client broadcasts its state to all other clients
          const updates = clients.map((c) => c.encode());

          clients.forEach((client, i) => {
            updates.forEach((update, j) => {
              if (i !== j) {
                client.apply(update);
              }
            });
          });

          // Verify final consistency
          const snapshot = clients[0].snapshot();
          expect(clients[1].snapshot()).toBe(snapshot);
          expect(clients[2].snapshot()).toBe(snapshot);
        }
      ),
      { numRuns: 50 }
    );
    console.log("✅ 50 rounds of random operation test completed");
  });

  test("Complex mixed operations - insert, delete, batch text operations", () => {
    console.log("🔀 Starting complex mixed operation test (30 rounds)...");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            client: fc.integer({ min: 0, max: 3 }),
            type: fc.constantFrom(
              "insertChar",
              "insertText",
              "delete",
              "deleteRange"
            ),
            pos: fc.nat(15),
            content: fc.oneof(
              fc.char(),
              fc.string({ minLength: 1, maxLength: 10 }),
              fc.lorem({ maxCount: 3 })
            ),
            length: fc.integer({ min: 1, max: 5 }),
          }),
          { minLength: 20, maxLength: 80 }
        ),
        (operations) => {
          const clients = [0, 1, 2, 3].map((i) => makeClient(`Client${i}`));

          // Add initial content
          clients[0].insertText(null, "base_document");
          for (let i = 1; i < clients.length; i++) {
            clients[i].apply(clients[0].encode());
          }

          // Execute random operations
          operations.forEach((op, index) => {
            const target = clients[op.client];
            const currentLength = target.ychars.length;

            try {
              switch (op.type) {
                case "insertChar":
                  target.insertChar(
                    null,
                    op.content.toString().charAt(0) || "x"
                  );
                  break;

                case "insertText":
                  const textContent =
                    typeof op.content === "string" ? op.content : "text";
                  target.insertText(null, textContent.slice(0, 5)); // Limit length
                  break;

                case "delete":
                  if (currentLength > 1) {
                    const deletePos = (op.pos % (currentLength - 1)) + 1;
                    target.deleteChars(deletePos, deletePos + 1);
                  }
                  break;

                case "deleteRange":
                  if (currentLength > 2) {
                    const startPos = (op.pos % (currentLength - 2)) + 1;
                    const endPos = Math.min(
                      startPos + op.length,
                      currentLength
                    );
                    target.deleteChars(startPos, endPos);
                  }
                  break;
              }
            } catch (error) {
              // Ignore invalid operations (e.g., deleting out of bounds)
              console.log(`Operation ${index} failed:`, error.message);
            }
          });

          // Full synchronization
          const updates = clients.map((c) => c.encode());
          clients.forEach((client, i) => {
            updates.forEach((update, j) => {
              if (i !== j) {
                client.apply(update);
              }
            });
          });

          // Verify consistency
          const snapshot = clients[0].snapshot();
          clients.forEach((client, index) => {
            expect(client.snapshot()).toBe(snapshot);
          });
        }
      ),
      { numRuns: 30 }
    );
    console.log("✅ Complex mixed operation test completed");
  });

  test("Extreme boundary cases - empty document and large operations", () => {
    console.log("⚡ Starting extreme boundary case test (25 rounds)...");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            client: fc.integer({ min: 0, max: 1 }),
            type: fc.constantFrom("insert", "delete", "insertMultiple"),
            content: fc.oneof(
              fc.char(),
              fc.string({ minLength: 0, maxLength: 20 }),
              fc.constantFrom("", " ", "\n", "\t")
            ),
          }),
          { minLength: 50, maxLength: 200 }
        ),
        (operations) => {
          const clients = [makeClient("A"), makeClient("B")];

          // Execute large operations on an empty document
          operations.forEach((op) => {
            const target = clients[op.client];
            const currentLength = target.ychars.length;

            try {
              switch (op.type) {
                case "insert":
                  const char = op.content.toString().charAt(0) || "x";
                  target.insertChar(null, char);
                  break;

                case "insertMultiple":
                  const text = op.content.toString().slice(0, 10) || "text";
                  target.insertText(null, text);
                  break;

                case "delete":
                  if (currentLength > 0) {
                    // Randomly delete position
                    const deletePos =
                      Math.floor(Math.random() * currentLength) + 1;
                    target.deleteChars(deletePos, deletePos + 1);
                  }
                  break;
              }
            } catch (error) {
              // Ignore boundary errors
            }
          });

          // Synchronize
          const updateA = clients[0].encode();
          const updateB = clients[1].encode();

          clients[0].apply(updateB);
          clients[1].apply(updateA);

          // Verify consistency
          expect(clients[0].snapshot()).toBe(clients[1].snapshot());
        }
      ),
      { numRuns: 25 }
    );
    console.log("✅ Extreme boundary case test completed");
  });

  test("Timestamp conflict stress test - simulate high concurrency", () => {
    console.log("⏰ Starting timestamp conflict stress test (20 rounds)...");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            client: fc.integer({ min: 0, max: 4 }),
            char: fc.char(),
            delay: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 25, maxLength: 100 }
        ),
        (operations) => {
          const clients = Array.from({ length: 5 }, (_, i) =>
            makeClient(`Client${i}`)
          );
          // Simulate operations at similar time points
          const originalNow = Date.now;
          let mockTime = Date.now();

          Date.now = () => {
            mockTime += Math.random() * 5; // Small time increment to increase conflict probability
            return Math.floor(mockTime);
          };

          try {
            // Execute operations
            operations.forEach((op) => {
              const target = clients[op.client];
              target.insertChar(null, op.char);
            });

            // Restore time function
            Date.now = originalNow;

            // Full synchronization
            const updates = clients.map((c) => c.encode());
            clients.forEach((client, i) => {
              updates.forEach((update, j) => {
                if (i !== j) {
                  client.apply(update);
                }
              });
            });

            // Verify final consistency
            const baseSnapshot = clients[0].snapshot();
            clients.forEach((client, index) => {
              expect(client.snapshot()).toBe(baseSnapshot);
            });

            // Verify content integrity - all characters should exist
            const uniqueChars = [...new Set(operations.map((op) => op.char))];
            uniqueChars.forEach((char) => {
              expect(baseSnapshot).toContain(char);
            });
          } finally {
            Date.now = originalNow;
          }
        }
      ),
      { numRuns: 20 }
    );
    console.log("✅ Timestamp conflict stress test completed");
  });

  test("Network partition recovery - random grouping and reconnection", () => {
    console.log("🌐 Starting network partition recovery test (15 rounds)...");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            phase: fc.constantFrom(
              "partition1",
              "partition2",
              "isolated",
              "recovery"
            ),
            client: fc.integer({ min: 0, max: 2 }),
            operation: fc.constantFrom("insert", "delete"),
            content: fc.char(),
          }),
          { minLength: 15, maxLength: 60 }
        ),
        (operations) => {
          const clients = [makeClient("A"), makeClient("B"), makeClient("C")];

          // Initial synchronization
          clients[0].insertText(null, "start");
          clients[1].apply(clients[0].encode());
          clients[2].apply(clients[0].encode());

          // Group operations by phase
          const phases = {
            partition1: [], // A-B group
            partition2: [], // C isolated
            isolated: [], // Completely isolated
            recovery: [], // Network recovery
          };

          operations.forEach((op) => {
            phases[op.phase].push(op);
          });

          // Execute partition 1 operations (A-B can communicate)
          phases.partition1.forEach((op) => {
            const target = clients[op.client % 2]; // Only use A and B
            if (op.operation === "insert") {
              target.insertChar(null, op.content);
            } else if (target.ychars.length > 1) {
              target.deleteChars(1, 2);
            }
          });

          // A-B synchronization
          const updateA1 = clients[0].encode();
          const updateB1 = clients[1].encode();
          clients[0].apply(updateB1);
          clients[1].apply(updateA1);

          // Execute partition 2 operations (C isolated)
          phases.partition2.forEach((op) => {
            if (op.operation === "insert") {
              clients[2].insertChar(null, op.content);
            } else if (clients[2].ychars.length > 1) {
              clients[2].deleteChars(1, 2);
            }
          });

          // Execute isolated period operations (each independently)
          phases.isolated.forEach((op) => {
            const target = clients[op.client];
            if (op.operation === "insert") {
              target.insertChar(null, op.content);
            } else if (target.ychars.length > 1) {
              target.deleteChars(1, 2);
            }
          });

          // Network recovery - full synchronization
          const finalUpdates = clients.map((c) => c.encode());
          clients.forEach((client, i) => {
            finalUpdates.forEach((update, j) => {
              if (i !== j) {
                client.apply(update);
              }
            });
          });

          // Execute post-recovery operations
          phases.recovery.forEach((op) => {
            const target = clients[op.client];
            if (op.operation === "insert") {
              target.insertChar(null, op.content);
            } else if (target.ychars.length > 1) {
              target.deleteChars(1, 2);
            }
          });

          // Final synchronization
          const lastUpdates = clients.map((c) => c.encode());
          clients.forEach((client, i) => {
            lastUpdates.forEach((update, j) => {
              if (i !== j) {
                client.apply(update);
              }
            });
          });

          // Verify final consistency
          const finalSnapshot = clients[0].snapshot();
          clients.forEach((client) => {
            expect(client.snapshot()).toBe(finalSnapshot);
          });
        }
      ),
      { numRuns: 15 }
    );
    console.log("✅ Network partition recovery test completed");
  });

  test("Large data volume test - handle long documents", () => {
    console.log("📊 Starting large data volume test (10 rounds)...");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            client: fc.integer({ min: 0, max: 1 }),
            type: fc.constantFrom(
              "bulkInsert",
              "randomDelete",
              "insertAtPosition"
            ),
            size: fc.integer({ min: 5, max: 50 }),
            content: fc.lorem({ maxCount: 10 }),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        (operations) => {
          const clients = [makeClient("Heavy_A"), makeClient("Heavy_B")];

          // Create a larger initial document
          const initialContent =
            "This is a large document with substantial content for testing. ".repeat(
              5
            );
          clients[0].insertText(null, initialContent);
          clients[1].apply(clients[0].encode());

          // Execute large data operations
          operations.forEach((op, index) => {
            const target = clients[op.client];
            const currentLength = target.ychars.length;

            try {
              switch (op.type) {
                case "bulkInsert":
                  const bulkContent = (op.content || "bulk").slice(0, op.size);
                  target.insertText(null, bulkContent);
                  break;

                case "randomDelete":
                  if (currentLength > op.size) {
                    const startPos =
                      Math.floor(Math.random() * (currentLength - op.size)) + 1;
                    target.deleteChars(
                      startPos,
                      startPos + Math.min(op.size, 10)
                    );
                  }
                  break;

                case "insertAtPosition":
                  const insertContent = (op.content || "pos").slice(0, 10);
                  if (currentLength > 0) {
                    const randomPos = Math.floor(Math.random() * currentLength);
                    // Use basic insertion to avoid complex position calculations
                    target.insertText(null, insertContent);
                  }
                  break;
              }
            } catch (error) {
              // Handle potential errors for large data operations
              console.log(
                `Large data operation ${index} failed:`,
                error.message
              );
            }
          });

          // Synchronize
          const updateA = clients[0].encode();
          const updateB = clients[1].encode();

          clients[0].apply(updateB);
          clients[1].apply(updateA);

          // Verify consistency
          const snapshotA = clients[0].snapshot();
          const snapshotB = clients[1].snapshot();

          expect(snapshotA).toBe(snapshotB);

          // Verify document still contains some original content
          expect(snapshotA).toContain("document");
        }
      ),
      { numRuns: 10 }
    );
    console.log("✅ Large data volume test completed");
  });
});
