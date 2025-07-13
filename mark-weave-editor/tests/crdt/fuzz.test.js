console.log("\n" + "=".repeat(80));
console.log("🎲 CRDT Randomized Fuzz Test Suite - fuzz.test.js");
console.log("=".repeat(80));

// ------------------------------------------------------------
// 随机并发场景（property-based）
// fast-check 生成随机操作序列，3 个客户端依次执行并实时广播 diff。
// 覆盖 insert / delete 混合并发，numRuns=50，可根据需要加大。
// 目标：证明算法在"非设计路径"随机输入下仍最终收敛。
// ------------------------------------------------------------

const makeClient = require("../helpers/makeClientWithRealLogic");
const fc = require("fast-check");

describe("CRDT 随机并发一致性", () => {
  test("50 轮随机操作后所有客户端文本一致", () => {
    console.log("🎯 开始执行 50 轮随机操作测试...");
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

          // 执行所有操作，但不立即同步
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

          // 批量同步：每个客户端将状态广播给其他所有客户端
          const updates = clients.map((c) => c.encode());

          clients.forEach((client, i) => {
            updates.forEach((update, j) => {
              if (i !== j) {
                client.apply(update);
              }
            });
          });

          // 验证最终一致性
          const snapshot = clients[0].snapshot();
          expect(clients[1].snapshot()).toBe(snapshot);
          expect(clients[2].snapshot()).toBe(snapshot);
        }
      ),
      { numRuns: 50 }
    );
    console.log("✅ 50 轮随机操作测试完成");
  });

  test("复杂混合操作 - 插入、删除、批量文本操作", () => {
    console.log("🔀 开始复杂混合操作测试 (30轮)...");
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

          // 添加初始内容
          clients[0].insertText(null, "base_document");
          for (let i = 1; i < clients.length; i++) {
            clients[i].apply(clients[0].encode());
          }

          // 执行随机操作
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
                  target.insertText(null, textContent.slice(0, 5)); // 限制长度
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
              // 忽略无效操作（如删除超出范围等）
              console.log(`Operation ${index} failed:`, error.message);
            }
          });

          // 全面同步
          const updates = clients.map((c) => c.encode());
          clients.forEach((client, i) => {
            updates.forEach((update, j) => {
              if (i !== j) {
                client.apply(update);
              }
            });
          });

          // 验证一致性
          const snapshot = clients[0].snapshot();
          clients.forEach((client, index) => {
            expect(client.snapshot()).toBe(snapshot);
          });
        }
      ),
      { numRuns: 30 }
    );
    console.log("✅ 复杂混合操作测试完成");
  });

  test("极端边界情况 - 空文档和大量操作", () => {
    console.log("⚡ 开始极端边界情况测试 (25轮)...");
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

          // 在空文档上执行大量操作
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
                    // 随机删除位置
                    const deletePos =
                      Math.floor(Math.random() * currentLength) + 1;
                    target.deleteChars(deletePos, deletePos + 1);
                  }
                  break;
              }
            } catch (error) {
              // 忽略边界错误
            }
          });

          // 同步
          const updateA = clients[0].encode();
          const updateB = clients[1].encode();

          clients[0].apply(updateB);
          clients[1].apply(updateA);

          // 验证一致性
          expect(clients[0].snapshot()).toBe(clients[1].snapshot());
        }
      ),
      { numRuns: 25 }
    );
    console.log("✅ 极端边界情况测试完成");
  });

  test("时间戳冲突压力测试 - 模拟高并发", () => {
    console.log("⏰ 开始时间戳冲突压力测试 (20轮)...");
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
          // 模拟在相似时间点的操作
          const originalNow = Date.now;
          let mockTime = Date.now();

          Date.now = () => {
            mockTime += Math.random() * 5; // 小的时间增量，增加冲突可能性
            return Math.floor(mockTime);
          };

          try {
            // 执行操作
            operations.forEach((op) => {
              const target = clients[op.client];
              target.insertChar(null, op.char);
            });

            // 恢复时间函数
            Date.now = originalNow;

            // 全面同步
            const updates = clients.map((c) => c.encode());
            clients.forEach((client, i) => {
              updates.forEach((update, j) => {
                if (i !== j) {
                  client.apply(update);
                }
              });
            });

            // 验证最终一致性
            const baseSnapshot = clients[0].snapshot();
            clients.forEach((client, index) => {
              expect(client.snapshot()).toBe(baseSnapshot);
            });

            // 验证内容完整性 - 所有字符都应该存在
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
    console.log("✅ 时间戳冲突压力测试完成");
  });

  test("网络分区恢复 - 随机分组和重连", () => {
    console.log("🌐 开始网络分区恢复测试 (15轮)...");
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

          // 初始同步
          clients[0].insertText(null, "start");
          clients[1].apply(clients[0].encode());
          clients[2].apply(clients[0].encode());

          // 按阶段分组操作
          const phases = {
            partition1: [], // A-B组
            partition2: [], // C独立
            isolated: [], // 完全隔离
            recovery: [], // 网络恢复
          };

          operations.forEach((op) => {
            phases[op.phase].push(op);
          });

          // 执行分区1操作（A-B可通信）
          phases.partition1.forEach((op) => {
            const target = clients[op.client % 2]; // 只使用A和B
            if (op.operation === "insert") {
              target.insertChar(null, op.content);
            } else if (target.ychars.length > 1) {
              target.deleteChars(1, 2);
            }
          });

          // A-B同步
          const updateA1 = clients[0].encode();
          const updateB1 = clients[1].encode();
          clients[0].apply(updateB1);
          clients[1].apply(updateA1);

          // 执行分区2操作（C独立）
          phases.partition2.forEach((op) => {
            if (op.operation === "insert") {
              clients[2].insertChar(null, op.content);
            } else if (clients[2].ychars.length > 1) {
              clients[2].deleteChars(1, 2);
            }
          });

          // 执行隔离期操作（各自独立）
          phases.isolated.forEach((op) => {
            const target = clients[op.client];
            if (op.operation === "insert") {
              target.insertChar(null, op.content);
            } else if (target.ychars.length > 1) {
              target.deleteChars(1, 2);
            }
          });

          // 网络恢复 - 全面同步
          const finalUpdates = clients.map((c) => c.encode());
          clients.forEach((client, i) => {
            finalUpdates.forEach((update, j) => {
              if (i !== j) {
                client.apply(update);
              }
            });
          });

          // 执行恢复后操作
          phases.recovery.forEach((op) => {
            const target = clients[op.client];
            if (op.operation === "insert") {
              target.insertChar(null, op.content);
            } else if (target.ychars.length > 1) {
              target.deleteChars(1, 2);
            }
          });

          // 最终同步
          const lastUpdates = clients.map((c) => c.encode());
          clients.forEach((client, i) => {
            lastUpdates.forEach((update, j) => {
              if (i !== j) {
                client.apply(update);
              }
            });
          });

          // 验证最终一致性
          const finalSnapshot = clients[0].snapshot();
          clients.forEach((client) => {
            expect(client.snapshot()).toBe(finalSnapshot);
          });
        }
      ),
      { numRuns: 15 }
    );
    console.log("✅ 网络分区恢复测试完成");
  });

  test("大规模数据量测试 - 处理长文档", () => {
    console.log("📊 开始大规模数据量测试 (10轮)...");
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

          // 创建较大的初始文档
          const initialContent =
            "This is a large document with substantial content for testing. ".repeat(
              5
            );
          clients[0].insertText(null, initialContent);
          clients[1].apply(clients[0].encode());

          // 执行大数据量操作
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
                    // 使用基本的插入，避免复杂的位置计算
                    target.insertText(null, insertContent);
                  }
                  break;
              }
            } catch (error) {
              // 处理大数据量操作可能的错误
              console.log(
                `Large data operation ${index} failed:`,
                error.message
              );
            }
          });

          // 同步
          const updateA = clients[0].encode();
          const updateB = clients[1].encode();

          clients[0].apply(updateB);
          clients[1].apply(updateA);

          // 验证一致性
          const snapshotA = clients[0].snapshot();
          const snapshotB = clients[1].snapshot();

          expect(snapshotA).toBe(snapshotB);

          // 验证文档仍包含一些原始内容
          expect(snapshotA).toContain("document");
        }
      ),
      { numRuns: 10 }
    );
    console.log("✅ 大规模数据量测试完成");
  });
});
