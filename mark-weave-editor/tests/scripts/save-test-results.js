#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Create results directory - use path relative to project root
const resultsDir = path.join(__dirname, "../test-results");
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Generated timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const dateStr = new Date().toLocaleString("en-US");

console.log(`🚀 Starting CRDT test suite... (${dateStr})`);

try {
  // Run test and capture output
  const output = execSync("npm run test:crdt", {
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    cwd: path.join(__dirname, "../.."), // Set working directory to project root
  });

  // Save detailed log
  const logFile = path.join(resultsDir, `test-log-${timestamp}.txt`);
  fs.writeFileSync(
    logFile,
    `CRDTtest结果报告
Generated Time: ${dateStr}
====================================

${output}`
  );

  // Run JSON format test results
  let jsonResult = null;
  try {
    const jsonOutput = execSync("npm run test:crdt:json", {
      encoding: "utf8",
      stdio: "pipe",
      cwd: path.join(__dirname, "../.."),
    });

    // Save JSON results
    const jsonFile = path.join(resultsDir, `test-results-${timestamp}.json`);
    fs.writeFileSync(jsonFile, jsonOutput);

    // Parse JSON results
    jsonResult = JSON.parse(jsonOutput);
  } catch (jsonError) {
    console.warn("⚠️  JSON format save failed, but text log saved");
    console.warn("JSON error:", jsonError.message);
  }

  // Generate summary
  let summary = `
📊 Test完成时间: ${dateStr}
📁 Detailed log: ${path.relative(process.cwd(), logFile)}
`;

  if (jsonResult) {
    summary += `
📈 test统计:
   - 总test套件: ${jsonResult.numTotalTestSuites || 0}
   - passed套件: ${jsonResult.numPassedTestSuites || 0}
   - failed套件: ${jsonResult.numFailedTestSuites || 0}
   - 总test数: ${jsonResult.numTotalTests || 0}
   - passedtest: ${jsonResult.numPassedTests || 0}
   - failedtest: ${jsonResult.numFailedTests || 0}
   - run时间: ${jsonResult.testResults?.[0]?.perfStats?.runtime || 0}ms
`;
  }

  console.log(summary);
  console.log("✅ Test results saved!");
} catch (error) {
  console.error("❌ testrunfailed:", error.message);
  process.exit(1);
}
