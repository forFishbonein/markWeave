const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// Configuration
const BASE_URL = "http://localhost:3000";
const LOGIN_URL = `${BASE_URL}/login`;
const OT_URL = `${BASE_URL}/performance-lab-ot`;

// User configuration
const USERS = [
  { email: "haowhenhai@163.com", password: "123456" },
  { email: "haowhenhai@gmail.com", password: "123456" },
];

const EDITOR_SELECTOR = 'div[placeholder*="content"]';

// Benchmark test configuration
const BENCHMARKS = {
  benchmark1: {
    name: "Basic Concurrent Input", // Basic concurrent input test
    userA: "AAAAAAA",
    userB: "BBBBBBB",
    description:
      "The most basic concurrent input; tests core OT conflict resolution.", // Most basic concurrent input, tests core OT conflict resolution capability
    testType: "concurrent_input",
  },
  benchmark2: {
    name: "Long Text Collaboration", // Long text collaboration test
    userA:
      "This is a longer text that simulates real document editing. It contains multiple sentences and should test the system's ability to handle continuous input from multiple users.",
    userB:
      "Meanwhile, another user is also editing the same document. This creates a realistic collaborative editing scenario where multiple people work on the same content simultaneously.",
    description:
      "Continuous long-text input; tests sustained performance and stability.", // Continuous long-text input, tests sustained performance and stability
    testType: "long_text_collaboration",
  },
  benchmark3: {
    name: "Rich-text Formatting Collaboration", // Rich-text formatting collaboration test
    userA: {
      insertText: "Hello world! This is user A's content.",
      formatTarget: "Hello world!",
      format: "bold",
    },
    userB: {
      insertText: "Testing OT collaboration from user B.",
      formatTarget: "Hello world!",
      format: "italic",
    },
    description:
      "Different users insert different text but apply styles to the same span.", // Different users insert different text but apply styles to the same span
    testType: "text_format_collaboration",
  },
  benchmark4: {
    name: "Format Range Overlap", // Format range overlap test
    userA: {
      insertText: "This is a shared document for collaborative testing.",
      formatTarget: "shared document",
      format: "bold",
    },
    userB: {
      insertText: "We are testing the collaborative editing system.",
      formatTarget: "document for collaborative",
      format: "bold",
    },
    description: "Both users apply bold with overlapping selection ranges.", // Both users apply bold operations with overlapping selection ranges
    testType: "format_range_overlap",
  },
};

// Support running all benchmarks or specified benchmark
const RUN_ALL_BENCHMARKS = process.argv[2] === "all";
const CURRENT_BENCHMARK = process.argv[2] || "benchmark1";

/**
 * Login and enter OT editor
 */
async function loginAndGotoOT(page, { email, password }, userLabel) {
  console.log(`[${userLabel}] goto login`);

  // Retry mechanism
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[${userLabel}] Attempt ${attempt} login attempt...`);

      await page.goto(LOGIN_URL, { waitUntil: "networkidle" });

      // Use id selector to wait and input
      await page.waitForSelector("input#email", {
        timeout: 30000,
        state: "attached",
      });
      await page.click("input#email");
      await page.type("input#email", email, { delay: 50 });

      await page.click("input#password");
      await page.type("input#password", password, { delay: 50 });

      await page.click('button[type="submit"]');

      // Wait for URL change to /home
      await page.waitForURL("**/home", { timeout: 10000 });
      console.log(`[${userLabel}] login success, goto OT`);
      await page.goto(OT_URL, { waitUntil: "networkidle" });
      await page.waitForSelector(EDITOR_SELECTOR, { timeout: 15000 });
      console.log(`[${userLabel}] editor loaded`);

      // Check page title and URL to confirm we're on the correct page
      const pageTitle = await page.title();
      const currentUrl = await page.url();
      console.log(`[${userLabel}] Page title: ${pageTitle}`);
      console.log(`[${userLabel}] Current URL: ${currentUrl}`);

      // Wait for OT client and monitor initialization (connection status not required)
      console.log(`⏳ Waiting for user ${email} 's OT client initialization...`);

      // First check elements on page
      const editorExists = await page.evaluate(() => {
        const editor = document.querySelector(".ProseMirror");
        const hasClient = !!window.otClient;
        const hasMonitor = !!window.otMonitor;
        const isReady = !!window.otReady;

        // Check if React components are correctly rendered
        const otComponent =
          document.querySelector('[data-testid="ot-editor"]') ||
          document.querySelector(".ant-card") ||
          document.querySelector('[class*="OT"]');

        console.log("🔍 Page check:", {
          editorExists: !!editor,
          hasClient,
          hasMonitor,
          isReady,
          hasOtComponent: !!otComponent,
          url: window.location.href,
          bodyText: document.body.textContent.substring(0, 200),
        });
        return {
          editorExists: !!editor,
          hasClient,
          hasMonitor,
          isReady,
          hasOtComponent: !!otComponent,
          bodyText: document.body.textContent.substring(0, 200),
        };
      });

      console.log("📊 Page status:", editorExists);

      // Wait for OT client ready status
      console.log("⏳ Waiting for OT client ready status...");
      await page.waitForFunction(
        () => {
          const hasClient = !!window.otClient;
          const hasMonitor = !!window.otMonitor;
          const isReady = !!window.otReady;
          console.log("🔍 Checking OT client status:", {
            hasClient,
            hasMonitor,
            isReady,
          });
          return hasClient && isReady; // Require client exists and ready
        },
        { timeout: 15000 }
      );

      console.log(`✅ User ${email} has entered OT editor`);
      return; // Success, exit retry loop
    } catch (error) {
      console.log(
        `❌ [${userLabel}] Attempt ${attempt} login attempt failed: ${error.message}`
      );

      if (attempt === 3) {
        // Last attempt failed, throw error
        throw error;
      }

      // Wait then retry
      console.log(`🔄 [${userLabel}] Waiting 2 seconds before retry...`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
}

/**
 * Clear editor content
 */
async function clearEditor(page) {
  console.log("🧹 Clearing editor content");

  await page.evaluate(() => {
    const editor = document.querySelector(".ProseMirror");
    if (editor) {
      editor.innerHTML = "<p><br></p>";
      // Trigger change event
      const event = new Event("input", { bubbles: true });
      editor.dispatchEvent(event);
    }
  });

  console.log("✅ Editor content cleared");

  // Wait for component remount
  console.log("🔧 Waiting for component remount...");
  await page.waitForTimeout(1000);

  // Recovery check
  const recoveryCheck = await page.evaluate(() => {
    return {
      hasOtClient: !!window.otClient,
      hasOtMonitor: !!window.otMonitor,
      isMonitoring: window.otMonitor?.isMonitoring || false,
    };
  });

  console.log("📊 Recovery check:", recoveryCheck);
}

/**
 * Execute text input test
 */
async function runTextInputTest(pageA, pageB, benchmark) {
  console.log("📝 Executing text input test");

  // Ensure monitor is running
  console.log("🔧 Ensuring monitor is running...");

  // User A input
  await pageA.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageA.type(".ProseMirror", benchmark.userA, {
    delay: 20, // Unified delay
  });
  console.log(`✅ User A input completed: "${benchmark.userA}"`);

  // User B input
  await pageB.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageB.type(".ProseMirror", benchmark.userB, {
    delay: 20, // Unified delay
  });
  console.log(`✅ User B input completed: "${benchmark.userB}"`);

  // Wait for sync
  await pageA.waitForTimeout(2000);
  await pageB.waitForTimeout(2000);
}

/**
 * Execute long text collaboration test
 */
async function runLongTextTest(pageA, pageB, benchmark) {
  console.log("📝 Executing long text collaboration test");

  // Ensure monitor is running
  console.log("🔧 Ensuring monitor is running...");
  await pageA.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageB.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  const textA = benchmark.userA;
  const textB = benchmark.userB;

  // 20 characters per segment, simulate real input
  for (let i = 0; i < textA.length; i += 20) {
    const segmentA = textA.slice(i, i + 20);
    const segmentB = textB.slice(i, i + 20);

    await Promise.all([
      pageA.keyboard.type(segmentA, { delay: 20 }),
      pageB.keyboard.type(segmentB, { delay: 20 }),
    ]);
  }

  // Wait for sync
  await pageA.waitForTimeout(2000);
  await pageB.waitForTimeout(2000);
}

/**
 * Execute format test
 */
async function runFormatTest(pageA, pageB, benchmark) {
  console.log("📝 Executing format test");

  // Ensure monitor is running
  console.log("🔧 Ensuring monitor is running...");
  await pageA.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageB.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  // Ensure editor is focused
  await pageA.click(EDITOR_SELECTOR);
  await pageB.click(EDITOR_SELECTOR);
  await new Promise((res) => setTimeout(res, 200));

  // User A insert text
  await pageA.keyboard.type(benchmark.userA.insertText, { delay: 20 });
  await new Promise((res) => setTimeout(res, 500));

  // User B insert text
  await pageB.keyboard.type(benchmark.userB.insertText, { delay: 20 });
  await new Promise((res) => setTimeout(res, 500));

  // Wait for text sync
  await new Promise((res) => setTimeout(res, 2000));

  // Check if text has been inserted
  const textCheck = await pageA.evaluate(() => {
    const editor = document.querySelector(".ProseMirror");
    return editor ? editor.textContent : "";
  });
  console.log(`📝 Current editor content: "${textCheck}"`);

  // User A apply format to target text
  await applyFormatToText(
    pageA,
    benchmark.userA.formatTarget,
    benchmark.userA.format
  );

  // User B apply format to target text
  await applyFormatToText(
    pageB,
    benchmark.userB.formatTarget,
    benchmark.userB.format
  );

  // Wait for sync
  await pageA.waitForTimeout(2000);
  await pageB.waitForTimeout(2000);
}

/**
 * Apply format to text
 */
async function applyFormatToText(page, targetText, formatType) {
  console.log(`🔧 Trying to apply format ${formatType} to text: "${targetText}"`);

  // Retry mechanism
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt} trying to apply format...`);

      // Wait a bit to ensure editor state is stable
      await new Promise((res) => setTimeout(res, 500));

      // Use improved JavaScript to directly select text
      const selectionResult = await page.evaluate((text) => {
        const editor = document.querySelector(".ProseMirror");
        if (!editor) return { success: false, error: "Editor not found" };

        // Get plain text content
        const textContent = editor.textContent || "";
        console.log("Current editor text content:", textContent);

        // Find and select text
        const startIndex = textContent.indexOf(text);
        if (startIndex === -1) {
          return {
            success: false,
            error: `Text "${text}" not found in: "${textContent}"`,
            availableText: textContent,
          };
        }

        const endIndex = startIndex + text.length;

        // Create selection range
        const range = document.createRange();
        const selection = window.getSelection();

        // Improved text node finding logic - handle text spanning multiple nodes
        let currentIndex = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;

        function findTextNodes(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const nodeLength = node.textContent.length;
            const nodeStart = currentIndex;
            const nodeEnd = currentIndex + nodeLength;

            // Check if this node contains target text start position
            if (nodeStart <= startIndex && startIndex < nodeEnd) {
              startNode = node;
              startOffset = startIndex - nodeStart;
            }

            // Check if this node contains target text end position
            if (nodeStart < endIndex && endIndex <= nodeEnd) {
              endNode = node;
              endOffset = endIndex - nodeStart;
            }

            currentIndex += nodeLength;
          } else {
            // Recursively traverse all child nodes
            for (const child of node.childNodes) {
              findTextNodes(child);
            }
          }
        }

        // Find all relevant text nodes
        findTextNodes(editor);

        // Verify if start and end nodes are found
        if (!startNode) {
          return { success: false, error: "Start node not found" };
        }
        if (!endNode) {
          return { success: false, error: "End node not found" };
        }

        // Set selection range
        try {
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);
        } catch (error) {
          return {
            success: false,
            error: `Range setting failed: ${error.message}`,
            details: {
              startNode: startNode.textContent,
              endNode: endNode.textContent,
              startOffset,
              endOffset,
              textLength: text.length,
            },
          };
        }

        // Clear existing selection and set new selection
        selection.removeAllRanges();
        selection.addRange(range);

        return { success: true, selectedText: text };
      }, targetText);

      if (!selectionResult.success) {
        console.log(`⚠️ Attempt ${attempt} attempt failed: ${selectionResult.error}`);
        if (selectionResult.availableText) {
          console.log(`📝 Available text: "${selectionResult.availableText}"`);
        }
        if (selectionResult.details) {
          console.log(`🔍 Error details:`, selectionResult.details);
        }

        // If it's the last attempt, return failure
        if (attempt === 3) {
          return false;
        }

        // Wait then retry
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      }

      console.log(`✅ Successfully selected text: "${selectionResult.selectedText}"`);

      // Apply format
      switch (formatType) {
        case "bold":
          await page.keyboard.press("Meta+b"); // Command+b on Mac
          console.log("🔧 Applying bold format");
          break;
        case "italic":
          await page.keyboard.press("Meta+i"); // Command+i on Mac
          console.log("🔧 Applying italic format");
          break;
      }

      // Wait for format application to complete
      await new Promise((res) => setTimeout(res, 500));
      return true;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed to apply format: ${error.message}`);
      if (attempt === 3) {
        return false;
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  return false;
}

/**
 * Execute benchmark test
 */
async function runBenchmark(pageA, pageB, benchmarkKey = CURRENT_BENCHMARK) {
  const benchmark = BENCHMARKS[benchmarkKey];
  console.log(`🚀 Starting execution: ${benchmark.name}`);
  console.log(`📝 Test description: ${benchmark.description}`);

  // Ensure monitor starts before test begins
  console.log("🔧 Ensuring monitor startup...");
  await pageA.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      console.log("🔧 [User A] Starting monitor");
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageB.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      console.log("🔧 [User B] Starting monitor");
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  // Wait for monitor initialization
  await new Promise((res) => setTimeout(res, 1000));

  // Check if page is still available
  try {
    // Click editor
    await pageA.click(EDITOR_SELECTOR);
    await pageB.click(EDITOR_SELECTOR);
    await new Promise((res) => setTimeout(res, 500));

    // // Clear editor content
    // console.log("🧹 Clearing editor content...");

    // // User A clear content
    // await pageA.evaluate(() => {
    //   const editor = document.querySelector(".ProseMirror");
    //   if (editor) {
    //     editor.innerHTML = "<p><br></p>";
    //     const event = new Event("input", { bubbles: true });
    //     editor.dispatchEvent(event);
    //   }
    // });

    // // User B clear content
    // await pageB.evaluate(() => {
    //   const editor = document.querySelector(".ProseMirror");
    //   if (editor) {
    //     editor.innerHTML = "<p><br></p>";
    //     const event = new Event("input", { bubbles: true });
    //     editor.dispatchEvent(event);
    //   }
    // });

    // Wait for content sync
    // await new Promise((res) => setTimeout(res, 1000));
    // console.log("✅ Editor content cleared");
  } catch (error) {
    console.error("❌ Page closed, cannot execute benchmark test:", error.message);
    throw error;
  }

  // Execute test
  switch (benchmarkKey) {
    case "benchmark1":
      // Basic concurrent input test
      await runTextInputTest(pageA, pageB, benchmark);
      break;
    case "benchmark2":
      // Long text collaboration test
      await runLongTextTest(pageA, pageB, benchmark);
      break;
    case "benchmark3":
    case "benchmark4":
      // Rich-text formatting collaboration test
      await runFormatTest(pageA, pageB, benchmark);
      break;
  }

  await new Promise((res) => setTimeout(res, 1000));
  console.log(`✅ ${benchmark.name} completed`);
}

/**
 * Get performance data
 */
async function getPerformanceData(pageA, pageB) {
  console.log("🔍 Starting to get performance data...");

  // Ensure monitor is running
  await pageA.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      console.log("🔧 [User A] Starting monitor");
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageB.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      console.log("🔧 [User B] Starting monitor");
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  // Wait for monitor to collect data
  console.log("⏳ Waiting for monitor to collect data...");
  await pageA.waitForTimeout(3000);
  await pageB.waitForTimeout(3000);

  // Get user A performance data
  const userAStats = await pageA.evaluate(() => {
    console.log("📊 [User A] Getting performance data");
    const monitor = window.otMonitor;
    if (!monitor) {
      console.log("❌ [User A] Monitor does not exist");
      return { error: "Monitor does not exist", debug: { monitorExists: false } };
    }

    const metrics = monitor.getAggregatedMetrics();
    console.log("📊 [User A] Performance data:", metrics);

    // Return debug info
    return {
      metrics,
      debug: {
        monitorExists: true,
        isMonitoring: monitor.isMonitoring,
        startTime: monitor.startTime,
        otClientExists: !!window.otClient,
        otClientConnected: window.otClient?.isConnected,
      },
    };
  });

  // Get user B performance data
  const userBStats = await pageB.evaluate(() => {
    console.log("📊 [User B] Getting performance data");
    const monitor = window.otMonitor;
    if (!monitor) {
      console.log("❌ [User B] Monitor does not exist");
      return { error: "Monitor does not exist", debug: { monitorExists: false } };
    }

    const metrics = monitor.getAggregatedMetrics();
    console.log("📊 [User B] Performance data:", metrics);

    // Return debug info
    return {
      metrics,
      debug: {
        monitorExists: true,
        isMonitoring: monitor.isMonitoring,
        startTime: monitor.startTime,
        otClientExists: !!window.otClient,
        otClientConnected: window.otClient?.isConnected,
      },
    };
  });

  // Get editor content
  const userAContent = await pageA.evaluate(() => {
    const editor = document.querySelector(".ProseMirror");
    return editor ? editor.textContent : "";
  });

  const userBContent = await pageB.evaluate(() => {
    const editor = document.querySelector(".ProseMirror");
    return editor ? editor.textContent : "";
  });

  console.log("📊 Performance data collection completed:");
  console.log("User A statistics:", userAStats);
  console.log("User B statistics:", userBStats);

  // Show debug info
  if (userAStats && userAStats.debug) {
    console.log("🔍 [User A] Debug info:", userAStats.debug);
  }
  if (userBStats && userBStats.debug) {
    console.log("🔍 [User B] Debug info:", userBStats.debug);
  }

  return {
    userA: {
      stats: userAStats?.metrics || userAStats,
      content: userAContent,
      email: USERS[0].email,
    },
    userB: {
      stats: userBStats?.metrics || userBStats,
      content: userBContent,
      email: USERS[1].email,
    },
  };
}

/**
 * Run single benchmark test
 */
async function runSingleBenchmark(browser, benchmarkKey, pages = null) {
  console.log(`\n🚀 Starting benchmark test: ${benchmarkKey}`);
  console.log(`📝 Test name: ${BENCHMARKS[benchmarkKey].name}`);

  let pageA, pageB, contextA, contextB;

  if (pages) {
    // Reuse existing pages
    pageA = pages.pageA;
    pageB = pages.pageB;
    console.log("🔄 Reusing existing page session");
  } else {
    // Create new pages and context
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    // Dual user concurrent login and enter OT page
    await Promise.all([
      loginAndGotoOT(pageA, USERS[0], "A"),
      loginAndGotoOT(pageB, USERS[1], "B"),
    ]);

    // Wait for editor to fully load
    await new Promise((res) => setTimeout(res, 2000));
  }

  // Execute benchmark test
  await runBenchmark(pageA, pageB, benchmarkKey);

  console.log("Benchmark test completed, starting performance data collection...");

  // Collect performance data
  const performanceData = await getPerformanceData(pageA, pageB);

  // Save results
  const result = {
    benchmark: benchmarkKey,
    name: BENCHMARKS[benchmarkKey].name,
    description: BENCHMARKS[benchmarkKey].description,
    timestamp: new Date().toISOString(),
    userA: performanceData.userA,
    userB: performanceData.userB,
    testConfig: BENCHMARKS[benchmarkKey],
  };

  const resultFileName = `ot_dual_user_${benchmarkKey}_result.json`;
  const resultPath = path.join(__dirname, "../results", resultFileName);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

  console.log(`✅ Benchmark test ${benchmarkKey} completed, results saved to: ${resultPath}`);
  console.log(`📝 User A content: "${performanceData.userA.content}"`);
  console.log(`📝 User B content: "${performanceData.userB.content}"`);

  // Only close when new context was created, but not in multi-benchmark test mode
  if (RUN_ALL_BENCHMARKS) {
    // When running all benchmarks, don't close browser, just wait
    console.log("Waiting 2 seconds before continuing to next benchmark...");
    await new Promise((res) => setTimeout(res, 2000));
  } else {
    // For single benchmark test, wait 15 seconds before closing
    console.log("Waiting 15 seconds before closing browser...");
    await new Promise((res) => setTimeout(res, 15000));
    await contextA?.close();
    await contextB?.close();
  }

  return { result, pages: { pageA, pageB } };
}

/**
 * Main function
 */
async function main() {
  const browser = await chromium.launch({ headless: false });

  if (RUN_ALL_BENCHMARKS) {
    console.log("🔄 Starting to run all benchmark tests...");
    const allResults = {};

    // Run all benchmark tests
    let sharedPages = null; // For sharing page sessions between benchmark tests

    for (const benchmarkKey of Object.keys(BENCHMARKS)) {
      try {
        const { result, pages } = await runSingleBenchmark(
          browser,
          benchmarkKey,
          sharedPages
        );
        allResults[benchmarkKey] = result;

        // Save page session for next benchmark test
        sharedPages = pages;

        // Wait briefly between benchmark tests
        await new Promise((res) => setTimeout(res, 1000));
      } catch (error) {
        console.error(`❌ Benchmark test ${benchmarkKey} failed:`, error);
        allResults[benchmarkKey] = { error: error.message };
      }
    }

    // Save all results to summary file
    const summaryResult = {
      timestamp: new Date().toISOString(),
      totalBenchmarks: Object.keys(BENCHMARKS).length,
      results: allResults,
    };

    const summaryFileName = `ot_dual_user_all_benchmarks_result.json`;
    const summaryPath = path.join(__dirname, "../results", summaryFileName);
    fs.writeFileSync(summaryPath, JSON.stringify(summaryResult, null, 2));

    console.log(`\n🎉 All benchmark tests completed! Summary results saved to: ${summaryPath}`);
    console.log("Waiting 10 seconds before closing browser...");
    await new Promise((res) => setTimeout(res, 10000));
  } else {
    // Run single benchmark test
    const { result } = await runSingleBenchmark(browser, CURRENT_BENCHMARK);
    console.log("Waiting 15 seconds before closing browser...");
    await new Promise((res) => setTimeout(res, 15000));
  }

  await browser.close();
}

// Run main function
main().catch(console.error);
