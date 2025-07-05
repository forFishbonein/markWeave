/*
 * @FilePath: YjsPerformanceMonitor.js
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: 真实Yjs性能监控器 - 学术级数据收集
 */

/**
 * 真实WebSocket网络监控器
 * 监控实际的Yjs WebSocket连接性能
 */
class YjsNetworkMonitor {
  constructor() {
    this.isMonitoring = false;
    this.networkData = [];
    this.latencyMeasurements = [];
    this.bandwidthData = [];
    this.connectionEvents = [];
    this.messageTypes = new Map();

    // 性能计数器
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.bytesSent = 0;
    this.bytesReceived = 0;
    this.connectionStartTime = null;
  }

  /**
   * 开始监控WebSocket连接
   * @param {WebSocket} ws - Yjs WebSocket连接
   * @param {string} docId - 文档ID
   */
  startMonitoring(ws, docId) {
    if (this.isMonitoring || !ws) return;

    this.isMonitoring = true;
    this.connectionStartTime = performance.now();

    console.log(`🔬 开始监控Yjs WebSocket性能 - 文档: ${docId}`);

    // 拦截原始的send方法
    const originalSend = ws.send.bind(ws);
    ws.send = (data) => {
      this.handleMessageSent(data);
      return originalSend(data);
    };

    // 监听接收消息
    ws.addEventListener("message", (event) => {
      this.handleMessageReceived(event.data);
    });

    // 监听连接状态变化
    ws.addEventListener("open", () => {
      this.recordConnectionEvent("connected");
    });

    ws.addEventListener("close", () => {
      this.recordConnectionEvent("disconnected");
    });

    ws.addEventListener("error", (error) => {
      this.recordConnectionEvent("error", error);
    });
  }

  /**
   * 处理发送消息
   */
  handleMessageSent(data) {
    const timestamp = performance.now();
    const size = this.calculateMessageSize(data);
    const type = this.getMessageType(data);

    this.messagesSent++;
    this.bytesSent += size;

    // 添加时间戳用于延迟测量
    const messageWithTimestamp = this.addTimestamp(data, timestamp);

    this.networkData.push({
      direction: "sent",
      timestamp,
      size,
      type,
      messageId: this.generateMessageId(),
    });

    this.updateMessageTypeStats(type, "sent", size);
    this.updateBandwidthData("sent", size, timestamp);

    console.log(`📤 Yjs消息发送: ${type}, ${size}字节`);
  }

  /**
   * 处理接收消息
   */
  handleMessageReceived(data) {
    const timestamp = performance.now();
    const size = this.calculateMessageSize(data);
    const type = this.getMessageType(data);

    this.messagesReceived++;
    this.bytesReceived += size;

    // 检查是否包含我们的时间戳（用于延迟计算）
    const latency = this.calculateLatency(data, timestamp);

    this.networkData.push({
      direction: "received",
      timestamp,
      size,
      type,
      latency,
      messageId: this.generateMessageId(),
    });

    if (latency !== null) {
      this.latencyMeasurements.push({
        latency,
        timestamp,
        type,
      });
    }

    this.updateMessageTypeStats(type, "received", size);
    this.updateBandwidthData("received", size, timestamp);

    console.log(
      `📥 Yjs消息接收: ${type}, ${size}字节${
        latency ? `, 延迟: ${latency.toFixed(2)}ms` : ""
      }`
    );
  }

  /**
   * 添加时间戳到消息中
   */
  addTimestamp(data, timestamp) {
    try {
      if (typeof data === "string") {
        const parsed = JSON.parse(data);
        parsed._yjsTimestamp = timestamp;
        return JSON.stringify(parsed);
      }
      // 对于二进制数据，我们无法添加时间戳
      return data;
    } catch (e) {
      return data;
    }
  }

  /**
   * 计算网络延迟
   */
  calculateLatency(data, receiveTime) {
    try {
      if (typeof data === "string") {
        const parsed = JSON.parse(data);
        if (parsed._yjsTimestamp) {
          return receiveTime - parsed._yjsTimestamp;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 计算消息大小
   */
  calculateMessageSize(data) {
    if (typeof data === "string") {
      return new Blob([data]).size;
    }
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (data instanceof Uint8Array) {
      return data.length;
    }
    return JSON.stringify(data).length;
  }

  /**
   * 获取消息类型
   */
  getMessageType(data) {
    try {
      if (typeof data === "string") {
        const parsed = JSON.parse(data);
        return parsed.type || "json-unknown";
      }
      if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        // Yjs使用二进制协议
        return "yjs-binary";
      }
      return "unknown";
    } catch (e) {
      return "binary";
    }
  }

  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录连接事件
   */
  recordConnectionEvent(type, data = null) {
    const event = {
      type,
      timestamp: performance.now(),
      data,
    };

    this.connectionEvents.push(event);
    console.log(`🔌 Yjs连接事件: ${type}`);
  }

  /**
   * 更新消息类型统计
   */
  updateMessageTypeStats(type, direction, size) {
    const key = `${type}_${direction}`;
    if (!this.messageTypes.has(key)) {
      this.messageTypes.set(key, {
        count: 0,
        totalBytes: 0,
        avgSize: 0,
      });
    }

    const stats = this.messageTypes.get(key);
    stats.count++;
    stats.totalBytes += size;
    stats.avgSize = stats.totalBytes / stats.count;
  }

  /**
   * 更新带宽数据
   */
  updateBandwidthData(direction, size, timestamp) {
    this.bandwidthData.push({
      direction,
      size,
      timestamp,
    });

    // 保持最近1分钟的数据
    const oneMinuteAgo = timestamp - 60000;
    this.bandwidthData = this.bandwidthData.filter(
      (item) => item.timestamp > oneMinuteAgo
    );
  }

  /**
   * 获取实时性能统计
   */
  getPerformanceStats() {
    const now = performance.now();
    const connectionDuration = this.connectionStartTime
      ? (now - this.connectionStartTime) / 1000
      : 0;

    // 计算最近1秒的带宽
    const oneSecondAgo = now - 1000;
    const recentBandwidth = this.bandwidthData.filter(
      (item) => item.timestamp > oneSecondAgo
    );

    const sentBandwidth =
      recentBandwidth
        .filter((item) => item.direction === "sent")
        .reduce((sum, item) => sum + item.size, 0) / 1024; // KB/s

    const receivedBandwidth =
      recentBandwidth
        .filter((item) => item.direction === "received")
        .reduce((sum, item) => sum + item.size, 0) / 1024; // KB/s

    // 计算延迟统计
    const latencies = this.latencyMeasurements.map((m) => m.latency);
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Latency =
      sortedLatencies.length > 0
        ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0
        : 0;

    // 计算消息频率
    const messageRate = this.networkData.filter(
      (msg) => msg.timestamp > oneSecondAgo
    ).length;

    return {
      // 连接信息
      connectionDuration,
      isConnected: this.connectionEvents.some((e) => e.type === "connected"),

      // 消息统计
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      messageRate,

      // 带宽统计
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      sentBandwidthKBps: sentBandwidth,
      receivedBandwidthKBps: receivedBandwidth,

      // 延迟统计
      avgLatencyMs: avgLatency,
      p95LatencyMs: p95Latency,
      latencyCount: latencies.length,

      // 消息类型统计
      messageTypes: Object.fromEntries(this.messageTypes),

      // 历史数据
      latencyHistory: latencies.slice(-20), // 最近20个延迟值
      connectionEvents: this.connectionEvents,
    };
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log("⏹️ 停止Yjs性能监控");
  }

  /**
   * 重置统计数据
   */
  reset() {
    this.networkData = [];
    this.latencyMeasurements = [];
    this.bandwidthData = [];
    this.connectionEvents = [];
    this.messageTypes.clear();

    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.bytesSent = 0;
    this.bytesReceived = 0;
    this.connectionStartTime = null;

    console.log("🔄 Yjs性能监控数据已重置");
  }

  /**
   * 导出学术级数据报告
   */
  exportAcademicReport() {
    const stats = this.getPerformanceStats();

    return {
      // 基本信息
      algorithm: "CRDT-Yjs",
      timestamp: new Date().toISOString(),
      testDuration: stats.connectionDuration,

      // 核心性能指标
      performance: {
        averageLatency: stats.avgLatencyMs,
        p95Latency: stats.p95LatencyMs,
        throughput: stats.messageRate,
        bandwidthEfficiency: stats.sentBandwidthKBps,
        totalOperations: stats.messagesSent,
        networkRoundTrips: stats.latencyCount,
      },

      // 详细统计
      detailed: {
        messagesSent: stats.messagesSent,
        messagesReceived: stats.messagesReceived,
        bytesSent: stats.bytesSent,
        bytesReceived: stats.bytesReceived,
        messageTypes: stats.messageTypes,
        connectionEvents: stats.connectionEvents,
      },

      // 原始数据（用于进一步分析）
      rawData: {
        networkData: this.networkData,
        latencyMeasurements: this.latencyMeasurements,
        bandwidthData: this.bandwidthData,
      },
    };
  }
}

/**
 * Yjs用户活动监控器
 * 监控真实的用户编辑操作
 */
class YjsUserActivityMonitor {
  constructor() {
    this.isMonitoring = false;
    this.userActions = [];
    this.editingSession = null;
  }

  /**
   * 开始监控用户活动
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.editingSession = {
      startTime: performance.now(),
      actions: [],
    };

    console.log("👤 开始监控Yjs用户活动");
  }

  /**
   * 记录用户操作
   */
  recordUserAction(type, data = {}) {
    if (!this.isMonitoring) return;

    const action = {
      type,
      timestamp: performance.now(),
      sessionTime: performance.now() - this.editingSession.startTime,
      data,
    };

    this.userActions.push(action);
    this.editingSession.actions.push(action);

    // 保持最近1000个操作
    if (this.userActions.length > 1000) {
      this.userActions = this.userActions.slice(-800);
    }
  }

  /**
   * 记录Yjs文档操作
   */
  recordYjsOperation(operation) {
    this.recordUserAction("yjs-operation", {
      operationType: operation.type,
      contentLength: operation.content?.length || 0,
      position: operation.position,
    });
  }

  /**
   * 记录键盘输入
   */
  recordKeyboardInput(event) {
    this.recordUserAction("keyboard", {
      key: event.key,
      keyCode: event.keyCode,
      isComposing: event.isComposing,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    });
  }

  /**
   * 记录鼠标操作
   */
  recordMouseAction(event) {
    this.recordUserAction("mouse", {
      type: event.type,
      button: event.button,
      x: event.clientX,
      y: event.clientY,
    });
  }

  /**
   * 获取用户活动统计
   */
  getActivityStats() {
    const now = performance.now();
    const timeWindow = 60000; // 1分钟窗口
    const recentActions = this.userActions.filter(
      (action) => now - action.timestamp <= timeWindow
    );

    const yjsOperations = recentActions.filter(
      (a) => a.type === "yjs-operation"
    );
    const keyboardActions = recentActions.filter((a) => a.type === "keyboard");
    const mouseActions = recentActions.filter((a) => a.type === "mouse");

    return {
      totalActions: recentActions.length,
      yjsOperations: yjsOperations.length,
      keyboardActions: keyboardActions.length,
      mouseActions: mouseActions.length,
      actionsPerSecond: recentActions.length / (timeWindow / 1000),

      // 编辑效率
      editingEfficiency:
        yjsOperations.length / Math.max(keyboardActions.length, 1),

      // 会话信息
      sessionDuration: this.editingSession
        ? (now - this.editingSession.startTime) / 1000
        : 0,
    };
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log("⏹️ 停止用户活动监控");
  }
}

/**
 * Yjs协作监控器
 * 监控多用户协作状态
 */
class YjsCollaborationMonitor {
  constructor() {
    this.isMonitoring = false;
    this.collaborators = new Map();
    this.awarenessEvents = [];
    this.conflicts = [];
  }

  /**
   * 开始监控协作
   */
  startMonitoring(awareness) {
    if (this.isMonitoring || !awareness) return;

    this.isMonitoring = true;

    // 监听awareness变化
    awareness.on("change", (changes) => {
      this.handleAwarenessChange(changes, awareness);
    });

    console.log("🤝 开始监控Yjs协作状态");
  }

  /**
   * 处理awareness变化
   */
  handleAwarenessChange(changes, awareness) {
    const timestamp = performance.now();

    // 记录用户加入/离开
    changes.added.forEach((clientId) => {
      const state = awareness.getStates().get(clientId);
      if (state?.user) {
        this.collaborators.set(clientId, {
          user: state.user,
          joinTime: timestamp,
          lastSeen: timestamp,
        });

        this.awarenessEvents.push({
          type: "user-joined",
          clientId,
          user: state.user,
          timestamp,
        });

        console.log(`👥 用户加入协作: ${state.user.name}`);
      }
    });

    changes.removed.forEach((clientId) => {
      const collaborator = this.collaborators.get(clientId);
      if (collaborator) {
        this.awarenessEvents.push({
          type: "user-left",
          clientId,
          user: collaborator.user,
          timestamp,
          sessionDuration: timestamp - collaborator.joinTime,
        });

        this.collaborators.delete(clientId);
        console.log(`👋 用户离开协作: ${collaborator.user.name}`);
      }
    });

    // 更新用户状态
    changes.updated.forEach((clientId) => {
      const state = awareness.getStates().get(clientId);
      const collaborator = this.collaborators.get(clientId);

      if (collaborator && state) {
        collaborator.lastSeen = timestamp;

        // 检测光标冲突
        if (state.cursor) {
          this.detectCursorConflicts(clientId, state.cursor, awareness);
        }
      }
    });
  }

  /**
   * 检测光标冲突
   */
  detectCursorConflicts(clientId, cursor, awareness) {
    const timestamp = performance.now();
    const conflictThreshold = 5; // 5个字符的距离视为冲突

    awareness.getStates().forEach((otherState, otherClientId) => {
      if (otherClientId !== clientId && otherState.cursor) {
        const distance = Math.abs(cursor.pos - otherState.cursor.pos);

        if (distance <= conflictThreshold) {
          this.conflicts.push({
            type: "cursor-conflict",
            timestamp,
            users: [
              this.collaborators.get(clientId)?.user,
              this.collaborators.get(otherClientId)?.user,
            ],
            positions: [cursor.pos, otherState.cursor.pos],
            distance,
          });

          console.log(`⚡ 检测到光标冲突: 距离${distance}字符`);
        }
      }
    });
  }

  /**
   * 获取协作统计
   */
  getCollaborationStats() {
    const now = performance.now();
    const activeCollaborators = Array.from(this.collaborators.values()).filter(
      (collab) => now - collab.lastSeen < 30000
    ); // 30秒内活跃

    return {
      totalCollaborators: this.collaborators.size,
      activeCollaborators: activeCollaborators.length,
      totalConflicts: this.conflicts.length,
      recentConflicts: this.conflicts.filter(
        (conflict) => now - conflict.timestamp < 60000
      ).length,

      // 协作效率
      conflictRate:
        this.conflicts.length / Math.max(this.awarenessEvents.length, 1),

      // 用户会话信息
      userSessions: activeCollaborators.map((collab) => ({
        user: collab.user.name,
        sessionDuration: (now - collab.joinTime) / 1000,
        isActive: now - collab.lastSeen < 5000,
      })),
    };
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log("⏹️ 停止协作监控");
  }
}

/**
 * 主要的Yjs性能监控器
 * 整合所有监控功能
 */
class YjsPerformanceMonitor {
  constructor() {
    this.networkMonitor = new YjsNetworkMonitor();
    this.userActivityMonitor = new YjsUserActivityMonitor();
    this.collaborationMonitor = new YjsCollaborationMonitor();

    this.isMonitoring = false;
    this.monitoringStartTime = null;
  }

  /**
   * 开始完整监控
   */
  startMonitoring(provider, awareness) {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringStartTime = performance.now();

    // 启动各个监控器
    if (provider?.ws) {
      this.networkMonitor.startMonitoring(provider.ws, provider.roomname);
    }

    this.userActivityMonitor.startMonitoring();

    if (awareness) {
      this.collaborationMonitor.startMonitoring(awareness);
    }

    // 设置全局事件监听
    this.setupGlobalEventListeners();

    console.log("🚀 Yjs完整性能监控已启动");
  }

  /**
   * 设置全局事件监听
   */
  setupGlobalEventListeners() {
    // 监听键盘事件
    document.addEventListener("keydown", (event) => {
      this.userActivityMonitor.recordKeyboardInput(event);
    });

    // 监听鼠标事件
    document.addEventListener("click", (event) => {
      this.userActivityMonitor.recordMouseAction(event);
    });

    document.addEventListener("mousedown", (event) => {
      this.userActivityMonitor.recordMouseAction(event);
    });
  }

  /**
   * 记录Yjs操作
   */
  recordYjsOperation(operation) {
    this.userActivityMonitor.recordYjsOperation(operation);
  }

  /**
   * 获取综合性能报告
   */
  getComprehensiveReport() {
    const networkStats = this.networkMonitor.getPerformanceStats();
    const activityStats = this.userActivityMonitor.getActivityStats();
    const collaborationStats =
      this.collaborationMonitor.getCollaborationStats();

    const now = performance.now();
    const totalMonitoringTime = this.monitoringStartTime
      ? (now - this.monitoringStartTime) / 1000
      : 0;

    return {
      // 基本信息
      algorithm: "CRDT-Yjs",
      timestamp: new Date().toISOString(),
      monitoringDuration: totalMonitoringTime,

      // 网络性能
      network: {
        latency: {
          average: networkStats.avgLatencyMs,
          p95: networkStats.p95LatencyMs,
          measurements: networkStats.latencyCount,
        },
        throughput: {
          messagesPerSecond: networkStats.messageRate,
          bandwidthKBps: networkStats.sentBandwidthKBps,
        },
        reliability: {
          messagesSent: networkStats.messagesSent,
          messagesReceived: networkStats.messagesReceived,
          connectionStability: networkStats.isConnected,
        },
      },

      // 用户活动
      userActivity: {
        totalActions: activityStats.totalActions,
        yjsOperations: activityStats.yjsOperations,
        actionsPerSecond: activityStats.actionsPerSecond,
        editingEfficiency: activityStats.editingEfficiency,
        sessionDuration: activityStats.sessionDuration,
      },

      // 协作性能
      collaboration: {
        totalUsers: collaborationStats.totalCollaborators,
        activeUsers: collaborationStats.activeCollaborators,
        conflicts: collaborationStats.totalConflicts,
        conflictRate: collaborationStats.conflictRate,
        userSessions: collaborationStats.userSessions,
      },

      // 学术指标
      academicMetrics: {
        operationalComplexity: this.calculateOperationalComplexity(
          networkStats,
          activityStats
        ),
        collaborationEfficiency: this.calculateCollaborationEfficiency(
          collaborationStats,
          activityStats
        ),
        networkEfficiency: this.calculateNetworkEfficiency(networkStats),
        userExperience: this.calculateUserExperience(
          networkStats,
          collaborationStats
        ),
      },
    };
  }

  /**
   * 计算操作复杂度
   */
  calculateOperationalComplexity(networkStats, activityStats) {
    const opsPerByte =
      activityStats.yjsOperations / Math.max(networkStats.bytesSent, 1);
    return {
      operationsPerByte: opsPerByte,
      complexity:
        opsPerByte > 0.1 ? "low" : opsPerByte > 0.05 ? "medium" : "high",
    };
  }

  /**
   * 计算协作效率
   */
  calculateCollaborationEfficiency(collaborationStats, activityStats) {
    const conflictRatio = collaborationStats.conflictRate;
    const userUtilization =
      collaborationStats.activeCollaborators /
      Math.max(collaborationStats.totalCollaborators, 1);

    return {
      conflictRatio,
      userUtilization,
      efficiency: (1 - conflictRatio) * userUtilization,
    };
  }

  /**
   * 计算网络效率
   */
  calculateNetworkEfficiency(networkStats) {
    const latencyScore = Math.max(0, 1 - networkStats.avgLatencyMs / 1000); // 1秒为基准
    const throughputScore = Math.min(1, networkStats.messageRate / 10); // 10msg/s为满分

    return {
      latencyScore,
      throughputScore,
      overallScore: (latencyScore + throughputScore) / 2,
    };
  }

  /**
   * 计算用户体验
   */
  calculateUserExperience(networkStats, collaborationStats) {
    const responsiveness = Math.max(0, 1 - networkStats.avgLatencyMs / 500); // 500ms为基准
    const stability = networkStats.isConnected ? 1 : 0;
    const collaborationQuality = 1 - collaborationStats.conflictRate;

    return {
      responsiveness,
      stability,
      collaborationQuality,
      overallScore: (responsiveness + stability + collaborationQuality) / 3,
    };
  }

  /**
   * 导出学术级数据
   */
  exportAcademicData() {
    const report = this.getComprehensiveReport();
    const networkReport = this.networkMonitor.exportAcademicReport();

    return {
      ...report,
      rawNetworkData: networkReport.rawData,
      exportedAt: new Date().toISOString(),
      dataIntegrity: {
        networkSamples: networkReport.rawData.networkData.length,
        latencySamples: networkReport.rawData.latencyMeasurements.length,
        userActionSamples: this.userActivityMonitor.userActions.length,
        collaborationEvents: this.collaborationMonitor.awarenessEvents.length,
      },
    };
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;

    this.networkMonitor.stopMonitoring();
    this.userActivityMonitor.stopMonitoring();
    this.collaborationMonitor.stopMonitoring();

    console.log("⏹️ Yjs完整性能监控已停止");
  }

  /**
   * 重置所有数据
   */
  reset() {
    this.networkMonitor.reset();
    this.userActivityMonitor.userActions = [];
    this.collaborationMonitor.collaborators.clear();
    this.collaborationMonitor.awarenessEvents = [];
    this.collaborationMonitor.conflicts = [];

    this.monitoringStartTime = null;

    console.log("🔄 Yjs性能监控数据已重置");
  }
}

export default YjsPerformanceMonitor;
