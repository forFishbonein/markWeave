/**
 * ShareDB OT Client - Stable Version
 * Referencing Yjs WebsocketProvider’s implementation to ensure connection stability
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
   * Connect to OT server - Enhanced version
   */
  connect(url = "ws://localhost:1235") {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        console.log("✅ OT client connected");
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log("⏳ OT client connecting...");
        return;
      }

      this.url = url;
      this.isConnecting = true;
      console.log("🔌 Trying to connect to OT server:", url);

      try {
        this.ws = new WebSocket(url);
        const connectStart = performance.now();

        // Settings connection timeout
        const connectTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.error("❌ OT connection timeout");
            this.ws.close();
            this.isConnecting = false;
            reject(new Error("Connection timeout"));
          }
        }, 10000); // 10s timeout

        this.ws.onopen = () => {
          clearTimeout(connectTimeout);
          this.performanceMetrics.connectionTime =
            performance.now() - connectStart;
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          console.log("✅ OT client connection successful");
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
            this.performanceMetrics.bytesReceived += event.data.length;
          } catch (error) {
            console.error("Failed to process OT message:", error);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          this.isConnected = false;
          this.isConnecting = false;
          this.stopHeartbeat();

          console.log("🔌 OT client connection closed", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });

          this.triggerCallback("disconnect", { event });

          // Auto reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;

          console.error("❌ OT client WebSocket error:", error);
          console.error("WebSocket error details:", {
            url: url,
            readyState: this.ws?.readyState,
            error: error,
          });

          if (this.reconnectAttempts === 0) {
            // Reject only on the first connection failure
            reject(error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        console.error("❌ Create WebSocket connection failed:", error);
        reject(error);
      }
    });
  }

  /**
   * Auto reconnect
   */
  scheduleReconnect() {
    if (this.isConnecting || this.isConnected) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `🔄 Attempting reconnect #${this.reconnectAttempts} in ${delay}ms...`
    );

    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        console.log(`🔄 Executing reconnect #${this.reconnectAttempts}`);
        this.connect(this.url).catch((error) => {
          console.error("Reconnect failed:", error);
        });
      }
    }, delay);
  }

  /**
   * Start heartbeat check
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, 30000); // 30s heartbeat
  }

  /**
   * Stop heartbeat check
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle server messages
   */
  handleMessage(message) {
    switch (message.type) {
      case "connection":
        this.connectionId = message.id;
        console.log("🆔 Received connection ID:", message.id);
        this.triggerCallback("connected", { connectionId: message.id });
        break;
      case "doc":
      case "docUpdate":
        this.handleDocumentUpdate(message);
        break;
      case "op":
        this.handleOperation(message);
        break;
      case "pong":
        this.handlePong(message);
        break;
      case "error":
        console.error("OT server error:", message.error);
        this.triggerCallback("error", message);
        break;
      default:
        console.warn("Unknown OT message type:", message.type);
    }
  }

  /**
   * Handle document updates
   */
  handleDocumentUpdate(message) {
    const { collection, id, data, version } = message;
    const docKey = `${collection}/${id}`;

    console.log("📄 Received document update:", { collection, id, version });

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
   * Handle operation
   */
  handleOperation(message) {
    const { collection, id, op, version } = message;
    const docKey = `${collection}/${id}`;

    console.log("⚡ Received operation:", { collection, id, version });

    // 🔥 Fix: filter out operations sent by self to prevent duplicate application
    // Check client ID in the message layer
    if (message._clientId === this.connectionId) {
      console.log("🔄 [OT] Skipping self-sent operation", {
        messageClientId: message._clientId,
        myClientId: this.connectionId,
        messageId: message._messageId,
      });
      return; // Don’t process self-sent operations
    }

    if (this.documents.has(docKey)) {
      const doc = this.documents.get(docKey);

      try {
        if (op && op.ops) {
          doc.data = this.applyRichTextOp(doc.data, op);
          doc.version = version;
        }
      } catch (error) {
        console.error("Applying operation failed:", error);
      }
    }

    this.triggerCallback("operation", { collection, id, op, version });
  }

  /**
   * Handle pong response (latency measurement)
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
   * Subscribe to documents
   */
  subscribeDocument(collection, id) {
    if (!this.isConnected) {
      console.warn("WebSocket not connected, cannot subscribe to document");
      return;
    }

    console.log("📝 Subscribe to document:", { collection, id });

    const message = {
      type: "subscribe",
      collection,
      id,
      timestamp: performance.now(),
    };

    this.sendMessage(message);
  }

  /**
   * Submit operation
   */
  submitOperation(collection, id, op) {
    console.log("🔥 [DEBUG] submitOperation called", {
      collection,
      id,
      op,
      isArray: Array.isArray(op),
      opType: typeof op,
      isConnected: this.isConnected,
      wsReadyState: this.ws?.readyState,
      hasDocuments: this.documents.size,
    });

    if (!this.isConnected) {
      console.warn(
        "❌ [DEBUG] WebSocket not connected, cannot submit operation"
      );
      return;
    }

    const docKey = `${collection}/${id}`;
    let doc = this.documents.get(docKey);

    if (!doc) {
      console.warn(
        "⚠️ [DEBUG] Document does not exist, creating new document:",
        docKey
      );
      doc = {
        collection,
        id,
        data: { ops: [] },
        version: 0,
      };
      this.documents.set(docKey, doc);
    }

    console.log("📄 [DEBUG] Current document state:", doc);

    // 🔥 Fix: add client identifier to operation to prevent duplicate application
    // Note: ShareDB operations should be array format, cannot directly merge with spread
    let enhancedOp;
    if (Array.isArray(op)) {
      // If op is array format (valid Delta format), keep it
      enhancedOp = op;
    } else {
      // If object format, extend with client info
      enhancedOp = {
        ...op,
        _clientId: this.connectionId,
        _timestamp: Date.now(),
        _messageId: `${this.connectionId}_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };
    }

    const message = {
      type: "op",
      collection,
      id,
      op: enhancedOp, // use enhanced operation
      version: doc.version,
      timestamp: performance.now(),
      // 🔥 Add client ID at message layer for filtering
      _clientId: this.connectionId,
      _messageId: `${this.connectionId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };

    console.log("📤 [DEBUG] Preparing to send message:", message);

    try {
      this.sendMessage(message);
      this.performanceMetrics.operationsCount++;
      this.performanceMetrics.lastOperationTime = performance.now();

      console.log(
        "✅ [DEBUG] Operation sent successfully, total ops count:",
        this.performanceMetrics.operationsCount
      );
    } catch (error) {
      console.error("❌ [DEBUG] Sending operation failed:", error);
    }
  }

  /**
   * Send ping request (latency measurement)
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
   * Send message to server
   */
  sendMessage(message) {
    console.log("🔥 [DEBUG] sendMessage called", {
      messageType: message.type,
      wsExists: !!this.ws,
      wsReadyState: this.ws?.readyState,
      isConnected: this.isConnected,
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const data = JSON.stringify(message);
        console.log("📤 [DEBUG] Sending WebSocket data:", data);

        this.ws.send(data);
        this.performanceMetrics.bytesSent += data.length;

        console.log(
          "✅ [DEBUG] WebSocket send successful, bytes:",
          data.length
        );
      } catch (error) {
        console.error("❌ [DEBUG] Sending message failed:", error);
      }
    } else {
      console.warn("❌ [DEBUG] WebSocket not connected, cannot send message", {
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
   * Register callback function
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * Remove callback function
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
   * Trigger callback function
   */
  triggerCallback(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Callback execution failed:", error);
        }
      });
    }
  }

  /**
   * Apply rich-text operation
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
   * Get document content
   */
  getDocument(collection, id) {
    const docKey = `${collection}/${id}`;
    return this.documents.get(docKey);
  }

  /**
   * Get performance metrics
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
   * Reset performance metrics
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
   * Manual reconnect
   */
  reconnect() {
    if (this.isConnected || this.isConnecting) {
      console.log("Already connected or connecting, no need to reconnect");
      return;
    }

    console.log("🔄 Manually reconnect to OT server");
    this.reconnectAttempts = 0;
    return this.connect(this.url);
  }

  /**
   * Disconnect
   */
  disconnect() {
    console.log("🔌 Actively disconnect OT connection");
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, "Active disconnect");
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.connectionId = null;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto reconnect
  }
}

export default OTClient;
