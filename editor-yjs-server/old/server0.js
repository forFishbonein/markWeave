/*
 * @FilePath: server0.js
 * @Author: Aron
 * @Date: 2025-03-03 01:19:22
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 14:48:14
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// server.js
// const express = require("express");
// const http = require("http");
// const WebSocket = require("ws");
// const { setupWSConnection } = require("y-websocket/bin/utils.js");
// const { setupWSConnection } = require("y-websocket/bin/utils.cjs");
// const { setupWSConnection } = require("y-websocket/dist/utils.cjs");
// const { setupWSConnection } = require("y-websocket/dist/server.cjs");
// const { setupWSConnection } = require("y-websocket/bin/utils.js");

// const { setupWSConnection } = require("y-websocket/bin/utils.js");
// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
// 从 dist/server.cjs 导入 setupWSConnection（注意路径根据 y-websocket 版本可能有所不同）
// import { setupWSConnection } from "y-websocket/dist/server.cjs";
import { setupWSConnection } from "y-websocket/bin/utils.js";
// import { setupWSConnection } from "y-websocket";
// import { setupWSConnection } from "y-websocket/dist/y-websocket.cjs";

const app = express();

// 可选：提供静态文件服务（比如前端页面）
app.use(express.static("public"));

const server = http.createServer(app);

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  // setupWSConnection 会自动处理房间（通过 URL 参数中的 roomName）
  setupWSConnection(ws, req, { gc: true });
});

const port = process.env.PORT || 1234;
server.listen(port, () => {
  console.log(`y-websocket server is running on port ${port}`);
});

//y-websocket自己本身就是服务器，所以没有提供导出，用不了！
/**
 * $ cat node_modules/y-websocket/package.json | grep exports -A 10

  "exports": {
    "./package.json": "./package.json",
    ".": {
      "import": "./src/y-websocket.js",
      "require": "./dist/y-websocket.cjs"
    }
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yjs/y-websocket.git"
  },


  使用 y-websocket 提供的 CLI 工具：

  y-websocket 提供了一个命令行工具，您可以全局安装它，然后运行服务器：

  bash
  复制
  编辑
  npm install -g y-websocket
  y-websocket --port 1234

 */
