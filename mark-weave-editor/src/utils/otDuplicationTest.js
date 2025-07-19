/**
 * OT内容重复问题测试工具
 * 用于验证多窗口协作时是否存在内容重复问题
 */

class OTDuplicationTest {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
    this.testId = `test_${Date.now()}`;
  }

  /**
   * 启动重复问题测试
   */
  startTest(otClient, editorView) {
    if (this.isRunning) {
      console.warn("🧪 [测试] 测试已在运行中");
      return;
    }

    this.isRunning = true;
    this.otClient = otClient;
    this.editorView = editorView;

    console.log("🧪 [测试] 开始OT重复问题测试", {
      testId: this.testId,
      clientId: otClient?.connectionId,
      editorConnected: !!editorView,
    });

    // 监听操作事件
    this.monitorOperations();

    // 执行测试用例
    this.runTestCases();
  }

  /**
   * 监听操作事件
   */
  monitorOperations() {
    if (!this.otClient || !this.editorView) return;

    // 记录发送的操作
    const originalSubmit = this.otClient.submitOperation.bind(this.otClient);
    this.otClient.submitOperation = (collection, id, op) => {
      this.recordOperation("sent", {
        collection,
        id,
        op,
        clientId: this.otClient.connectionId,
        timestamp: Date.now(),
      });
      return originalSubmit(collection, id, op);
    };

    // 监听接收的操作
    this.otClient.on("operation", (data) => {
      this.recordOperation("received", {
        ...data,
        timestamp: Date.now(),
      });
    });

    // 监听编辑器变化
    const originalDispatch = this.editorView.dispatch.bind(this.editorView);
    this.editorView.dispatch = (tr) => {
      if (tr.docChanged && !tr.getMeta("fromOT")) {
        this.recordOperation("editor_change", {
          steps: tr.steps.length,
          textContent: tr.doc.textContent,
          timestamp: Date.now(),
        });
      }
      return originalDispatch(tr);
    };
  }

  /**
   * 记录操作
   */
  recordOperation(type, data) {
    const record = {
      type,
      data,
      testId: this.testId,
      timestamp: Date.now(),
    };

    this.testResults.push(record);
    console.log(`🧪 [测试] 记录操作:`, record);
  }

  /**
   * 执行测试用例
   */
  async runTestCases() {
    await this.delay(1000); // 等待连接稳定

    // 测试用例1: 单字符输入
    await this.testSingleCharacterInput();

    // 测试用例2: 连续输入
    await this.testContinuousInput();

    // 测试用例3: 删除操作
    await this.testDeleteOperation();

    // 生成测试报告
    this.generateReport();
  }

  /**
   * 测试单字符输入
   */
  async testSingleCharacterInput() {
    console.log("🧪 [测试] 执行单字符输入测试");

    const testChar = "1";
    const initialContent = this.editorView.state.doc.textContent;

    // 模拟用户输入
    this.simulateUserInput(testChar);

    await this.delay(2000); // 等待同步完成

    const finalContent = this.editorView.state.doc.textContent;
    const expectedContent = initialContent + testChar;

    const testResult = {
      test: "single_character_input",
      input: testChar,
      initialContent,
      finalContent,
      expectedContent,
      passed: finalContent === expectedContent,
      duplicated: finalContent.includes(testChar.repeat(2)),
    };

    this.testResults.push({
      type: "test_result",
      data: testResult,
      timestamp: Date.now(),
    });

    console.log("🧪 [测试] 单字符输入测试结果:", testResult);
  }

  /**
   * 测试连续输入
   */
  async testContinuousInput() {
    console.log("🧪 [测试] 执行连续输入测试");

    const testString = "abc";
    const initialContent = this.editorView.state.doc.textContent;

    for (const char of testString) {
      this.simulateUserInput(char);
      await this.delay(200);
    }

    await this.delay(2000);

    const finalContent = this.editorView.state.doc.textContent;
    const expectedContent = initialContent + testString;

    const testResult = {
      test: "continuous_input",
      input: testString,
      initialContent,
      finalContent,
      expectedContent,
      passed: finalContent === expectedContent,
      duplicated: this.checkForDuplication(finalContent, testString),
    };

    this.testResults.push({
      type: "test_result",
      data: testResult,
      timestamp: Date.now(),
    });

    console.log("🧪 [测试] 连续输入测试结果:", testResult);
  }

  /**
   * 测试删除操作
   */
  async testDeleteOperation() {
    console.log("🧪 [测试] 执行删除操作测试");

    // 先插入一些文本
    this.simulateUserInput("test");
    await this.delay(500);

    const beforeDelete = this.editorView.state.doc.textContent;

    // 模拟删除操作
    this.simulateDelete(1);
    await this.delay(2000);

    const afterDelete = this.editorView.state.doc.textContent;

    const testResult = {
      test: "delete_operation",
      beforeDelete,
      afterDelete,
      passed: afterDelete.length === beforeDelete.length - 1,
      overDeleted: afterDelete.length < beforeDelete.length - 1,
    };

    this.testResults.push({
      type: "test_result",
      data: testResult,
      timestamp: Date.now(),
    });

    console.log("🧪 [测试] 删除操作测试结果:", testResult);
  }

  /**
   * 模拟用户输入
   */
  simulateUserInput(text) {
    const { state } = this.editorView;
    const tr = state.tr.insertText(text, state.selection.from);
    this.editorView.dispatch(tr);
  }

  /**
   * 模拟删除操作
   */
  simulateDelete(length = 1) {
    const { state } = this.editorView;
    const from = Math.max(0, state.selection.from - length);
    const tr = state.tr.delete(from, state.selection.from);
    this.editorView.dispatch(tr);
  }

  /**
   * 检查是否存在重复
   */
  checkForDuplication(content, originalInput) {
    const duplicatedPattern = originalInput
      .split("")
      .map((char) => char.repeat(2))
      .join("");
    return content.includes(duplicatedPattern);
  }

  /**
   * 生成测试报告
   */
  generateReport() {
    const report = {
      testId: this.testId,
      summary: {
        totalOperations: this.testResults.filter(
          (r) => r.type !== "test_result"
        ).length,
        testResults: this.testResults.filter((r) => r.type === "test_result"),
        passed: 0,
        failed: 0,
        duplicationsDetected: 0,
      },
      details: this.testResults,
    };

    report.summary.testResults.forEach((result) => {
      if (result.data.passed) {
        report.summary.passed++;
      } else {
        report.summary.failed++;
      }

      if (result.data.duplicated || result.data.overDeleted) {
        report.summary.duplicationsDetected++;
      }
    });

    console.log("🧪 [测试] 测试报告:", report);

    // 保存到localStorage供调试使用
    localStorage.setItem(
      `ot_test_report_${this.testId}`,
      JSON.stringify(report)
    );

    this.isRunning = false;
    return report;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 停止测试
   */
  stopTest() {
    this.isRunning = false;
    console.log("🧪 [测试] 测试已停止");
  }
}

// 创建全局测试实例
window.OTDuplicationTest = OTDuplicationTest;

export default OTDuplicationTest;
