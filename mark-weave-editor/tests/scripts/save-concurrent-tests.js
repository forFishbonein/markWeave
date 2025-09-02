#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Create output directory - use path relative to project root
const outputDir = path.join(__dirname, "../test-results");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate filename
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outputFile = path.join(outputDir, `concurrent-test-${timestamp}.md`);

console.log("🧪 Starting concurrent insertion test suite...");
console.log(`📝 Results will be saved to: ${path.relative(process.cwd(), outputFile)}`);

// Create Markdown file header
const header = `# Complete Concurrent Insertion Test Suite Results

**Test Time**: ${new Date().toLocaleString("en-US")}
**Test File**: \`tests/crdt/concurrent.test.js\`
**Test Command**: \`npm run test:crdt -- --testNamePattern="Complete concurrent insertion test suite"\`

---

## Test Output

\`\`\`
`;

// Write file header
fs.writeFileSync(outputFile, header);

// Run existing concurrent test file - set correct working directory
const testProcess = spawn(
  "npm",
  ["run", "test:crdt", "--", "--testNamePattern=Complete concurrent insertion test suite"],
  {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    cwd: path.join(__dirname, "../.."), // Set working directory to project root
  }
);

let output = "";

// Capture stdout
testProcess.stdout.on("data", (data) => {
  const text = data.toString();
  process.stdout.write(text); // Also display in console
  output += text;
});

// Capture stderr
testProcess.stderr.on("data", (data) => {
  const text = data.toString();
  process.stderr.write(text); // Also display in console
  output += text;
});

// Handle test completion
testProcess.on("close", (code) => {
  // Add ending
  const footer = `
\`\`\`

## Test Results Summary

**Exit Code**: ${code}
**Test Status**: ${code === 0 ? "✅ passed" : "❌ failed"}
**Generated Time**: ${new Date().toLocaleString("en-US")}

---

### Test Suite Description

1. **Basic concurrent insertion** - Test basic multi-user simultaneous input
2. **Ultra-fast concurrent insertion** - Simulate high-frequency input scenario
3. **Three-user concurrent** - Verify multi-user collaboration consistency
4. **Out-of-order sync** - Test operation out-of-order caused by network delay
5. **Conflict resolution consistency** - Same timestamp handling
6. **Network packet loss simulation** - Random update loss
7. **Boundary cases** - Empty document concurrent insertion
8. **Timestamp analysis** - Verify sorting rules

These tests verify the correctness and consistency of CRDT algorithm in various concurrent scenarios.
`;

  // Write complete output
  fs.appendFileSync(outputFile, output + footer);

  console.log(
    `\n✅ Concurrent tests completed! Results saved to: ${path.relative(
      process.cwd(),
      outputFile
    )}`
  );
  console.log(`📊 Test${code === 0 ? "passed" : "failed"} (exit code: ${code})`);
});
