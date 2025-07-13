#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 创建输出目录
const outputDir = 'test-results';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// 生成文件名
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outputFile = path.join(outputDir, `concurrent-test-${timestamp}.md`);

console.log('🧪 开始运行并发插入测试套件...');
console.log(`📝 结果将保存到: ${outputFile}`);

// 创建Markdown文件头部
const header = `# 并发插入完整测试套件结果

**测试时间**: ${new Date().toLocaleString('zh-CN')}  
**测试文件**: \`tests/crdt/concurrent.test.js\`  
**测试命令**: \`npm run test:crdt -- --testNamePattern="并发插入完整测试套件"\`

---

## 测试输出

\`\`\`
`;

// 写入文件头部
fs.writeFileSync(outputFile, header);

// 运行现有的并发测试文件
const testProcess = spawn('npm', ['run', 'test:crdt', '--', '--testNamePattern=并发插入完整测试套件'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

let output = '';

// 捕获stdout
testProcess.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text); // 同时显示在控制台
  output += text;
});

// 捕获stderr
testProcess.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text); // 同时显示在控制台
  output += text;
});

// 测试完成
testProcess.on('close', (code) => {
  // 创建Markdown文件尾部
  const footer = `\`\`\`

---

## 测试分析

### 测试概览
- 测试文件: \`tests/crdt/concurrent.test.js\`
- 测试套件: 并发插入完整测试套件
- 退出代码: ${code}
- 测试状态: ${code === 0 ? '✅ 通过' : '❌ 失败'}

### 包含的测试用例
从 \`tests/crdt/concurrent.test.js\` 中的测试：

1. **基础并发插入** - 两客户端开头同时插入
2. **中间位置并发插入** - 在指定字符后同时插入 ✅ **核心修复验证**
3. **多字符并发插入** - 使用insertText
4. **三客户端并发插入** - 复杂并发场景
5. **连续并发插入** - 模拟快速输入
6. **混合操作并发** - 插入+删除+格式化
7. **边界情况** - 空文档并发插入
8. **时间戳分析** - 验证排序规则

### 关键修复验证
${output.includes('✅ 字符正确插入在下划线后') ? '✅' : '❌'} 字符正确插入在下划线后（修复验证）
${output.includes('start_') && output.includes('end') ? '✅' : '❌'} 字符插入位置准确
${code === 0 ? '✅' : '❌'} 所有测试通过

### 重要结果摘要
${output.includes('start_YXend') || output.includes('start_XYend') ? 
  '✅ **核心问题已修复**: 字符现在正确插入在下划线后，格式为 `start_XYend` 而不是之前错误的 `start_endXY`' : 
  '⚠️ 需要检查字符插入位置'}

### 测试统计
\`\`\`
${output.match(/Tests:.*total.*/) ? output.match(/Tests:.*total.*/)[0] : '未找到测试统计信息'}
\`\`\`

**生成时间**: ${new Date().toLocaleString('zh-CN')}
**源文件**: tests/crdt/concurrent.test.js
**输出文件**: ${path.resolve(outputFile)}
`;

  // 追加输出和尾部到文件
  fs.appendFileSync(outputFile, output + footer);

  console.log('\n' + '='.repeat(50));
  console.log('✅ 测试完成！');
  console.log(`📄 结果已保存到: ${outputFile}`);
  
  // 显示文件大小
  const stats = fs.statSync(outputFile);
  const fileSizeKB = (stats.size / 1024).toFixed(2);
  console.log(`📊 文件大小: ${fileSizeKB} KB`);
  
  console.log('🔍 可以使用以下命令查看结果:');
  console.log(`   cat "${outputFile}"`);
  console.log(`   code "${outputFile}"  # 如果安装了VS Code`);
  
  console.log('\n📝 测试的是现有文件: tests/crdt/concurrent.test.js');
  
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ 运行测试时出错:', error);
  process.exit(1);
});