/*
 * @FilePath: persistence.js
 * @Author: Aron
 * @Date: 2025-03-04 14:17:32
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-06-03 01:44:03
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// persistence.js
import * as Y from "yjs";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import Doc from "./models/Doc.js";
const username = "weaveEditor"; // 替换为你的用户名
const password = "EWA68bKFRmAzHcZ7"; // 替换为你的密码
const host = "8.130.52.237"; // 或你的 MongoDB 服务器地址
const port = "27017"; // MongoDB 默认端口
const dbName = "weaveeditor"; // 数据库名称 //只能纯小写

const mongoUrl = `mongodb://${encodeURIComponent(
  username
)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
// let clientPromise = null;
// async function getDb() {
//   if (!clientPromise) {
//     const client = new MongoClient(mongoUrl, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     clientPromise = client.connect();
//   }
//   const client = await clientPromise;
//   return client.db(dbName);
// }
let connectPromise = null;
function connectMongo() {
  if (!connectPromise) {
    connectPromise = mongoose.connect(mongoUrl, {
      dbName,
      // 如果你想改全局 Buffer → Binary 存储格式，可继续在这里配置
    });
  }
  return connectPromise;
}

/**
 * 序列化 ydoc 状态并存储到数据库
 * @param {string} docId 文档唯一标识，例如房间名称
 * @param {Y.Doc} ydoc 当前 Y.Doc
 */
export async function saveDocState(docId, ydoc, userId) {
  try {
    // const db = await getDb();
    // const collection = db.collection("docs");
    console.log("新的ydoc内容:", ydoc);
    // 序列化 yDoc 状态为一个 Uint8Array
    // const update = Y.encodeStateAsUpdate(ydoc);
    // console.log("update:", update);
    // // 转成 base64 字符串保存（也可以保存为二进制数据）
    // const updateBase64 = Buffer.from(update).toString("base64");
    // console.log("updateBase64:", updateBase64);
    // 使用 upsert 保存数据
    // await collection.updateOne(
    //   { docId },
    //   { $set: { document: ydoc, lastUpdated: new Date() } },
    //   { upsert: true }
    // );
    await connectMongo(); // 确保已连接
    const updateBuf = Buffer.from(Y.encodeStateAsUpdate(ydoc));
    await Doc.updateOne(
      { docId },
      {
        $set: { state: updateBuf, lastUpdated: new Date() },
        $setOnInsert: {
          ownerId: userId,
          participants: [{ userId, role: "owner" }],
          createdAt: new Date(),
          title: "Untitled",
        },
      },
      { upsert: true }
    );
    console.log(`保存文档 ${docId} 状态成功`);
  } catch (err) {
    console.error("保存文档状态失败", err);
  }
}

/**
 * 从数据库加载存储的 ydoc 状态，并应用到当前 ydoc 中
 * @param {string} docId 文档唯一标识
 * @param {Y.Doc} ydoc 当前 Y.Doc
 */
export async function loadDocState(docId, ydoc) {
  console.log("docId", docId);
  try {
    // const db = await getDb();
    // const collection = db.collection("docs");
    // const result = await collection.findOne({ docId });
    // if (result && result.update) {
    //   // const updateBuffer = Buffer.from(result.update, "base64");
    //   // Y.applyUpdate(ydoc, updateBuffer);
    //   // console.log(`加载文档 ${docId} 状态成功`);
    //   // console.log("updateBuffer:", updateBuffer);
    //   return result.update;
    // } else {
    //   console.log(`文档 ${docId} 状态不存在`);
    // }
    await connectMongo();
    const doc = await Doc.findOne({ docId }, { state: 1 });
    if (!doc || !doc.state) {
      console.log(`ℹ️ 文档 ${docId} 尚无持久化状态`);
      return false;
    }
    // Buffer → Uint8Array（零拷贝视图）
    const buf = doc.state;
    const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    Y.applyUpdate(ydoc, uint8);
    console.log(`✅ 加载文档 ${docId} 成功`);
    return true;
  } catch (err) {
    console.error("加载文档状态失败", err);
    return false;
  }
}
