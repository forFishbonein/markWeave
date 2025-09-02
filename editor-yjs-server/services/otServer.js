import ShareDB from "sharedb";
import ShareDBMongo from "sharedb-mongo";
import richText from "rich-text";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { URL } from "url";

// Register rich-text OT type
ShareDB.types.register(richText.type);

/**
 * ShareDB OT server
 * For performance comparison with Yjs CRDT
 */
class OTServer {
  constructor() {
    this.db = null;
    this.backend = null;
    this.wss = null;
    this.connections = new Map();
    this.documents = new Map(); // Track documents
    this.performanceMetrics = {
      operationsCount: 0,
      totalLatency: 0,
      networkBytes: 0,
      activeConnections: 0,
      conflictResolutions: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Initialize OT server
   */
  async initialize() {
    try {
      // Use same MongoDB configuration as main app
      const username = process.env.DB_USERNAME || "markWeave";
      const password = process.env.DB_PASSWORD || "eBkwPRfcdHHkdHYt";
      const host = process.env.DB_HOST || "8.130.52.237";
      const port = process.env.DB_PORT || "27017";
      const dbName = process.env.DB_NAME || "markweave";

      const mongoUrl = `mongodb://${encodeURIComponent(
        username
      )}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;

      console.log("🔗 OT server connecting to MongoDB:", host + ":" + port);
      this.db = ShareDBMongo(mongoUrl);

      // Create ShareDB backend
      this.backend = new ShareDB({
        db: this.db,
        // Enable performance monitoring
        enableMetrics: true,
      });

      // Listen to operation events for performance statistics
      this.backend.use("op", (request, next) => {
        const startTime = Date.now();

        // Record operation start
        this.performanceMetrics.operationsCount++;

        next((err) => {
          if (!err) {
            // Record operation latency
            const latency = Date.now() - startTime;
            this.performanceMetrics.totalLatency += latency;

            // Detect conflict resolution
            if (request.op && request.op.src && request.snapshot.v > 1) {
              this.performanceMetrics.conflictResolutions++;
            }
          }
        });
      });

      console.log("✅ OT server initialization successful");
    } catch (error) {
      console.error("❌ OT server initialization failed:", error);
      throw error;
    }
  }

  /**
   * Start WebSocket server
   */
  startWebSocketServer(port = 1235) {
    const server = http.createServer((req, res) => {
      // Handle HTTP requests, return WebSocket upgrade info
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("WebSocket Server Running");
    });

    this.wss = new WebSocketServer({
      server,
      verifyClient: (info) => {
        console.log("🔍 WebSocket connection verification:", {
          origin: info.origin,
          secure: info.secure,
          req: info.req.url,
        });
        return true; // Allow all connections
      },
    });

    this.wss.on("connection", (ws, req) => {
      const connectionId = this.generateConnectionId();
      const connection = {
        id: connectionId,
        ws,
        agent: this.backend.connect(),
        bytesReceived: 0,
        bytesSent: 0,
        joinTime: Date.now(),
        subscribedDocs: new Set(), // Track subscribed documents
      };

      this.connections.set(connectionId, connection);
      this.performanceMetrics.activeConnections++;

      console.log(`🔗 New OT connection: ${connectionId}`);

      // Listen to messages
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(connection, message);

          // Track network traffic
          connection.bytesReceived += data.length;
          this.performanceMetrics.networkBytes += data.length;
        } catch (error) {
          console.error("Failed to process OT message:", error);
        }
      });

      // Listen to connection close
      ws.on("close", () => {
        this.connections.delete(connectionId);
        this.performanceMetrics.activeConnections--;
        connection.agent.close();
        console.log(`🔌 OT connection closed: ${connectionId}`);
      });

      // Listen to errors
      ws.on("error", (error) => {
        console.error(`OT connection error ${connectionId}:`, error);
      });

      // Send connection confirmation
      this.sendMessage(connection, {
        type: "connection",
        id: connectionId,
        timestamp: Date.now(),
      });
    });

    server.listen(port, () => {
      console.log(`🚀 OT WebSocket server running on port ${port}`);
    });
  }

  /**
   * Handle client messages
   */
  handleMessage(connection, message) {
    switch (message.type) {
      case "subscribe":
        this.handleSubscribe(connection, message);
        break;
      case "op":
        this.handleOperation(connection, message);
        break;
      case "ping":
        this.handlePing(connection, message);
        break;
      default:
        console.warn("Unknown OT message type:", message.type);
    }
  }

  /**
   * Handle document subscription
   */
  handleSubscribe(connection, message) {
    const { collection, id } = message;
    const docKey = `${collection}/${id}`;
    const doc = connection.agent.get(collection, id);

    // Add to connection's subscribed document list
    connection.subscribedDocs.add(docKey);

    doc.subscribe((err) => {
      if (err) {
        console.error("Failed to subscribe to document:", err);
        return;
      }

      // If document does not exist, create empty document
      if (doc.type === null) {
        console.log(`📄 Creating new document: ${docKey}`);
        doc.create([], "rich-text", (err) => {
          if (err) {
            console.error("Failed to create document:", err);
            return;
          }
          console.log(`✅ Document creation successful: ${docKey}`);
          this.sendDocumentState(connection, doc, collection, id);
          this.setupDocumentListener(doc, docKey);
        });
      } else {
        console.log(
          `📄 Document exists, sending snapshot: ${docKey}, version: ${doc.version}`
        );
        this.sendDocumentState(connection, doc, collection, id);
        this.setupDocumentListener(doc, docKey);
      }
    });
  }

  /**
   * Set document listener
   */
  setupDocumentListener(doc, docKey) {
    if (!this.documents.has(docKey)) {
      console.log(
        `🎯 [OT Server] Setting listener for document ${docKey} setting listener`
      );

      // Listen to document operations - use multiple events
      doc.on("op", (op, source) => {
        console.log(`📡 [OT Server] Document operation event (op): ${docKey}`, {
          op,
          source: source ? "agent" : "system",
          version: doc.version,
        });
        this.broadcastOperation(docKey, op, doc.version, source);
      });

      // Listen to document update events
      doc.on("create", (source) => {
        console.log(`📡 [OT Server] Document creation event: ${docKey}`, {
          source,
        });
      });

      // Listen to document deletion events
      doc.on("del", (source) => {
        console.log(`📡 [OT Server] Document deletion event: ${docKey}`, {
          source,
        });
      });

      // Listen to all events
      doc.on("load", () => {
        console.log(`📡 [OT Server] Document load event: ${docKey}`);
      });

      this.documents.set(docKey, doc);
    }
  }

  /**
   * Broadcast operation to other clients
   */
  broadcastOperation(docKey, op, version, sourceAgent) {
    const [collection, id] = docKey.split("/");

    this.connections.forEach((conn, connId) => {
      // Don't send to operation initiator, and connection must have subscribed to the document
      if (
        conn.agent !== sourceAgent &&
        conn.subscribedDocs.has(docKey) &&
        conn.ws.readyState === WebSocket.OPEN
      ) {
        console.log(
          `📤 [OT Server] Broadcasting to client ${connId} operation:`,
          op
        );
        this.sendMessage(conn, {
          type: "op",
          collection,
          id,
          op,
          version,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Send document state
   */
  sendDocumentState(connection, doc, collection, id) {
    console.log(`📄 [OT SERVER] Sending document state: ${collection}/${id}`, {
      version: doc.version,
      type: doc.type,
      hasData: !!doc.data,
    });

    // Send document snapshot - rebuild complete document content
    const snapshot = this.buildDocumentSnapshot(doc);

    this.sendMessage(connection, {
      type: "doc",
      collection,
      id,
      data: snapshot,
      version: doc.version,
      timestamp: Date.now(),
    });

    console.log(
      `✅ [OT SERVER] Document snapshot sent, content length: ${
        snapshot ? JSON.stringify(snapshot).length : 0
      }`
    );
  }

  /**
   * Build document snapshot - get current document content from ShareDB
   */
  buildDocumentSnapshot(doc) {
    try {
      if (!doc || doc.type === null) {
        console.log(`📄 [OT SERVER] Document empty, returning empty snapshot`);
        return [];
      }

      // ShareDB rich-text document's data field contains current state
      if (doc.data !== undefined) {
        console.log(
          `📄 [OT SERVER] Document has data, type: ${typeof doc.data}`,
          doc.data
        );
        return doc.data;
      }

      // If no data, return empty array
      console.log(`📄 [OT SERVER] Document has no data, returning empty array`);
      return [];
    } catch (error) {
      console.error(`❌ [OT SERVER] Failed to build document snapshot:`, error);
      return [];
    }
  }

  /**
   * Handle operation
   */
  handleOperation(connection, message) {
    const { collection, id, op, version } = message;
    console.log(`📝 [OT SERVER] Received operation request:`, {
      collection,
      id,
      op,
      version,
    });

    const doc = connection.agent.get(collection, id);

    // Ensure document is subscribed
    if (!doc.subscribed) {
      console.log(
        `📄 [OT SERVER] Document not subscribed, subscribing first: ${collection}/${id}`
      );
      doc.subscribe((err) => {
        if (err) {
          console.error("❌ [OT SERVER] Failed to subscribe to document:", err);
          this.sendMessage(connection, {
            type: "error",
            error: err.message,
            timestamp: Date.now(),
          });
          return;
        }
        console.log(`✅ [OT SERVER] Document subscription successful, processing operation`);
        this.processOperation(connection, doc, message);
      });
    } else {
      console.log(`📄 [OT SERVER] Document already subscribed, processing operation directly`);
      this.processOperation(connection, doc, message);
    }
  }

  /**
   * Handle specific operation
   */
  processOperation(connection, doc, message) {
    const { collection, id, op, version } = message;

    // If document does not exist, create first
    if (doc.type === null) {
      console.log(
        `📄 [OT SERVER] Document does not exist, creating document: ${collection}/${id}`
      );
      doc.create([], "rich-text", (err) => {
        if (err) {
          console.error("❌ [OT SERVER] Failed to create document:", err);
          this.sendMessage(connection, {
            type: "error",
            error: err.message,
            timestamp: Date.now(),
          });
          return;
        }

        console.log(`✅ [OT SERVER] Document created successfully, submitting operation`);
        this.submitOperation(connection, doc, message);
      });
    } else {
      console.log(`📄 [OT SERVER] Document already exists, directly submit operation`);
      this.submitOperation(connection, doc, message);
    }
  }

  /**
   * Submit operation to ShareDB
   */
  submitOperation(connection, doc, message) {
    const { collection, id, op, version } = message;

    // Ensure operation format is correct - ShareDB rich-text expects direct Delta array
    let richTextOp;
    if (Array.isArray(op)) {
      // If already in array format, use directly
      richTextOp = op;
    } else if (op && op.ops && Array.isArray(op.ops)) {
      // If wrapped in ops format, unwrap
      richTextOp = op.ops;
    } else {
      console.error("❌ [OT SERVER] Invalid operation format:", op);
      this.sendMessage(connection, {
        type: "error",
        error: "Invalid operation format",
        timestamp: Date.now(),
      });
      return;
    }

    console.log(`📤 [OT SERVER] Submitting operation to ShareDB:`, {
      collection,
      id,
      originalOp: op,
      richTextOp,
      version,
      docVersion: doc.version,
      docType: doc.type,
    });

    // Submit operation
    doc.submitOp(richTextOp, { source: connection.agent }, (err) => {
      if (err) {
        console.error("❌ [OT SERVER] Submit operationfailed:", err);
        this.sendMessage(connection, {
          type: "error",
          error: err.message,
          timestamp: Date.now(),
        });
      } else {
        console.log(
          `✅ [OT SERVER] Operation submitted successfully, new version: ${doc.version}`
        );

        // Send operation success response
        this.sendMessage(connection, {
          type: "docUpdate",
          collection,
          id,
          data: doc.data,
          version: doc.version,
          timestamp: Date.now(),
        });

        console.log(`📤 [OT SERVER] Sent docUpdate response`);

        // Manually trigger broadcast - as document listener seems not triggered
        console.log(
          `🔄 [OT SERVER] Manually broadcasting operation to other clients`
        );
        const docKey = `${collection}/${id}`;
        this.broadcastOperation(
          docKey,
          richTextOp,
          doc.version,
          connection.agent
        );
      }
    });
  }

  /**
   * Handle ping request (for latency measurement)
   */
  handlePing(connection, message) {
    this.sendMessage(connection, {
      type: "pong",
      timestamp: Date.now(),
      clientTimestamp: message.timestamp,
    });
  }

  /**
   * Send message to client
   */
  sendMessage(connection, message) {
    if (connection.ws.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(message);
      connection.ws.send(data);

      // Count sent bytes
      connection.bytesSent += data.length;
      this.performanceMetrics.networkBytes += data.length;
    }
  }

  /**
   * Generate connection ID
   */
  generateConnectionId() {
    return `ot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const uptime = Date.now() - this.performanceMetrics.startTime;
    const avgLatency =
      this.performanceMetrics.operationsCount > 0
        ? this.performanceMetrics.totalLatency /
          this.performanceMetrics.operationsCount
        : 0;

    return {
      ...this.performanceMetrics,
      uptime,
      avgLatency,
      opsPerSecond: this.performanceMetrics.operationsCount / (uptime / 1000),
      bytesPerSecond: this.performanceMetrics.networkBytes / (uptime / 1000),
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.performanceMetrics = {
      operationsCount: 0,
      totalLatency: 0,
      networkBytes: 0,
      activeConnections: this.performanceMetrics.activeConnections,
      conflictResolutions: 0,
      startTime: Date.now(),
    };
  }
}

export default OTServer;
