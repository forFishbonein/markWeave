# CRDT 和 OT 性能指标计算总结

## 0、两种性能测量的示例

### CRDT 多窗口性能：

![image-20250720231135548](https://aronimage.oss-cn-hangzhou.aliyuncs.com/image-20250720231135548.png)

### OT 多窗口性能：

![image-20250720222927593](https://aronimage.oss-cn-hangzhou.aliyuncs.com/image-20250720222927593.png)

| 指标         | OT（ShareDB）   | CRDT（Yjs） | 结论/原因                              |
| ------------ | --------------- | ----------- | -------------------------------------- |
| 实时延迟     | 87.3ms/283.4ms  | 1.8ms/1.9ms | CRDT 远低于 OT，OT 受网络/服务器影响大 |
| P95 延迟     | 474.3ms/826.7ms | 3.7ms/4.2ms | CRDT 极其稳定，OT 有高波动尾部         |
| E2E 延迟     | 163.3ms/166.0ms | 2.1ms/2.3ms | CRDT 端到端延迟极低，OT 网络往返明显   |
| 样本数       | 0/32            | 20/22       | CRDT 统计更稳定，OT 左窗口数据需确认   |
| 多窗口一致性 | 差异较大        | 极为一致    | CRDT 本地优先，OT 依赖服务器和网络     |

- **CRDT（Yjs）在多窗口下延迟极低且一致，体验极佳。**
- **OT（ShareDB）在多窗口下延迟明显更高，且波动大，P95 延迟尤其突出。**
- **CRDT 的优势在于本地优先、无需等待服务器，OT 的劣势在于每次都要服务器确认。**

## 1、CRDT 和 OT 性能指标计算总结

### 1.1 共同的核心逻辑

#### 1.1.1 基础数据结构

```javascript
// 两者都使用相同的指标存储结构
this.metrics = {
  operationsCount: 0, // 操作/更新次数
  keystrokes: 0, // 按键计数
  operationLatencies: [], // 延迟数组 (核心指标)
  networkLatencies: [], // 网络延迟数组
  // 🔥 新增：端到端延迟指标
  endToEndLatencies: [], // E2E延迟数组
  realNetworkBytes: {
    sent: 0,
    received: 0,
  },
};

this.pendingOperations = []; // 待匹配的用户操作队列
this.windowId = `${type}-${Date.now()}-${random}`; // 窗口唯一标识

// 🔥 新增：E2E延迟相关数据结构
this.pendingE2E = new Map(); // {hash: timestamp} - 发送消息哈希到时间戳
this.pendingOperationMessages = new Map(); // {messageId: timestamp} - 操作消息ID到时间戳
```

#### 1.1.2 键盘输入处理

```javascript
handleKeydown(event) {
  // 只监听编辑器内的操作
  if (event.target.closest("[contenteditable]") ||
      event.target.closest(".ProseMirror")) {

    const timestamp = performance.now();
    this.metrics.keystrokes++;

    const operation = {
      id: `op_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      key: event.key,
      keyCode: event.keyCode,
      windowId: this.windowId,
    };

    // 只记录可打印字符到待匹配队列
    if (this.isPrintableKey(event.key)) {
      this.pendingOperations.push(operation);

      // 清理1秒前的过期操作
      const cutoffTime = timestamp - 1000;
      this.pendingOperations = this.pendingOperations.filter(
        (op) => op.timestamp > cutoffTime
      );
    }
  }
}

// 相同的可打印字符判断
isPrintableKey(key) {
  return (
    key.length === 1 ||
    key === "Enter" ||
    key === "Space" ||
    key === "Backspace" ||
    key === "Delete"
  );
}
```

#### 1.1.3 操作匹配算法

```javascript
/**
 * 查找并移除匹配的操作
 * 实际运行示例：
 * 假设用户连续输入 "abc"
 * t=100ms: 用户按下 'a' -> pendingOperations = [{id:1, timestamp:100, key:'a'}]
 * t=150ms: 用户按下 'b' -> pendingOperations = [{id:1, timestamp:100, key:'a'}, {id:2, timestamp:150, key:'b'}]
 * t=200ms: 用户按下 'c' -> pendingOperations = [..., {id:3, timestamp:200, key:'c'}]
 *
 * t=250ms: 文档更新事件触发 (可能是 'c' 的输入导致的)
 * findAndRemoveMatchingOperation(250)
 *
 * 1. timeWindow = 1000, cutoffTime = 250 - 1000 = -750
 * 2. validOperations = 所有操作 (都 > -750)
 * 3. matchedOp = {id:3, timestamp:200, key:'c'} (最近的操作)
 * 4. 从队列中移除 id:3 的操作
 * 5. 返回 {id:3, timestamp:200, key:'c'}
 *
 * 计算延迟: 250 - 200 = 50ms (用户感知延迟)
 */
findAndRemoveMatchingOperation(updateTimestamp) {
  if (this.pendingOperations.length === 0) return null;

  const timeWindow = 1000; // 1秒时间窗口
  const cutoffTime = updateTimestamp - timeWindow;

  // 过滤掉过期操作
  const validOperations = this.pendingOperations.filter(
    (op) => op.timestamp > cutoffTime
  );

  if (validOperations.length === 0) return null;

  // 使用LIFO策略：匹配最近的操作 ——> 也就是最晚的操作
  const matchedOp = validOperations[validOperations.length - 1];

  // 从队列中移除已匹配的操作
  this.pendingOperations = this.pendingOperations.filter(
    (op) => op.id !== matchedOp.id
  );

  return matchedOp;
}
```

#### 1.1.4 P95 延迟计算策略

```javascript
// 分层P95计算策略
const recentWindow = 4000; // 4秒时间窗口
const recentLatencies = this.metrics.operationLatencies
  .filter((l) => l.timestamp > now - recentWindow)
  .map((l) => l.latency);

const allLatencies = this.metrics.operationLatencies.map((l) => l.latency);

let latenciesToUse, p95Latency, avgLatency;

if (recentLatencies.length >= 12) {
  // 策略1：最近数据充足，使用4秒内数据
  latenciesToUse = recentLatencies;
} else if (allLatencies.length >= 20) {
  // 策略2：历史数据充足，使用全部数据
  latenciesToUse = allLatencies;
} else if (allLatencies.length >= 6) {
  // 策略3：数据较少，使用全部数据但置信度低
  latenciesToUse = allLatencies;
} else {
  // 策略4：数据不足，使用现有数据
  latenciesToUse = allLatencies;
}

// 计算平均延迟和P95延迟
if (latenciesToUse.length > 0) {
  avgLatency =
    latenciesToUse.reduce((a, b) => a + b, 0) / latenciesToUse.length;

  if (latenciesToUse.length >= 6) {
    // 真实P95计算
    const sortedLatencies = [...latenciesToUse].sort((a, b) => a - b);
    p95Latency =
      sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  } else {
    // 估算P95 = 平均值 * 1.5
    p95Latency = avgLatency * 1.5;
  }
} else {
  avgLatency = 0;
  p95Latency = 0;
}
```

#### 1.1.5 🔥 新增：E2E 延迟计算

```javascript
// 🔥 E2E延迟计算核心逻辑
setupRealWebSocketMonitoring() {
  const ws = this.otClient.ws; // 或 this.provider.ws (CRDT)

  // 拦截发送的消息
  const originalSend = ws.send.bind(ws);
  ws.send = (data) => {
    const timestamp = performance.now();
    const size = data.length || data.byteLength || 0;

    // 计算消息哈希
    let hash = null;
    if (data instanceof Uint8Array) {
      hash = this.crc32(data);
    } else if (typeof data === "string") {
      hash = this.simpleHash(data);
    }

    if (hash !== null) {
      this.pendingE2E.set(hash, timestamp);

      // 提取messageId用于操作匹配
      let messageId = null;
      if (typeof data === "string") {
        try {
          const message = JSON.parse(data);
          messageId = message._messageId || message.messageId;
        } catch (e) {
          // 忽略JSON解析错误
        }
      }

      if (messageId) {
        this.pendingOperationMessages.set(messageId, timestamp);
      }
    }

    return originalSend(data);
  };

  // 拦截接收的消息
  ws.addEventListener("message", (event) => {
    const timestamp = performance.now();
    const size = event.data.length || event.data.byteLength || 0;

    // 计算接收消息哈希
    let hash = null;
    if (event.data instanceof Uint8Array) {
      hash = this.crc32(event.data);
    } else if (typeof event.data === "string") {
      hash = this.simpleHash(event.data);
    }

    if (hash !== null) {
      const sendTime = this.pendingE2E.get(hash);

      if (sendTime) {
        // 计算E2E延迟
        const e2eLatency = timestamp - sendTime;

        if (e2eLatency >= 0.1 && e2eLatency <= 10000) {
          this.metrics.endToEndLatencies.push({
            latency: e2eLatency,
            timestamp,
            size,
            windowId: this.windowId,
            isReal: true,
          });
        }

        // 清理已匹配的发送记录
        this.pendingE2E.delete(hash);
      }
    }

    // 尝试通过messageId匹配操作响应
    if (typeof event.data === "string") {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "docUpdate" && message.data?._messageId) {
          const operationSendTime = this.pendingOperationMessages.get(message.data._messageId);
          if (operationSendTime) {
            const operationE2ELatency = timestamp - operationSendTime;
            // 记录操作级别的E2E延迟
            this.pendingOperationMessages.delete(message.data._messageId);
          }
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }
  });
}

// 🔥 E2E延迟统计计算
getAggregatedMetrics() {
  // ... 其他指标计算 ...

  // 🔥 新增：端到端延迟统计
  const allEndToEndLatencies = this.metrics.endToEndLatencies.map(l => l.latency);

  let avgE2ELatency = 0;
  let p95E2ELatency = 0;

  if (allEndToEndLatencies.length > 0) {
    avgE2ELatency = allEndToEndLatencies.reduce((a, b) => a + b, 0) / allEndToEndLatencies.length;

    if (allEndToEndLatencies.length >= 6) {
      const sortedE2ELatencies = [...allEndToEndLatencies].sort((a, b) => a - b);
      p95E2ELatency = sortedE2ELatencies[Math.floor(sortedE2ELatencies.length * 0.95)] || 0;
    } else {
      p95E2ELatency = avgE2ELatency * 1.5;
    }
  }

  return {
    // ... 其他指标 ...
    avgE2ELatency,
    p95E2ELatency,
    e2eSamples: allEndToEndLatencies.length,
  };
}
```

#### 1.1.6 🔥 新增：E2E 延迟数据清理

```javascript
// 定期清理过期的E2E数据
cleanupExpiredE2EData() {
  const now = performance.now();
  const cutoffTime = now - 10000; // 10秒窗口

  // 清理过期的哈希记录
  for (const [hash, timestamp] of this.pendingE2E.entries()) {
    if (timestamp < cutoffTime) {
      this.pendingE2E.delete(hash);
    }
  }

  // 清理过期的消息ID记录
  for (const [messageId, timestamp] of this.pendingOperationMessages.entries()) {
    if (timestamp < cutoffTime) {
      this.pendingOperationMessages.delete(messageId);
    }
  }
}
```

### 1.2 不同的延迟测量逻辑

#### 1.2.1 CRDT (Yjs)：本地即时响应延迟

```javascript
/**
 * 开始监控 ——> 核心函数
 */
startMonitoring(ydoc, awareness, provider) {
  // 设置事件监听器
  if (ydoc) {
    ydoc.off("update", this.handleDocumentUpdate);
    ydoc.on("update", this.handleDocumentUpdate); // 监听文档更新
  }

  if (awareness) {
    awareness.on("change", this.handleAwarenessChange); // 监听用户状态变化
  }

  if (provider) {
    provider.on("status", this.handleProviderStatus); // 监听WebSocket连接状态
  }

  document.addEventListener("keydown", this.handleKeydown); // 监听键盘输入

  // 🔥 新增：拦截WebSocket来监控E2E延迟
  this.setupRealWebSocketMonitoring();

  // 🔥 新增：定期清理过期的E2E数据
  this.e2eCleanupInterval = setInterval(() => {
    this.cleanupExpiredE2EData();
  }, 5000); // 每5秒清理一次
}

handleDocumentUpdate(update, origin) {
  const timestamp = performance.now();

  // 🔥 CRDT特色：只测量本地操作的即时响应
  if (!origin || origin === "local" || origin === this.ydoc?.clientID) {
    const matchedOperation = this.findAndRemoveMatchingOperation(timestamp);

    if (matchedOperation) {
      // 计算本地响应延迟 = 文档更新时间 - 键盘输入时间
      const userPerceivedLatency = timestamp - matchedOperation.timestamp;

      // CRDT延迟范围：0.1ms - 1000ms (期望低延迟)
      if (userPerceivedLatency >= 0.1 && userPerceivedLatency <= 1000) {
        const latencyRecord = {
          latency: userPerceivedLatency,
          timestamp,
          operationType: matchedOperation.key,
          source: "user_perceived",
          // CRDT无需标记isReal，因为都是本地响应
        };
        this.metrics.operationLatencies.push(latencyRecord);
      }
    }
  } else {
    // 远程操作：不影响本地用户感知延迟，不记录
    console.log(`📥 [CRDT] 远程操作（不影响用户感知）: 来源 ${origin}`);
  }
}
```

#### 1.2.2 OT (ShareDB)：服务器往返延迟

```javascript
/**
 * 开始监控
 */
startMonitoring(otClient) {
  this.otClient = otClient;
  this.isMonitoring = true;
  this.startTime = performance.now();

  // 设置真实事件监听
  this.setupRealEventListeners();

  // 开始数据同步
  this.startDataSync();
}

/**
 * 设置真实事件监听器
 */
setupRealEventListeners() {
  document.addEventListener("keydown", this.handleKeydown);

  if (this.otClient) {
    this.otClient.on("docUpdate", this.handleDocUpdate);
    this.otClient.on("operation", this.handleOperation);
    this.otClient.on("pong", this.handlePong);
  }

  this.monitorConnectionEvents();

  // 🔥 关键：真实WebSocket消息拦截
  this.setupRealWebSocketMonitoring();
}

handleDocUpdate(data) {
  const timestamp = performance.now();

  // 🔥 OT特色：测量服务器确认延迟
  const isLocalOperationConfirm =
    !data ||
    data.source === "local" ||
    data.source === this.windowId ||
    data.clientId === this.windowId;

  if (isLocalOperationConfirm) {
    const matchedOperation = this.findAndRemoveMatchingOperation(timestamp);

    if (matchedOperation) {
      // 计算服务器往返延迟 = 服务器确认时间 - 键盘输入时间
      const userPerceivedLatency = timestamp - matchedOperation.timestamp;

      // OT延迟范围：0.1ms - 5000ms (允许更高延迟)
      if (userPerceivedLatency >= 0.1 && userPerceivedLatency <= 5000) {
        const latencyRecord = {
          latency: userPerceivedLatency,
          timestamp,
          operationType: matchedOperation.key,
          source: "user_perceived",
          isReal: true,  // 🔥 OT标记真实数据
        };
        this.metrics.operationLatencies.push(latencyRecord);
      }
    }
  } else {
    // 远程操作：不影响本地用户感知延迟
    console.log(`📥 [OT] 远程操作（不影响用户感知）:`, data);
  }
}
```

### 1.3 不同的网络监控方式

#### 1.3.1 CRDT (Yjs)：Awareness + WebSocket 拦截

```javascript
// Awareness ping-pong网络延迟测试
startPingTest() {
  setInterval(() => {
    const startTime = performance.now();
    const pingId = Math.random().toString(36).substr(2, 9);

    // 通过awareness发送ping
    this.awareness.setLocalStateField("ping", {
      id: pingId,
      timestamp: startTime,
    });

    // 监听pong响应
    const handlePong = (changes) => {
      states.forEach((state, clientId) => {
        if (state.ping?.id === pingId && clientId !== this.awareness.clientID) {
          const endTime = performance.now();
          const latency = endTime - startTime;

          this.metrics.networkLatencies.push({
            latency,
            timestamp: endTime,
            clientId,
            windowId: this.windowId,
          });
        }
      });
    };
  }, 5000); // 每5秒ping一次
}

// 🔥 增强的WebSocket拦截（支持E2E延迟）
setupRealWebSocketMonitoring() {
  const ws = this.provider.ws;

  const originalSend = ws.send.bind(ws);
  ws.send = (data) => {
    const timestamp = performance.now();
    const size = data.length || data.byteLength || 0;

    // 计算消息哈希
    let hash = null;
    if (data instanceof Uint8Array) {
      hash = this.crc32(data);
    } else if (typeof data === "string") {
      hash = this.simpleHash(data);
    }

    if (hash !== null) {
      this.pendingE2E.set(hash, timestamp);
    }

    this.metrics.networkEvents.push({
      type: "send",
      timestamp,
      size,
    });

    return originalSend(data);
  };

  // 拦截接收消息
  ws.addEventListener("message", (event) => {
    const timestamp = performance.now();
    const size = event.data.length || event.data.byteLength || 0;

    // 计算接收消息哈希
    let hash = null;
    if (event.data instanceof Uint8Array) {
      hash = this.crc32(event.data);
    } else if (typeof event.data === "string") {
      hash = this.simpleHash(event.data);
    }

    if (hash !== null) {
      const sendTime = this.pendingE2E.get(hash);

      if (sendTime) {
        // 计算E2E延迟
        const e2eLatency = timestamp - sendTime;

        if (e2eLatency >= 0.1 && e2eLatency <= 10000) {
          this.metrics.endToEndLatencies.push({
            latency: e2eLatency,
            timestamp,
            size,
            windowId: this.windowId,
            isReal: true,
          });
        }

        this.pendingE2E.delete(hash);
      }
    }

    this.metrics.networkEvents.push({
      type: "receive",
      timestamp,
      size,
    });
  });
}
```

#### 1.3.2 OT (ShareDB)：真实 WebSocket 消息拦截

```javascript
// 🔥 OT优势：完整的WebSocket消息拦截
setupRealWebSocketMonitoring() {
  const ws = this.otClient.ws;

  // 拦截发送
  const originalSend = ws.send;
  ws.send = (data) => {
    const timestamp = performance.now();
    const messageSize = new Blob([data]).size;  // 精确字节计算

    this.realNetworkStats.messagesSent++;
    this.realNetworkStats.bytesSent += messageSize;
    this.metrics.realNetworkBytes.sent += messageSize;

    // 🔥 新增：E2E延迟计算
    let hash = null;
    if (data instanceof Uint8Array) {
      hash = this.crc32(data);
    } else if (typeof data === "string") {
      hash = this.simpleHash(data);
    }

    if (hash !== null) {
      this.pendingE2E.set(hash, timestamp);

      // 提取messageId用于操作匹配
      let messageId = null;
      if (typeof data === "string") {
        try {
          const message = JSON.parse(data);
          messageId = message._messageId || message.messageId;
        } catch (e) {
          // 忽略JSON解析错误
        }
      }

      if (messageId) {
        this.pendingOperationMessages.set(messageId, timestamp);
      }
    }

    this.metrics.networkEvents.push({
      type: "send",
      timestamp,
      size: messageSize,
      data: data,  // 保存完整消息内容
    });

    return originalSend.call(ws, data);
  };

  // 拦截接收
  ws.addEventListener("message", (event) => {
    const timestamp = performance.now();
    const messageSize = new Blob([event.data]).size;

    this.realNetworkStats.messagesReceived++;
    this.realNetworkStats.bytesReceived += messageSize;
    this.metrics.realNetworkBytes.received += messageSize;

    // 🔥 新增：E2E延迟计算
    let hash = null;
    if (event.data instanceof Uint8Array) {
      hash = this.crc32(event.data);
    } else if (typeof event.data === "string") {
      hash = this.simpleHash(event.data);
    }

    if (hash !== null) {
      const sendTime = this.pendingE2E.get(hash);

      if (sendTime) {
        // 计算E2E延迟
        const e2eLatency = timestamp - sendTime;

        if (e2eLatency >= 0.1 && e2eLatency <= 10000) {
          this.metrics.endToEndLatencies.push({
            latency: e2eLatency,
            timestamp,
            size: messageSize,
            windowId: this.windowId,
            isReal: true,
          });
        }

        this.pendingE2E.delete(hash);
      }
    }

    // 尝试通过messageId匹配操作响应
    if (typeof event.data === "string") {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "docUpdate" && message.data?._messageId) {
          const operationSendTime = this.pendingOperationMessages.get(message.data._messageId);
          if (operationSendTime) {
            const operationE2ELatency = timestamp - operationSendTime;
            // 记录操作级别的E2E延迟
            this.pendingOperationMessages.delete(message.data._messageId);
          }
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }

    // 解析消息并触发相应处理
    try {
      const message = JSON.parse(event.data);
      if (message.type === "docUpdate" || message.type === "op") {
        this.handleDocUpdate(message);  // 直接触发延迟计算
      }
    } catch (error) {
      console.warn("解析消息失败:", error);
    }
  });
}
```

### 1.4 最终指标输出格式

#### 1.4.1 共同的核心指标

```javascript
return {
  // 延迟指标 (计算方法相同)
  avgLatency, // 平均延迟
  p95Latency, // P95延迟

  // 🔥 新增：E2E延迟指标
  avgE2ELatency, // 平均E2E延迟
  p95E2ELatency, // P95 E2E延迟
  e2eSamples, // E2E样本数

  // 操作统计 (字段名略有不同)
  operationsCount, // CRDT: documentUpdates, OT: operationsCount
  keystrokes, // 按键次数

  // 样本质量 (评估方法相同)
  latencySamples, // 总样本数
  recentLatencySamples, // 最近样本数
  dataQuality: {
    calculationMethod: "recent|historical|limited|estimated",
    confidence: "high|medium|low",
  },

  // 多窗口信息
  windowId,
  totalWindows, // CRDT专有，OT用windowCount

  // 🔥 新增：数据真实性标记
  dataSource: "real-websocket-monitoring",
  hasRealNetworkData: this.metrics.networkEvents.length > 0,
  hasRealLatencyData:
    this.metrics.operationLatencies.filter((l) => l.isReal).length > 0,
  hasRealE2EData: this.metrics.endToEndLatencies.length > 0,
};
```

### 1.5 核心差异总结

| 方面             | 相同点          | CRDT 差异      | OT 差异             |
| ---------------- | --------------- | -------------- | ------------------- |
| **操作匹配**     | LIFO + 1 秒窗口 | -              | -                   |
| **P95 计算**     | 分层策略        | -              | -                   |
| **E2E 计算**     | WebSocket 拦截  | 简单哈希匹配   | 复杂 messageId 匹配 |
| **延迟定义**     | -               | 本地即时响应   | 服务器往返确认      |
| **延迟范围**     | -               | 0.1ms-1000ms   | 0.1ms-5000ms        |
| **网络监控**     | -               | Awareness ping | 真实 WebSocket 拦截 |
| **数据精度**     | -               | 部分估算       | 100%真实测量        |
| **E2E 数据清理** | 10 秒窗口清理   | 10 秒窗口清理  | 10 秒窗口清理       |

两个监控器的核心算法逻辑高度一致，主要差异在于延迟的定义和网络监控的实现方式，这也反映了 CRDT 和 OT 两种算法的本质区别。

## 2、CRDT vs OT 延迟测量的区别

### 2.1 相同点：延迟计算公式

```javascript
// 两者都使用相同的公式：
const userPerceivedLatency = timestamp - matchedOperation.timestamp;
```

### 2.2 真正区别：触发时机和事件来源

#### 2.2.1 CRDT (Yjs)：本地文档更新事件

```javascript
// CRDT触发时机：ydoc.on('update') 事件
handleDocumentUpdate(update, origin) {
  const timestamp = performance.now();

  // 关键：只处理本地操作
  if (!origin || origin === "local" || origin === this.ydoc?.clientID) {
    const matchedOperation = this.findAndRemoveMatchingOperation(timestamp);

    if (matchedOperation) {
      // 延迟 = 本地文档更新时间 - 键盘输入时间
      const userPerceivedLatency = timestamp - matchedOperation.timestamp;
      // CRDT：本地即时响应，延迟通常很小 (0.1ms-1000ms)
    }
  }
}
```

#### 2.2.2 OT (ShareDB)：服务器确认事件

```javascript
// OT触发时机：otClient.on('docUpdate') 事件
handleDocUpdate(data) {
  const timestamp = performance.now();

  // 关键：检查是否为本地操作的服务器确认
  const isLocalOperationConfirm =
    !data ||
    data.source === "local" ||
    data.source === this.windowId ||
    !data.clientId ||
    data.clientId === this.windowId;

  if (isLocalOperationConfirm) {
    const matchedOperation = this.findAndRemoveMatchingOperation(timestamp);

    if (matchedOperation) {
      // 延迟 = 服务器确认时间 - 键盘输入时间
      const userPerceivedLatency = timestamp - matchedOperation.timestamp;
      // OT：需要服务器往返，延迟通常更大 (0.1ms-5000ms)
    }
  }
}
```

### 2.3 核心差异总结

| 方面         | CRDT (Yjs)          | OT (ShareDB)               |
| ------------ | ------------------- | -------------------------- |
| **触发事件** | `ydoc.on('update')` | `otClient.on('docUpdate')` |
| **事件含义** | 本地文档状态变化    | 服务器确认文档更新         |
| **延迟范围** | 0.1ms - 1000ms      | 0.1ms - 5000ms             |
| **网络依赖** | 本地即时响应        | 需要服务器往返             |
| **估算策略** | 无法匹配时用 1ms    | 无法匹配时用 50ms          |

### 2.4 为什么 OT 延迟更大？

1. **CRDT**：用户输入 → 本地文档更新 → 触发`ydoc.update`事件 → 计算延迟
2. **OT**：用户输入 → 发送到服务器 → 服务器处理 → 服务器确认 → 触发`docUpdate`事件 → 计算延迟

**OT 多了一个网络往返过程**，所以延迟范围设置得更大（5000ms vs 1000ms），无法匹配时的估算值也更高（50ms vs 1ms）。

## 3、ydoc.on('update') 事件 对比 otClient.on('docUpdate') 事件

### 3.1 事件来源不同

#### 3.1.1 CRDT: `ydoc.on('update')`

```javascript
// 🔥 直接监听Y.Doc实例的内部状态变化
ydoc.on("update", callback);

// 触发时机：
// - 本地操作：ydoc.getText().insert(0, "Hello")
// - 远程同步：WebSocket收到其他客户端更新
// - 撤销/重做：undo/redo操作
// - 初始化：文档加载完成

// 数据格式：
// update: Uint8Array (二进制更新数据)
// origin: 更新来源 (本地clientID、远程clientID、undefined等)
```

#### 3.1.2 OT: `otClient.on('docUpdate')`

```javascript
// 🔥 监听OTClient的消息处理结果
otClient.on("docUpdate", callback);

// 触发时机：
// - 服务器确认：本地操作提交后收到服务器确认
// - 远程操作：其他客户端操作被服务器广播
// - 文档订阅：订阅文档后收到初始状态

// 数据格式：
// data: {
//   collection: "documents",
//   id: "doc-id",
//   data: { ops: [...] },
//   version: 123,
//   source?: "local" | "remote",
//   clientId?: "client_xxx"
// }
```

### 3.2 同步流程不同

#### 3.2.1 CRDT 同步流程

```javascript
// 1. 本地操作立即生效
ydoc.getText("content").insert(0, "Hello"); // 立即触发update事件

// 2. 本地update事件触发
ydoc.on("update", (update, origin) => {
  if (origin === ydoc.clientID) {
    // 本地操作：立即更新界面
    updateProseMirror();
  }
});

// 3. 通过WebSocket广播给其他客户端
// 4. 其他客户端收到后也触发update事件
```

#### 3.2.2 OT 同步流程

```javascript
// 1. 本地操作发送到服务器
otClient.submitOperation(collection, id, op);

// 2. 服务器处理并确认
// 3. 服务器发送docUpdate消息给所有客户端
// 4. 客户端收到docUpdate事件
otClient.on("docUpdate", (data) => {
  // 更新本地文档状态
  updateLocalDocument(data);
  // 更新界面
  updateProseMirror();
});
```

### 3.3 网络依赖程度

#### 3.3.1 CRDT 网络依赖

```javascript
// 本地操作不依赖网络
ydoc.getText("content").insert(0, "Hello"); // 立即生效，不等待网络

// 网络断开时：
// - 本地操作继续工作
// - 远程同步暂停
// - 网络恢复后自动同步
```

#### 3.3.2 OT 网络依赖

```javascript
// 所有操作都依赖网络
otClient.submitOperation(collection, id, op); // 必须等待服务器确认

// 网络断开时：
// - 无法提交新操作
// - 界面不会更新
// - 需要重新连接才能继续
```

### 3.4 性能监控差异

#### 3.4.1 CRDT 性能监控

```javascript
// 监控本地即时响应
handleDocumentUpdate(update, origin) {
  if (origin === this.ydoc?.clientID) {
    // 测量：键盘输入 → 本地文档更新
    const userPerceivedLatency = timestamp - matchedOperation.timestamp;
    // 延迟通常很小：0.1ms - 1000ms
  }
}
```

#### 3.4.2 OT 性能监控

```javascript
// 监控服务器往返延迟
handleDocUpdate(data) {
  if (data.clientId === this.windowId) {
    // 测量：键盘输入 → 服务器确认
    const userPerceivedLatency = timestamp - matchedOperation.timestamp;
    // 延迟通常较大：0.1ms - 5000ms
  }
}
```

### 3.5 总结

**CRDT 的`ydoc.on('update')`**：

- 直接监听 Y.Doc 的内部状态变化
- 本地操作立即触发，不依赖网络
- 测量本地即时响应延迟
- 数据格式是二进制 Uint8Array

**OT 的`otClient.on('docUpdate')`**：

- 监听 OTClient 的消息处理结果
- 只在收到服务器确认时触发
- 测量服务器往返延迟
- 数据格式是 JSON 对象

**核心差异**：CRDT 是本地优先的即时响应机制，OT 是服务器优先的确认机制！

## 4、🔥 E2E 延迟测量的实现细节

### 4.1 E2E 延迟的定义

**E2E 延迟**（End-to-End Latency）是指从客户端发送消息到接收到对应响应之间的完整网络往返时间。

### 4.2 实现原理

#### 4.2.1 消息匹配策略

```javascript
// 策略1：哈希匹配（适用于所有消息类型）
const hash = this.simpleHash(messageString);
this.pendingE2E.set(hash, sendTimestamp);

// 策略2：MessageId匹配（适用于操作消息）
const messageId = message._messageId;
this.pendingOperationMessages.set(messageId, sendTimestamp);
```

#### 4.2.2 时间窗口清理

```javascript
// 定期清理过期的E2E数据
cleanupExpiredE2EData() {
  const now = performance.now();
  const cutoffTime = now - 10000; // 10秒窗口

  // 清理过期的哈希记录
  for (const [hash, timestamp] of this.pendingE2E.entries()) {
    if (timestamp < cutoffTime) {
      this.pendingE2E.delete(hash);
    }
  }

  // 清理过期的消息ID记录
  for (const [messageId, timestamp] of this.pendingOperationMessages.entries()) {
    if (timestamp < cutoffTime) {
      this.pendingOperationMessages.delete(messageId);
    }
  }
}
```

### 4.3 CRDT vs OT 的 E2E 实现差异

| 方面           | CRDT (Yjs)         | OT (ShareDB)              |
| -------------- | ------------------ | ------------------------- |
| **消息类型**   | 二进制 Uint8Array  | JSON 字符串               |
| **匹配策略**   | 简单哈希匹配       | 哈希 + MessageId 双重匹配 |
| **时间窗口**   | 5 秒               | 10 秒                     |
| **数据精度**   | 中等（二进制数据） | 高（JSON 结构化数据）     |
| **实现复杂度** | 简单               | 复杂                      |

### 4.4 E2E 延迟的意义

1. **网络质量评估**：反映真实的网络传输延迟
2. **服务器性能**：OT 中体现服务器处理时间
3. **用户体验**：完整的操作响应时间
4. **故障诊断**：区分网络延迟和应用延迟

通过 E2E 延迟测量，我们可以更全面地评估协作编辑系统的性能表现。
