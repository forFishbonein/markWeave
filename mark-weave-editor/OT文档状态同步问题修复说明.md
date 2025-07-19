# OT 文档状态同步问题修复说明

## 🚨 问题描述

**第二个窗口输入内容后，第一个窗口再次输入的内容无法同步到第二个窗口**

## 🔍 问题分析

### 现象

1. **左侧窗口**：内容较短，例如显示几个字符
2. **右侧窗口**：内容很长，包含大量重复字符
3. **同步失败**：后续操作无法正确同步

### 根本原因

#### 1. **文档状态不一致**

```
窗口1: "abc"              (长度: 3)
窗口2: "abcabcabcabc..."   (长度: 20+，包含重复内容)
```

#### 2. **位置计算错误**

```javascript
// 窗口1 计算操作位置
deltaOps.push({ retain: step.from }); // 假设 step.from = 3

// 但窗口2 的文档长度不是3，而是20+
// 导致 retain: 3 在窗口2中指向错误位置
```

#### 3. **操作失效**

```javascript
// 服务器尝试应用操作: [{ retain: 3 }, { insert: "d" }]
// 在长文档中 retain: 3 指向不正确的位置
// 导致操作无法正确应用或被忽略
```

## 🛠️ 修复方案

### 方案 1: 添加文档长度验证

在 `processUserOperations` 中添加文档状态检查：

```javascript
const processUserOperations = (tr, client) => {
  // 🔥 新增：获取当前文档状态信息
  const currentDoc = viewRef.current.state.doc;
  const currentLength = currentDoc.textContent.length;
  const currentContent = currentDoc.textContent;

  console.log("🔍 [OT] 当前文档状态:", {
    length: currentLength,
    content:
      currentContent.substring(0, 50) + (currentLength > 50 ? "..." : ""),
    docVersion: client.documents.get(`${collection}/${docId}`)?.version,
  });

  // 处理每个步骤时验证位置
  tr.steps.forEach((step, index) => {
    if (step.slice && step.slice.content.size > 0) {
      // 🔥 修复：验证插入位置的有效性
      const insertPos = step.from;
      const docSize = currentDoc.content.size;

      if (insertPos > docSize) {
        console.error(
          `❌ [OT] 插入位置超出文档范围: ${insertPos} > ${docSize}`
        );
        return; // 跳过无效操作
      }

      // 动态调整 retain 位置，基于当前文档的真实长度
      const actualRetain = Math.min(insertPos, docSize);

      const deltaOps = [];
      if (actualRetain > 0) {
        deltaOps.push({ retain: actualRetain });
      }

      // ... 其余插入逻辑
    }
  });
};
```

### 方案 2: 强制文档状态同步

在检测到状态不一致时，强制同步：

```javascript
const updateEditorFromOT = (data) => {
  // 🔥 新增：检测文档状态不一致
  if (data.data !== undefined) {
    const currentContent = viewRef.current.state.doc.textContent;
    const expectedContent = reconstructTextFromShareDB(data.data);

    if (currentContent !== expectedContent) {
      console.warn("⚠️ [OT] 检测到文档状态不一致", {
        current: currentContent.length,
        expected: expectedContent.length,
        currentPreview: currentContent.substring(0, 30),
        expectedPreview: expectedContent.substring(0, 30),
      });

      // 强制重建文档
      forceDocumentRebuild(data.data);
      return;
    }
  }

  // ... 其余处理逻辑
};

const forceDocumentRebuild = (shareDBData) => {
  console.log("🔄 [OT] 强制重建文档状态");

  const reconstructedContent = reconstructDocumentFromShareDB(shareDBData);

  if (reconstructedContent) {
    const newDoc = schema.nodes.doc.create(
      null,
      schema.nodes.paragraph.create(null, reconstructedContent)
    );

    const tr = viewRef.current.state.tr
      .setMeta("fromOT", true)
      .setMeta("forceRebuild", true)
      .replaceWith(0, viewRef.current.state.doc.content.size, newDoc.content);

    viewRef.current.dispatch(tr);
    console.log("✅ [OT] 文档状态强制同步完成");
  }
};
```

### 方案 3: 添加操作队列和重试机制

```javascript
class OTOperationQueue {
  constructor() {
    this.pendingOperations = [];
    this.retryCount = new Map();
    this.maxRetries = 3;
  }

  addOperation(op, callback) {
    const opId = `op_${Date.now()}_${Math.random()}`;
    this.pendingOperations.push({
      id: opId,
      operation: op,
      callback,
      timestamp: Date.now(),
    });

    this.processQueue();
  }

  processQueue() {
    if (this.pendingOperations.length === 0) return;

    const nextOp = this.pendingOperations[0];
    const retries = this.retryCount.get(nextOp.id) || 0;

    if (retries >= this.maxRetries) {
      console.error("❌ [OT] 操作重试次数超限，放弃操作:", nextOp);
      this.pendingOperations.shift();
      this.retryCount.delete(nextOp.id);
      this.processQueue();
      return;
    }

    try {
      // 验证操作的有效性
      if (this.validateOperation(nextOp.operation)) {
        nextOp.callback();
        this.pendingOperations.shift();
        this.retryCount.delete(nextOp.id);
      } else {
        // 操作无效，等待文档同步后重试
        this.retryCount.set(nextOp.id, retries + 1);
        setTimeout(() => this.processQueue(), 100);
        return;
      }
    } catch (error) {
      console.error("❌ [OT] 操作处理失败:", error);
      this.retryCount.set(nextOp.id, retries + 1);
      setTimeout(() => this.processQueue(), 100);
      return;
    }

    // 继续处理下一个操作
    setTimeout(() => this.processQueue(), 10);
  }

  validateOperation(op) {
    const currentDocSize = viewRef.current?.state.doc.content.size || 0;

    for (const delta of op) {
      if (delta.retain && delta.retain > currentDocSize) {
        console.warn("⚠️ [OT] 操作位置超出文档范围:", delta);
        return false;
      }
    }

    return true;
  }
}
```

### 方案 4: 定期状态同步检查

```javascript
const startDocumentSyncMonitor = () => {
  const syncInterval = setInterval(() => {
    if (!otClientRef.current || !viewRef.current) return;

    // 请求最新的文档状态
    otClientRef.current.requestDocumentSync(collection, docId);
  }, 5000); // 每5秒检查一次

  return () => clearInterval(syncInterval);
};

// 在 OTClient 中添加
class OTClient {
  requestDocumentSync(collection, id) {
    if (!this.isConnected) return;

    this.sendMessage({
      type: "requestSync",
      collection,
      id,
      timestamp: Date.now(),
    });
  }
}
```

## 🧪 验证方法

### 1. 添加调试日志

```javascript
console.log("🔍 [DEBUG] 文档状态对比:", {
  window1Length: currentContent.length,
  window2Length: otherWindowContent.length,
  contentMatch: currentContent === otherWindowContent,
});
```

### 2. 实时状态监控

```javascript
const monitorDocumentState = () => {
  setInterval(() => {
    const doc1 = window1.state.doc.textContent;
    const doc2 = window2.state.doc.textContent;

    if (doc1 !== doc2) {
      console.warn("⚠️ 文档状态不一致检测到!");
      console.log("窗口1:", doc1);
      console.log("窗口2:", doc2);
    }
  }, 1000);
};
```

### 3. 操作有效性检查

```javascript
const validateOperationPosition = (op, docSize) => {
  for (const delta of op) {
    if (delta.retain && delta.retain > docSize) {
      console.error("❌ 无效操作位置:", delta.retain, "文档大小:", docSize);
      return false;
    }
  }
  return true;
};
```

## 🎯 预期效果

修复后：

- ✅ **状态一致性**：两个窗口的文档状态始终保持同步
- ✅ **位置准确性**：操作位置计算基于准确的文档状态
- ✅ **容错能力**：检测到状态不一致时自动修复
- ✅ **操作可靠性**：无效操作会被重试或丢弃

核心思路是**确保操作位置计算基于准确的文档状态**，并在检测到不一致时主动修复！
