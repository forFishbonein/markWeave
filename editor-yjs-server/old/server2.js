/*
 * @FilePath: server.js
 * @Author: Aron
 * @Date: 2025-03-04 17:32:57
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 19:18:05
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils.js";
import * as Y from "yjs";
import { LeveldbPersistence } from "y-leveldb";

// 初始化 Express 应用及静态资源目录
const app = express();
app.use(express.static("public"));

// 创建 HTTP 服务器及 WebSocket 服务器
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 初始化 LevelDB 持久化实例，文档数据将存储在 "./yjs-docs" 目录下
const ldb = new LeveldbPersistence("./yjs-docs");

// 内存中缓存已加载的 Y.Doc
const docs = new Map();

/**
 * 根据房间名称获取 Y.Doc 对象
 * - 如果内存中没有，则从 LevelDB 中加载文档状态
 * - 同时添加更新监听器，更新会自动存储到 LevelDB
 */
async function getYDoc(roomName) {
  if (!docs.has(roomName)) {
    // 尝试从 LevelDB 加载文档状态（若不存在则返回一个新建的空文档）
    const persistedYDoc = await ldb.getYDoc(roomName);
    docs.set(roomName, persistedYDoc);
    console.log(
      `加载了房间 ${roomName} 的持久化状态：`,
      Y.encodeStateAsUpdate(persistedYDoc)
    );
    // 监听每次更新，将增量更新存储到 LevelDB
    persistedYDoc.on("update", async (update) => {
      try {
        await ldb.storeUpdate(roomName, update);
        console.log(`房间 ${roomName} 的更新已持久化到 LevelDB`);
      } catch (err) {
        console.error(`存储房间 ${roomName} 更新时出错:`, err);
      }
    });
  }
  return docs.get(roomName);
}

// 处理 WebSocket 连接
wss.on("connection", async (ws, req) => {
  // 假设 URL 格式为 "/room1"、"/room2" 等
  let roomName = req.url.slice(1); // 去除开头的 "/"
  if (!roomName) {
    roomName = "default-room";
  }
  console.log(`连接到房间: ${roomName}`);

  // 获取（或加载）对应房间的 Y.Doc
  const ydoc = await getYDoc(roomName);
  console.log("加载到的ydoc：", ydoc);
  // const ydoc = new Y.Doc();
  // 将该 Y.Doc 与 WebSocket 连接绑定，实现实时同步
  setupWSConnection(ws, req, { gc: true, doc: ydoc });
});

const port = process.env.PORT || 1235;
server.listen(port, () => {
  console.log(`y-websocket 服务器正在 ${port} 端口运行`);
});
