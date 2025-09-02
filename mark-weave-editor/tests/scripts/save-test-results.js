#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 创建结果目录 - 使用相对于项目根目录的路径
const resultsDir = path.join(__dirname, "../test-results");
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// 生成时间戳
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const dateStr = new Date().toLocaleString("zh-CN");

console.log(`🚀 开始运行CRDT测试套件... (${dateStr})`);

try {
  // 运行测试并捕获输出
  const output = execSync("npm run test:crdt", {
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    cwd: path.join(__dirname, "../.."), // 设置工作目录为项目根目录
  });

  // 保存详细日志
  const logFile = path.join(resultsDir, `test-log-${timestamp}.txt`);
  fs.writeFileSync(
    logFile,
    `CRDT测试结果报告
生成时间: ${dateStr}
====================================

${output}`
  );

  // 运行JSON格式的测试结果
  let jsonResult = null;
  try {
    const jsonOutput = execSync("npm run test:crdt:json", {
      encoding: "utf8",
      stdio: "pipe",
      cwd: path.join(__dirname, "../.."),
    });

    // 保存JSON结果
    const jsonFile = path.join(resultsDir, `test-results-${timestamp}.json`);
    fs.writeFileSync(jsonFile, jsonOutput);

    // 解析JSON结果
    jsonResult = JSON.parse(jsonOutput);
  } catch (jsonError) {
    console.warn("⚠️  JSON格式保存失败，但文本日志已保存");
    console.warn("JSON错误:", jsonError.message);
  }

  // 生成摘要
  let summary = `
📊 测试完成时间: ${dateStr}
📁 详细日志: ${path.relative(process.cwd(), logFile)}
`;

  if (jsonResult) {
    summary += `
📈 测试统计:
   - 总测试套件: ${jsonResult.numTotalTestSuites || 0}
   - 通过套件: ${jsonResult.numPassedTestSuites || 0}
   - 失败套件: ${jsonResult.numFailedTestSuites || 0}
   - 总测试数: ${jsonResult.numTotalTests || 0}
   - 通过测试: ${jsonResult.numPassedTests || 0}
   - 失败测试: ${jsonResult.numFailedTests || 0}
   - 运行时间: ${jsonResult.testResults?.[0]?.perfStats?.runtime || 0}ms
`;
  }

  console.log(summary);
  console.log("✅ 测试结果已保存!");
} catch (error) {
  console.error("❌ 测试运行失败:", error.message);
  process.exit(1);
}
