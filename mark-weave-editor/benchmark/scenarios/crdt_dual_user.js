const { chromium } = require("playwright");
const fs = require("fs");

const FRONTEND_URL = "http://localhost:3000";
const LOGIN_URL = `${FRONTEND_URL}/login`;
const CRDT_URL = `${FRONTEND_URL}/performance-lab-crdt`;

const USERS = [
  { email: "haowhenhai@163.com", password: "123456" },
  { email: "haowhenhai@gmail.com", password: "123456" },
];

const EDITOR_SELECTOR = 'div[placeholder*="content"]';

// 定义4个测试基准
const BENCHMARKS = {
  benchmark1: {
    name: "Basic Concurrent Input", // 基础并发输入测试
    userA: "AAAAAAA",
    userB: "BBBBBBB",
    description:
      "The most basic concurrent input; tests core CRDT conflict resolution.", // 最基础的并发输入，测试CRDT核心冲突解决能力
    testType: "concurrent_input",
  },
  benchmark2: {
    name: "Long Text Collaboration", // 长文本协作测试
    userA:
      "This is a longer text that simulates real document editing. It contains multiple sentences and should test the system's ability to handle continuous input from multiple users.",
    userB:
      "Meanwhile, another user is also editing the same document. This creates a realistic collaborative editing scenario where multiple people work on the same content simultaneously.",
    description:
      "Continuous long-text input; tests sustained performance and stability.", // 长文本连续输入，测试持续性能和稳定性
    testType: "long_text_collaboration",
  },
  benchmark3: {
    name: "Rich-text Formatting Collaboration", // 富文本格式协作测试
    userA: {
      insertText: "Hello world! This is user A's content.",
      formatTarget: "Hello world!",
      format: "bold",
    },
    userB: {
      insertText: "Testing CRDT collaboration from user B.",
      formatTarget: "Hello world!",
      format: "italic",
    },
    description:
      "Different users insert different text but apply styles to the same span.", // 不同用户插入不同文本，但对同一段文本应用格式
    testType: "text_format_collaboration",
  },
  benchmark4: {
    name: "Format Range Overlap", // 格式范围重叠测试
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
    description: "Both users apply bold with overlapping selection ranges.", // 两个用户都做bold操作，但选中的文本范围有重叠
    testType: "format_range_overlap",
  },
};

// 支持运行所有基准或指定基准
const RUN_ALL_BENCHMARKS = process.argv[2] === "all";
const CURRENT_BENCHMARK = process.argv[2] || "benchmark1";

async function applyFormatToText(page, targetText, formatType) {
  console.log(`🔧 尝试应用格式 ${formatType} 到文本: "${targetText}"`);

  // 重试机制
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 第 ${attempt} 次尝试应用格式...`);

      // 等待一下确保编辑器状态稳定
      await new Promise((res) => setTimeout(res, 500));

      // 使用改进的JavaScript直接选择文本
      const selectionResult = await page.evaluate((text) => {
        const editor = document.querySelector(".ProseMirror");
        if (!editor) return { success: false, error: "Editor not found" };

        // 获取纯文本内容
        const textContent = editor.textContent || "";
        console.log("当前编辑器文本内容:", textContent);

        // 查找文本并选择
        const startIndex = textContent.indexOf(text);
        if (startIndex === -1) {
          return {
            success: false,
            error: `Text "${text}" not found in: "${textContent}"`,
            availableText: textContent,
          };
        }

        const endIndex = startIndex + text.length;

        // 创建选择范围
        const range = document.createRange();
        const selection = window.getSelection();

        // 改进的文本节点查找逻辑 - 处理跨越多个节点的文本
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

            // 检查这个节点是否包含目标文本的起始位置
            if (nodeStart <= startIndex && startIndex < nodeEnd) {
              startNode = node;
              startOffset = startIndex - nodeStart;
            }

            // 检查这个节点是否包含目标文本的结束位置
            if (nodeStart < endIndex && endIndex <= nodeEnd) {
              endNode = node;
              endOffset = endIndex - nodeStart;
            }

            currentIndex += nodeLength;
          } else {
            // 递归遍历所有子节点
            for (const child of node.childNodes) {
              findTextNodes(child);
            }
          }
        }

        // 查找所有相关的文本节点
        findTextNodes(editor);

        // 验证是否找到了起始和结束节点
        if (!startNode) {
          return { success: false, error: "Start node not found" };
        }
        if (!endNode) {
          return { success: false, error: "End node not found" };
        }

        // 设置选择范围
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

        // 清除现有选择并设置新选择
        selection.removeAllRanges();
        selection.addRange(range);

        return { success: true, selectedText: text };
      }, targetText);

      if (!selectionResult.success) {
        console.log(`⚠️ 第 ${attempt} 次尝试失败: ${selectionResult.error}`);
        if (selectionResult.availableText) {
          console.log(`📝 可用文本: "${selectionResult.availableText}"`);
        }
        if (selectionResult.details) {
          console.log(`🔍 错误详情:`, selectionResult.details);
        }

        // 如果是最后一次尝试，返回失败
        if (attempt === 3) {
          return false;
        }

        // 等待后重试
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      }

      console.log(`✅ 成功选择文本: "${selectionResult.selectedText}"`);

      // 应用格式
      switch (formatType) {
        case "bold":
          await page.keyboard.press("Meta+b"); // Command+b on Mac
          console.log("🔧 应用粗体格式");
          break;
        case "italic":
          await page.keyboard.press("Meta+i"); // Command+i on Mac
          console.log("🔧 应用斜体格式");
          break;
      }

      // 等待格式应用完成
      await new Promise((res) => setTimeout(res, 500));
      return true;
    } catch (error) {
      console.error(`❌ 第 ${attempt} 次尝试应用格式失败: ${error.message}`);
      if (attempt === 3) {
        return false;
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  return false;
}
// 执行基准测试
async function runBenchmark(pageA, pageB, benchmarkKey = CURRENT_BENCHMARK) {
  const benchmark = BENCHMARKS[benchmarkKey];
  console.log(`🚀 开始执行: ${benchmark.name}`);
  console.log(`📝 测试描述: ${benchmark.description}`);

  // 检查页面是否仍然可用
  try {
    // 点击编辑器
    await pageA.click(EDITOR_SELECTOR);
    await pageB.click(EDITOR_SELECTOR);
    await new Promise((res) => setTimeout(res, 500));

    // 清空编辑器内容
    console.log("🧹 清空编辑器内容...");

    // 用户A清空内容 - 使用ProseMirror特定的方法
    await pageA.evaluate(() => {
      const editor = document.querySelector(".ProseMirror");
      if (editor) {
        // 清空ProseMirror内容
        editor.innerHTML = "<p><br></p>";
        // 触发变化事件
        const event = new Event("input", { bubbles: true });
        editor.dispatchEvent(event);
      }
    });

    // 用户B清空内容 - 使用ProseMirror特定的方法
    await pageB.evaluate(() => {
      const editor = document.querySelector(".ProseMirror");
      if (editor) {
        // 清空ProseMirror内容
        editor.innerHTML = "<p><br></p>";
        // 触发变化事件
        const event = new Event("input", { bubbles: true });
        editor.dispatchEvent(event);
      }
    });

    // 等待内容同步
    await new Promise((res) => setTimeout(res, 1000));
    console.log("✅ 编辑器内容已清空");
  } catch (error) {
    console.error("❌ 页面已关闭，无法执行基准测试:", error.message);
    throw error;
  }

  switch (benchmarkKey) {
    case "benchmark1":
      // 基础并发输入测试
      await Promise.all([
        pageA.keyboard.type(benchmark.userA, { delay: 20 }),
        pageB.keyboard.type(benchmark.userB, { delay: 20 }),
      ]);
      break;

    case "benchmark2":
      // 长文本协作测试
      const textA = benchmark.userA;
      const textB = benchmark.userB;

      // 每20个字符一段，模拟真实输入
      for (let i = 0; i < textA.length; i += 20) {
        const segmentA = textA.slice(i, i + 20);
        const segmentB = textB.slice(i, i + 20);

        await Promise.all([
          pageA.keyboard.type(segmentA, { delay: 20 }),
          pageB.keyboard.type(segmentB, { delay: 20 }),
        ]);
        // // 用户A插入文本
        // await pageA.keyboard.type(segmentA, { delay: 20 });
        // await new Promise((res) => setTimeout(res, 200));

        // // 用户B插入文本
        // await pageB.keyboard.type(segmentB, { delay: 20 });
        // await new Promise((res) => setTimeout(res, 200));

        // await new Promise((res) => setTimeout(res, 200));
      }
      break;

    case "benchmark3":
      // 富文本格式协作测试
      // 确保编辑器聚焦
      await pageA.click(EDITOR_SELECTOR);
      await pageB.click(EDITOR_SELECTOR);
      await new Promise((res) => setTimeout(res, 200));

      // 用户A插入文本
      await pageA.keyboard.type(benchmark.userA.insertText, { delay: 20 });
      await new Promise((res) => setTimeout(res, 500));

      // 用户B插入文本
      await pageB.keyboard.type(benchmark.userB.insertText, { delay: 20 });
      await new Promise((res) => setTimeout(res, 500));

      // 等待文本同步
      await new Promise((res) => setTimeout(res, 2000));

      // 检查文本是否已插入
      const textCheck = await pageA.evaluate(() => {
        const editor = document.querySelector(".ProseMirror");
        return editor ? editor.textContent : "";
      });
      console.log(`📝 当前编辑器内容: "${textCheck}"`);

      // 用户A对目标文本应用格式
      await applyFormatToText(
        pageA,
        benchmark.userA.formatTarget,
        benchmark.userA.format
      );

      // 用户B对目标文本应用格式
      await applyFormatToText(
        pageB,
        benchmark.userB.formatTarget,
        benchmark.userB.format
      );
      break;

    case "benchmark4":
      // 格式范围重叠测试
      // 确保编辑器聚焦
      await pageA.click(EDITOR_SELECTOR);
      await pageB.click(EDITOR_SELECTOR);
      await new Promise((res) => setTimeout(res, 200));

      // // 用户A插入文本
      // await pageA.keyboard.type(benchmark.userA.insertText, { delay: 20 });
      // await new Promise((res) => setTimeout(res, 500));

      // // 用户B插入文本
      // await pageB.keyboard.type(benchmark.userB.insertText, { delay: 20 });
      // await new Promise((res) => setTimeout(res, 500));

      // // 等待文本同步
      // await new Promise((res) => setTimeout(res, 1000));

      // 用户A插入文本
      await pageA.keyboard.type(benchmark.userA.insertText, { delay: 20 });
      await new Promise((res) => setTimeout(res, 1000));

      // 用户B插入文本
      await pageB.keyboard.type(benchmark.userB.insertText, { delay: 20 });
      await new Promise((res) => setTimeout(res, 1000));

      // 等待文本同步 - 增加更长的同步时间
      await new Promise((res) => setTimeout(res, 3000));

      // 检查文本是否已插入
      const textCheck2 = await pageA.evaluate(() => {
        const editor = document.querySelector(".ProseMirror");
        return editor ? editor.textContent : "";
      });
      console.log(`📝 当前编辑器内容: "${textCheck2}"`);

      // 用户A对目标文本应用格式
      await applyFormatToText(
        pageA,
        benchmark.userA.formatTarget,
        benchmark.userA.format
      );
      // 用户B对目标文本应用格式
      await applyFormatToText(
        pageB,
        benchmark.userB.formatTarget,
        benchmark.userB.format
      );
      break;
  }

  await new Promise((res) => setTimeout(res, 1000));
  console.log(`✅ ${benchmark.name} 完成`);
}

async function loginAndGotoCRDT(page, { email, password }, userLabel) {
  console.log(`[${userLabel}] goto login`);
  await page.goto(LOGIN_URL, { waitUntil: "networkidle" });

  // 用 id 选择器等待和输入
  await page.waitForSelector("input#email", {
    timeout: 30000,
    state: "attached",
  });
  await page.click("input#email");
  await page.type("input#email", email, { delay: 50 });

  await page.click("input#password");
  await page.type("input#password", password, { delay: 50 });

  await page.click('button[type="submit"]');
  // 等待 URL 变化到 /home
  await page.waitForURL("**/home", { timeout: 10000 });
  console.log(`[${userLabel}] login success, goto CRDT`);
  await page.goto(CRDT_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(EDITOR_SELECTOR, { timeout: 15000 });
  console.log(`[${userLabel}] editor loaded`);

  // 检查页面标题和URL，确认我们在正确的页面上
  const pageTitle = await page.title();
  const currentUrl = await page.url();
  console.log(`[${userLabel}] 页面标题: ${pageTitle}`);
  console.log(`[${userLabel}] 当前URL: ${currentUrl}`);
}

// 运行单个基准测试
async function runSingleBenchmark(browser, benchmarkKey, pages = null) {
  console.log(`\n🚀 开始运行基准测试: ${benchmarkKey}`);
  console.log(`📝 测试名称: ${BENCHMARKS[benchmarkKey].name}`);

  let pageA, pageB, contextA, contextB;

  if (pages) {
    // 复用现有的页面
    pageA = pages.pageA;
    pageB = pages.pageB;
    console.log("🔄 复用现有页面会话");
  } else {
    // 创建新的页面和上下文
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    // 双用户并发登录和进入CRDT页面
    await Promise.all([
      loginAndGotoCRDT(pageA, USERS[0], "A"),
      loginAndGotoCRDT(pageB, USERS[1], "B"),
    ]);

    // 等待编辑器完全加载
    await new Promise((res) => setTimeout(res, 2000));

    // 🔌 等待 WebSocket 连接成功
    console.log("等待 WebSocket 连接...");

    try {
      await pageA.waitForFunction(
        () => {
          return window.ydoc && window.provider && window.awareness;
        },
        { timeout: 10000 }
      );
      console.log("✅ 用户A WebSocket 组件已初始化");

      await pageB.waitForFunction(
        () => {
          return window.ydoc && window.provider && window.awareness;
        },
        { timeout: 10000 }
      );
      console.log("✅ 用户B WebSocket 组件已初始化");

      // 等待连接状态变为 connected
      await pageA.waitForFunction(
        () => {
          return window.provider?.ws?.readyState === 1; // WebSocket.OPEN
        },
        { timeout: 15000 }
      );
      console.log("✅ 用户A WebSocket 已连接");

      await pageB.waitForFunction(
        () => {
          return window.provider?.ws?.readyState === 1; // WebSocket.OPEN
        },
        { timeout: 15000 }
      );
      console.log("✅ 用户B WebSocket 已连接");
    } catch (error) {
      console.log("⚠️ WebSocket 连接等待超时，继续执行");
    }
  }

  // 执行基准测试
  await runBenchmark(pageA, pageB, benchmarkKey);

  console.log("基准测试完成，开始采集性能数据...");

  // 尝试强制创建监控器（如果不存在）
  await pageA.evaluate(() => {
    if (window.forceInitCrdtMonitor) {
      console.log("🔧 [PLAYWRIGHT] 调用强制初始化函数");
      const result = window.forceInitCrdtMonitor();
      console.log("🔧 [PLAYWRIGHT] 强制初始化结果:", result);
    } else {
      console.log("🔧 [PLAYWRIGHT] forceInitCrdtMonitor 函数不存在");
    }
  });

  await pageB.evaluate(() => {
    if (window.forceInitCrdtMonitor) {
      console.log("🔧 [PLAYWRIGHT] 调用强制初始化函数");
      const result = window.forceInitCrdtMonitor();
      console.log("🔧 [PLAYWRIGHT] 强制初始化结果:", result);
    } else {
      console.log("🔧 [PLAYWRIGHT] forceInitCrdtMonitor 函数不存在");
    }
  });

  // 等待一下，让强制初始化生效
  await new Promise((res) => setTimeout(res, 1000));

  // 强制初始化监控器（如果还没有初始化）
  console.log("🔧 强制初始化性能监控器...");
  await pageA.evaluate(() => {
    if (window.forceInitCrdtMonitor) {
      window.forceInitCrdtMonitor();
    }
  });
  await pageB.evaluate(() => {
    if (window.forceInitCrdtMonitor) {
      window.forceInitCrdtMonitor();
    }
  });

  // 采集性能数据
  const statsA = await pageA.evaluate(() => {
    return window.getPerformanceStats
      ? window.getPerformanceStats()
      : "NO_STATS";
  });
  const statsB = await pageB.evaluate(() => {
    return window.getPerformanceStats
      ? window.getPerformanceStats()
      : "NO_STATS";
  });

  console.log("采集到的性能数据:");
  console.log("用户A:", statsA);
  console.log("用户B:", statsB);

  // 保存结果，包含基准测试信息
  const result = {
    benchmark: benchmarkKey,
    benchmarkInfo: BENCHMARKS[benchmarkKey],
    timestamp: new Date().toISOString(),
    userA: statsA,
    userB: statsB,
  };

  const resultFileName = `crdt_dual_user_${benchmarkKey}_result.json`;
  fs.writeFileSync(
    __dirname + "/../results/" + resultFileName,
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  console.log(
    `✅ 基准测试 ${benchmarkKey} 完成，结果已保存到 results/${resultFileName}`
  );

  // 只有在创建了新上下文时才关闭，但不在多基准测试模式下关闭
  if (RUN_ALL_BENCHMARKS) {
    // 运行所有基准测试时，不关闭浏览器，只等待一下
    console.log("等待 2 秒后继续下一个基准测试...");
    await new Promise((res) => setTimeout(res, 2000));
  } else {
    // 单个基准测试时，等待15秒后关闭
    console.log("等待 15 秒后关闭浏览器...");
    await new Promise((res) => setTimeout(res, 15000000)); // todo
    await contextA?.close();
    await contextB?.close();
  }

  return { result, pages: { pageA, pageB } };
}

(async () => {
  const browser = await chromium.launch({ headless: false });

  if (RUN_ALL_BENCHMARKS) {
    console.log("🔄 开始运行所有基准测试...");
    const allResults = {};

    // 运行所有基准测试
    let sharedPages = null; // 用于在基准测试间共享页面会话

    for (const benchmarkKey of Object.keys(BENCHMARKS)) {
      try {
        const { result, pages } = await runSingleBenchmark(
          browser,
          benchmarkKey,
          sharedPages
        );
        allResults[benchmarkKey] = result;

        // 保存页面会话供下一个基准测试使用
        sharedPages = pages;

        // 在基准测试之间稍作等待
        await new Promise((res) => setTimeout(res, 1000));
      } catch (error) {
        console.error(`❌ 基准测试 ${benchmarkKey} 失败:`, error);
        allResults[benchmarkKey] = { error: error.message };
      }
    }

    // 保存所有结果到一个汇总文件
    const summaryResult = {
      timestamp: new Date().toISOString(),
      totalBenchmarks: Object.keys(BENCHMARKS).length,
      results: allResults,
    };

    const summaryFileName = `crdt_dual_user_all_benchmarks_result.json`;
    fs.writeFileSync(
      __dirname + "/../results/" + summaryFileName,
      JSON.stringify(summaryResult, null, 2),
      "utf-8"
    );

    console.log(
      `\n🎉 所有基准测试完成！汇总结果已保存到 results/${summaryFileName}`
    );
    console.log("等待 10 秒后关闭浏览器...");
    await new Promise((res) => setTimeout(res, 10000)); //todo
  } else {
    // 运行单个基准测试
    const { result } = await runSingleBenchmark(browser, CURRENT_BENCHMARK);
    console.log("等待 15 秒后关闭浏览器...");
    await new Promise((res) => setTimeout(res, 15000));
  }

  await browser.close();
})();
