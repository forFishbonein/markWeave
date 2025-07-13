#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 创建结果目录
const resultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

// 生成时间戳
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dateStr = new Date().toLocaleString('zh-CN');

console.log(`🚀 开始运行CRDT测试套件... (${dateStr})`);

try {
  // 运行测试并捕获输出
  const output = execSync('npm run test:crdt', { 
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });

  // 保存详细日志
  const logFile = path.join(resultsDir, `test-log-${timestamp}.txt`);
  fs.writeFileSync(logFile, `CRDT测试结果报告
生成时间: ${dateStr}
====================================

${output}`);

  // 运行JSON格式的测试结果
  let jsonResult = null;
  try {
    const jsonOutput = execSync('npm run test:crdt:json', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // 保存JSON结果
    const jsonFile = path.join(resultsDir, `test-results-${timestamp}.json`);
    fs.writeFileSync(jsonFile, jsonOutput);
    
    // 解析JSON结果
    jsonResult = JSON.parse(jsonOutput);
  } catch (jsonError) {
    console.warn('⚠️  JSON格式保存失败，但文本日志已保存');
  }

  // 生成摘要报告
  const lines = output.split('\n');
  const testSuitesLine = lines.find(line => line.includes('Test Suites:'));
  const testsLine = lines.find(line => line.includes('Tests:'));
  const timeLine = lines.find(line => line.includes('Time:'));

  const summary = `CRDT测试摘要报告
生成时间: ${dateStr}
====================================

${testSuitesLine || ''}
${testsLine || ''}
${timeLine || ''}

详细日志: ${logFile}
${jsonResult ? `JSON结果: test-results-${timestamp}.json` : ''}

测试状态: ✅ 全部通过
`;

  // 保存摘要
  const summaryFile = path.join(resultsDir, `test-summary-${timestamp}.txt`);
  fs.writeFileSync(summaryFile, summary);

  // 保存最新结果（覆盖）
  fs.writeFileSync(path.join(resultsDir, 'latest-test-log.txt'), output);
  fs.writeFileSync(path.join(resultsDir, 'latest-summary.txt'), summary);

  console.log(`✅ 测试完成！结果已保存:`);
  console.log(`   📄 详细日志: ${logFile}`);
  console.log(`   📊 摘要报告: ${summaryFile}`);
  console.log(`   🔄 最新结果: test-results/latest-test-log.txt`);

  // 显示摘要
  console.log('\n' + summary);

} catch (error) {
  // 测试失败时也保存结果
  const errorLog = `CRDT测试失败报告
生成时间: ${dateStr}
====================================

错误信息:
${error.message}

标准输出:
${error.stdout || '无'}

错误输出:
${error.stderr || '无'}
`;

  const errorFile = path.join(resultsDir, `test-error-${timestamp}.txt`);
  fs.writeFileSync(errorFile, errorLog);
  
  console.error(`❌ 测试失败！错误日志已保存: ${errorFile}`);
  console.error(error.message);
  process.exit(1);
}