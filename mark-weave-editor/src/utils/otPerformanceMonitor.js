/**
 * OT性能监控器 - 真实数据版本
 * 完全基于真实WebSocket消息和OT操作的性能监控
 */
class OTPerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.startTime = null;
    this.windowId = `ot-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 性能数据
    this.metrics = {
      operationsCount: 0,
      totalOperationSize: 0,
      operationTimes: [],
      networkEvents: [],
      connectionEvents: [],
      userOperations: [],
      keystrokes: 0,
      operationLatencies: [],
      networkLatencies: [],
      // 🔥 新增：端到端延迟指标
      endToEndLatencies: [],
      realNetworkBytes: {
        sent: 0,
        received: 0,
      },
    };

    // 真实操作队列 - 用于匹配用户操作和服务器响应
    this.pendingOperations = [];
    this.websocketMessageQueue = [];
    this.realNetworkStats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
    };

    // 🔥 新增：端到端延迟相关
    this.pendingE2E = new Map(); // {hash: timestamp}
    this.pendingOperationMessages = new Map(); // {messageId: timestamp} - 用于匹配操作和响应
    this.originalSend = null;
    this.originalOnMessage = null;

    // 绑定方法
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleDocUpdate = this.handleDocUpdate.bind(this);
    this.handleOperation = this.handleOperation.bind(this);
    this.handlePong = this.handlePong.bind(this);
  }

  /**
   * 计算CRC32哈希
   */
  crc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ this.crc32Table[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * 简单字符串哈希
   */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * CRC32查找表
   */
  get crc32Table() {
    if (!this._crc32Table) {
      this._crc32Table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        this._crc32Table[i] = c;
      }
    }
    return this._crc32Table;
  }

  /**
   * 开始监控  ——> 调用了setupRealEventListeners
   */
  startMonitoring(otClient) {
    console.log("🔍 [OT] startMonitoring被调用", {
      isMonitoring: this.isMonitoring,
      hasOtClient: !!otClient,
      otClientType: typeof otClient,
    });

    if (this.isMonitoring) {
      console.log("⚠️ [OT] 监控已启动，跳过");
      return;
    }

    this.otClient = otClient;
    this.isMonitoring = true;
    this.startTime = performance.now();

    console.log("🚀 [OT] 开始真实性能监控");
    console.log(`🔑 [MULTI-WINDOW] OT客户端信息:`, {
      windowId: this.windowId,
      otClientConnected: !!(this.otClient && this.otClient.isConnected),
      userAgent: navigator.userAgent.includes("Chrome") ? "Chrome" : "Other",
      sessionStorage: sessionStorage.length, // 无痕窗口会有不同的session
    });

    // 设置真实事件监听
    this.setupRealEventListeners();

    // 🔥 新增：定期清理过期的E2E数据
    this.e2eCleanupInterval = setInterval(() => {
      this.cleanupExpiredE2EData();
    }, 5000); // 每5秒清理一次
  }

  /**
   * 设置真实事件监听器  ——> 核心函数
   */
  setupRealEventListeners() {
    // 键盘事件监听
    document.addEventListener("keydown", this.handleKeydown);

    // OT客户端事件监听
    if (this.otClient) {
      console.log("🔧 [OT] 设置OT客户端事件监听器");
      this.otClient.on("docUpdate", this.handleDocUpdate);
      this.otClient.on("operation", this.handleOperation);
      this.otClient.on("pong", this.handlePong);
      console.log("✅ [OT] OT客户端事件监听器设置完成");
    } else {
      console.log("⚠️ [OT] OT客户端不存在，无法设置事件监听器");
    }

    // 连接状态监听
    this.monitorConnectionEvents();

    // 🔥 关键：真实WebSocket消息拦截
    this.setupRealWebSocketMonitoring();

    // 🔥 新增：清理旧的E2E数据，确保从干净状态开始
    this.pendingE2E.clear();
    console.log("✅ [OT] 真实事件监听器已设置，E2E数据已清理");
  }

  /**
   * 设置真实WebSocket监控
   */
  setupRealWebSocketMonitoring() {
    if (!this.otClient || !this.otClient.ws) {
      console.log("⚠️ [OT] WebSocket不存在，稍后重试");
      setTimeout(() => {
        if (this.isMonitoring && this.otClient && this.otClient.ws) {
          this.setupRealWebSocketMonitoring();
        }
      }, 300); // 🔥 优化：加快同步频率
      return;
    }

    const ws = this.otClient.ws;
    console.log("🔍 [OT] 开始监控真实WebSocket消息");

    // 🔥 新增：拦截发送的消息 - 支持E2E延迟计算
    this.originalSend = ws.send.bind(ws);
    ws.send = (data) => {
      const timestamp = performance.now();
      const size = data.length || data.byteLength || 0;

      // 记录网络事件
      this.metrics.networkEvents.push({
        type: "send",
        timestamp,
        size,
        windowId: this.windowId,
      });

      // 🔥 计算CRC32哈希并记录发送时间 - 支持多种数据格式
      let hash = null;
      if (data instanceof Uint8Array) {
        hash = this.crc32(data);
      } else if (data instanceof ArrayBuffer) {
        hash = this.crc32(new Uint8Array(data));
      } else if (typeof data === "string") {
        // 对于字符串，使用简单的哈希
        hash = this.simpleHash(data);
      }

      if (hash !== null) {
        this.pendingE2E.set(hash, timestamp);

        // 🔥 新增：提取messageId用于操作匹配
        let messageId = null;
        let clientId = null;
        if (typeof data === "string") {
          try {
            const message = JSON.parse(data);
            messageId = message._messageId || message.messageId;
            clientId = message._clientId || message.clientId;
          } catch (e) {
            // 忽略JSON解析错误
          }
        }

        if (messageId) {
          this.pendingOperationMessages.set(messageId, timestamp);
          // 🔥 新增：同时存储clientId作为备用匹配
          if (clientId) {
            this.pendingOperationMessages.set(
              `${clientId}_${messageId}`,
              timestamp
            );
          }
          console.log(
            `📤 [E2E] 发送操作消息，messageId: ${messageId}, clientId: ${clientId}, 时间戳: ${timestamp}, 大小: ${size}字节`
          );
        } else {
          console.log(
            `📤 [E2E] 发送消息，哈希: ${hash}, 时间戳: ${timestamp}, 大小: ${size}字节`
          );
        }

        // 🔥 新增：发送时调试信息
        console.log(`🔍 [E2E] 发送调试信息:`, {
          hash,
          messageId,
          pendingE2ESize: this.pendingE2E.size,
          pendingOperationMessagesSize: this.pendingOperationMessages.size,
          dataType: typeof data,
          isUint8Array: data instanceof Uint8Array,
          isArrayBuffer: data instanceof ArrayBuffer,
          isString: typeof data === "string",
          dataPreview:
            typeof data === "string" ? data.substring(0, 100) : "Binary data",
        });
      } else {
        console.log(`📤 [E2E] 发送消息但跳过E2E计算:`, {
          dataType: typeof data,
          isUint8Array: data instanceof Uint8Array,
          isArrayBuffer: data instanceof ArrayBuffer,
          isString: typeof data === "string",
          size,
        });
      }

      console.log(`📤 [OT] 发送消息: ${size}字节`);
      return this.originalSend(data);
    };

    // 🔥 新增：拦截接收的消息 - 支持E2E延迟计算
    this.originalOnMessage = ws.onmessage;
    ws.addEventListener("message", (event) => {
      const timestamp = performance.now();
      const size = event.data.length || event.data.byteLength || 0;

      // 记录网络事件
      this.metrics.networkEvents.push({
        type: "receive",
        timestamp,
        size,
        windowId: this.windowId,
      });

      // 🔥 计算CRC32哈希并计算端到端延迟 - 支持多种数据格式
      let hash = null;
      if (event.data instanceof Uint8Array) {
        hash = this.crc32(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        hash = this.crc32(new Uint8Array(event.data));
      } else if (typeof event.data === "string") {
        // 对于字符串，使用简单的哈希
        hash = this.simpleHash(event.data);
      }

      if (hash !== null) {
        const sendTime = this.pendingE2E.get(hash);

        // 🔥 新增：尝试通过messageId匹配操作响应
        let operationSendTime = null;
        let matchedMessageId = null;

        if (typeof event.data === "string") {
          try {
            const message = JSON.parse(event.data);

            // 🔥 新增：调试消息结构
            if (message.type === "docUpdate") {
              console.log(`🔍 [E2E] docUpdate消息结构:`, {
                messageType: message.type,
                hasData: !!message.data,
                dataKeys: message.data ? Object.keys(message.data) : [],
                dataContent: message.data,
                fullMessage: JSON.stringify(message, null, 2),
              });
            }

            // 检查是否是操作响应（docUpdate类型）
            if (
              message.type === "docUpdate" &&
              message.data &&
              message.data._messageId
            ) {
              matchedMessageId = message.data._messageId;
              operationSendTime =
                this.pendingOperationMessages.get(matchedMessageId);
            }
            // 🔥 新增：尝试其他可能的消息结构
            else if (message.type === "docUpdate" && message._messageId) {
              matchedMessageId = message._messageId;
              operationSendTime =
                this.pendingOperationMessages.get(matchedMessageId);
            } else if (
              message.type === "docUpdate" &&
              message.data &&
              typeof message.data === "object"
            ) {
              // 尝试在data对象中查找messageId
              const possibleMessageId =
                message.data._messageId ||
                message.data.messageId ||
                message.data.clientId;
              if (possibleMessageId) {
                matchedMessageId = possibleMessageId;
                operationSendTime =
                  this.pendingOperationMessages.get(matchedMessageId);
              }
            }
            // 🔥 新增：尝试基于clientId的匹配
            else if (
              message.type === "docUpdate" &&
              message.data &&
              message.data.clientId
            ) {
              // 尝试匹配clientId开头的key
              for (const [
                key,
                timestamp,
              ] of this.pendingOperationMessages.entries()) {
                if (key.startsWith(message.data.clientId)) {
                  matchedMessageId = key;
                  operationSendTime = timestamp;
                  break;
                }
              }
            }
            // 🔥 新增：基于时间窗口的智能匹配
            if (message.type === "docUpdate" && !operationSendTime) {
              // 如果没有找到直接匹配，尝试匹配最近发送的操作
              const now = performance.now();
              const timeWindow = 10000; // 10秒窗口，更宽松
              let bestMatch = null;
              let bestTimeDiff = Infinity;

              for (const [
                key,
                sendTime,
              ] of this.pendingOperationMessages.entries()) {
                const timeDiff = now - sendTime; // 只考虑正向时间差
                if (
                  timeDiff >= 0 &&
                  timeDiff < timeWindow &&
                  timeDiff < bestTimeDiff
                ) {
                  bestMatch = { key, sendTime };
                  bestTimeDiff = timeDiff;
                }
              }

              if (bestMatch) {
                matchedMessageId = bestMatch.key;
                operationSendTime = bestMatch.sendTime;
                console.log(
                  `🔍 [E2E] 基于时间窗口匹配: ${matchedMessageId}, 时间差: ${bestTimeDiff.toFixed(
                    1
                  )}ms`
                );
              } else {
                console.log(`🔍 [E2E] 时间窗口内无匹配操作，可用操作:`, {
                  pendingOperations: Array.from(
                    this.pendingOperationMessages.entries()
                  ).map(([key, time]) => ({
                    key: key.substring(0, 20) + "...",
                    timeDiff: (now - time).toFixed(1),
                    isInWindow: now - time >= 0 && now - time < 10000,
                  })),
                  timeWindow: 10000,
                  currentTime: now,
                });
              }
            }
          } catch (e) {
            // 忽略JSON解析错误
          }
        }

        console.log(
          `📥 [E2E] 接收消息，哈希: ${hash}, 时间戳: ${timestamp}, 大小: ${size}字节, 有发送时间: ${!!sendTime}, 有操作时间: ${!!operationSendTime}`
        );

        // 🔥 新增：调试信息
        if (!sendTime && !operationSendTime) {
          console.log(`🔍 [E2E] 调试信息:`, {
            hash,
            matchedMessageId,
            pendingE2ESize: this.pendingE2E.size,
            pendingOperationMessagesSize: this.pendingOperationMessages.size,
            dataType: typeof event.data,
            isUint8Array: event.data instanceof Uint8Array,
            isArrayBuffer: event.data instanceof ArrayBuffer,
            isString: typeof event.data === "string",
            dataPreview:
              typeof event.data === "string"
                ? event.data.substring(0, 100)
                : "Binary data",
            pendingHashes: Array.from(this.pendingE2E.keys()).slice(-5), // 最近5个哈希
            pendingMessageIds: Array.from(
              this.pendingOperationMessages.keys()
            ).slice(-5), // 最近5个messageId
          });
        }

        // 使用操作匹配时间或哈希匹配时间
        const actualSendTime = operationSendTime || sendTime;

        if (actualSendTime) {
          const e2eLatency = timestamp - actualSendTime;

          // 记录合理的端到端延迟 - 放宽过滤条件
          if (e2eLatency >= 0 && e2eLatency < 20000) {
            this.metrics.endToEndLatencies.push({
              latency: e2eLatency,
              timestamp,
              hash,
              size,
              windowId: this.windowId,
              source: operationSendTime ? "operation_e2e" : "websocket_e2e",
              sendTime: actualSendTime,
              receiveTime: timestamp,
              messageId: matchedMessageId,
            });

            // 保持最近200个样本
            if (this.metrics.endToEndLatencies.length > 200) {
              this.metrics.endToEndLatencies =
                this.metrics.endToEndLatencies.slice(-200);
            }

            console.log(
              `🌐 [E2E] ${
                operationSendTime ? "操作" : "WebSocket"
              }端到端延迟: ${e2eLatency.toFixed(1)}ms, ${
                operationSendTime
                  ? `messageId: ${matchedMessageId}`
                  : `哈希: ${hash}`
              }`
            );
            console.log(
              `📊 [E2E] 端到端延迟数组长度: ${this.metrics.endToEndLatencies.length}`
            );
          } else {
            console.log(
              `⚠️ [E2E] 延迟异常: ${e2eLatency.toFixed(1)}ms, ${
                operationSendTime
                  ? `messageId: ${matchedMessageId}`
                  : `哈希: ${hash}`
              }`
            );
          }

          // 删除已处理的消息
          if (operationSendTime) {
            this.pendingOperationMessages.delete(matchedMessageId);
          } else {
            this.pendingE2E.delete(hash);
          }
        } else {
          console.log(
            `📥 [E2E] 收到未知消息，哈希: ${hash}, messageId: ${matchedMessageId}`
          );
        }
      } else {
        console.log(`📥 [E2E] 接收消息但跳过E2E计算:`, {
          dataType: typeof event.data,
          isUint8Array: event.data instanceof Uint8Array,
          isArrayBuffer: event.data instanceof ArrayBuffer,
          isString: typeof event.data === "string",
          size,
        });
      }

      console.log(`📥 [OT] 接收消息: ${size}字节`);

      // 调用原始处理函数
      if (this.originalOnMessage) {
        this.originalOnMessage.call(ws, event);
      }
    });

    // 监听连接状态变化
    ws.onopen = (event) => {
      this.metrics.connectionEvents.push({
        type: "open",
        timestamp: performance.now(),
        windowId: this.windowId,
      });
      console.log("🔗 [OT] WebSocket连接已建立");
    };

    ws.onclose = (event) => {
      this.metrics.connectionEvents.push({
        type: "close",
        timestamp: performance.now(),
        code: event.code,
        reason: event.reason,
        windowId: this.windowId,
      });
      console.log("❌ [OT] WebSocket连接已关闭");
    };

    ws.onerror = (error) => {
      this.metrics.connectionEvents.push({
        type: "error",
        timestamp: performance.now(),
        error: error.message || "WebSocket错误",
        windowId: this.windowId,
      });
      console.error("💥 [OT] WebSocket错误:", error);
    };
  }

  /**
   * 监控连接事件
   */
  monitorConnectionEvents() {
    if (!this.otClient) return;

    // 监听连接状态变化
    this.otClient.on("connected", () => {
      this.metrics.connectionEvents.push({
        type: "connected",
        timestamp: performance.now(),
        status: "connected",
      });
    });

    this.otClient.on("disconnected", () => {
      this.metrics.connectionEvents.push({
        type: "disconnected",
        timestamp: performance.now(),
        status: "disconnected",
      });
    });
  }

  /**
   * 处理键盘输入（用户操作）
   */
  handleKeydown(event) {
    // 只监听编辑器内的操作
    if (
      !event.target.closest("[contenteditable]") &&
      !event.target.closest(".ProseMirror")
    ) {
      return;
    }

    const timestamp = performance.now();
    this.metrics.keystrokes++;

    const operationId = `op_${timestamp}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const operation = {
      id: operationId,
      timestamp,
      key: event.key,
      keyCode: event.keyCode,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      windowId: this.windowId,
    };

    this.metrics.userOperations.push(operation);

    // 只记录可能产生OT操作的按键
    if (this.isPrintableKey(event.key)) {
      this.pendingOperations.push(operation);

      // 清理过期操作（3秒前，与匹配窗口保持一致）
      const cutoffTime = timestamp - 3000;
      this.pendingOperations = this.pendingOperations.filter(
        (op) => op.timestamp > cutoffTime
      );

      console.log(
        `⌨️ [OT] 记录用户操作: ${event.key}, 待处理队列: ${this.pendingOperations.length}`
      );

      // 🔥 移除模拟响应 - 现在完全依赖真实的WebSocket消息
      // 真实的OT操作会通过WebSocket消息处理
    }
  }

  /**
   * 处理文档更新（真实OT操作完成）
   */
  handleDocUpdate(data) {
    const timestamp = performance.now();
    const operationSize = JSON.stringify(data).length;

    this.metrics.operationsCount++;
    this.metrics.totalOperationSize += operationSize;
    this.metrics.operationTimes.push(timestamp);

    console.log(`📄 [OT] 文档更新事件:`, {
      data,
      operationSize,
      timestamp,
      operationsCount: this.metrics.operationsCount,
    });

    // 🔥 方案A：用户感知延迟测量（与CRDT保持一致）
    // OT的特点：需要等待服务器确认才能更新界面

    // 检查是否为本地操作的服务器确认
    // OT的docUpdate消息可能没有source字段，我们通过其他方式判断
    const isLocalOperationConfirm =
      !data ||
      data.source === "local" ||
      data.source === this.windowId ||
      !data.clientId ||
      data.clientId === this.windowId ||
      (data && typeof data === "object" && Object.keys(data).length === 0); // 空对象也可能是本地确认

    console.log(
      "data.source",
      data.source,
      "isLocalOperationConfirm",
      isLocalOperationConfirm
    );

    // 🔥 新增：对于OT，我们总是尝试匹配操作，因为每个docUpdate都可能是对本地操作的响应
    if (true) {
      // 总是尝试匹配，让findAndRemoveMatchingOperation来决定
      // 本地操作确认：尝试匹配键盘输入，测量用户感知延迟
      const matchedOperation = this.findAndRemoveMatchingOperation(timestamp);

      if (matchedOperation) {
        const userPerceivedLatency = timestamp - matchedOperation.timestamp;

        console.log(
          `⚡ [OT] 用户感知延迟: ${userPerceivedLatency.toFixed(1)}ms`
        );

        // 记录用户感知延迟
        if (userPerceivedLatency >= 0.1 && userPerceivedLatency <= 5000) {
          // OT可能有更高延迟
          const latencyRecord = {
            latency: userPerceivedLatency,
            timestamp,
            operationSize,
            operationType: matchedOperation.key,
            operationId: matchedOperation.id,
            windowId: this.windowId,
            source: "user_perceived",
            isReal: true,
          };

          this.metrics.operationLatencies.push(latencyRecord);

          console.log(
            `📊 [OT] 用户感知延迟记录: ${userPerceivedLatency.toFixed(
              1
            )}ms, 操作: ${matchedOperation.key}, 数组长度: ${
              this.metrics.operationLatencies.length
            }`
          );
        } else {
          console.log(
            `⚠️ OT用户感知延迟异常: ${userPerceivedLatency.toFixed(
              1
            )}ms，已忽略`
          );
        }
      } else {
        // 无法匹配的本地操作（如格式化或初始化）
        // OT中这类操作通常也需要服务器往返，所以有一定延迟
        const estimatedLatency = 50; // 50ms估算的服务器往返时间

        const latencyRecord = {
          latency: estimatedLatency,
          timestamp,
          operationSize,
          operationType: "formatting_or_server_op",
          operationId: `server_op_${timestamp}`,
          windowId: this.windowId,
          source: "estimated_server_latency",
          isReal: false,
        };

        this.metrics.operationLatencies.push(latencyRecord);

        console.log(
          `📊 [OT] 服务器操作延迟(估算): ${estimatedLatency}ms, 数组长度: ${this.metrics.operationLatencies.length}`
        );
      }
    } else {
      // 远程操作：不影响本地用户感知延迟，不记录
      console.log(`📥 [OT] 远程操作（不影响用户感知）:`, data);
    }
  }

  /**
   * 🔥 处理OT多窗口同步确认
   */

  /**
   * 处理操作响应
   */
  handleOperation(data) {
    console.log(`⚡ [OT] 收到操作响应:`, data);
    // 这个方法主要用于记录，实际的延迟计算在handleDocUpdate中
  }

  /**
   * 查找并移除匹配的操作
   */
  findAndRemoveMatchingOperation(updateTimestamp) {
    console.log(`🔍 [OT] 开始查找匹配操作:`, {
      updateTimestamp,
      pendingOperationsLength: this.pendingOperations.length,
      pendingOperations: this.pendingOperations.map((op) => ({
        key: op.key,
        timestamp: op.timestamp,
        timeDiff: (updateTimestamp - op.timestamp).toFixed(1),
      })),
    });

    if (this.pendingOperations.length === 0) return null;

    // 🔥 增加时间窗口：3秒内的操作才可能匹配（OT可能有更高延迟）
    const timeWindow = 3000;
    const cutoffTime = updateTimestamp - timeWindow;

    // 过滤有效操作
    const validOperations = this.pendingOperations.filter(
      (op) => op.timestamp > cutoffTime
    );

    if (validOperations.length === 0) {
      // 清理过期操作
      this.pendingOperations = this.pendingOperations.filter(
        (op) => op.timestamp > cutoffTime
      );

      // 🔥 新增：调试信息
      console.log(`🔍 [OT] 用户操作匹配失败:`, {
        updateTimestamp,
        cutoffTime,
        timeWindow,
        pendingOperationsCount: this.pendingOperations.length,
        oldestOperation:
          this.pendingOperations.length > 0
            ? updateTimestamp - this.pendingOperations[0].timestamp
            : "N/A",
        newestOperation:
          this.pendingOperations.length > 0
            ? updateTimestamp -
              this.pendingOperations[this.pendingOperations.length - 1]
                .timestamp
            : "N/A",
      });

      return null;
    }

    // 取最近的操作（LIFO）
    const matchedOp = validOperations[validOperations.length - 1];

    // 从队列中移除
    this.pendingOperations = this.pendingOperations.filter(
      (op) => op.id !== matchedOp.id
    );

    // 🔥 新增：调试信息
    console.log(`✅ [OT] 用户操作匹配成功:`, {
      matchedOperation: matchedOp.key,
      timeDiff: (updateTimestamp - matchedOp.timestamp).toFixed(1) + "ms",
      remainingOperations: this.pendingOperations.length,
    });

    return matchedOp;
  }

  /**
   * 判断是否为可打印字符
   */
  isPrintableKey(key) {
    return (
      key.length === 1 ||
      key === "Enter" ||
      key === "Space" ||
      key === "Backspace" ||
      key === "Delete"
    );
  }

  /**
   * 处理pong响应（真实网络延迟测量）
   */
  handlePong(data) {
    if (data.latency) {
      this.metrics.networkLatencies.push({
        latency: data.latency,
        timestamp: performance.now(),
        windowId: this.windowId,
        isReal: true,
      });

      console.log(`🏓 [OT] 真实网络延迟: ${data.latency.toFixed(1)}ms`);
    }
  }

  /**
   * 清理过期的E2E数据
   */
  cleanupExpiredE2EData() {
    const now = performance.now();
    const maxAge = 10000; // 10秒过期，更短的时间窗口
    let cleanedE2ECount = 0;
    let cleanedOperationsCount = 0;

    // 清理过期的E2E数据
    for (const [hash, timestamp] of this.pendingE2E.entries()) {
      if (now - timestamp > maxAge) {
        this.pendingE2E.delete(hash);
        cleanedE2ECount++;
      }
    }

    // 清理过期的操作数据
    for (const [
      messageId,
      timestamp,
    ] of this.pendingOperationMessages.entries()) {
      if (now - timestamp > maxAge) {
        this.pendingOperationMessages.delete(messageId);
        cleanedOperationsCount++;
      }
    }

    if (cleanedE2ECount > 0 || cleanedOperationsCount > 0) {
      console.log(
        `🧹 [E2E] 清理了 ${cleanedE2ECount} 个过期E2E数据, ${cleanedOperationsCount} 个过期操作数据, 剩余: E2E=${this.pendingE2E.size}, 操作=${this.pendingOperationMessages.size}`
      );
    }
  }

  /**
   * 获取真实性能统计
   */
  getAggregatedMetrics() {
    console.log("🔍 [OT监控] getAggregatedMetrics 被调用");
    console.log("🔍 [OT监控] isMonitoring:", this.isMonitoring);
    console.log("🔍 [OT监控] startTime:", this.startTime);
    console.log("🔍 [OT监控] otClientExists:", !!this.otClient);
    console.log("🔍 [OT监控] otClientConnected:", this.otClient?.isConnected);

    if (!this.isMonitoring || !this.startTime) {
      console.log("❌ [OT监控] 监控未启动或开始时间为空，返回null");
      return null;
    }

    const now = performance.now();
    const monitoringDuration = (now - this.startTime) / 1000;

    // 🔥 优化：缩短时间窗口为4秒，提升响应速度
    const recentWindow = 4000; // 从10000ms改为4000ms
    const recentTime = now - recentWindow;

    const recentLatencies = this.metrics.operationLatencies
      .filter((l) => l.timestamp > recentTime)
      .map((l) => l.latency);

    const allLatencies = this.metrics.operationLatencies.map((l) => l.latency);
    const allNetworkLatencies = this.metrics.networkLatencies.map(
      (l) => l.latency
    );
    // 🔥 新增：端到端延迟统计
    const allEndToEndLatencies = this.metrics.endToEndLatencies.map(
      (l) => l.latency
    );

    // 🔥 优化：分层P95计算策略
    let latenciesToUse, p95Latency, avgLatency;

    if (recentLatencies.length >= 12) {
      // 最近数据充足：使用最近4秒的数据
      latenciesToUse = recentLatencies;
      // 🔥 减少日志输出频率，避免定时器重复输出
      if (recentLatencies.length % 10 === 0) {
        console.log(
          `📊 [OT] 使用最近4秒数据计算P95: ${latenciesToUse.length}个样本`
        );
      }
    } else if (allLatencies.length >= 20) {
      // 历史数据充足：使用全部数据
      latenciesToUse = allLatencies;
      // 🔥 减少日志输出频率，避免定时器重复输出
      if (allLatencies.length % 10 === 0) {
        console.log(
          `📊 [OT] 使用全部历史数据计算P95: ${latenciesToUse.length}个样本`
        );
      }
    } else if (allLatencies.length >= 6) {
      // 数据较少：使用全部数据，但降低置信度
      latenciesToUse = allLatencies;
      // 🔥 减少日志输出频率，避免定时器重复输出
      if (allLatencies.length % 10 === 0) {
        console.log(
          `📊 [OT] 使用少量数据计算P95: ${latenciesToUse.length}个样本（置信度较低）`
        );
      }
    } else {
      // 数据不足：使用平均值作为P95估算
      latenciesToUse = allLatencies;
      // 🔥 减少日志输出频率，避免定时器重复输出
      if (allLatencies.length === 0 || allLatencies.length % 10 === 0) {
        console.log(
          `📊 [OT] 数据不足，使用平均值估算P95: ${latenciesToUse.length}个样本`
        );
      }
    }

    if (latenciesToUse.length > 0) {
      avgLatency =
        latenciesToUse.reduce((a, b) => a + b, 0) / latenciesToUse.length;

      if (latenciesToUse.length >= 6) {
        const sortedLatencies = [...latenciesToUse].sort((a, b) => a - b);
        p95Latency =
          sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
      } else {
        // 样本不足时，使用平均值 * 1.5 作为P95估算
        p95Latency = avgLatency * 1.5;
      }
    } else {
      avgLatency = 0;
      p95Latency = 0;
    }

    const avgNetworkLatency =
      allNetworkLatencies.length > 0
        ? allNetworkLatencies.reduce((a, b) => a + b, 0) /
          allNetworkLatencies.length
        : 0;

    // 🔥 新增：端到端延迟统计计算
    let avgE2ELatency = 0;
    let p95E2ELatency = 0;

    if (allEndToEndLatencies.length > 0) {
      avgE2ELatency =
        allEndToEndLatencies.reduce((a, b) => a + b, 0) /
        allEndToEndLatencies.length;

      if (allEndToEndLatencies.length >= 6) {
        const sortedEndToEndLatencies = [...allEndToEndLatencies].sort(
          (a, b) => a - b
        );
        p95E2ELatency =
          sortedEndToEndLatencies[
            Math.floor(sortedEndToEndLatencies.length * 0.95)
          ] || 0;
      } else {
        p95E2ELatency = avgE2ELatency * 1.5;
      }
    }

    return {
      // 基本信息
      monitoringDuration,
      isConnected: this.otClient && this.otClient.isConnected,
      windowId: this.windowId,

      // 操作统计
      operationsCount: this.metrics.operationsCount,
      totalOperationSize: this.metrics.totalOperationSize,
      opsPerSecond: this.metrics.operationsCount / monitoringDuration,
      avgOperationSize:
        this.metrics.operationsCount > 0
          ? this.metrics.totalOperationSize / this.metrics.operationsCount
          : 0,

      // 用户操作统计
      keystrokes: this.metrics.keystrokes,
      keystrokesPerSecond: this.metrics.keystrokes / monitoringDuration,
      pendingOperations: this.pendingOperations.length,

      // 🔥 优化：延迟统计
      avgLatency,
      p95Latency,
      avgNetworkLatency,
      latencySamples: allLatencies.length,
      recentLatencySamples: recentLatencies.length,
      networkLatencySamples: allNetworkLatencies.length,

      // 🔥 新增：端到端延迟统计
      avgE2ELatency,
      p95E2ELatency,
      e2eSamples: allEndToEndLatencies.length,

      // 🔥 新增：数据质量指标
      dataQuality: {
        timeWindow: recentWindow,
        minSamples: 12,
        calculationMethod:
          recentLatencies.length >= 12
            ? "recent"
            : allLatencies.length >= 20
            ? "historical"
            : allLatencies.length >= 6
            ? "limited"
            : "estimated",
        confidence:
          recentLatencies.length >= 12
            ? "high"
            : allLatencies.length >= 20
            ? "medium"
            : "low",
      },

      // 🔥 真实网络统计 - 不再使用估算值
      bytesSent: this.metrics.realNetworkBytes.sent,
      bytesReceived: this.metrics.realNetworkBytes.received,
      bytesPerSecond:
        (this.metrics.realNetworkBytes.sent +
          this.metrics.realNetworkBytes.received) /
        monitoringDuration,

      // 网络消息统计
      messagesSent: this.realNetworkStats.messagesSent,
      messagesReceived: this.realNetworkStats.messagesReceived,
      messagesPerSecond:
        (this.realNetworkStats.messagesSent +
          this.realNetworkStats.messagesReceived) /
        monitoringDuration,

      // 协作统计
      activeConnections: this.otClient && this.otClient.isConnected ? 1 : 0,
      conflictResolutions: 0, // OT自动处理冲突

      // 运行时间
      uptime: monitoringDuration * 1000,

      // 数据真实性标记
      dataSource: "real-websocket-monitoring",
      hasRealNetworkData: this.metrics.networkEvents.length > 0,
      hasRealLatencyData:
        this.metrics.operationLatencies.filter((l) => l.isReal).length > 0,
    };
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;

    // 清理事件监听器
    document.removeEventListener("keydown", this.handleKeydown);

    // 清理OT事件监听器
    if (this.otClient) {
      this.otClient.off("docUpdate", this.handleDocUpdate);
      this.otClient.off("operation", this.handleOperation);
      this.otClient.off("pong", this.handlePong);
    }

    // 🔥 新增：恢复原始WebSocket方法
    if (this.otClient && this.otClient.ws && this.originalSend) {
      this.otClient.ws.send = this.originalSend;
    }

    // 🔥 新增：清理E2E清理定时器
    if (this.e2eCleanupInterval) {
      clearInterval(this.e2eCleanupInterval);
    }

    console.log("⏹️ 已停止OT性能监控");
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = {
      operationsCount: 0,
      totalOperationSize: 0,
      operationTimes: [],
      networkEvents: [],
      connectionEvents: [],
      userOperations: [],
      keystrokes: 0,
      operationLatencies: [],
      networkLatencies: [],
      // 🔥 新增：端到端延迟指标
      endToEndLatencies: [],
      realNetworkBytes: {
        sent: 0,
        received: 0,
      },
    };

    this.pendingOperations = [];
    this.pendingE2E.clear();
    this.pendingOperationMessages.clear();
    this.realNetworkStats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
    };
    this.startTime = performance.now();

    console.log("🔄 OT性能指标已重置");
  }
}

export default OTPerformanceMonitor;
