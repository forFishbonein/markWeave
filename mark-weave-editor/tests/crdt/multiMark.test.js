// ------------------------------------------------------------
// 多格式叠加与撤销
// 步骤：
// 1. 插入 "hi"；
// 2. 加粗 h+i，斜体 i，链接 h；
// 3. 并发撤销：Client1 removeBold，Client2 removeEm；
// 4. 期望结果：字符 h 仅有 link，字符 i 无任何 mark。
// ------------------------------------------------------------

const makeClient = require("../helpers/makeClientWithRealLogic");

const { convertCRDTToProseMirrorDoc } = require("../../src/crdt/crdtUtils");

test("多格式叠加后撤销得到正确 mark 树", () => {
  const A = makeClient("A");
  const B = makeClient("B");

  // 1. 写入 "hi"
  A.insertText(null, "hi");
  B.apply(A.encode());

  const [hId, iId] = A.ychars.toArray().map((c) => c.opId);

  // 2. 加粗 h+i，斜体 i，链接 h
  A.addBold(hId, iId, "after");
  A.addEm(iId, iId, "after");
  A.addLink(hId, hId, "https://example.com", "after");

  const updA = A.encode();
  B.apply(updA);

  // 3. 并发撤销：A 取消粗体，B 取消斜体
  A.removeBold(hId, iId, "after");
  B.removeEm(iId, iId, "after");

  const updA2 = A.encode();
  const updB2 = B.encode();
  A.apply(updB2);
  B.apply(updA2);

  // 4. 转换为 ProseMirror 文档并检查 marks
  const docNode = convertCRDTToProseMirrorDoc();
  const json = docNode.toJSON();
  const marksH = (json.content[0].content[0].marks || []).map((m) => m.type);
  const marksI = (json.content[0].content[1].marks || []).map((m) => m.type);

  expect(marksH).toEqual(["link"]);
  expect(marksI.length).toBe(0);
});
