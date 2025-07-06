/**
 * ShareDB OT客户端 - 稳定版本
 * 参考Yjs WebsocketProvider的实现方式，确保连接稳定性
 */
class OTClient {
  constructor() {
    this.ws = null;
    this.connectionId = null;
    this.documents = new Map();
    this.callbacks = new Map();
    this.performanceMetrics = {
      operationsCount: 0,
      networkLatency: [],
      bytesSent: 0,
      bytesReceived: 0,
      connectionTime: null,
      lastOperationTime: null,
    };
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.url = null;
  }

  /**
   * 连接到OT服务器 - 增强版本
   */
  connect(url = "ws://localhost:1235") {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        console.log("✅ OT客户端已连接");
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log("⏳ OT客户端正在连接中...");
        return;
      }

      this.url = url;
      this.isConnecting = true;
      console.log("🔌 尝试连接到OT服务器:", url);

      try {
        this.ws = new WebSocket(url);
        const connectStart = performance.now();

        // 设置连接超时
        const connectTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.error("❌ OT连接超时");
            this.ws.close();
            this.isConnecting = false;
            reject(new Error("连接超时"));
          }
        }, 10000); // 10秒超时

        this.ws.onopen = () => {
          clearTimeout(connectTimeout);
          this.performanceMetrics.connectionTime =
            performance.now() - connectStart;
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          console.log("✅ OT客户端连接成功");
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
            this.performanceMetrics.bytesReceived += event.data.length;
          } catch (error) {
            console.error("处理OT消息失败:", error);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          this.isConnected = false;
          this.isConnecting = false;
          this.stopHeartbeat();

          console.log("🔌 OT客户端连接关闭", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });

          this.triggerCallback("disconnect", { event });

          // 自动重连
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;

          console.error("❌ OT客户端WebSocket错误:", error);
          console.error("WebSocket错误详情:", {
            url: url,
            readyState: this.ws?.readyState,
            error: error,
          });

          if (this.reconnectAttempts === 0) {
            // 只在第一次连接失败时reject
            reject(error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        console.error("❌ 创建WebSocket连接失败:", error);
        reject(error);
      }
    });
  }

  /**
   * 自动重连
   */
  scheduleReconnect() {
    if (this.isConnecting || this.isConnected) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 ${delay}ms后尝试第${this.reconnectAttempts}次重连...`);

    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        console.log(`🔄 执行第${this.reconnectAttempts}次重连`);
        this.connect(this.url).catch((error) => {
          console.error("重连失败:", error);
        });
      }
    }, delay);
  }

  /**
   * 开始心跳检测
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, 30000); // 30秒心跳
  }

  /**
   * 停止心跳检测
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 处理服务器消息
   */
  handleMessage(message) {
    switch (message.type) {
      case "connection":
        this.connectionId = message.id;
        console.log("🆔 收到连接ID:", message.id);
        this.triggerCallback("connected", { connectionId: message.id });
        break;
      case "doc":
        this.handleDocumentUpdate(message);
        break;
      case "op":
        this.handleOperation(message);
        break;
      case "pong":
        this.handlePong(message);
        break;
      case "error":
        console.error("OT服务器错误:", message.error);
        this.triggerCallback("error", message);
        break;
      default:
        console.warn("未知的OT消息类型:", message.type);
    }
  }

  /**
   * 处理文档更新
   */
  handleDocumentUpdate(message) {
    const { collection, id, data, version } = message;
    const docKey = `${collection}/${id}`;

    console.log("📄 收到文档更新:", { collection, id, version });

    if (!this.documents.has(docKey)) {
      this.documents.set(docKey, {
        collection,
        id,
        data: data || { ops: [] },
        version: version || 0,
      });
    } else {
      const doc = this.documents.get(docKey);
      doc.data = data || { ops: [] };
      doc.version = version || 0;
    }

    this.triggerCallback("docUpdate", { collection, id, data, version });
  }

  /**
   * 处理操作
   */
  handleOperation(message) {
    const { collection, id, op, version } = message;
    const docKey = `${collection}/${id}`;

    console.log("⚡ 收到操作:", { collection, id, version });

    if (this.documents.has(docKey)) {
      const doc = this.documents.get(docKey);

      try {
        if (op && op.ops) {
          doc.data = this.applyRichTextOp(doc.data, op);
          doc.version = version;
        }
      } catch (error) {
        console.error("应用操作失败:", error);
      }
    }

    this.triggerCallback("operation", { collection, id, op, version });
  }

  /**
   * 处理pong响应（延迟测量）
   */
  handlePong(message) {
    const latency = performance.now() - message.clientTimestamp;
    this.performanceMetrics.networkLatency.push(latency);

    if (this.performanceMetrics.networkLatency.length > 100) {
      this.performanceMetrics.networkLatency.shift();
    }

    this.triggerCallback("pong", { latency });
  }

  /**
   * 订阅文档
   */
  subscribeDocument(collection, id) {
    if (!this.isConnected) {
      console.warn("WebSocket未连接，无法订阅文档");
      return;
    }

    console.log("📝 订阅文档:", { collection, id });

    const message = {
      type: "subscribe",
      collection,
      id,
      timestamp: performance.now(),
    };

    this.sendMessage(message);
  }

  /**
   * 提交操作
   */
  submitOperation(collection, id, op) {
    console.log("🔥 [DEBUG] submitOperation 被调用", {
      collection,
      id,
      op,
      isConnected: this.isConnected,
      wsReadyState: this.ws?.readyState,
      hasDocuments: this.documents.size,
    });

    if (!this.isConnected) {
      console.warn("❌ [DEBUG] WebSocket未连接，无法提交操作");
      return;
    }

    const docKey = `${collection}/${id}`;
    let doc = this.documents.get(docKey);

    if (!doc) {
      console.warn("⚠️ [DEBUG] 文档不存在，创建新文档:", docKey);
      doc = {
        collection,
        id,
        data: { ops: [] },
        version: 0,
      };
      this.documents.set(docKey, doc);
    }

    console.log("📄 [DEBUG] 当前文档状态:", doc);

    const message = {
      type: "op",
      collection,
      id,
      op,
      version: doc.version,
      timestamp: performance.now(),
    };

    console.log("📤 [DEBUG] 准备发送消息:", message);

    try {
      this.sendMessage(message);
      this.performanceMetrics.operationsCount++;
      this.performanceMetrics.lastOperationTime = performance.now();

      console.log(
        "✅ [DEBUG] 操作发送成功，操作计数:",
        this.performanceMetrics.operationsCount
      );
    } catch (error) {
      console.error("❌ [DEBUG] 发送操作失败:", error);
    }
  }

  /**
   * 发送ping请求（延迟测量）
   */
  ping() {
    if (!this.isConnected) return;

    const message = {
      type: "ping",
      timestamp: performance.now(),
    };

    this.sendMessage(message);
  }

  /**
   * 发送消息到服务器
   */
  sendMessage(message) {
    console.log("🔥 [DEBUG] sendMessage 被调用", {
      messageType: message.type,
      wsExists: !!this.ws,
      wsReadyState: this.ws?.readyState,
      isConnected: this.isConnected,
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const data = JSON.stringify(message);
        console.log("📤 [DEBUG] 发送WebSocket数据:", data);

        this.ws.send(data);
        this.performanceMetrics.bytesSent += data.length;

        console.log("✅ [DEBUG] WebSocket发送成功，字节数:", data.length);
      } catch (error) {
        console.error("❌ [DEBUG] 发送消息失败:", error);
      }
    } else {
      console.warn("❌ [DEBUG] WebSocket未连接，无法发送消息", {
        readyState: this.ws?.readyState,
        isConnected: this.isConnected,
        wsStates: {
          CONNECTING: WebSocket.CONNECTING,
          OPEN: WebSocket.OPEN,
          CLOSING: WebSocket.CLOSING,
          CLOSED: WebSocket.CLOSED,
        },
      });
    }
  }

  /**
   * 注册回调函数
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * 移除回调函数
   */
  off(event, callback) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发回调函数
   */
  triggerCallback(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("回调函数执行失败:", error);
        }
      });
    }
  }

  /**
   * 应用rich-text操作
   */
  applyRichTextOp(doc, op) {
    if (!doc) {
      doc = { ops: [] };
    }

    if (op && op.ops) {
      doc.ops = [...(doc.ops || []), ...op.ops];
    }

    return doc;
  }

  /**
   * 获取文档内容
   */
  getDocument(collection, id) {
    const docKey = `${collection}/${id}`;
    return this.documents.get(docKey);
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    const latencies = this.performanceMetrics.networkLatency;
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
        : 0;

    const p95Latency =
      latencies.length > 0
        ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
        : 0;

    return {
      ...this.performanceMetrics,
      avgLatency,
      p95Latency,
      isConnected: this.isConnected,
      connectionId: this.connectionId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * 重置性能指标
   */
  resetMetrics() {
    this.performanceMetrics = {
      operationsCount: 0,
      networkLatency: [],
      bytesSent: 0,
      bytesReceived: 0,
      connectionTime: this.performanceMetrics.connectionTime,
      lastOperationTime: null,
    };
  }

  /**
   * 手动重连
   */
  reconnect() {
    if (this.isConnected || this.isConnecting) {
      console.log("已连接或正在连接中，无需重连");
      return;
    }

    console.log("🔄 手动重连OT服务器");
    this.reconnectAttempts = 0;
    return this.connect(this.url);
  }

  /**
   * 断开连接
   */
  disconnect() {
    console.log("🔌 主动断开OT连接");
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, "主动断开");
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.connectionId = null;
    this.reconnectAttempts = this.maxReconnectAttempts; // 防止自动重连
  }
}

export default OTClient;
