const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// 配置
const BASE_URL = "http://localhost:3000";
const LOGIN_URL = `${BASE_URL}/login`;
const OT_URL = `${BASE_URL}/performance-lab-ot`;

// 用户配置
const USERS = [
  { email: "haowhenhai@163.com", password: "123456" },
  { email: "haowhenhai@gmail.com", password: "123456" },
];

const EDITOR_SELECTOR = 'div[placeholder*="content"]';

// 基准测试配置
const BENCHMARKS = {
  benchmark1: {
    name: "Basic Concurrent Input", // 基础并发输入测试
    userA: "AAAAAAA",
    userB: "BBBBBBB",
    description:
      "The most basic concurrent input; tests core OT conflict resolution.", // 最基础的并发输入，测试OT核心冲突解决能力
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
      insertText: "Testing OT collaboration from user B.",
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
    description: "Both users apply bold with overlapping selection ranges.", // 两个用户都做 bold 操作，但选中的文本范围有重叠
    testType: "format_range_overlap",
  },
};

// 支持运行所有基准或指定基准
const RUN_ALL_BENCHMARKS = process.argv[2] === "all";
const CURRENT_BENCHMARK = process.argv[2] || "benchmark1";

/**
 * 登录并进入OT编辑器
 */
async function loginAndGotoOT(page, { email, password }, userLabel) {
  console.log(`[${userLabel}] goto login`);

  // 重试机制
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[${userLabel}] 第 ${attempt} 次登录尝试...`);

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
      console.log(`[${userLabel}] login success, goto OT`);
      await page.goto(OT_URL, { waitUntil: "networkidle" });
      await page.waitForSelector(EDITOR_SELECTOR, { timeout: 15000 });
      console.log(`[${userLabel}] editor loaded`);

      // 检查页面标题和URL，确认我们在正确的页面上
      const pageTitle = await page.title();
      const currentUrl = await page.url();
      console.log(`[${userLabel}] 页面标题: ${pageTitle}`);
      console.log(`[${userLabel}] 当前URL: ${currentUrl}`);

      // 等待OT客户端和监控器初始化（不要求连接状态）
      console.log(`⏳ 等待用户 ${email} 的OT客户端初始化...`);

      // 先检查页面上的元素
      const editorExists = await page.evaluate(() => {
        const editor = document.querySelector(".ProseMirror");
        const hasClient = !!window.otClient;
        const hasMonitor = !!window.otMonitor;
        const isReady = !!window.otReady;

        // 检查React组件是否正确渲染
        const otComponent =
          document.querySelector('[data-testid="ot-editor"]') ||
          document.querySelector(".ant-card") ||
          document.querySelector('[class*="OT"]');

        console.log("🔍 页面检查:", {
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

      console.log("📊 页面状态:", editorExists);

      // 等待OT客户端ready状态
      console.log("⏳ 等待OT客户端ready状态...");
      await page.waitForFunction(
        () => {
          const hasClient = !!window.otClient;
          const hasMonitor = !!window.otMonitor;
          const isReady = !!window.otReady;
          console.log("🔍 检查OT客户端状态:", {
            hasClient,
            hasMonitor,
            isReady,
          });
          return hasClient && isReady; // 要求客户端存在且ready
        },
        { timeout: 15000 }
      );

      console.log(`✅ 用户 ${email} 已进入OT编辑器`);
      return; // 成功，退出重试循环
    } catch (error) {
      console.log(
        `❌ [${userLabel}] 第 ${attempt} 次登录尝试失败: ${error.message}`
      );

      if (attempt === 3) {
        // 最后一次尝试失败，抛出错误
        throw error;
      }

      // 等待后重试
      console.log(`🔄 [${userLabel}] 等待 2 秒后重试...`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
}

/**
 * 清空编辑器内容
 */
async function clearEditor(page) {
  console.log("🧹 清空编辑器内容");

  await page.evaluate(() => {
    const editor = document.querySelector(".ProseMirror");
    if (editor) {
      editor.innerHTML = "<p><br></p>";
      // 触发变化事件
      const event = new Event("input", { bubbles: true });
      editor.dispatchEvent(event);
    }
  });

  console.log("✅ 编辑器内容已清空");

  // 等待组件重新挂载
  console.log("🔧 等待组件重新挂载...");
  await page.waitForTimeout(1000);

  // 恢复检查
  const recoveryCheck = await page.evaluate(() => {
    return {
      hasOtClient: !!window.otClient,
      hasOtMonitor: !!window.otMonitor,
      isMonitoring: window.otMonitor?.isMonitoring || false,
    };
  });

  console.log("📊 恢复检查:", recoveryCheck);
}

/**
 * 执行文本输入测试
 */
async function runTextInputTest(pageA, pageB, benchmark) {
  console.log("📝 执行文本输入测试");

  // 确保监控器正在运行
  console.log("🔧 确保监控器正在运行...");

  // 用户A输入
  await pageA.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageA.type(".ProseMirror", benchmark.userA, {
    delay: 20, // 统一延迟
  });
  console.log(`✅ 用户A输入完成: "${benchmark.userA}"`);

  // 用户B输入
  await pageB.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageB.type(".ProseMirror", benchmark.userB, {
    delay: 20, // 统一延迟
  });
  console.log(`✅ 用户B输入完成: "${benchmark.userB}"`);

  // 等待同步
  await pageA.waitForTimeout(2000);
  await pageB.waitForTimeout(2000);
}

/**
 * 执行长文本协作测试
 */
async function runLongTextTest(pageA, pageB, benchmark) {
  console.log("📝 执行长文本协作测试");

  // 确保监控器正在运行
  console.log("🔧 确保监控器正在运行...");
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

  // 每20个字符一段，模拟真实输入
  for (let i = 0; i < textA.length; i += 20) {
    const segmentA = textA.slice(i, i + 20);
    const segmentB = textB.slice(i, i + 20);

    await Promise.all([
      pageA.keyboard.type(segmentA, { delay: 20 }),
      pageB.keyboard.type(segmentB, { delay: 20 }),
    ]);
  }

  // 等待同步
  await pageA.waitForTimeout(2000);
  await pageB.waitForTimeout(2000);
}

/**
 * 执行格式测试
 */
async function runFormatTest(pageA, pageB, benchmark) {
  console.log("📝 执行格式测试");

  // 确保监控器正在运行
  console.log("🔧 确保监控器正在运行...");
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

  // 等待同步
  await pageA.waitForTimeout(2000);
  await pageB.waitForTimeout(2000);
}

/**
 * 应用格式到文本
 */
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

/**
 * 执行基准测试
 */
async function runBenchmark(pageA, pageB, benchmarkKey = CURRENT_BENCHMARK) {
  const benchmark = BENCHMARKS[benchmarkKey];
  console.log(`🚀 开始执行: ${benchmark.name}`);
  console.log(`📝 测试描述: ${benchmark.description}`);

  // 确保监控器在测试开始前启动
  console.log("🔧 确保监控器启动...");
  await pageA.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      console.log("🔧 [用户A] 启动监控器");
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageB.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      console.log("🔧 [用户B] 启动监控器");
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  // 等待监控器初始化
  await new Promise((res) => setTimeout(res, 1000));

  // 检查页面是否仍然可用
  try {
    // 点击编辑器
    await pageA.click(EDITOR_SELECTOR);
    await pageB.click(EDITOR_SELECTOR);
    await new Promise((res) => setTimeout(res, 500));

    // // 清空编辑器内容
    // console.log("🧹 清空编辑器内容...");

    // // 用户A清空内容
    // await pageA.evaluate(() => {
    //   const editor = document.querySelector(".ProseMirror");
    //   if (editor) {
    //     editor.innerHTML = "<p><br></p>";
    //     const event = new Event("input", { bubbles: true });
    //     editor.dispatchEvent(event);
    //   }
    // });

    // // 用户B清空内容
    // await pageB.evaluate(() => {
    //   const editor = document.querySelector(".ProseMirror");
    //   if (editor) {
    //     editor.innerHTML = "<p><br></p>";
    //     const event = new Event("input", { bubbles: true });
    //     editor.dispatchEvent(event);
    //   }
    // });

    // 等待内容同步
    // await new Promise((res) => setTimeout(res, 1000));
    // console.log("✅ 编辑器内容已清空");
  } catch (error) {
    console.error("❌ 页面已关闭，无法执行基准测试:", error.message);
    throw error;
  }

  // 执行测试
  switch (benchmarkKey) {
    case "benchmark1":
      // 基础并发输入测试
      await runTextInputTest(pageA, pageB, benchmark);
      break;
    case "benchmark2":
      // 长文本协作测试
      await runLongTextTest(pageA, pageB, benchmark);
      break;
    case "benchmark3":
    case "benchmark4":
      // 富文本格式协作测试
      await runFormatTest(pageA, pageB, benchmark);
      break;
  }

  await new Promise((res) => setTimeout(res, 1000));
  console.log(`✅ ${benchmark.name} 完成`);
}

/**
 * 获取性能数据
 */
async function getPerformanceData(pageA, pageB) {
  console.log("🔍 开始获取性能数据...");

  // 确保监控器正在运行
  await pageA.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      console.log("🔧 [用户A] 启动监控器");
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  await pageB.evaluate(() => {
    if (window.otMonitor && !window.otMonitor.isMonitoring) {
      console.log("🔧 [用户B] 启动监控器");
      window.otMonitor.startMonitoring(window.otClient);
    }
  });

  // 等待监控器收集数据
  console.log("⏳ 等待监控器收集数据...");
  await pageA.waitForTimeout(3000);
  await pageB.waitForTimeout(3000);

  // 获取用户A的性能数据
  const userAStats = await pageA.evaluate(() => {
    console.log("📊 [用户A] 获取性能数据");
    const monitor = window.otMonitor;
    if (!monitor) {
      console.log("❌ [用户A] 监控器不存在");
      return { error: "监控器不存在", debug: { monitorExists: false } };
    }

    const metrics = monitor.getAggregatedMetrics();
    console.log("📊 [用户A] 性能数据:", metrics);

    // 返回调试信息
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

  // 获取用户B的性能数据
  const userBStats = await pageB.evaluate(() => {
    console.log("📊 [用户B] 获取性能数据");
    const monitor = window.otMonitor;
    if (!monitor) {
      console.log("❌ [用户B] 监控器不存在");
      return { error: "监控器不存在", debug: { monitorExists: false } };
    }

    const metrics = monitor.getAggregatedMetrics();
    console.log("📊 [用户B] 性能数据:", metrics);

    // 返回调试信息
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

  // 获取编辑器内容
  const userAContent = await pageA.evaluate(() => {
    const editor = document.querySelector(".ProseMirror");
    return editor ? editor.textContent : "";
  });

  const userBContent = await pageB.evaluate(() => {
    const editor = document.querySelector(".ProseMirror");
    return editor ? editor.textContent : "";
  });

  console.log("📊 性能数据获取完成:");
  console.log("用户A统计:", userAStats);
  console.log("用户B统计:", userBStats);

  // 显示调试信息
  if (userAStats && userAStats.debug) {
    console.log("🔍 [用户A] 调试信息:", userAStats.debug);
  }
  if (userBStats && userBStats.debug) {
    console.log("🔍 [用户B] 调试信息:", userBStats.debug);
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
 * 运行单个基准测试
 */
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

    // 双用户并发登录和进入OT页面
    await Promise.all([
      loginAndGotoOT(pageA, USERS[0], "A"),
      loginAndGotoOT(pageB, USERS[1], "B"),
    ]);

    // 等待编辑器完全加载
    await new Promise((res) => setTimeout(res, 2000));
  }

  // 执行基准测试
  await runBenchmark(pageA, pageB, benchmarkKey);

  console.log("基准测试完成，开始采集性能数据...");

  // 采集性能数据
  const performanceData = await getPerformanceData(pageA, pageB);

  // 保存结果
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

  console.log(`✅ 基准测试 ${benchmarkKey} 完成，结果已保存到: ${resultPath}`);
  console.log(`📝 用户A内容: "${performanceData.userA.content}"`);
  console.log(`📝 用户B内容: "${performanceData.userB.content}"`);

  // 只有在创建了新上下文时才关闭，但不在多基准测试模式下关闭
  if (RUN_ALL_BENCHMARKS) {
    // 运行所有基准测试时，不关闭浏览器，只等待一下
    console.log("等待 2 秒后继续下一个基准测试...");
    await new Promise((res) => setTimeout(res, 2000));
  } else {
    // 单个基准测试时，等待15秒后关闭
    console.log("等待 15 秒后关闭浏览器...");
    await new Promise((res) => setTimeout(res, 15000));
    await contextA?.close();
    await contextB?.close();
  }

  return { result, pages: { pageA, pageB } };
}

/**
 * 主函数
 */
async function main() {
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

    const summaryFileName = `ot_dual_user_all_benchmarks_result.json`;
    const summaryPath = path.join(__dirname, "../results", summaryFileName);
    fs.writeFileSync(summaryPath, JSON.stringify(summaryResult, null, 2));

    console.log(`\n🎉 所有基准测试完成！汇总结果已保存到: ${summaryPath}`);
    console.log("等待 10 秒后关闭浏览器...");
    await new Promise((res) => setTimeout(res, 10000));
  } else {
    // 运行单个基准测试
    const { result } = await runSingleBenchmark(browser, CURRENT_BENCHMARK);
    console.log("等待 15 秒后关闭浏览器...");
    await new Promise((res) => setTimeout(res, 15000));
  }

  await browser.close();
}

// 运行主函数
main().catch(console.error);
