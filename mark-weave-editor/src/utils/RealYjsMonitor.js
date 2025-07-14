/*
 * @FilePath: RealYjsMonitor.js
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: 真实Yjs性能监控器 - 多窗口同步版本
 */

/**
 * 真实Yjs性能监控器 - 支持多窗口数据同步
 */
class RealYjsMonitor {
  constructor() {
    this.isMonitoring = false;
    this.startTime = null;
    this.windowId = `window_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 性能数据
    this.metrics = {
      documentUpdates: 0,
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
    };

    this.pendingOperations = [];
    this.pendingSyncOperations = []; // 🔥 新增：待同步操作队列

    // 绑定方法
    this.handleDocumentUpdate = this.handleDocumentUpdate.bind(this);
    this.handleAwarenessChange = this.handleAwarenessChange.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleProviderStatus = this.handleProviderStatus.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);
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
      ydocClientID: ydoc?.clientID
    });

    this.isMonitoring = true;
    this.startTime = performance.now();
    this.ydoc = ydoc;
    this.awareness = awareness;
    this.provider = provider;

    console.log(`🚀 开始真实Yjs性能监控 - 窗口ID: ${this.windowId}`);
    console.log(`🔑 [MULTI-WINDOW] 客户端信息:`, {
      windowId: this.windowId,
      ydocClientID: ydoc?.clientID,
      userAgent: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
      isIncognito: 'Unknown' // 无法直接检测
    });

    // 监听文档更新
    if (ydoc) {
      // 🔥 测试：先移除可能存在的监听器
      ydoc.off("update", this.handleDocumentUpdate);
      
      ydoc.on("update", this.handleDocumentUpdate);
      console.log("✅ 已监听文档更新事件");
      
      // 🔥 调试：测试事件是否工作
      setTimeout(() => {
        console.log("🧪 [DEBUG] 测试文档更新事件监听是否工作...");
        // 创建一个小的测试更新
        const testText = ydoc.getText('test');
        testText.insert(0, 'test');
        testText.delete(0, 4);
      }, 1000);
      
    } else {
      console.error("❌ ydoc 为空，无法监听文档更新");
    }

    // 监听awareness变化
    if (awareness) {
      awareness.on("change", this.handleAwarenessChange);
      console.log("✅ 已监听awareness变化事件");
    }

    // 监听WebSocket状态
    if (provider) {
      provider.on("status", this.handleProviderStatus);
      console.log("✅ 已监听WebSocket状态事件");
    }

    // 监听键盘输入
    document.addEventListener("keydown", this.handleKeydown);
    console.log("✅ 已监听键盘输入事件");

    // 🔧 新增：监听localStorage变化，实现多窗口数据同步
    window.addEventListener("storage", this.handleStorageChange);
    console.log("✅ 已监听多窗口数据同步");

    // 拦截WebSocket来监控网络数据
    this.interceptWebSocket();

    // 🔧 新增：定期同步数据到localStorage
    this.startDataSync();
  }

  /**
   * 🔧 新增：开始数据同步
   */
  startDataSync() {
    this.syncInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.syncDataToStorage();
      }
    }, 250); // 🔥 优化：每250ms同步一次数据，更快响应
  }

  /**
   * 🔧 新增：同步数据到localStorage
   */
  syncDataToStorage() {
    const syncData = {
      windowId: this.windowId,
      timestamp: Date.now(),
      metrics: {
        documentUpdates: this.metrics.documentUpdates,
        keystrokes: this.metrics.keystrokes,
        operationLatencies: this.metrics.operationLatencies.slice(-50), // 只同步最近50个
        networkLatencies: this.metrics.networkLatencies.slice(-20),
        collaborators: Array.from(this.metrics.collaborators.entries()),
        totalUpdateSize: this.metrics.totalUpdateSize,
        networkEvents: this.metrics.networkEvents.slice(-100),
      },
      pendingOperations: this.pendingOperations.length,
      isMonitoring: this.isMonitoring,
    };

    try {
      localStorage.setItem(
        `yjs_monitor_${this.windowId}`,
        JSON.stringify(syncData)
      );

      // 触发其他窗口更新
      localStorage.setItem("yjs_monitor_sync_trigger", Date.now().toString());
    } catch (e) {
      console.warn("无法同步数据到localStorage:", e);
    }
  }

  /**
   * 🔧 新增：处理localStorage变化
   */
  handleStorageChange(event) {
    if (event.key === "yjs_monitor_sync_trigger") {
      // 其他窗口有数据更新，合并数据
      this.mergeDataFromOtherWindows();
    }
  }

  /**
   * 🔧 新增：合并其他窗口的数据
   */
  mergeDataFromOtherWindows() {
    const allWindowData = [];

    // 收集所有窗口的数据
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith("yjs_monitor_") &&
        key !== `yjs_monitor_${this.windowId}`
      ) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && Date.now() - data.timestamp < 10000) {
            // 10秒内的数据才有效
            allWindowData.push(data);
          }
        } catch (e) {
          console.warn("解析其他窗口数据失败:", e);
        }
      }
    }

    // 合并延迟数据
    const allLatencies = [...this.metrics.operationLatencies];
    const allNetworkLatencies = [...this.metrics.networkLatencies];

    allWindowData.forEach((windowData) => {
      if (windowData.metrics) {
        allLatencies.push(...(windowData.metrics.operationLatencies || []));
        allNetworkLatencies.push(
          ...(windowData.metrics.networkLatencies || [])
        );
      }
    });

    // 去重并排序
    const uniqueLatencies = this.deduplicateLatencies(allLatencies);
    const uniqueNetworkLatencies =
      this.deduplicateLatencies(allNetworkLatencies);

    // 更新合并后的数据（但不覆盖本窗口的原始数据）
    this.mergedMetrics = {
      operationLatencies: uniqueLatencies.slice(-200), // 保持最近200个
      networkLatencies: uniqueNetworkLatencies.slice(-100),
      totalWindows: allWindowData.length + 1,
      lastMergeTime: Date.now(),
    };
  }

  /**
   * 🔧 新增：去重延迟数据
   */
  deduplicateLatencies(latencies) {
    const seen = new Set();
    return latencies
      .filter((item) => {
        const key = `${item.timestamp}_${item.latency}_${item.updateSize}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // 移除事件监听
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
    window.removeEventListener("storage", this.handleStorageChange);

    // 清理同步定时器
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // 清理localStorage数据
    try {
      localStorage.removeItem(`yjs_monitor_${this.windowId}`);
    } catch (e) {
      console.warn("清理localStorage失败:", e);
    }

    console.log("⏹️ 已停止Yjs性能监控");
  }

  /**
   * 处理文档更新事件
   */
  handleDocumentUpdate(update, origin) {
    const timestamp = performance.now();
    const updateSize = update.length;

    this.metrics.documentUpdates++;
    this.metrics.totalUpdateSize += updateSize;
    this.metrics.updateTimes.push(timestamp);

    console.log(`📝 [CRDT] 文档更新事件:`, {
      origin,
      updateSize,
      timestamp,
      documentUpdates: this.metrics.documentUpdates
    });

    // 🔥 方案A：用户感知延迟测量
    // 只测量本地操作到界面更新的延迟
    if (!origin || origin === 'local' || origin === this.ydoc?.clientID) {
      // 本地操作：尝试匹配键盘输入，测量用户感知延迟
      const matchedOperation = this.findAndRemoveMatchingOperation(timestamp);
      
      if (matchedOperation) {
        const userPerceivedLatency = timestamp - matchedOperation.timestamp;
        
        console.log(`⚡ [CRDT] 用户感知延迟: ${userPerceivedLatency.toFixed(1)}ms`);
        
        // 记录用户感知延迟
        if (userPerceivedLatency >= 0.1 && userPerceivedLatency <= 1000) {
          const latencyRecord = {
            latency: userPerceivedLatency,
            timestamp,
            updateSize,
            origin: 'local',
            operationType: matchedOperation.key,
            operationId: matchedOperation.id,
            windowId: this.windowId,
            source: 'user_perceived'
          };

          this.metrics.operationLatencies.push(latencyRecord);

          console.log(
            `📊 [CRDT] 用户感知延迟记录: ${userPerceivedLatency.toFixed(1)}ms, 操作: ${
              matchedOperation.key
            }, 数组长度: ${this.metrics.operationLatencies.length}`
          );
        } else {
          console.log(`⚠️ 用户感知延迟异常: ${userPerceivedLatency.toFixed(1)}ms，已忽略`);
        }
      } else {
        // 无法匹配的本地操作（如格式化），估算为即时响应
        const instantLatency = 1; // 1ms表示即时响应
        
        const latencyRecord = {
          latency: instantLatency,
          timestamp,
          updateSize,
          origin: 'local',
          operationType: 'formatting_or_instant',
          operationId: `instant_${timestamp}`,
          windowId: this.windowId,
          source: 'instant_response'
        };

        this.metrics.operationLatencies.push(latencyRecord);
        
        console.log(`📊 [CRDT] 即时操作延迟: ${instantLatency}ms, 数组长度: ${this.metrics.operationLatencies.length}`);
      }
    } else {
      // 远程操作：不影响本地用户感知延迟，不记录
      console.log(`📥 [CRDT] 远程操作（不影响用户感知）: 来源 ${origin}`);
    }
  }

  /**
   * 🔥 处理多窗口同步确认
   */
  handleMultiWindowSyncConfirmation(timestamp, updateSize, origin) {
    console.log(`🔍 [DEBUG] 处理多窗口同步确认:`, {
      timestamp,
      updateSize,
      origin,
      pendingSyncOpsCount: this.pendingSyncOperations?.length || 0
    });

    if (!this.pendingSyncOperations || this.pendingSyncOperations.length === 0) {
      console.log(`⚠️ [DEBUG] 没有待同步操作，可能是纯远程操作`);
      return;
    }

    // 🔥 简化匹配策略：使用FIFO匹配最老的待同步操作
    // 这假设操作按顺序在多个窗口间同步
    const pendingOp = this.pendingSyncOperations.shift();
    
    console.log(`🎯 [DEBUG] 匹配到待同步操作:`, pendingOp);
    
    if (pendingOp) {
      const multiWindowSyncLatency = timestamp - pendingOp.timestamp;
      
      console.log(`📐 [DEBUG] 计算多窗口同步延迟: ${multiWindowSyncLatency.toFixed(1)}ms`);
      
      // 记录多窗口网络同步延迟
      if (multiWindowSyncLatency >= 1 && multiWindowSyncLatency <= 10000) { // 放宽上限到10秒
        const latencyRecord = {
          latency: multiWindowSyncLatency,
          timestamp,
          updateSize,
          origin,
          operationType: 'multi_window_sync',
          operationId: pendingOp.id,
          windowId: this.windowId,
          source: 'multi_window_sync',
          remoteOrigin: origin
        };

        this.metrics.operationLatencies.push(latencyRecord);

        console.log(
          `📊 [CRDT] 多窗口同步延迟: ${multiWindowSyncLatency.toFixed(1)}ms, 大小: ${updateSize}字节, 来源: ${origin}`
        );
        console.log(`📈 [DEBUG] 延迟数组长度: ${this.metrics.operationLatencies.length}`);
      } else {
        console.log(`⚠️ [DEBUG] 多窗口同步延迟异常: ${multiWindowSyncLatency.toFixed(1)}ms，已忽略`);
      }
    }
  }

  /**
   * 🔥 新增：处理网络同步确认
   */
  handleSyncConfirmation(timestamp, updateSize) {
    console.log(`🔍 [DEBUG] 尝试处理同步确认:`, {
      timestamp,
      updateSize,
      pendingSyncOpsCount: this.pendingSyncOperations?.length || 0,
      pendingSyncOps: this.pendingSyncOperations?.slice(0, 3)
    });

    if (!this.pendingSyncOperations || this.pendingSyncOperations.length === 0) {
      console.log(`⚠️ [DEBUG] 没有待同步操作，忽略远程更新`);
      return;
    }

    // 查找匹配的待同步操作（简单的FIFO匹配）
    const pendingOp = this.pendingSyncOperations.shift();
    
    console.log(`🎯 [DEBUG] 匹配到待同步操作:`, pendingOp);
    
    if (pendingOp) {
      const syncLatency = timestamp - pendingOp.timestamp;
      
      console.log(`📐 [DEBUG] 计算同步延迟: ${syncLatency.toFixed(1)}ms`);
      
      // 记录网络同步延迟
      if (syncLatency >= 1 && syncLatency <= 5000) {
        const latencyRecord = {
          latency: syncLatency,
          timestamp,
          updateSize,
          origin: 'network_sync',
          operationType: 'network_sync',
          operationId: pendingOp.id,
          windowId: this.windowId,
          source: 'network_sync'
        };

        this.metrics.operationLatencies.push(latencyRecord);

        console.log(
          `📊 [CRDT] 网络同步延迟: ${syncLatency.toFixed(1)}ms, 大小: ${updateSize}字节`
        );
        console.log(`📈 [DEBUG] 延迟数组长度: ${this.metrics.operationLatencies.length}`);
      } else {
        console.log(`⚠️ [DEBUG] 同步延迟异常: ${syncLatency.toFixed(1)}ms，已忽略`);
      }
    }
  }

  /**
   * 查找并移除匹配的操作
   */
  findAndRemoveMatchingOperation(updateTimestamp) {
    if (this.pendingOperations.length === 0) return null;

    const timeWindow = 1000;
    const cutoffTime = updateTimestamp - timeWindow;

    const validOperations = this.pendingOperations.filter(
      (op) => op.timestamp > cutoffTime
    );

    if (validOperations.length === 0) {
      this.pendingOperations = this.pendingOperations.filter(
        (op) => op.timestamp > cutoffTime
      );
      return null;
    }

    const matchedOp = validOperations[validOperations.length - 1];

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

      console.log(`⌨️ [DEBUG] 键盘事件:`, {
        key: event.key,
        timestamp,
        operationId,
        isPrintable: this.isPrintableKey(event.key),
        pendingOpsCount: this.pendingOperations.length
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
   * 拦截WebSocket进行网络监控
   */
  interceptWebSocket() {
    if (this.provider && this.provider.ws) {
      const ws = this.provider.ws;

      const originalSend = ws.send.bind(ws);
      ws.send = (data) => {
        const timestamp = performance.now();
        const size = data.length || data.byteLength || 0;

        this.metrics.networkEvents.push({
          type: "send",
          timestamp,
          size,
          windowId: this.windowId,
        });

        console.log(`📤 发送数据: ${size}字节`);
        return originalSend(data);
      };

      ws.addEventListener("message", (event) => {
        const timestamp = performance.now();
        const size = event.data.length || event.data.byteLength || 0;

        this.metrics.networkEvents.push({
          type: "receive",
          timestamp,
          size,
          windowId: this.windowId,
        });

        console.log(`📥 接收数据: ${size}字节`);
      });
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
            clientId !== this.awareness.clientID
          ) {
            const endTime = performance.now();
            const latency = endTime - startTime;

            this.metrics.networkLatencies.push({
              latency,
              timestamp: endTime,
              clientId,
              windowId: this.windowId,
            });

            console.log(`🏓 网络延迟: ${latency.toFixed(1)}ms`);
            this.awareness.off("change", handlePong);
          }
        });
      };

      this.awareness.on("change", handlePong);

      setTimeout(() => {
        this.awareness.off("change", handlePong);
      }, 5000);
    }, 5000);
  }

  /**
   * 🔧 修复：获取实时性能统计（包含多窗口数据）
   */
  getPerformanceStats() {
    if (!this.isMonitoring || !this.startTime) {
      return null;
    }

    const now = performance.now();
    const monitoringDuration = (now - this.startTime) / 1000;

    // 🔧 使用合并后的数据进行计算
    const allLatencies = this.mergedMetrics
      ? this.mergedMetrics.operationLatencies.map((l) => l.latency)
      : this.metrics.operationLatencies.map((l) => l.latency);

    const allNetworkLatencies = this.mergedMetrics
      ? this.mergedMetrics.networkLatencies.map((l) => l.latency)
      : this.metrics.networkLatencies.map((l) => l.latency);

    // 🔥 调试信息
    console.log(`📊 [DEBUG] 性能统计计算:`, {
      originalLatencies: this.metrics.operationLatencies.length,
      mergedLatencies: this.mergedMetrics?.operationLatencies?.length || 0,
      allLatencies: allLatencies.length,
      latencyValues: allLatencies.slice(0, 10),
      monitoringDuration
    });

    // 🔥 优化：缩短时间窗口为4秒，提升响应速度
    const recentWindow = 4000; // 从10000ms改为4000ms
    const recentTime = now - recentWindow;

    const recentLatencies = (
      this.mergedMetrics
        ? this.mergedMetrics.operationLatencies
        : this.metrics.operationLatencies
    )
      .filter((l) => l.timestamp > recentTime)
      .map((l) => l.latency);

    // 🔥 优化：分层P95计算策略
    let latenciesToUse, p95Latency, avgLatency;

    if (recentLatencies.length >= 12) {
      // 最近数据充足：使用最近4秒的数据
      latenciesToUse = recentLatencies;
      console.log(
        `📊 [CRDT] 使用最近4秒数据计算P95: ${latenciesToUse.length}个样本`
      );
    } else if (allLatencies.length >= 20) {
      // 历史数据充足：使用全部数据
      latenciesToUse = allLatencies;
      console.log(
        `📊 [CRDT] 使用全部历史数据计算P95: ${latenciesToUse.length}个样本`
      );
    } else if (allLatencies.length >= 6) {
      // 数据较少：使用全部数据，但降低置信度
      latenciesToUse = allLatencies;
      console.log(
        `📊 [CRDT] 使用少量数据计算P95: ${latenciesToUse.length}个样本（置信度较低）`
      );
    } else {
      // 数据不足：使用平均值作为P95估算
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

    // 计算带宽
    const sentBytes = this.metrics.networkEvents
      .filter((e) => e.type === "send")
      .reduce((sum, e) => sum + e.size, 0);
    const receivedBytes = this.metrics.networkEvents
      .filter((e) => e.type === "receive")
      .reduce((sum, e) => sum + e.size, 0);

    return {
      // 基本信息
      monitoringDuration,
      isConnected:
        this.provider &&
        this.provider.ws &&
        this.provider.ws.readyState === WebSocket.OPEN,
      windowId: this.windowId,
      totalWindows: this.mergedMetrics ? this.mergedMetrics.totalWindows : 1,

      // 文档操作统计
      documentUpdates: this.metrics.documentUpdates,
      totalUpdateSize: this.metrics.totalUpdateSize,
      updatesPerSecond: this.metrics.documentUpdates / monitoringDuration,
      avgUpdateSize:
        this.metrics.documentUpdates > 0
          ? this.metrics.totalUpdateSize / this.metrics.documentUpdates
          : 0,

      // 用户操作统计
      keystrokes: this.metrics.keystrokes,
      keystrokesPerSecond: this.metrics.keystrokes / monitoringDuration,
      pendingOperations: this.pendingOperations.length,

      // 🔥 优化：实时延迟统计
      avgLatency,
      p95Latency,
      avgNetworkLatency,
      latencySamples: allLatencies.length,
      recentLatencySamples: recentLatencies.length,
      networkLatencySamples: allNetworkLatencies.length,

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

      // 网络统计
      sentBytes,
      receivedBytes,
      totalBytes: sentBytes + receivedBytes,
      bandwidthKBps: (sentBytes + receivedBytes) / 1024 / monitoringDuration,

      // 协作统计
      activeCollaborators: this.metrics.collaborators.size,
      totalAwarenessChanges: this.metrics.awarenessChanges.length,

      // 原始数据
      rawData: {
        operationLatencies: this.mergedMetrics
          ? this.mergedMetrics.operationLatencies
          : this.metrics.operationLatencies,
        networkLatencies: this.mergedMetrics
          ? this.mergedMetrics.networkLatencies
          : this.metrics.networkLatencies,
        networkEvents: this.metrics.networkEvents,
        awarenessChanges: this.metrics.awarenessChanges,
        userOperations: this.metrics.userOperations,
        pendingOperations: this.pendingOperations,
      },
    };
  }

  /**
   * 导出学术数据
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
        networkEvents: stats.rawData.networkEvents.length,
        userOperations: stats.rawData.userOperations.length,
      },

      rawData: stats.rawData,
    };
  }

  /**
   * 重置数据
   */
  reset() {
    this.metrics = {
      documentUpdates: 0,
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
    };

    this.pendingOperations = [];
    this.pendingSyncOperations = []; // 🔥 清理待同步操作队列
    this.mergedMetrics = null;
    this.startTime = performance.now();

    // 清理localStorage
    try {
      localStorage.removeItem(`yjs_monitor_${this.windowId}`);
    } catch (e) {
      console.warn("清理localStorage失败:", e);
    }

    console.log("🔄 性能监控数据已重置");
  }
}

export default RealYjsMonitor;
