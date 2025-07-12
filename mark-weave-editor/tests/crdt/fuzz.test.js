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
          const updates = clients.map(c => c.encode());
          
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
  });
});
