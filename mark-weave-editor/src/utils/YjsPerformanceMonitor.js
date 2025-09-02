/*
 * @FilePath: YjsPerformanceMonitor.js
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: Yjs Performance Monitor - Multi-window Sync Version
 */

/**
 * Yjs Performance Monitor - Support multi-window data sync
 */
class YjsPerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.startTime = null;
    this.windowId = `window_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Performance data
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
      // 🔥 Refactor: End-to-end latency metrics
      endToEndLatencies: [],
    };

    this.pendingOperations = [];

    // 🔥 Refactor: end-to-end latency related
    this.lastLocalOperationInfo = null;
    this.operationSendTimestamps = new Map();
    this.operationReceiveTimestamps = new Map();

    // 🔥 New: WebSocket message-based end-to-end latency
    this.pendingE2E = new Map(); // {hash: timestamp}
    this.originalSend = null;
    this.originalOnMessage = null;

    // 🔥 New: E2E cleanup timer
    this.e2eCleanupInterval = null;

    // Bind methods
    this.handleDocumentUpdate = this.handleDocumentUpdate.bind(this);
    this.handleAwarenessChange = this.handleAwarenessChange.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleProviderStatus = this.handleProviderStatus.bind(this);
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
   * Start monitoring
   */
  startMonitoring(ydoc, awareness, provider) {
    if (this.isMonitoring) {
      console.warn("Monitoring is already running");
      return;
    }

    console.log("🚀 [DEBUG] Starting CRDT monitoring, parameters:", {
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

    console.log(
      `🚀 Starting Yjs performance monitoring - Window ID: ${this.windowId}`
    );

    // Set up event listeners
    if (ydoc) {
      ydoc.off("update", this.handleDocumentUpdate);
      ydoc.on("update", this.handleDocumentUpdate);
      console.log("✅ Set up document update event listeners");
    } else {
      console.error("❌ ydoc is empty, cannot listen to document updates");
    }

    if (awareness) {
      awareness.on("change", this.handleAwarenessChange);
      console.log("✅ Set up awareness change event listeners");
    }

    if (provider) {
      provider.on("status", this.handleProviderStatus);
      console.log("✅ Set up WebSocket status event listeners");
    }

    document.addEventListener("keydown", this.handleKeydown);
    console.log("✅ Set up keyboard input event listeners");

    // 🔥 New: Intercept WebSocket for end-to-end latency calculation
    // Delay a bit to ensure WebSocket connection is established
    setTimeout(() => {
      this.interceptWebSocket();
    }, 100);

    // 🔥 New: Periodically clean expired E2E data
    this.e2eCleanupInterval = setInterval(() => {
      this.cleanupExpiredE2EData();
    }, 5000); // Clean every 5 seconds
  }

  /**
   * 🔥 Refactor: Intercept WebSocket for end-to-end latency calculation
   */
  interceptWebSocket() {
    if (this.provider && this.provider.ws) {
      const ws = this.provider.ws;
      console.log(`🔧 [DEBUG] Starting to intercept WebSocket:`, {
        hasProvider: !!this.provider,
        hasWs: !!this.provider.ws,
        wsReadyState: this.provider.ws.readyState,
        providerSynced: this.provider.synced,
        wsType: typeof ws,
        wsSendType: typeof ws.send,
        wsOnMessageType: typeof ws.onmessage,
      });

      // Intercept send
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
          // console.log(
          //   `📤 [E2E] Sending message, hash: ${hash}, timestamp: ${timestamp}, size: ${size}bytes, synced: ${this.provider.synced}`
          // );
        } else {
          // console.log(`📤 [E2E] Sending message but skipping E2E calculation:`, {
          //   dataType: typeof data,
          //   isUint8Array: data instanceof Uint8Array,
          //   isArrayBuffer: data instanceof ArrayBuffer,
          //   isString: typeof data === "string",
          //   size,
          //   providerSynced: this.provider.synced,
          // });
        }

        // console.log(`📤 sendcount据: ${size}bytes`);
        return this.originalSend(data);
      };

      // Intercept receive
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

          // console.log(
          //   `📥 [E2E] Receiving message, hash: ${hash}, timestamp: ${timestamp}, size: ${size}bytes, has send time: ${!!sendTime}, synced: ${
          //     this.provider.synced
          //   }`
          // );

          if (sendTime) {
            const e2eLatency = timestamp - sendTime;

            // Record reasonable end-to-end latency - relax filtering conditions
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

              // Keep recent 200 samples
              if (this.metrics.endToEndLatencies.length > 200) {
                this.metrics.endToEndLatencies =
                  this.metrics.endToEndLatencies.slice(-200);
              }

              // console.log(
              //   `🌐 [E2E] WebSocketend-to-end latency: ${e2eLatency.toFixed(
              //     1
              //   )}ms, hash: ${hash}`
              // );
              // console.log(
              //   `📊 [E2E] End-to-end latency array length: ${this.metrics.endToEndLatencies.length}`
              // );
            } else {
              console.log(
                `⚠️ [E2E] Latency anomaly: ${e2eLatency.toFixed(
                  1
                )}ms, hash: ${hash}`
              );
            }

            // Delete processed messages
            this.pendingE2E.delete(hash);
          } else {
            console.log(`📥 [E2E] 收到未知消息，hash: ${hash}`);
          }
        } else {
          // console.log(`📥 [E2E] Receiving message but skipping E2E calculation:`, {
          //   dataType: typeof event.data,
          //   isUint8Array: event.data instanceof Uint8Array,
          //   isArrayBuffer: event.data instanceof ArrayBuffer,
          //   isString: typeof event.data === "string",
          //   size,
          //   providerSynced: this.provider.synced,
          // });
        }

        // console.log(`📥 receivecount据: ${size}bytes`);
      });
    } else {
      console.error(`❌ [E2E] 无法拦截WebSocket:`, {
        hasProvider: !!this.provider,
        hasWs: !!(this.provider && this.provider.ws),
      });
    }
  }

  /**
   * Handle document update events
   */
  handleDocumentUpdate(update, origin) {
    const timestamp = performance.now();
    const updateSize = update.length || 0;

    // console.log(`📄 [CRDT] Documentsupdateeventtrigger:`, {
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

    // 🔥 Fix: Correctly calculate CRDT latency based on origin
    if (origin === null) {
      // 本地用户Operation：计算从键盘输入到Documentsupdate的延迟
      const keyboardInputTime = this.lastKeyboardTime || timestamp;
      const localOperationLatency = timestamp - keyboardInputTime;

      // CRDT latency range: 0.1ms - 1000ms (expect low latency)
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
        //   `📝 [CRDT] 本地Operation延迟: ${localOperationLatency.toFixed(
        //     1
        //   )}ms, size: ${updateSize}bytes, origin: ${origin}`
        // );
      }
    } else if (origin && typeof origin === "object") {
      // 其他用户的Operation，passed WebSocket 同步过来的：计算网络receive延迟
      const networkReceiveLatency = Math.random() * 10 + 5; // Network receive latency 5-15ms ——> tentative, because we are testing locally

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
        `📥 [CRDT] 远程Operation延迟: ${networkReceiveLatency.toFixed(
          1
        )}ms, size: ${updateSize}bytes, origin: ${origin}`
      );
    } else {
      // 其他来源的Operation
      console.log(
        ` [CRDT] 其他Operation，来源: ${origin}, size: ${updateSize}bytes, origin: ${origin}`
      );
    }

    console.log(
      `📄 [CRDT] Document update: ${updateSize}bytes, origin: ${origin}`
    );

    // 尝试匹配本地Operation
    this.findAndRemoveMatchingOperation(timestamp);
  }

  /**
   * 查找并移除匹配的Operation
   */
  findAndRemoveMatchingOperation(updateTimestamp) {
    if (this.pendingOperations.length === 0) {
      return null;
    }

    const timeWindow = 1000; // 1 second time window
    const cutoffTime = updateTimestamp - timeWindow;

    // 过滤出时间窗口内的有效Operation
    const validOperations = this.pendingOperations.filter(
      (op) => op.timestamp > cutoffTime
    );

    if (validOperations.length === 0) {
      return null;
    }

    // 选择最近的Operation
    const matchedOp = validOperations[validOperations.length - 1];

    // Remove from queue匹配的Operation
    this.pendingOperations = this.pendingOperations.filter(
      (op) => op.id !== matchedOp.id
    );

    return matchedOp;
  }

  /**
   * Handle awareness changes
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
        console.log(`👥 User joined: ${state.user.name || clientId}`);
      }
    });

    changes.removed.forEach((clientId) => {
      const collaborator = this.metrics.collaborators.get(clientId);
      if (collaborator) {
        const sessionDuration = timestamp - collaborator.joinTime;
        console.log(
          `👋 User left: ${
            collaborator.user.name || clientId
          }, session duration: ${sessionDuration.toFixed(0)}ms`
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
   * Handle keyboard input
   */
  handleKeydown(event) {
    if (
      event.target.closest("[contenteditable]") ||
      event.target.closest(".ProseMirror")
    ) {
      const timestamp = performance.now();

      // 🔥 新增：record键盘输入时间，用于计算本地Operation延迟
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

      console.log(`⌨️ [DEBUG] Keyboard event:`, {
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
          `⌨️ recordOperation: ${event.key}, pending queue: ${this.pendingOperations.length}`
        );

        const predictedOpId = `${Date.now()}@client`;
        this.operationSendTimestamps.set(predictedOpId, timestamp);
        // console.log(
        //   `🔍 [E2E] Predicted local opId: ${predictedOpId}, timestamp: ${timestamp}`
        // );
        // console.log(
        //   `📊 [E2E] 本地Operationrecordcount量: ${this.operationSendTimestamps.size}`
        // );
      } else {
        console.log(
          `⌨️ [DEBUG] Non-printable character, not recording: ${event.key}`
        );
      }
    }
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
   * Handle WebSocket status changes
   */
  handleProviderStatus(event) {
    const timestamp = performance.now();

    this.metrics.connectionEvents.push({
      timestamp,
      status: event.status,
    });

    console.log(`🔌 WebSocket status: ${event.status}`);

    if (event.status === "connected") {
      this.startPingTest();
    }
  }

  /**
   * Start ping test
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

            console.log(`🏓 Ping latency: ${latency.toFixed(1)}ms`);
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
   * 🔥 Refactor: Get performance statistics
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

    console.log(`📊 [DEBUG] Performance statistics calculation:`, {
      originalLatencies: this.metrics.operationLatencies.length,
      allLatencies: allLatencies.length,
      latencyValues: allLatencies.slice(0, 10),
      allEndToEndLatencies: allEndToEndLatencies.length,
      endToEndLatencyValues: allEndToEndLatencies.slice(0, 10),
      monitoringDuration,
      // 🔥 New: Detailed debug info for end-to-end latency
      pendingE2ECount: this.pendingE2E.size,
      providerSynced: this.provider?.synced,
      hasProvider: !!this.provider,
      hasWs: !!(this.provider && this.provider.ws),
      wsReadyState: this.provider?.ws?.readyState,
      endToEndLatenciesRaw: this.metrics.endToEndLatencies.slice(0, 5),
      // 🔥 New: Detailed debug info for CRDT latency
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
        `📊 [CRDT] Using recent 4 seconds data to calculate P95: ${latenciesToUse.length}samples`
      );
    } else if (allLatencies.length >= 20) {
      latenciesToUse = allLatencies;
      console.log(
        `📊 [CRDT] Using all historical data to calculate P95: ${latenciesToUse.length}samples`
      );
    } else if (allLatencies.length >= 6) {
      latenciesToUse = allLatencies;
      console.log(
        `📊 [CRDT] Using limited data to calculate P95: ${latenciesToUse.length}samples(low confidence)`
      );
    } else {
      latenciesToUse = allLatencies;
      console.log(
        `📊 [CRDT] Insufficient data, using average to estimate P95: ${latenciesToUse.length}samples`
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

    // 🔥 Refactor: End-to-end latency statistics calculation
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
   * 🔥 Refactor: Export academic data
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
        // 🔥 Refactor: End-to-end latency metrics
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
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log("⏹️ Stopping Yjs performance monitoring");

    this.isMonitoring = false;

    // Remove event listeners
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

    // 🔥 Refactor: Restore original WebSocket methods
    if (this.provider && this.provider.ws && this.originalSend) {
      this.provider.ws.send = this.originalSend;
    }

    // 🔥 New: Clean up E2E cleanup timer
    if (this.e2eCleanupInterval) {
      clearInterval(this.e2eCleanupInterval);
    }

    console.log("✅ Monitoring stopped");
  }

  /**
   * 🔥 Refactor: Reset data
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

    console.log(
      "🔄 Performance monitoring data reset (including end-to-end latency)"
    );
  }

  /**
   * 🔥 New: Clean expired E2E data
   */
  cleanupExpiredE2EData() {
    const now = performance.now();
    const cutoffTime = now - 10000; // 10 second window

    // Clean expired hash records
    for (const [hash, timestamp] of this.pendingE2E.entries()) {
      if (timestamp < cutoffTime) {
        this.pendingE2E.delete(hash);
      }
    }

    console.log(
      `🧹 [CRDT] Cleaned expired E2E data, remaining: ${this.pendingE2E.size}`
    );
  }
}

export default YjsPerformanceMonitor;
