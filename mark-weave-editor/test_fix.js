// 测试删除后格式化操作的修复
const { resetYDoc } = require('./src/crdt/index');
const { insertText, deleteChars, addBold, getVisibleCharOpIds } = require('./src/crdt/crdtActions');

// 重置CRDT
resetYDoc();

// 测试场景：插入文本 -> 删除中间字符 -> 对剩余字符加粗
console.log('🔥 开始测试删除后格式化错位修复...');

// 1. 插入文本 "hello world"
console.log('\n1️⃣ 插入文本 "hello world"');
insertText(null, "hello world");

// 2. 删除 "lo wo" (位置 3-8，ProseMirror 1-based)
console.log('\n2️⃣ 删除 "lo wo" (位置 4-9)');
deleteChars(4, 9);

// 3. 尝试对剩余的 "herld" 中的 "he" 加粗 (位置 1-3)
console.log('\n3️⃣ 对位置 1-3 的字符加粗');
const result = getVisibleCharOpIds(0, 1); // 转换为0-based索引
console.log('🔍 查找结果:', result);

if (result.startId && result.endId) {
  addBold(result.startId, result.endId);
  console.log('✅ 成功添加加粗格式');
} else {
  console.log('❌ 未能找到正确的字符ID');
}

console.log('\n🎯 测试完成');