/*
 * @FilePath: server.js
 * @Author: Aron
 * @Date: 2025-03-04 19:18:16
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 23:56:50
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils.js";
import * as Y from "yjs";
import { loadDocState, saveDocState } from "./persistence.js";
import cors from "cors";
import { json } from "stream/consumers";

const app = express();
app.use(express.static("public"));
// 添加 JSON body 解析中间件
app.use(express.json({ limit: "50mb" })); // 允许最大 50MB 的 JSON 请求体
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // 处理 URL 编码的请求体
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// const docId = "room1"; // 示例：每个文档对应一个房间

// 每个房间对应一个 Y.Doc（这里简单示例一个文档）——> 这个没法处理，因为我们获取不到 ydoc 的内容！
const docs = new Map();
async function getYDoc(roomName) {
  console.log("文档id：", roomName);
  if (!docs.has(roomName)) {
    // const ydoc = new Y.Doc();
    // console.log("ydoc000:", ydoc);
    // 尝试从数据库加载已有状态（持久化）
    let ydoc = await loadDocState(roomName);
    docs.set(roomName, ydoc);
  }
  return docs.get(roomName);
}
app.post("/api/doc", async (req, res) => {
  const { id, content } = req.body;
  if (!id || !content) {
    return res.status(400).json({ error: "缺少 id 或文档内容" });
  }
  try {
    console.log("更新文档：", id);
    saveDocState(id, content).catch((err) => {
      console.error(`保存文档 ${docId} 出错:`, err);
    });
    docs.set(id, content);
    res.json({ message: "文档更新并持久化成功" });
  } catch (err) {
    console.error("更新文档时出错:", err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/initial", async (req, res) => {
  const { docId } = req.query;
  if (!docId) {
    return res.status(400).json({ error: "缺少 docId 参数" });
  }
  try {
    const initialData = await getYDoc(docId);
    res.json({ docId, content: initialData });
  } catch (err) {
    console.error("加载初始文档状态时出错:", err);
    res.status(500).json({ error: err.message });
  }
});
wss.on("connection", async (ws, req) => {
  // console.log("新连接的 URL:", req.url);
  // // 从 URL 中解析房间名称，示例中直接使用固定的 docId
  // const ydoc = getYDoc(docId);
  // setupWSConnection(ws, req, { gc: true, doc: ydoc });
  // 假设 URL 格式为 "/room1"、"/room2" 等
  let roomName = req.url.slice(1); // 移除开头的 "/"
  if (!roomName) {
    roomName = "default-room";
  }
  // const initialData = await getYDoc(roomName);
  // 创建一个新的 Y.Doc
  const ydoc = new Y.Doc(); //这里不用管，给个空的就可以，因为前端会进行内容填充，这里不管是什么都影响不到前端，因为我们要的结构是ychars构造出来的！
  setupWSConnection(ws, req, { gc: true, doc: ydoc });
});

// 每隔一定时间保存文档状态（例如每 10 秒保存一次）——> 没有意义，应该从前端作为入口，更新的时候调用接口来保存数据！
// setInterval(() => {
//   docs.forEach((ydoc, id) => {
//     saveDocState(id, ydoc).catch((err) => {
//       console.error(`保存文档 ${docId} 出错:`, err);
//     });
//   });
// }, 10000);

const port = process.env.PORT || 1235;
server.listen(port, () => {
  console.log(`y-websocket server is running on port ${port}`);
});
