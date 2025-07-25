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
const EDIT_COUNT = 10;
const EDIT_INTERVAL_MS = 200;

async function loginAndGotoCRDT(page, { email, password }, userLabel) {
  console.log(`[${userLabel}] goto login`);
  await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
  await page.screenshot({ path: `login_${userLabel}_1.png` });

  // 打印页面 HTML 内容
  const html = await page.content();
  require("fs").writeFileSync(
    `debug_login_page_${userLabel}.html`,
    html,
    "utf-8"
  );

  // 用 id 选择器等待和输入
  await page.waitForSelector("input#email", {
    timeout: 30000,
    state: "attached",
  });
  await page.click("input#email");
  await page.type("input#email", email, { delay: 50 });

  await page.click("input#password");
  await page.type("input#password", password, { delay: 50 });

  await page.screenshot({ path: `login_${userLabel}_3.png` });

  await page.click('button[type="submit"]');
  // 等待 URL 变化到 /home
  await page.waitForURL("**/home", { timeout: 10000 });
  console.log(`[${userLabel}] login success, goto CRDT`);
  await page.goto(CRDT_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(EDITOR_SELECTOR, { timeout: 15000 });
  console.log(`[${userLabel}] editor loaded`);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // 双用户并发登录和进入CRDT页面
  await Promise.all([
    loginAndGotoCRDT(pageA, USERS[0], "A"),
    loginAndGotoCRDT(pageB, USERS[1], "B"),
  ]);

  // 聚焦编辑器
  await pageA.focus(EDITOR_SELECTOR);
  await pageB.focus(EDITOR_SELECTOR);

  // 自动输入内容
  for (let i = 0; i < EDIT_COUNT; i++) {
    await Promise.all([pageA.keyboard.type("A"), pageB.keyboard.type("B")]);
    await new Promise((res) => setTimeout(res, EDIT_INTERVAL_MS));
  }

  // 采集性能数据
  const statsA = await pageA.evaluate(() => window.getPerformanceStats?.());
  const statsB = await pageB.evaluate(() => window.getPerformanceStats?.());

  fs.writeFileSync(
    __dirname + "/../results/crdt_dual_user_result.json",
    JSON.stringify({ userA: statsA, userB: statsB }, null, 2),
    "utf-8"
  );

  await browser.close();
  console.log(
    "CRDT双用户基准测试完成，结果已保存到 results/crdt_dual_user_result.json"
  );
})();
