/**
 * OT content duplication issue test tool
 * Used to verify if content duplication issues exist during multi-window collaboration
 */

class OTDuplicationTest {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
    this.testId = `test_${Date.now()}`;
  }

  /**
   * Start duplication issue test
   */
  startTest(otClient, editorView) {
    if (this.isRunning) {
      console.warn("🧪 [TEST] Test is already running");
      return;
    }

    this.isRunning = true;
    this.otClient = otClient;
    this.editorView = editorView;

    console.log("🧪 [TEST] Starting OT duplication issue test", {
      testId: this.testId,
      clientId: otClient?.connectionId,
      editorConnected: !!editorView,
    });

    // Listen to operation events
    this.monitorOperations();

    // Execute test cases
    this.runTestCases();
  }

  /**
   * Listen to operation events
   */
  monitorOperations() {
    if (!this.otClient || !this.editorView) return;

    // Record sent operations
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

    // Listen to received operations
    this.otClient.on("operation", (data) => {
      this.recordOperation("received", {
        ...data,
        timestamp: Date.now(),
      });
    });

    // Listen to editor changes
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
   * Record operation
   */
  recordOperation(type, data) {
    const record = {
      type,
      data,
      testId: this.testId,
      timestamp: Date.now(),
    };

    this.testResults.push(record);
    console.log(`🧪 [test] Record operation:`, record);
  }

  /**
   * Execute test cases
   */
  async runTestCases() {
    await this.delay(1000); // 等待连接稳定

    // test用例1: singlecharacterinput
    await this.testSingleCharacterInput();

    // test用例2: 连续input
    await this.testContinuousInput();

    // test用例3: deleteoperation
    await this.testDeleteOperation();

    // generatetestreport
    this.generateReport();
  }

  /**
   * testsinglecharacterinput
   */
  async testSingleCharacterInput() {
    console.log("🧪 [test] 执行singlecharacterinputtest");

    const testChar = "1";
    const initialContent = this.editorView.state.doc.textContent;

    // 模拟用户input
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

    console.log("🧪 [test] singlecharacterinputtestresults:", testResult);
  }

  /**
   * test连续input
   */
  async testContinuousInput() {
    console.log("🧪 [test] 执行连续inputtest");

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

    console.log("🧪 [test] 连续inputtestresults:", testResult);
  }

  /**
   * testdeleteoperation
   */
  async testDeleteOperation() {
    console.log("🧪 [test] 执行deleteoperationtest");

    // first插入一些文本
    this.simulateUserInput("test");
    await this.delay(500);

    const beforeDelete = this.editorView.state.doc.textContent;

    // 模拟deleteoperation
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

    console.log("🧪 [test] deleteoperationtestresults:", testResult);
  }

  /**
   * 模拟用户input
   */
  simulateUserInput(text) {
    const { state } = this.editorView;
    const tr = state.tr.insertText(text, state.selection.from);
    this.editorView.dispatch(tr);
  }

  /**
   * 模拟deleteoperation
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
   * generatetestreport
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

    console.log("🧪 [test] testreport:", report);

    // Save到localStorage供调试使用
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
   * 停止test
   */
  stopTest() {
    this.isRunning = false;
    console.log("🧪 [test] testalready停止");
  }
}

// 创建全局test实例
window.OTDuplicationTest = OTDuplicationTest;

export default OTDuplicationTest;
