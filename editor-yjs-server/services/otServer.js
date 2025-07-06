import ShareDB from "sharedb";
import ShareDBMongo from "sharedb-mongo";
import richText from "rich-text";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { URL } from "url";

// 注册rich-text OT类型
ShareDB.types.register(richText.type);

/**
 * ShareDB OT服务器
 * 用于与Yjs CRDT进行性能对比
 */
class OTServer {
  constructor() {
    this.db = null;
    this.backend = null;
    this.wss = null;
    this.connections = new Map();
    this.documents = new Map(); // 跟踪文档
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
   * 初始化OT服务器
   */
  async initialize() {
    try {
      // 使用与主应用相同的MongoDB配置
      const username = process.env.DB_USERNAME || "markWeave";
      const password = process.env.DB_PASSWORD || "eBkwPRfcdHHkdHYt";
      const host = process.env.DB_HOST || "8.130.52.237";
      const port = process.env.DB_PORT || "27017";
      const dbName = process.env.DB_NAME || "markweave";

      const mongoUrl = `mongodb://${encodeURIComponent(
        username
      )}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;

      console.log("🔗 OT服务器连接MongoDB:", host + ":" + port);
      this.db = ShareDBMongo(mongoUrl);

      // 创建ShareDB后端
      this.backend = new ShareDB({
        db: this.db,
        // 启用性能监控
        enableMetrics: true,
      });

      // 监听操作事件用于性能统计
      this.backend.use("op", (request, next) => {
        const startTime = Date.now();

        // 记录操作开始
        this.performanceMetrics.operationsCount++;

        next((err) => {
          if (!err) {
            // 记录操作延迟
            const latency = Date.now() - startTime;
            this.performanceMetrics.totalLatency += latency;

            // 检测冲突解决
            if (request.op && request.op.src && request.snapshot.v > 1) {
              this.performanceMetrics.conflictResolutions++;
            }
          }
        });
      });

      console.log("✅ OT服务器初始化成功");
    } catch (error) {
      console.error("❌ OT服务器初始化失败:", error);
      throw error;
    }
  }

  /**
   * 启动WebSocket服务器
   */
  startWebSocketServer(port = 1235) {
    const server = http.createServer((req, res) => {
      // 处理HTTP请求，返回WebSocket升级信息
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("WebSocket Server Running");
    });

    this.wss = new WebSocketServer({
      server,
      verifyClient: (info) => {
        console.log("🔍 WebSocket连接验证:", {
          origin: info.origin,
          secure: info.secure,
          req: info.req.url,
        });
        return true; // 允许所有连接
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
        subscribedDocs: new Set(), // 跟踪订阅的文档
      };

      this.connections.set(connectionId, connection);
      this.performanceMetrics.activeConnections++;

      console.log(`🔗 新的OT连接: ${connectionId}`);

      // 监听消息
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(connection, message);

          // 统计网络流量
          connection.bytesReceived += data.length;
          this.performanceMetrics.networkBytes += data.length;
        } catch (error) {
          console.error("处理OT消息失败:", error);
        }
      });

      // 监听连接关闭
      ws.on("close", () => {
        this.connections.delete(connectionId);
        this.performanceMetrics.activeConnections--;
        connection.agent.close();
        console.log(`🔌 OT连接关闭: ${connectionId}`);
      });

      // 监听错误
      ws.on("error", (error) => {
        console.error(`OT连接错误 ${connectionId}:`, error);
      });

      // 发送连接确认
      this.sendMessage(connection, {
        type: "connection",
        id: connectionId,
        timestamp: Date.now(),
      });
    });

    server.listen(port, () => {
      console.log(`🚀 OT WebSocket服务器运行在端口 ${port}`);
    });
  }

  /**
   * 处理客户端消息
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
        console.warn("未知的OT消息类型:", message.type);
    }
  }

  /**
   * 处理文档订阅
   */
  handleSubscribe(connection, message) {
    const { collection, id } = message;
    const docKey = `${collection}/${id}`;
    const doc = connection.agent.get(collection, id);

    // 添加到连接的订阅文档列表
    connection.subscribedDocs.add(docKey);

    doc.subscribe((err) => {
      if (err) {
        console.error("订阅文档失败:", err);
        return;
      }

      // 如果文档不存在，创建一个空文档
      if (doc.type === null) {
        console.log(`📄 创建新文档: ${docKey}`);
        doc.create([], "rich-text", (err) => {
          if (err) {
            console.error("创建文档失败:", err);
            return;
          }
          console.log(`✅ 文档创建成功: ${docKey}`);
          this.sendDocumentState(connection, doc, collection, id);
          this.setupDocumentListener(doc, docKey);
        });
      } else {
        console.log(`📄 文档已存在，发送快照: ${docKey}, 版本: ${doc.version}`);
        this.sendDocumentState(connection, doc, collection, id);
        this.setupDocumentListener(doc, docKey);
      }
    });
  }

  /**
   * 设置文档监听器
   */
  setupDocumentListener(doc, docKey) {
    if (!this.documents.has(docKey)) {
      console.log(`🎯 [OT服务器] 为文档 ${docKey} 设置监听器`);

      // 监听文档操作 - 使用多个事件
      doc.on("op", (op, source) => {
        console.log(`📡 [OT服务器] 文档操作事件(op): ${docKey}`, {
          op,
          source: source ? "agent" : "system",
          version: doc.version,
        });
        this.broadcastOperation(docKey, op, doc.version, source);
      });

      // 监听文档更新事件
      doc.on("create", (source) => {
        console.log(`📡 [OT服务器] 文档创建事件: ${docKey}`, { source });
      });

      // 监听文档删除事件
      doc.on("del", (source) => {
        console.log(`📡 [OT服务器] 文档删除事件: ${docKey}`, { source });
      });

      // 监听所有事件
      doc.on("load", () => {
        console.log(`📡 [OT服务器] 文档加载事件: ${docKey}`);
      });

      this.documents.set(docKey, doc);
    }
  }

  /**
   * 广播操作给其他客户端
   */
  broadcastOperation(docKey, op, version, sourceAgent) {
    const [collection, id] = docKey.split("/");

    this.connections.forEach((conn, connId) => {
      // 不发送给操作的发起者，且连接必须订阅了该文档
      if (
        conn.agent !== sourceAgent &&
        conn.subscribedDocs.has(docKey) &&
        conn.ws.readyState === WebSocket.OPEN
      ) {
        console.log(`📤 [OT服务器] 向客户端 ${connId} 广播操作:`, op);
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
   * 发送文档状态
   */
  sendDocumentState(connection, doc, collection, id) {
    console.log(`📄 [OT SERVER] 发送文档状态: ${collection}/${id}`, {
      version: doc.version,
      type: doc.type,
      hasData: !!doc.data,
    });

    // 发送文档快照 - 重建完整的文档内容
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
      `✅ [OT SERVER] 文档快照已发送，内容长度: ${
        snapshot ? JSON.stringify(snapshot).length : 0
      }`
    );
  }

  /**
   * 构建文档快照 - 从ShareDB获取当前文档内容
   */
  buildDocumentSnapshot(doc) {
    try {
      if (!doc || doc.type === null) {
        console.log(`📄 [OT SERVER] 文档为空，返回空快照`);
        return [];
      }

      // ShareDB rich-text 文档的 data 字段包含当前状态
      if (doc.data !== undefined) {
        console.log(
          `📄 [OT SERVER] 文档有数据，类型: ${typeof doc.data}`,
          doc.data
        );
        return doc.data;
      }

      // 如果没有数据，返回空数组
      console.log(`📄 [OT SERVER] 文档无数据，返回空数组`);
      return [];
    } catch (error) {
      console.error(`❌ [OT SERVER] 构建文档快照失败:`, error);
      return [];
    }
  }

  /**
   * 处理操作
   */
  handleOperation(connection, message) {
    const { collection, id, op, version } = message;
    console.log(`📝 [OT SERVER] 收到操作请求:`, {
      collection,
      id,
      op,
      version,
    });

    const doc = connection.agent.get(collection, id);

    // 确保文档已订阅
    if (!doc.subscribed) {
      console.log(`📄 [OT SERVER] 文档未订阅，先订阅: ${collection}/${id}`);
      doc.subscribe((err) => {
        if (err) {
          console.error("❌ [OT SERVER] 订阅文档失败:", err);
          this.sendMessage(connection, {
            type: "error",
            error: err.message,
            timestamp: Date.now(),
          });
          return;
        }
        console.log(`✅ [OT SERVER] 文档订阅成功，处理操作`);
        this.processOperation(connection, doc, message);
      });
    } else {
      console.log(`📄 [OT SERVER] 文档已订阅，直接处理操作`);
      this.processOperation(connection, doc, message);
    }
  }

  /**
   * 处理具体的操作
   */
  processOperation(connection, doc, message) {
    const { collection, id, op, version } = message;

    // 如果文档不存在，先创建
    if (doc.type === null) {
      console.log(`📄 [OT SERVER] 文档不存在，创建文档: ${collection}/${id}`);
      doc.create([], "rich-text", (err) => {
        if (err) {
          console.error("❌ [OT SERVER] 创建文档失败:", err);
          this.sendMessage(connection, {
            type: "error",
            error: err.message,
            timestamp: Date.now(),
          });
          return;
        }

        console.log(`✅ [OT SERVER] 文档创建成功，提交操作`);
        this.submitOperation(connection, doc, message);
      });
    } else {
      console.log(`📄 [OT SERVER] 文档已存在，直接提交操作`);
      this.submitOperation(connection, doc, message);
    }
  }

  /**
   * 提交操作到ShareDB
   */
  submitOperation(connection, doc, message) {
    const { collection, id, op, version } = message;

    // 确保操作格式正确 - ShareDB rich-text期望直接的Delta数组
    let richTextOp;
    if (Array.isArray(op)) {
      // 如果已经是数组格式，直接使用
      richTextOp = op;
    } else if (op && op.ops && Array.isArray(op.ops)) {
      // 如果是包装在ops中的格式，解包
      richTextOp = op.ops;
    } else {
      console.error("❌ [OT SERVER] 无效的操作格式:", op);
      this.sendMessage(connection, {
        type: "error",
        error: "Invalid operation format",
        timestamp: Date.now(),
      });
      return;
    }

    console.log(`📤 [OT SERVER] 提交操作到ShareDB:`, {
      collection,
      id,
      originalOp: op,
      richTextOp,
      version,
      docVersion: doc.version,
      docType: doc.type,
    });

    // 提交操作
    doc.submitOp(richTextOp, { source: connection.agent }, (err) => {
      if (err) {
        console.error("❌ [OT SERVER] 提交操作失败:", err);
        this.sendMessage(connection, {
          type: "error",
          error: err.message,
          timestamp: Date.now(),
        });
      } else {
        console.log(`✅ [OT SERVER] 操作提交成功，新版本: ${doc.version}`);

        // 发送操作成功响应
        this.sendMessage(connection, {
          type: "docUpdate",
          collection,
          id,
          data: doc.data,
          version: doc.version,
          timestamp: Date.now(),
        });

        console.log(`📤 [OT SERVER] 已发送docUpdate响应`);

        // 手动触发广播 - 因为文档监听器似乎没有被触发
        console.log(`🔄 [OT SERVER] 手动广播操作给其他客户端`);
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
   * 处理ping请求（用于延迟测量）
   */
  handlePing(connection, message) {
    this.sendMessage(connection, {
      type: "pong",
      timestamp: Date.now(),
      clientTimestamp: message.timestamp,
    });
  }

  /**
   * 发送消息给客户端
   */
  sendMessage(connection, message) {
    if (connection.ws.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(message);
      connection.ws.send(data);

      // 统计发送字节数
      connection.bytesSent += data.length;
      this.performanceMetrics.networkBytes += data.length;
    }
  }

  /**
   * 生成连接ID
   */
  generateConnectionId() {
    return `ot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取性能指标
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
   * 重置性能指标
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
