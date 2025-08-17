const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function getCurrentTime() {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
}

function cleanTestOutput(rawOutput) {
  const lines = rawOutput.split("\n");
  const cleanLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip console.log related lines
    if (line.trim().startsWith("console.log")) {
      continue;
    }

    // Skip file path information lines (at Object.log, etc.)
    if (line.trim().startsWith("at ") && line.includes(".js:")) {
      continue;
    }

    // Skip empty console.log content lines (lines with only spaces)
    if (
      line.trim() === "" &&
      i > 0 &&
      lines[i - 1].trim().startsWith("console.log")
    ) {
      continue;
    }

    // Skip arrow symbols and other Jest output formats
    if (line.trim().startsWith("at Array.forEach")) {
      continue;
    }

    cleanLines.push(line);
  }

  return cleanLines.join("\n");
}

function formatTestSummary(output) {
  // Extract test result summary - only extract final statistics
  const lines = output.split("\n");
  let summary = "";
  let foundTestSuites = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];

    if (line.includes("Test Suites:")) {
      foundTestSuites = true;
      summary = line + "\n" + summary;
    } else if (
      foundTestSuites &&
      (line.includes("Tests:") ||
        line.includes("Time:") ||
        line.includes("Ran all test suites"))
    ) {
      summary = line + "\n" + summary;
    }

    // If complete test summary is found, stop searching
    if (foundTestSuites && line.includes("Ran all test suites")) {
      break;
    }
  }

  return summary.trim();
}

function main() {
  try {
    console.log("🧹 Starting to generate clean test logs...");

    // Execute tests and capture output
    const rawOutput = execSync("npm run test:crdt", {
      encoding: "utf8",
      cwd: process.cwd(),
    });

    // Clean output
    const cleanOutput = cleanTestOutput(rawOutput);

    // Create timestamped filenames
    const timestamp = getCurrentTime();
    const cleanLogFile = `test-results/clean-test-log-${timestamp}.txt`;
    const latestCleanLogFile = "test-results/latest-clean-test-log.txt";

    // Ensure directory exists
    if (!fs.existsSync("test-results")) {
      fs.mkdirSync("test-results");
    }

    // Generate cleaned complete log
    const header = `CRDT Test Results - Clean Version
    Generated at: ${new Date().toLocaleString("en-US")}
    ================================
    `;

    const fullCleanLog = header + cleanOutput;

    // Save files
    fs.writeFileSync(cleanLogFile, fullCleanLog);
    fs.writeFileSync(latestCleanLogFile, fullCleanLog);

    // Generate concise summary
    const summary = formatTestSummary(rawOutput);
    const summaryFile = `test-results/clean-test-summary-${timestamp}.txt`;
    const latestSummaryFile = "test-results/latest-clean-summary.txt";

    const summaryContent = `CRDT Test Summary - ${new Date().toLocaleString(
      "en-US"
    )}
    ================================

    [Summary Statistics]
    ${summary}

    [Suite Descriptions]:
    - CRDT Performance Benchmark Suite
    - CRDT Randomized Fuzz Suite (6 subtests)
    - CRDT Concurrent Operations Suite (17 subtests)
    - CRDT Multi-Format Suite (7 subtests)
    - CRDT Conflict Resolution Suite (remove-wins)
    - CRDT Deterministic Suite
    `;

    fs.writeFileSync(summaryFile, summaryContent);
    fs.writeFileSync(latestSummaryFile, summaryContent);

    console.log("✅ Clean test logs generated:");
    console.log(`   📄 Complete log: ${cleanLogFile}`);
    console.log(`   📋 Test summary: ${summaryFile}`);
    console.log(`   🔗 Latest log: ${latestCleanLogFile}`);
    console.log(`   🔗 Latest summary: ${latestSummaryFile}`);
  } catch (error) {
    console.error("❌ Error generating clean test logs:", error.message);
    process.exit(1);
  }
}

main();
