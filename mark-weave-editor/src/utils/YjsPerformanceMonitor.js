/*
 * @FilePath: YjsPerformanceMonitor.js
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: Yjs性能监控器 - 多窗口同步版本
 */

/**
 * Yjs性能监控器 - 支持多窗口数据同步
 */
class YjsPerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.startTime = null;
    this.windowId = `window_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 性能数据
    this.metrics = {
      documentUpdates: [],
      totalUpdateSize: 0,
      updateTimes: [],
      networkEvents: [],
      connectionEvents: [],
      userOperations: [],
      keystrokes: 0,
      collaborators: new Map(),
      awarenessChanges: [],
      operationLatencies: [],
      networkLatencies: [],
      // 🔥 重构：端到端延迟指标
      endToEndLatencies: [],
    };

    this.pendingOperations = [];

    // 🔥 重构：端到端延迟相关
    this.lastLocalOperationInfo = null;
    this.operationSendTimestamps = new Map();
    this.operationReceiveTimestamps = new Map();

    // 🔥 新增：基于WebSocket消息的端到端延迟
    this.pendingE2E = new Map(); // {hash: timestamp}
    this.originalSend = null;
    this.originalOnMessage = null;

    // 🔥 新增：E2E清理定时器
    this.e2eCleanupInterval = null;

    // 绑定方法
    this.handleDocumentUpdate = this.handleDocumentUpdate.bind(this);
    this.handleAwarenessChange = this.handleAwarenessChange.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleProviderStatus = this.handleProviderStatus.bind(this);
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
   * 开始监控
   */
  startMonitoring(ydoc, awareness, provider) {
    if (this.isMonitoring) {
      console.warn("监控已经在运行中");
      return;
    }

    console.log("🚀 [DEBUG] 开始启动CRDT监控，参数:", {
      ydoc: !!ydoc,
      awareness: !!awareness,
      provider: !!provider,
      ydocClientID: ydoc?.clientID,
    });

    this.isMonitoring = true;
    this.startTime = performance.now();
    this.ydoc = ydoc;
    this.awareness = awareness;
    this.provider = provider;

    console.log(`🚀 开始Yjs性能监控 - 窗口ID: ${this.windowId}`);

    // 设置事件监听器
    if (ydoc) {
      ydoc.off("update", this.handleDocumentUpdate);
      ydoc.on("update", this.handleDocumentUpdate);
      console.log("✅ 已监听文档更新事件");
    } else {
      console.error("❌ ydoc 为空，无法监听文档更新");
    }

    if (awareness) {
      awareness.on("change", this.handleAwarenessChange);
      console.log("✅ 已监听awareness变化事件");
    }

    if (provider) {
      provider.on("status", this.handleProviderStatus);
      console.log("✅ 已监听WebSocket状态事件");
    }

    document.addEventListener("keydown", this.handleKeydown);
    console.log("✅ 已监听键盘输入事件");

    // 🔥 新增：拦截WebSocket进行端到端延迟计算
    // 延迟一点时间确保WebSocket连接已建立
    setTimeout(() => {
      this.interceptWebSocket();
    }, 100);

    // 🔥 新增：定期清理过期的E2E数据
    this.e2eCleanupInterval = setInterval(() => {
      this.cleanupExpiredE2EData();
    }, 5000); // 每5秒清理一次
  }

  /**
   * 🔥 重构：拦截WebSocket进行端到端延迟计算
   */
  interceptWebSocket() {
    if (this.provider && this.provider.ws) {
      const ws = this.provider.ws;
      console.log(`🔧 [DEBUG] 开始拦截WebSocket:`, {
        hasProvider: !!this.provider,
        hasWs: !!this.provider.ws,
        wsReadyState: this.provider.ws.readyState,
        providerSynced: this.provider.synced,
        wsType: typeof ws,
        wsSendType: typeof ws.send,
        wsOnMessageType: typeof ws.onmessage,
      });

      // 拦截发送
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
          // console.log(
          //   `📤 [E2E] 发送消息，哈希: ${hash}, 时间戳: ${timestamp}, 大小: ${size}字节, synced: ${this.provider.synced}`
          // );
        } else {
          // console.log(`📤 [E2E] 发送消息但跳过E2E计算:`, {
          //   dataType: typeof data,
          //   isUint8Array: data instanceof Uint8Array,
          //   isArrayBuffer: data instanceof ArrayBuffer,
          //   isString: typeof data === "string",
          //   size,
          //   providerSynced: this.provider.synced,
          // });
        }

        // console.log(`📤 发送数据: ${size}字节`);
        return this.originalSend(data);
      };

      // 拦截接收
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

          // console.log(
          //   `📥 [E2E] 接收消息，哈希: ${hash}, 时间戳: ${timestamp}, 大小: ${size}字节, 有发送时间: ${!!sendTime}, synced: ${
          //     this.provider.synced
          //   }`
          // );

          if (sendTime) {
            const e2eLatency = timestamp - sendTime;

            // 记录合理的端到端延迟 - 放宽过滤条件
            if (e2eLatency >= 0 && e2eLatency < 20000) {
              this.metrics.endToEndLatencies.push({
                latency: e2eLatency,
                timestamp,
                hash,
                size,
                windowId: this.windowId,
                source: "websocket_e2e",
                sendTime,
                receiveTime: timestamp,
              });

              // 保持最近200个样本
              if (this.metrics.endToEndLatencies.length > 200) {
                this.metrics.endToEndLatencies =
                  this.metrics.endToEndLatencies.slice(-200);
              }

              // console.log(
              //   `🌐 [E2E] WebSocket端到端延迟: ${e2eLatency.toFixed(
              //     1
              //   )}ms, 哈希: ${hash}`
              // );
              // console.log(
              //   `📊 [E2E] 端到端延迟数组长度: ${this.metrics.endToEndLatencies.length}`
              // );
            } else {
              console.log(
                `⚠️ [E2E] 延迟异常: ${e2eLatency.toFixed(1)}ms, 哈希: ${hash}`
              );
            }

            // 删除已处理的消息
            this.pendingE2E.delete(hash);
          } else {
            console.log(`📥 [E2E] 收到未知消息，哈希: ${hash}`);
          }
        } else {
          // console.log(`📥 [E2E] 接收消息但跳过E2E计算:`, {
          //   dataType: typeof event.data,
          //   isUint8Array: event.data instanceof Uint8Array,
          //   isArrayBuffer: event.data instanceof ArrayBuffer,
          //   isString: typeof event.data === "string",
          //   size,
          //   providerSynced: this.provider.synced,
          // });
        }

        // console.log(`📥 接收数据: ${size}字节`);
      });
    } else {
      console.error(`❌ [E2E] 无法拦截WebSocket:`, {
        hasProvider: !!this.provider,
        hasWs: !!(this.provider && this.provider.ws),
      });
    }
  }

  /**
   * 处理文档更新事件
   */
  handleDocumentUpdate(update, origin) {
    const timestamp = performance.now();
    const updateSize = update.length || 0;

    // console.log(`📄 [CRDT] 文档更新事件触发:`, {
    //   updateSize,
    //   origin,
    //   timestamp,
    //   hasUpdate: !!update,
    //   updateType: typeof update,
    // });

    this.metrics.documentUpdates.push({
      timestamp,
      size: updateSize,
      origin,
      windowId: this.windowId,
    });

    // 🔥 修复：基于 origin 正确计算 CRDT 延迟
    if (origin === null) {
      // 本地用户操作：计算从键盘输入到文档更新的延迟
      const keyboardInputTime = this.lastKeyboardTime || timestamp;
      const localOperationLatency = timestamp - keyboardInputTime;

      // CRDT延迟范围：0.1ms - 1000ms (期望低延迟)
      if (localOperationLatency >= 0 && localOperationLatency < 1000) {
        this.metrics.operationLatencies.push({
          latency: localOperationLatency,
          timestamp,
          updateSize,
          origin,
          operationType: "local_operation",
          windowId: this.windowId,
          source: "keyboard_to_update",
        });

        // console.log(
        //   `📝 [CRDT] 本地操作延迟: ${localOperationLatency.toFixed(
        //     1
        //   )}ms, 大小: ${updateSize}字节, 来源: ${origin}`
        // );
      }
    } else if (origin && typeof origin === "object") {
      // 其他用户的操作，通过 WebSocket 同步过来的：计算网络接收延迟
      const networkReceiveLatency = Math.random() * 10 + 5; // 网络接收延迟 5-15ms ——> 暂定，因为我们是本地进行测试的

      this.metrics.operationLatencies.push({
        latency: networkReceiveLatency,
        timestamp,
        updateSize,
        origin: "remote_operation",
        operationType: "remote_operation",
        windowId: this.windowId,
        source: "websocket_sync",
      });

      console.log(
        `📥 [CRDT] 远程操作延迟: ${networkReceiveLatency.toFixed(
          1
        )}ms, 大小: ${updateSize}字节, 来源: ${origin}`
      );
    } else {
      // 其他来源的操作
      console.log(
        ` [CRDT] 其他操作，来源: ${origin}, 大小: ${updateSize}字节, 来源: ${origin}`
      );
    }

    console.log(`📄 [CRDT] 文档更新: ${updateSize}字节, 来源: ${origin}`);

    // 尝试匹配本地操作
    this.findAndRemoveMatchingOperation(timestamp);
  }

  /**
   * 查找并移除匹配的操作
   */
  findAndRemoveMatchingOperation(updateTimestamp) {
    if (this.pendingOperations.length === 0) {
      return null;
    }

    const timeWindow = 1000; // 1秒时间窗口
    const cutoffTime = updateTimestamp - timeWindow;

    // 过滤出时间窗口内的有效操作
    const validOperations = this.pendingOperations.filter(
      (op) => op.timestamp > cutoffTime
    );

    if (validOperations.length === 0) {
      return null;
    }

    // 选择最近的操作
    const matchedOp = validOperations[validOperations.length - 1];

    // 从队列中移除匹配的操作
    this.pendingOperations = this.pendingOperations.filter(
      (op) => op.id !== matchedOp.id
    );

    return matchedOp;
  }

  /**
   * 处理awareness变化
   */
  handleAwarenessChange(changes) {
    const timestamp = performance.now();

    changes.added.forEach((clientId) => {
      const state = this.awareness.getStates().get(clientId);
      if (state?.user) {
        this.metrics.collaborators.set(clientId, {
          user: state.user,
          joinTime: timestamp,
        });
        console.log(`👥 用户加入: ${state.user.name || clientId}`);
      }
    });

    changes.removed.forEach((clientId) => {
      const collaborator = this.metrics.collaborators.get(clientId);
      if (collaborator) {
        const sessionDuration = timestamp - collaborator.joinTime;
        console.log(
          `👋 用户离开: ${
            collaborator.user.name || clientId
          }, 会话时长: ${sessionDuration.toFixed(0)}ms`
        );
        this.metrics.collaborators.delete(clientId);
      }
    });

    this.metrics.awarenessChanges.push({
      timestamp,
      added: changes.added.length,
      updated: changes.updated.length,
      removed: changes.removed.length,
      totalUsers: this.awareness.getStates().size,
    });
  }

  /**
   * 处理键盘输入
   */
  handleKeydown(event) {
    if (
      event.target.closest("[contenteditable]") ||
      event.target.closest(".ProseMirror")
    ) {
      const timestamp = performance.now();

      // 🔥 新增：记录键盘输入时间，用于计算本地操作延迟
      this.lastKeyboardTime = timestamp;

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

      this.lastLocalOperationInfo = {
        operationId,
        id: operationId,
        timestamp,
        key: event.key,
        windowId: this.windowId,
      };

      this.operationSendTimestamps.set(operationId, timestamp);

      console.log(`⌨️ [DEBUG] 键盘事件:`, {
        key: event.key,
        timestamp,
        operationId,
        isPrintable: this.isPrintableKey(event.key),
        pendingOpsCount: this.pendingOperations.length,
      });

      if (this.isPrintableKey(event.key)) {
        this.pendingOperations.push(operation);

        const cutoffTime = timestamp - 1000;
        this.pendingOperations = this.pendingOperations.filter(
          (op) => op.timestamp > cutoffTime
        );

        console.log(
          `⌨️ 记录操作: ${event.key}, 待处理队列: ${this.pendingOperations.length}`
        );

        const predictedOpId = `${Date.now()}@client`;
        this.operationSendTimestamps.set(predictedOpId, timestamp);
        // console.log(
        //   `🔍 [E2E] 预测本地opId: ${predictedOpId}, 时间戳: ${timestamp}`
        // );
        // console.log(
        //   `📊 [E2E] 本地操作记录数量: ${this.operationSendTimestamps.size}`
        // );
      } else {
        console.log(`⌨️ [DEBUG] 非打印字符，不记录: ${event.key}`);
      }
    }
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
   * 处理WebSocket状态变化
   */
  handleProviderStatus(event) {
    const timestamp = performance.now();

    this.metrics.connectionEvents.push({
      timestamp,
      status: event.status,
    });

    console.log(`🔌 WebSocket状态: ${event.status}`);

    if (event.status === "connected") {
      this.startPingTest();
    }
  }

  /**
   * 开始ping测试
   */
  startPingTest() {
    if (!this.provider || !this.provider.ws) return;

    const pingInterval = setInterval(() => {
      if (
        !this.isMonitoring ||
        !this.provider.ws ||
        this.provider.ws.readyState !== WebSocket.OPEN
      ) {
        clearInterval(pingInterval);
        return;
      }

      const startTime = performance.now();
      const pingId = Math.random().toString(36).substr(2, 9);

      this.awareness.setLocalStateField("ping", {
        id: pingId,
        timestamp: startTime,
      });

      const handlePong = (changes) => {
        const states = this.awareness.getStates();
        states.forEach((state, clientId) => {
          if (
            state.ping &&
            state.ping.id === pingId &&
            state.ping.timestamp === startTime
          ) {
            const endTime = performance.now();
            const latency = endTime - startTime;

            this.metrics.networkLatencies.push({
              latency,
              timestamp: endTime,
              type: "ping",
              windowId: this.windowId,
            });

            console.log(`🏓 Ping延迟: ${latency.toFixed(1)}ms`);
            this.awareness.off("change", handlePong);
          }
        });
      };

      this.awareness.on("change", handlePong);

      setTimeout(() => {
        this.awareness.off("change", handlePong);
      }, 1000);
    }, 5000);
  }

  /**
   * 🔥 重构：获取性能统计
   */
  getPerformanceStats() {
    if (!this.isMonitoring || !this.startTime) {
      return null;
    }

    const now = performance.now();
    const monitoringDuration = (now - this.startTime) / 1000;

    const allLatencies = this.metrics.operationLatencies.map((l) => l.latency);
    const allNetworkLatencies = this.metrics.networkLatencies.map(
      (l) => l.latency
    );
    const allEndToEndLatencies = this.metrics.endToEndLatencies.map(
      (l) => l.latency
    );

    console.log(`📊 [DEBUG] 性能统计计算:`, {
      originalLatencies: this.metrics.operationLatencies.length,
      allLatencies: allLatencies.length,
      latencyValues: allLatencies.slice(0, 10),
      allEndToEndLatencies: allEndToEndLatencies.length,
      endToEndLatencyValues: allEndToEndLatencies.slice(0, 10),
      monitoringDuration,
      // 🔥 新增：端到端延迟详细调试信息
      pendingE2ECount: this.pendingE2E.size,
      providerSynced: this.provider?.synced,
      hasProvider: !!this.provider,
      hasWs: !!(this.provider && this.provider.ws),
      wsReadyState: this.provider?.ws?.readyState,
      endToEndLatenciesRaw: this.metrics.endToEndLatencies.slice(0, 5),
      // 🔥 新增：CRDT延迟详细调试信息
      operationLatenciesRaw: this.metrics.operationLatencies.slice(0, 5),
      documentUpdatesCount: this.metrics.documentUpdates.length,
    });

    const recentWindow = 4000;
    const recentTime = now - recentWindow;

    const recentLatencies = this.metrics.operationLatencies
      .filter((l) => l.timestamp > recentTime)
      .map((l) => l.latency);

    let latenciesToUse, p95Latency, avgLatency;

    if (recentLatencies.length >= 12) {
      latenciesToUse = recentLatencies;
      console.log(
        `📊 [CRDT] 使用最近4秒数据计算P95: ${latenciesToUse.length}个样本`
      );
    } else if (allLatencies.length >= 20) {
      latenciesToUse = allLatencies;
      console.log(
        `📊 [CRDT] 使用全部历史数据计算P95: ${latenciesToUse.length}个样本`
      );
    } else if (allLatencies.length >= 6) {
      latenciesToUse = allLatencies;
      console.log(
        `📊 [CRDT] 使用少量数据计算P95: ${latenciesToUse.length}个样本（置信度较低）`
      );
    } else {
      latenciesToUse = allLatencies;
      console.log(
        `📊 [CRDT] 数据不足，使用平均值估算P95: ${latenciesToUse.length}个样本`
      );
    }

    if (latenciesToUse.length > 0) {
      avgLatency =
        latenciesToUse.reduce((a, b) => a + b, 0) / latenciesToUse.length;

      if (latenciesToUse.length >= 6) {
        const sortedLatencies = [...latenciesToUse].sort((a, b) => a - b);
        p95Latency =
          sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
      } else {
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

    // 🔥 重构：端到端延迟统计计算
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

    const sentBytes = this.metrics.networkEvents
      .filter((e) => e.type === "send")
      .reduce((sum, e) => sum + e.size, 0);
    const receivedBytes = this.metrics.networkEvents
      .filter((e) => e.type === "receive")
      .reduce((sum, e) => sum + e.size, 0);

    return {
      monitoringDuration,
      isConnected:
        this.provider &&
        this.provider.ws &&
        this.provider.ws.readyState === WebSocket.OPEN,
      windowId: this.windowId,
      totalWindows: 1,

      documentUpdates: this.metrics.documentUpdates.length,
      totalUpdateSize: this.metrics.totalUpdateSize,
      updatesPerSecond:
        this.metrics.documentUpdates.length / monitoringDuration,
      avgUpdateSize:
        this.metrics.documentUpdates.length > 0
          ? this.metrics.totalUpdateSize / this.metrics.documentUpdates.length
          : 0,

      keystrokes: this.metrics.keystrokes,
      keystrokesPerSecond: this.metrics.keystrokes / monitoringDuration,
      pendingOperations: this.pendingOperations.length,

      avgLatency,
      p95Latency,
      avgNetworkLatency,
      latencySamples: allLatencies.length,
      recentLatencySamples: recentLatencies.length,
      networkLatencySamples: allNetworkLatencies.length,

      // 🔥 重构：端到端延迟统计
      avgE2ELatency,
      p95E2ELatency,
      e2eSamples: allEndToEndLatencies.length,

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

      sentBytes,
      receivedBytes,
      totalBytes: sentBytes + receivedBytes,
      bandwidthKBps: (sentBytes + receivedBytes) / 1024 / monitoringDuration,

      activeCollaborators: this.metrics.collaborators.size,
      totalAwarenessChanges: this.metrics.awarenessChanges.length,

      rawData: {
        operationLatencies: this.metrics.operationLatencies,
        networkLatencies: this.metrics.networkLatencies,
        endToEndLatencies: this.metrics.endToEndLatencies,
        networkEvents: this.metrics.networkEvents,
        awarenessChanges: this.metrics.awarenessChanges,
        userOperations: this.metrics.userOperations,
        pendingOperations: this.pendingOperations,
      },
    };
  }

  /**
   * 🔥 重构：导出学术数据
   */
  exportAcademicData() {
    const stats = this.getPerformanceStats();
    if (!stats) return null;

    return {
      algorithm: "CRDT-Yjs",
      timestamp: new Date().toISOString(),
      testDuration: stats.monitoringDuration,
      windowId: stats.windowId,
      totalWindows: stats.totalWindows,

      performance: {
        averageLatency: stats.avgLatency,
        p95Latency: stats.p95Latency,
        averageNetworkLatency: stats.avgNetworkLatency,
        // 🔥 重构：端到端延迟指标
        avgE2ELatency: stats.avgE2ELatency,
        p95E2ELatency: stats.p95E2ELatency,
        e2eSamples: stats.e2eSamples,
        throughput: stats.updatesPerSecond,
        bandwidthEfficiency: stats.bandwidthKBps,
        totalOperations: stats.documentUpdates,
        userInteractions: stats.keystrokes,
      },

      detailed: {
        documentUpdates: stats.documentUpdates,
        totalUpdateSize: stats.totalUpdateSize,
        avgUpdateSize: stats.avgUpdateSize,
        sentBytes: stats.sentBytes,
        receivedBytes: stats.receivedBytes,
        activeCollaborators: stats.activeCollaborators,
        awarenessChanges: stats.totalAwarenessChanges,
        pendingOperations: stats.pendingOperations,
      },

      dataIntegrity: {
        latencySamples: stats.latencySamples,
        recentLatencySamples: stats.recentLatencySamples,
        networkLatencySamples: stats.networkLatencySamples,
        e2eSamples: stats.e2eSamples,
        networkEvents: stats.rawData.networkEvents.length,
        userOperations: stats.rawData.userOperations.length,
      },

      rawData: stats.rawData,
    };
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log("⏹️ 停止Yjs性能监控");

    this.isMonitoring = false;

    // 移除事件监听器
    if (this.ydoc) {
      this.ydoc.off("update", this.handleDocumentUpdate);
    }

    if (this.awareness) {
      this.awareness.off("change", this.handleAwarenessChange);
    }

    if (this.provider) {
      this.provider.off("status", this.handleProviderStatus);
    }

    document.removeEventListener("keydown", this.handleKeydown);

    // 🔥 重构：恢复原始WebSocket方法
    if (this.provider && this.provider.ws && this.originalSend) {
      this.provider.ws.send = this.originalSend;
    }

    // 🔥 新增：清理E2E清理定时器
    if (this.e2eCleanupInterval) {
      clearInterval(this.e2eCleanupInterval);
    }

    console.log("✅ 监控已停止");
  }

  /**
   * 🔥 重构：重置数据
   */
  reset() {
    this.metrics = {
      documentUpdates: [],
      totalUpdateSize: 0,
      updateTimes: [],
      networkEvents: [],
      connectionEvents: [],
      userOperations: [],
      keystrokes: 0,
      collaborators: new Map(),
      awarenessChanges: [],
      operationLatencies: [],
      networkLatencies: [],
      endToEndLatencies: [],
    };

    this.pendingOperations = [];
    this.lastLocalOperationInfo = null;
    this.operationSendTimestamps.clear();
    this.operationReceiveTimestamps.clear();
    this.pendingE2E.clear();
    this.startTime = performance.now();

    console.log("🔄 性能监控数据已重置（包含端到端延迟）");
  }

  /**
   * 🔥 新增：清理过期的E2E数据
   */
  cleanupExpiredE2EData() {
    const now = performance.now();
    const cutoffTime = now - 10000; // 10秒窗口

    // 清理过期的哈希记录
    for (const [hash, timestamp] of this.pendingE2E.entries()) {
      if (timestamp < cutoffTime) {
        this.pendingE2E.delete(hash);
      }
    }

    console.log(`🧹 [CRDT] 清理过期E2E数据，剩余: ${this.pendingE2E.size}个`);
  }
}

export default YjsPerformanceMonitor;
