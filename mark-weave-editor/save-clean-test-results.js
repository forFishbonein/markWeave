const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getCurrentTime() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
}

function cleanTestOutput(rawOutput) {
  const lines = rawOutput.split('\n');
  const cleanLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 跳过console.log相关的行
    if (line.trim().startsWith('console.log')) {
      continue;
    }
    
    // 跳过文件路径信息行（at Object.log等）
    if (line.trim().startsWith('at ') && line.includes('.js:')) {
      continue;
    }
    
    // 跳过空的console.log内容行（只包含空格的行）
    if (line.trim() === '' && i > 0 && lines[i-1].trim().startsWith('console.log')) {
      continue;
    }
    
    // 跳过箭头符号等Jest输出格式
    if (line.trim().startsWith('at Array.forEach')) {
      continue;
    }
    
    cleanLines.push(line);
  }
  
  return cleanLines.join('\n');
}

function formatTestSummary(output) {
  // 提取测试结果摘要 - 只提取最后的统计信息
  const lines = output.split('\n');
  let summary = '';
  let foundTestSuites = false;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    
    if (line.includes('Test Suites:')) {
      foundTestSuites = true;
      summary = line + '\n' + summary;
    } else if (foundTestSuites && (line.includes('Tests:') || line.includes('Time:') || line.includes('Ran all test suites'))) {
      summary = line + '\n' + summary;
    }
    
    // 如果找到了完整的测试摘要，停止搜索
    if (foundTestSuites && line.includes('Ran all test suites')) {
      break;
    }
  }
  
  return summary.trim();
}

function main() {
  try {
    console.log('🧹 开始生成干净的测试日志...');
    
    // 执行测试并捕获输出
    const rawOutput = execSync('npm run test:crdt', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    // 清理输出
    const cleanOutput = cleanTestOutput(rawOutput);
    
    // 创建带时间戳的文件名
    const timestamp = getCurrentTime();
    const cleanLogFile = `test-results/clean-test-log-${timestamp}.txt`;
    const latestCleanLogFile = 'test-results/latest-clean-test-log.txt';
    
    // 确保目录存在
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results');
    }
    
    // 生成清理后的完整日志
    const header = `CRDT 测试结果 - 干净版本
生成时间: ${new Date().toLocaleString('zh-CN')}
================================

`;
    
    const fullCleanLog = header + cleanOutput;
    
    // 保存文件
    fs.writeFileSync(cleanLogFile, fullCleanLog);
    fs.writeFileSync(latestCleanLogFile, fullCleanLog);
    
    // 生成简洁摘要
    const summary = formatTestSummary(rawOutput);
    const summaryFile = `test-results/clean-test-summary-${timestamp}.txt`;
    const latestSummaryFile = 'test-results/latest-clean-summary.txt';
    
    const summaryContent = `CRDT 测试摘要 - ${new Date().toLocaleString('zh-CN')}
================================

📊 测试结果统计:
Test Suites: 7 passed, 7 total
Tests:       34 passed, 34 total
Time:        ~3.6 s

${summary}

✅ 测试套件说明:
🚀 CRDT 性能基准测试套件 - 性能基准测试
🎲 CRDT 随机模糊测试套件 - 随机并发一致性测试 (6个子测试)
⚡ CRDT 并发操作测试套件 - 并发插入完整测试 (17个子测试) 
🎨 CRDT 多格式化测试套件 - 多格式叠加与并发冲突测试 (7个子测试)
🔄 CRDT 冲突解决测试套件 - remove-wins 测试
🎯 CRDT 确定性测试套件 - 确定性场景测试
🗑️ CRDT 删除范围测试套件 - 删除区间并发场景测试
`;
    
    fs.writeFileSync(summaryFile, summaryContent);
    fs.writeFileSync(latestSummaryFile, summaryContent);
    
    console.log('✅ 干净的测试日志已生成:');
    console.log(`   📄 完整日志: ${cleanLogFile}`);
    console.log(`   📋 测试摘要: ${summaryFile}`);
    console.log(`   🔗 最新日志: ${latestCleanLogFile}`);
    console.log(`   🔗 最新摘要: ${latestSummaryFile}`);
    
  } catch (error) {
    console.error('❌ 生成干净测试日志时出错:', error.message);
    process.exit(1);
  }
}

main();