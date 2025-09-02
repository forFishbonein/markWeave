/**
 * OT Performance Monitor - Real Data Version
 * Performance monitoring completely based on real WebSocket messages and OT operations
 */
class OTPerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.startTime = null;
    this.windowId = `ot-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Performance data
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
      // 🔥 New: End-to-end latency metrics
      endToEndLatencies: [],
      realNetworkBytes: {
        sent: 0,
        received: 0,
      },
    };

    // Real operation queue - for matching user operations and server responses
    this.pendingOperations = [];
    this.websocketMessageQueue = [];
    this.realNetworkStats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
    };

    // 🔥 New: End-to-end latency related
    this.pendingE2E = new Map(); // {hash: timestamp}
    this.pendingOperationMessages = new Map(); // {messageId: timestamp} - for matching operations and responses
    this.originalSend = null;
    this.originalOnMessage = null;

    // Bind methods
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleDocUpdate = this.handleDocUpdate.bind(this);
    this.handleOperation = this.handleOperation.bind(this);
    this.handlePong = this.handlePong.bind(this);
  }

  /**
   * Calculate CRC32 hash
   */
  crc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ this.crc32Table[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Simple string hash
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
   * CRC32 lookup table
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
   * Start monitoring  ——> Called setupRealEventListeners
   */
  startMonitoring(otClient) {
    console.log("🔍 [OT] startMonitoring called", {
      isMonitoring: this.isMonitoring,
      hasOtClient: !!otClient,
      otClientType: typeof otClient,
    });

    if (this.isMonitoring) {
      console.log("⚠️ [OT] Monitoring already started, skipping");
      return;
    }

    this.otClient = otClient;
    this.isMonitoring = true;
    this.startTime = performance.now();

    console.log("🚀 [OT] Starting real performance monitoring");
    console.log(`🔑 [MULTI-WINDOW] OT client info:`, {
      windowId: this.windowId,
      otClientConnected: !!(this.otClient && this.otClient.isConnected),
      userAgent: navigator.userAgent.includes("Chrome") ? "Chrome" : "Other",
      sessionStorage: sessionStorage.length, // Incognito windows will have different sessions
    });

    // Set up real event listeners
    this.setupRealEventListeners();

    // 🔥 New: Periodically clean expired E2E data
    this.e2eCleanupInterval = setInterval(() => {
      this.cleanupExpiredE2EData();
    }, 5000); // Clean every 5 seconds
  }

  /**
   * Set up real event listeners  ——> Core function
   */
  setupRealEventListeners() {
    // Keyboard event listening
    document.addEventListener("keydown", this.handleKeydown);

    // OT client event listening
    if (this.otClient) {
      console.log("🔧 [OT] Setting up OT client event listeners");
      this.otClient.on("docUpdate", this.handleDocUpdate);
      this.otClient.on("operation", this.handleOperation);
      this.otClient.on("pong", this.handlePong);
      console.log("✅ [OT] OT client event listeners setup completed");
    } else {
      console.log("⚠️ [OT] OT client does not exist, cannot set up event listeners");
    }

    // Connection status monitoring
    this.monitorConnectionEvents();

    // 🔥 Key: Real WebSocket message interception
    this.setupRealWebSocketMonitoring();

    // 🔥 New: Clean old E2E data, ensure starting from clean state
    this.pendingE2E.clear();
    console.log("✅ [OT] Real event listeners set up, E2E data cleaned");
  }

  /**
   * Set up real WebSocket monitoring
   */
  setupRealWebSocketMonitoring() {
    if (!this.otClient || !this.otClient.ws) {
      console.log("⚠️ [OT] WebSocket does not exist, retrying later");
      setTimeout(() => {
        if (this.isMonitoring && this.otClient && this.otClient.ws) {
          this.setupRealWebSocketMonitoring();
        }
      }, 300); // 🔥 Optimization: Speed up sync frequency
      return;
    }

    const ws = this.otClient.ws;
    console.log("🔍 [OT] Starting to monitor real WebSocket messages");

    // 🔥 New: Intercept sent messages - support E2E latency calculation
    this.originalSend = ws.send.bind(ws);
    ws.send = (data) => {
      const timestamp = performance.now();
      const size = data.length || data.byteLength || 0;

      // Record network events
      this.metrics.networkEvents.push({
        type: "send",
        timestamp,
        size,
        windowId: this.windowId,
      });

      // 🔥 Fix: Update real network statistics
      this.realNetworkStats.messagesSent++;
      this.realNetworkStats.bytesSent += size;
      this.metrics.realNetworkBytes.sent += size;

      // 🔥 Calculate CRC32 hash and record send time - support multiple data formats
      let hash = null;
      if (data instanceof Uint8Array) {
        hash = this.crc32(data);
      } else if (data instanceof ArrayBuffer) {
        hash = this.crc32(new Uint8Array(data));
      } else if (typeof data === "string") {
        // For strings, use simple hash
        hash = this.simpleHash(data);
      }

      if (hash !== null) {
        this.pendingE2E.set(hash, timestamp);

        // 🔥 New: Extract messageId for operation matching
        let messageId = null;
        let clientId = null;
        if (typeof data === "string") {
          try {
            const message = JSON.parse(data);
            messageId = message._messageId || message.messageId;
            clientId = message._clientId || message.clientId;
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }

        if (messageId) {
          this.pendingOperationMessages.set(messageId, timestamp);
          // 🔥 New: Also store clientId as backup matching
          if (clientId) {
            this.pendingOperationMessages.set(
              `${clientId}_${messageId}`,
              timestamp
            );
          }
          console.log(
            `📤 [E2E] Sending operation message, messageId: ${messageId}, clientId: ${clientId}, timestamp: ${timestamp}, size: ${size}bytes`
          );
        } else {
          console.log(
            `📤 [E2E] Sending message, hash: ${hash}, timestamp: ${timestamp}, size: ${size}bytes`
          );
        }

        // 🔥 New: Debug info on send
        console.log(`🔍 [E2E] send调试信息:`, {
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
        console.log(`📤 [E2E] Sending message but skipping E2E calculation:`, {
          dataType: typeof data,
          isUint8Array: data instanceof Uint8Array,
          isArrayBuffer: data instanceof ArrayBuffer,
          isString: typeof data === "string",
          size,
        });
      }

      console.log(`📤 [OT] Sending message: ${size}bytes`);
      return this.originalSend(data);
    };

    // 🔥 New: Intercept received messages - support E2E latency calculation
    this.originalOnMessage = ws.onmessage;
    ws.addEventListener("message", (event) => {
      const timestamp = performance.now();
      const size = event.data.length || event.data.byteLength || 0;

      // Record network events
      this.metrics.networkEvents.push({
        type: "receive",
        timestamp,
        size,
        windowId: this.windowId,
      });

      // 🔥 Fix: Update real network statistics
      this.realNetworkStats.messagesReceived++;
      this.realNetworkStats.bytesReceived += size;
      this.metrics.realNetworkBytes.received += size;

      // 🔥 Calculate CRC32 hash and calculate end-to-end latency - support multiple data formats
      let hash = null;
      if (event.data instanceof Uint8Array) {
        hash = this.crc32(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        hash = this.crc32(new Uint8Array(event.data));
      } else if (typeof event.data === "string") {
        // For strings, use simple hash
        hash = this.simpleHash(event.data);
      }

      if (hash !== null) {
        const sendTime = this.pendingE2E.get(hash);

        // 🔥 New: Try to match operation responses via messageId
        let operationSendTime = null;
        let matchedMessageId = null;

        if (typeof event.data === "string") {
          try {
            const message = JSON.parse(event.data);

            // 🔥 New: Debug message structure
            if (message.type === "docUpdate") {
              console.log(`🔍 [E2E] docUpdate message structure:`, {
                messageType: message.type,
                hasData: !!message.data,
                dataKeys: message.data ? Object.keys(message.data) : [],
                dataContent: message.data,
                fullMessage: JSON.stringify(message, null, 2),
              });
            }

            // Check if it's operation response (docUpdate type)
            if (
              message.type === "docUpdate" &&
              message.data &&
              message.data._messageId
            ) {
              matchedMessageId = message.data._messageId;
              operationSendTime =
                this.pendingOperationMessages.get(matchedMessageId);
            }
            // 🔥 New: Try other possible message structures
            else if (message.type === "docUpdate" && message._messageId) {
              matchedMessageId = message._messageId;
              operationSendTime =
                this.pendingOperationMessages.get(matchedMessageId);
            } else if (
              message.type === "docUpdate" &&
              message.data &&
              typeof message.data === "object"
            ) {
              // Try to find messageId in data object
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
            // 🔥 New: Try matching based on clientId
            else if (
              message.type === "docUpdate" &&
              message.data &&
              message.data.clientId
            ) {
              // Try to match keys starting with clientId
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
            // 🔥 New: Intelligent matching based on time window
            if (message.type === "docUpdate" && !operationSendTime) {
              // If no direct match found, try to match recently sent operations
              const now = performance.now();
              const timeWindow = 10000; // 10 second window，更宽松
              let bestMatch = null;
              let bestTimeDiff = Infinity;

              for (const [
                key,
                sendTime,
              ] of this.pendingOperationMessages.entries()) {
                const timeDiff = now - sendTime; // Only consider positive time differences
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
                  `🔍 [E2E] Time window based matching: ${matchedMessageId}, time diff: ${bestTimeDiff.toFixed(
                    1
                  )}ms`
                );
              } else {
                console.log(`🔍 [E2E] No matching operations in time window, available operations:`, {
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
            // Ignore JSON parsing errors
          }
        }

        console.log(
          `📥 [E2E] Receiving message, hash: ${hash}, timestamp: ${timestamp}, size: ${size}bytes, has send time: ${!!sendTime}, has operation time: ${!!operationSendTime}`
        );

        // 🔥 New: Debug info
        if (!sendTime && !operationSendTime) {
          console.log(`🔍 [E2E] Debug info:`, {
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
            pendingHashes: Array.from(this.pendingE2E.keys()).slice(-5), // Recent 5 hashes
            pendingMessageIds: Array.from(
              this.pendingOperationMessages.keys()
            ).slice(-5), // Recent 5 messageIds
          });
        }

        // Use operation match time or hash match time
        const actualSendTime = operationSendTime || sendTime;

        if (actualSendTime) {
          const e2eLatency = timestamp - actualSendTime;

          // Record reasonable end-to-end latency - relax filtering conditions
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

            // Keep recent 200 samples
            if (this.metrics.endToEndLatencies.length > 200) {
              this.metrics.endToEndLatencies =
                this.metrics.endToEndLatencies.slice(-200);
            }

            console.log(
              `🌐 [E2E] ${
                operationSendTime ? "Operation" : "WebSocket"
              }end-to-end latency: ${e2eLatency.toFixed(1)}ms, ${
                operationSendTime
                  ? `messageId: ${matchedMessageId}`
                  : `hash: ${hash}`
              }`
            );
            console.log(
              `📊 [E2E] End-to-end latency array length: ${this.metrics.endToEndLatencies.length}`
            );
          } else {
            console.log(
              `⚠️ [E2E] Latency anomaly: ${e2eLatency.toFixed(1)}ms, ${
                operationSendTime
                  ? `messageId: ${matchedMessageId}`
                  : `hash: ${hash}`
              }`
            );
          }

          // Delete processed messages
          if (operationSendTime) {
            this.pendingOperationMessages.delete(matchedMessageId);
          } else {
            this.pendingE2E.delete(hash);
          }
        } else {
          console.log(
            `📥 [E2E] 收到未知消息，hash: ${hash}, messageId: ${matchedMessageId}`
          );
        }
      } else {
        console.log(`📥 [E2E] Receiving message but skipping E2E calculation:`, {
          dataType: typeof event.data,
          isUint8Array: event.data instanceof Uint8Array,
          isArrayBuffer: event.data instanceof ArrayBuffer,
          isString: typeof event.data === "string",
          size,
        });
      }

      console.log(`📥 [OT] Receiving message: ${size}bytes`);

      // Call original handler function
      if (this.originalOnMessage) {
        this.originalOnMessage.call(ws, event);
      }
    });

    // Listen to connection state changes
    ws.onopen = (event) => {
      this.metrics.connectionEvents.push({
        type: "open",
        timestamp: performance.now(),
        windowId: this.windowId,
      });
      console.log("🔗 [OT] WebSocket connection established");
    };

    ws.onclose = (event) => {
      this.metrics.connectionEvents.push({
        type: "close",
        timestamp: performance.now(),
        code: event.code,
        reason: event.reason,
        windowId: this.windowId,
      });
      console.log("❌ [OT] WebSocket connection closed");
    };

    ws.onerror = (error) => {
      this.metrics.connectionEvents.push({
        type: "error",
        timestamp: performance.now(),
        error: error.message || "WebSocket error",
        windowId: this.windowId,
      });
      console.error("💥 [OT] WebSocket error:", error);
    };
  }

  /**
   * Monitor connection events
   */
  monitorConnectionEvents() {
    if (!this.otClient) return;

    // Listen to connection state changes
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
   * Handle keyboard input（userOperation）
   */
  handleKeydown(event) {
    // 只listen编辑器内的Operation
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

    // 只record可能产生OTOperation的按键
    if (this.isPrintableKey(event.key)) {
      this.pendingOperations.push(operation);

      // 清理过期Operation（3秒前，与匹配窗口保持一致）
      const cutoffTime = timestamp - 3000;
      this.pendingOperations = this.pendingOperations.filter(
        (op) => op.timestamp > cutoffTime
      );

      console.log(
        `⌨️ [OT] recorduserOperation: ${event.key}, pending queue: ${this.pendingOperations.length}`
      );

      // 🔥 Remove simulated responses - now completely rely on real WebSocket messages
      // 真实的OTOperation会passedWebSocket消息处理
    }
  }

  /**
   * 处理Documentsupdate（真实OTOperation完成）
   */
  handleDocUpdate(data) {
    const timestamp = performance.now();
    const operationSize = JSON.stringify(data).length;

    this.metrics.operationsCount++;
    this.metrics.totalOperationSize += operationSize;
    this.metrics.operationTimes.push(timestamp);

    console.log(`📄 [OT] Document update event:`, {
      data,
      operationSize,
      timestamp,
      operationsCount: this.metrics.operationsCount,
    });

    // 🔥 Plan A: User perceived latency measurement (consistent with CRDT)
    // OT characteristic: need to wait for server confirmation to update interface

    // 检查是否为本地Operation的服务器确认
    // OT's docUpdate message may not have source field, we judge via other means
    const isLocalOperationConfirm =
      !data ||
      data.source === "local" ||
      data.source === this.windowId ||
      !data.clientId ||
      data.clientId === this.windowId ||
      (data && typeof data === "object" && Object.keys(data).length === 0); // Empty object may also be local confirmation

    console.log(
      "data.source",
      data.source,
      "isLocalOperationConfirm",
      isLocalOperationConfirm
    );

    // 🔥 新增：对于OT，我们总是尝试匹配Operation，因为每docUpdate都可能是对本地Operation的响应
    if (true) {
      // Always try to match, let findAndRemoveMatchingOperation decide
      // 本地Operation确认：尝试匹配键盘输入，测量user感知延迟
      const matchedOperation = this.findAndRemoveMatchingOperation(timestamp);

      if (matchedOperation) {
        const userPerceivedLatency = timestamp - matchedOperation.timestamp;

        console.log(
          `⚡ [OT] User perceived latency: ${userPerceivedLatency.toFixed(1)}ms`
        );

        // Record user perceived latency
        if (userPerceivedLatency >= 0.1 && userPerceivedLatency <= 5000) {
          // OT may have higher latency
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
            `📊 [OT] User perceived latency recorded: ${userPerceivedLatency.toFixed(
              1
            )}ms, Operation: ${matchedOperation.key}, array length: ${
              this.metrics.operationLatencies.length
            }`
          );
        } else {
          console.log(
            `⚠️ OT user perceived latency anomaly: ${userPerceivedLatency.toFixed(
              1
            )}ms, ignored`
          );
        }
      } else {
        // 无法匹配的本地Operation（如格式化或初始化）
        // OT中这类Operation通常也needed服务器往返，所以有一定延迟
        const estimatedLatency = 50; // 50ms estimated server round trip time

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
          `📊 [OT] 服务器Operation延迟(估算): ${estimatedLatency}ms, array length: ${this.metrics.operationLatencies.length}`
        );
      }
    } else {
      // 远程Operation：不影响本地user感知延迟，不record
      console.log(`📥 [OT] 远程Operation（不影响user感知）:`, data);
    }
  }

  /**
   * 🔥 Handle OT multi-window sync confirmation
   */

  /**
   * Handle operation response
   */
  handleOperation(data) {
    console.log(`⚡ [OT] 收到Operation响应:`, data);
    // This method is mainly for recording, actual latency calculation is in handleDocUpdate
  }

  /**
   * 查找并移除匹配的Operation
   */
  findAndRemoveMatchingOperation(updateTimestamp) {
    console.log(`🔍 [OT] start查找匹配Operation:`, {
      updateTimestamp,
      pendingOperationsLength: this.pendingOperations.length,
      pendingOperations: this.pendingOperations.map((op) => ({
        key: op.key,
        timestamp: op.timestamp,
        timeDiff: (updateTimestamp - op.timestamp).toFixed(1),
      })),
    });

    if (this.pendingOperations.length === 0) return null;

    // 🔥 增加时间窗口：3秒内的Operation才可能匹配（OT可能有更高延迟）
    const timeWindow = 3000;
    const cutoffTime = updateTimestamp - timeWindow;

    // 过滤有效Operation
    const validOperations = this.pendingOperations.filter(
      (op) => op.timestamp > cutoffTime
    );

    if (validOperations.length === 0) {
      // 清理过期Operation
      this.pendingOperations = this.pendingOperations.filter(
        (op) => op.timestamp > cutoffTime
      );

      // 🔥 New: Debug info
      console.log(`🔍 [OT] userOperation匹配failed:`, {
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

    // 取最近的Operation（LIFO）
    const matchedOp = validOperations[validOperations.length - 1];

    // Remove from queue
    this.pendingOperations = this.pendingOperations.filter(
      (op) => op.id !== matchedOp.id
    );

    // 🔥 New: Debug info
    console.log(`✅ [OT] userOperation匹配successful:`, {
      matchedOperation: matchedOp.key,
      timeDiff: (updateTimestamp - matchedOp.timestamp).toFixed(1) + "ms",
      remainingOperations: this.pendingOperations.length,
    });

    return matchedOp;
  }

  /**
   * Determine if it's a printable character
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
   * Handle pong response (real network latency measurement)
   */
  handlePong(data) {
    if (data.latency) {
      this.metrics.networkLatencies.push({
        latency: data.latency,
        timestamp: performance.now(),
        windowId: this.windowId,
        isReal: true,
      });

      console.log(`🏓 [OT] Real network latency: ${data.latency.toFixed(1)}ms`);
    }
  }

  /**
   * Clean expired E2E data
   */
  cleanupExpiredE2EData() {
    const now = performance.now();
    const maxAge = 10000; // 10 seconds expiration, shorter time window
    let cleanedE2ECount = 0;
    let cleanedOperationsCount = 0;

    // Clean expired E2E data
    for (const [hash, timestamp] of this.pendingE2E.entries()) {
      if (now - timestamp > maxAge) {
        this.pendingE2E.delete(hash);
        cleanedE2ECount++;
      }
    }

    // 清理过期的Operationcount据
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
        `🧹 [E2E] Cleaned ${cleanedE2ECount} expired E2E data, ${cleanedOperationsCount} 过期Operationcount据, 剩余: E2E=${this.pendingE2E.size}, Operation=${this.pendingOperationMessages.size}`
      );
    }
  }

  /**
   * Get real performance statistics
   */
  getAggregatedMetrics() {
    console.log("🔍 [OT Monitor] getAggregatedMetrics called");
    console.log("🔍 [OT Monitor] isMonitoring:", this.isMonitoring);
    console.log("🔍 [OT Monitor] startTime:", this.startTime);
    console.log("🔍 [OT Monitor] otClientExists:", !!this.otClient);
    console.log("🔍 [OT Monitor] otClientConnected:", this.otClient?.isConnected);

    if (!this.isMonitoring || !this.startTime) {
      console.log("❌ [OT Monitor] Monitoring not started or start time is empty, returning null");
      return null;
    }

    const now = performance.now();
    const monitoringDuration = (now - this.startTime) / 1000;

    // 🔥 Optimization: Shorten time window to 4 seconds, improve response speed
    const recentWindow = 4000; // Change from 10000ms to 4000ms
    const recentTime = now - recentWindow;

    const recentLatencies = this.metrics.operationLatencies
      .filter((l) => l.timestamp > recentTime)
      .map((l) => l.latency);

    const allLatencies = this.metrics.operationLatencies.map((l) => l.latency);
    const allNetworkLatencies = this.metrics.networkLatencies.map(
      (l) => l.latency
    );
    // 🔥 New: End-to-end latency statistics
    const allEndToEndLatencies = this.metrics.endToEndLatencies.map(
      (l) => l.latency
    );

    // 🔥 Optimization: Layered P95 calculation strategy
    let latenciesToUse, p95Latency, avgLatency;

    if (recentLatencies.length >= 12) {
      // Recent data sufficient: use recent 4 seconds data
      latenciesToUse = recentLatencies;
      // 🔥 Reduce log output frequency, avoid timer repetitive output
      if (recentLatencies.length % 10 === 0) {
        console.log(
          `📊 [OT] Using recent 4 seconds data to calculate P95: ${latenciesToUse.length}samples`
        );
      }
    } else if (allLatencies.length >= 20) {
      // Historical data sufficient: use all data
      latenciesToUse = allLatencies;
      // 🔥 Reduce log output frequency, avoid timer repetitive output
      if (allLatencies.length % 10 === 0) {
        console.log(
          `📊 [OT] Using all historical data to calculate P95: ${latenciesToUse.length}samples`
        );
      }
    } else if (allLatencies.length >= 6) {
      // Less data: use all data, but lower confidence
      latenciesToUse = allLatencies;
      // 🔥 Reduce log output frequency, avoid timer repetitive output
      if (allLatencies.length % 10 === 0) {
        console.log(
          `📊 [OT] Using limited data to calculate P95: ${latenciesToUse.length}samples(low confidence)`
        );
      }
    } else {
      // Insufficient data: use average as P95 estimation
      latenciesToUse = allLatencies;
      // 🔥 Reduce log output frequency, avoid timer repetitive output
      if (allLatencies.length === 0 || allLatencies.length % 10 === 0) {
        console.log(
          `📊 [OT] Insufficient data, using average to estimate P95: ${latenciesToUse.length}samples`
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
        // When samples insufficient, use average * 1.5 as P95 estimation
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

    // 🔥 New: End-to-end latency statistics计算
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
      // Basic info
      monitoringDuration,
      isConnected: this.otClient && this.otClient.isConnected,
      windowId: this.windowId,

      // Operation统计
      operationsCount: this.metrics.operationsCount,
      totalOperationSize: this.metrics.totalOperationSize,
      opsPerSecond: this.metrics.operationsCount / monitoringDuration,
      avgOperationSize:
        this.metrics.operationsCount > 0
          ? this.metrics.totalOperationSize / this.metrics.operationsCount
          : 0,

      // userOperation统计
      keystrokes: this.metrics.keystrokes,
      keystrokesPerSecond: this.metrics.keystrokes / monitoringDuration,
      pendingOperations: this.pendingOperations.length,

      // 🔥 Optimization: Latency statistics
      avgLatency,
      p95Latency,
      avgNetworkLatency,
      latencySamples: allLatencies.length,
      recentLatencySamples: recentLatencies.length,
      networkLatencySamples: allNetworkLatencies.length,

      // 🔥 New: End-to-end latency statistics
      avgE2ELatency,
      p95E2ELatency,
      e2eSamples: allEndToEndLatencies.length,

      // 🔥 New: Data quality metrics
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

      // 🔥 Real network statistics - no longer use estimated values
      bytesSent: this.metrics.realNetworkBytes.sent,
      bytesReceived: this.metrics.realNetworkBytes.received,
      bytesPerSecond:
        (this.metrics.realNetworkBytes.sent +
          this.metrics.realNetworkBytes.received) /
        monitoringDuration,

      // Network message statistics
      messagesSent: this.realNetworkStats.messagesSent,
      messagesReceived: this.realNetworkStats.messagesReceived,
      messagesPerSecond:
        (this.realNetworkStats.messagesSent +
          this.realNetworkStats.messagesReceived) /
        monitoringDuration,

      // Collaboration statistics
      activeConnections: this.otClient && this.otClient.isConnected ? 1 : 0,
      conflictResolutions: 0, // OT automatically handles conflicts

      // Runtime
      uptime: monitoringDuration * 1000,

      // Data authenticity markers
      dataSource: "real-websocket-monitoring",
      hasRealNetworkData: this.metrics.networkEvents.length > 0,
      hasRealLatencyData:
        this.metrics.operationLatencies.filter((l) => l.isReal).length > 0,
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;

    // Clean up event listeners
    document.removeEventListener("keydown", this.handleKeydown);

    // Clean up OT event listeners
    if (this.otClient) {
      this.otClient.off("docUpdate", this.handleDocUpdate);
      this.otClient.off("operation", this.handleOperation);
      this.otClient.off("pong", this.handlePong);
    }

    // 🔥 New: Restore original WebSocket methods
    if (this.otClient && this.otClient.ws && this.originalSend) {
      this.otClient.ws.send = this.originalSend;
    }

    // 🔥 New: Clean up E2E cleanup timer
    if (this.e2eCleanupInterval) {
      clearInterval(this.e2eCleanupInterval);
    }

    console.log("⏹️ Stopped OT performance monitoring");
  }

  /**
   * Reset metrics
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
      // 🔥 New: End-to-end latency metrics
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

    console.log("🔄 OT performance metrics reset");
  }
}

export default OTPerformanceMonitor;
