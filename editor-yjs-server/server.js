/*
 * @FilePath: server.js
 * @Author: Aron
 * @Date: 2025-03-04 19:18:16
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-07 02:38:43
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils.js";
import * as Y from "yjs";
import {
  loadDocState,
  saveDocState,
  loadDocContent,
  saveDocContent,
  updateDocumentTitle,
} from "./persistence.js";
import cors from "cors";
import debounce from "lodash.debounce";
import mongoose from "mongoose";
import dotenv from "dotenv";

import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import OTServer from "./services/otServer.js";

dotenv.config();

const app = express();
app.use(express.static("public"));
// 添加 JSON body 解析中间件
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

// API 路由
app.use("/api", apiRoutes);

// 文档内容相关API
app.get("/api/doc/:docId", async (req, res) => {
  const { docId } = req.params;

  try {
    const doc = await loadDocContent(docId);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "文档不存在",
      });
    }

    res.json({
      success: true,
      data: doc,
    });
  } catch (err) {
    console.error("获取文档失败:", err);
    res.status(500).json({
      success: false,
      message: "获取文档失败",
      error: err.message,
    });
  }
});

app.put("/api/doc/:docId", async (req, res) => {
  const { docId } = req.params;
  const { content, userId, teamId } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: "缺少文档内容",
    });
  }

  try {
    await saveDocContent(docId, content, userId, teamId);

    res.json({
      success: true,
      message: "文档保存成功",
    });
  } catch (err) {
    console.error("保存文档失败:", err);
    res.status(500).json({
      success: false,
      message: "保存文档失败",
      error: err.message,
    });
  }
});

app.put("/api/doc/:docId/title", async (req, res) => {
  const { docId } = req.params;
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "标题不能为空",
    });
  }

  try {
    await updateDocumentTitle(docId, title.trim());

    res.json({
      success: true,
      message: "标题更新成功",
    });
  } catch (err) {
    console.error("更新标题失败:", err);
    res.status(500).json({
      success: false,
      message: "更新标题失败",
      error: err.message,
    });
  }
});

// CRDT同步相关的API端点
app.post("/api/doc", async (req, res) => {
  const { id, content } = req.body; // content是base64编码的Yjs更新

  if (!id || !content) {
    return res.status(400).json({ error: "缺少 docId 或 update content" });
  }

  try {
    const ydoc = await getYDoc(id);
    const uint8 = Uint8Array.from(Buffer.from(content, "base64"));
    Y.applyUpdate(ydoc, uint8);
    // saveDocState 会在 debounce 中自动调用
    res.json({ message: "更新已应用" });
  } catch (err) {
    console.error("应用 update 时出错:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/initial", async (req, res) => {
  const { docId } = req.query;

  if (!docId) {
    return res.status(400).json({ error: "缺少 docId 参数" });
  }

  try {
    const ydoc = await getYDoc(docId);
    const stateBase64 = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
      "base64"
    );
    res.json({ docId, update: stateBase64 });
  } catch (err) {
    console.error("加载初始文档失败:", err);
    res.status(500).json({ error: err.message });
  }
});

// OT性能指标API
app.get("/api/ot/metrics", (req, res) => {
  if (otServer) {
    const metrics = otServer.getPerformanceMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } else {
    res.status(503).json({
      success: false,
      message: "OT服务器未启动",
    });
  }
});

app.post("/api/ot/metrics/reset", (req, res) => {
  if (otServer) {
    otServer.resetMetrics();
    res.json({
      success: true,
      message: "OT性能指标已重置",
    });
  } else {
    res.status(503).json({
      success: false,
      message: "OT服务器未启动",
    });
  }
});

// 错误处理中间件
app.use(errorHandler);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const username = process.env.DB_USERNAME || "markWeave";
const password = process.env.DB_PASSWORD || "eBkwPRfcdHHkdHYt";
const host = process.env.DB_HOST || "8.130.52.237";
const port = process.env.DB_PORT || "27017";
const dbName = process.env.DB_NAME || "markweave";

const mongoUrl = `mongodb://${encodeURIComponent(
  username
)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;

mongoose
  .connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// Yjs文档管理
const docs = new Map();

async function getYDoc(roomName) {
  console.log("📄 Loading document:", roomName);

  if (docs.has(roomName)) {
    return docs.get(roomName);
  }

  const ydoc = new Y.Doc();

  // 从数据库加载文档状态
  await loadDocState(roomName, ydoc);

  // 设置持久化（防抖处理）
  const persist = debounce(
    () => saveDocState(roomName, ydoc),
    2000, // 2秒内的更新合并
    { maxWait: 10000 } // 最长10秒必须保存一次
  );

  ydoc.on("update", persist);
  docs.set(roomName, ydoc);

  return ydoc;
}

// WebSocket处理
wss.on("connection", async (ws, req) => {
  try {
    const url = new URL(req.url, `ws://${req.headers.host}`);
    const roomName = url.pathname.slice(1) || "default-room";

    console.log("🔌 WebSocket connection:", roomName);

    const ydoc = await getYDoc(roomName);

    // 🔥 禁用 y-websocket 的内置持久化，避免创建 o_documents 集合
    // 我们使用自己的 persistence.js 进行持久化到 docs 集合
    setupWSConnection(ws, req, {
      gc: true,
      doc: ydoc,
      // 禁用内置持久化机制
      persistence: {
        provider: null,
        bindState: () => {},
        writeState: () => {},
      },
    });

    console.log(
      "✅ WebSocket 连接已建立，使用自定义持久化 (禁用 o_documents 集合创建)"
    );
  } catch (error) {
    console.error("❌ WebSocket connection error:", error);
    ws.close();
  }
});

// 初始化OT服务器
let otServer = null;

async function initializeOTServer() {
  try {
    otServer = new OTServer();
    await otServer.initialize();
    otServer.startWebSocketServer(1235); // OT服务器运行在1235端口
    console.log("✅ OT服务器启动成功");
  } catch (error) {
    console.error("❌ OT服务器启动失败:", error);
  }
}

const PORT = process.env.PORT || 1234;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server available at ws://localhost:${PORT}`);
  console.log(`🌐 API server available at http://localhost:${PORT}/api`);

  // 启动OT服务器
  await initializeOTServer();
});
