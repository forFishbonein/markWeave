#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// 创建输出目录 - 使用相对于项目根目录的路径
const outputDir = path.join(__dirname, "../test-results");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 生成文件名
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outputFile = path.join(outputDir, `concurrent-test-${timestamp}.md`);

console.log("🧪 开始运行并发插入测试套件...");
console.log(`📝 结果将保存到: ${path.relative(process.cwd(), outputFile)}`);

// 创建Markdown文件头部
const header = `# 并发插入完整测试套件结果

**测试时间**: ${new Date().toLocaleString("zh-CN")}
**测试文件**: \`tests/crdt/concurrent.test.js\`
**测试命令**: \`npm run test:crdt -- --testNamePattern="并发插入完整测试套件"\`

---

## 测试输出

\`\`\`
`;

// 写入文件头部
fs.writeFileSync(outputFile, header);

// 运行现有的并发测试文件 - 设置正确的工作目录
const testProcess = spawn(
  "npm",
  ["run", "test:crdt", "--", "--testNamePattern=并发插入完整测试套件"],
  {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    cwd: path.join(__dirname, "../.."), // 设置工作目录为项目根目录
  }
);

let output = "";

// 捕获stdout
testProcess.stdout.on("data", (data) => {
  const text = data.toString();
  process.stdout.write(text); // 同时显示在控制台
  output += text;
});

// 捕获stderr
testProcess.stderr.on("data", (data) => {
  const text = data.toString();
  process.stderr.write(text); // 同时显示在控制台
  output += text;
});

// 测试完成时的处理
testProcess.on("close", (code) => {
  // 添加结尾
  const footer = `
\`\`\`

## 测试结果摘要

**退出代码**: ${code}
**测试状态**: ${code === 0 ? "✅ 通过" : "❌ 失败"}
**生成时间**: ${new Date().toLocaleString("zh-CN")}

---

### 测试套件说明

1. **基础并发插入** - 测试基本的多用户同时输入
2. **超快并发插入** - 模拟高频输入场景
3. **三用户并发** - 验证多用户协作一致性
4. **乱序同步** - 测试网络延迟导致的操作乱序
5. **冲突解决一致性** - 相同时间戳处理
6. **网络丢包模拟** - 随机丢失更新
7. **边界情况** - 空文档并发插入
8. **时间戳分析** - 验证排序规则

这些测试验证了CRDT算法在各种并发场景下的正确性和一致性。
`;

  // 写入完整输出
  fs.appendFileSync(outputFile, output + footer);

  console.log(
    `\n✅ 并发测试完成! 结果已保存到: ${path.relative(
      process.cwd(),
      outputFile
    )}`
  );
  console.log(`📊 测试${code === 0 ? "通过" : "失败"} (退出代码: ${code})`);
});
