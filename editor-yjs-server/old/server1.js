/*
 * @FilePath: server1.js
 * @Author: Aron
 * @Date: 2025-03-04 14:17:23
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 23:54:21
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils.js";
import * as Y from "yjs";
import { loadDocState, saveDocState } from "../persistence.js";

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// const docId = "room1"; // 示例：每个文档对应一个房间

// 每个房间对应一个 Y.Doc（这里简单示例一个文档）——> 这个没法处理，因为我们获取不到 ydoc 的内容！
const docs = new Map();
async function getYDoc(roomName) {
  if (!docs.has(roomName)) {
    const ydoc = new Y.Doc();
    console.log("ydoc000:", ydoc);
    // 尝试从数据库加载已有状态（持久化）
    await loadDocState(roomName, ydoc);
    docs.set(roomName, ydoc);
  }
  return docs.get(roomName);
}

wss.on("connection", async (ws, req) => {
  console.log("新连接的 URL:", req.url);
  // // 从 URL 中解析房间名称，示例中直接使用固定的 docId
  // const ydoc = getYDoc(docId);
  // setupWSConnection(ws, req, { gc: true, doc: ydoc });
  // 假设 URL 格式为 "/room1"、"/room2" 等
  let roomName = req.url.slice(1); // 移除开头的 "/"
  if (!roomName) {
    roomName = "default-room";
  }
  console.log(`连接到房间: ${roomName}`);
  const ydoc = await getYDoc(roomName);
  // 将该房间的 Y.Doc 传给 setupWSConnection，实现文档状态同步
  setupWSConnection(ws, req, { gc: true, doc: ydoc });
});

// 每隔一定时间保存文档状态（例如每 10 秒保存一次）
setInterval(() => {
  docs.forEach((ydoc, id) => {
    saveDocState(id, ydoc).catch((err) => {
      console.error(`保存文档 ${docId} 出错:`, err);
    });
  });
}, 10000);

const port = process.env.PORT || 1235;
server.listen(port, () => {
  console.log(`y-websocket server is running on port ${port}`);
});
