/*
 * @FilePath: persistence.js
 * @Author: Aron
 * @Date: 2025-03-04 14:17:32
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-06-24 02:58:05
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import mongoose from "mongoose";
import * as Y from "yjs";
import debounce from "lodash.debounce";
import Doc from "./models/Doc.js";
import dotenv from "dotenv";

dotenv.config();

const username = process.env.DB_USERNAME || "markWeave";
const password = process.env.DB_PASSWORD || "eBkwPRfcdHHkdHYt";
const host = process.env.DB_HOST || "8.130.52.237";
const port = process.env.DB_PORT || "27017";
const dbName = process.env.DB_NAME || "markweave";

export const MONGODB_URI = `mongodb://${encodeURIComponent(
  username
)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;

let connectPromise = null;
function connectMongo() {
  if (!connectPromise) {
    connectPromise = mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
  return connectPromise;
}

/**
 * 将Yjs文档转换为JSON格式
 * @param {Y.Doc} ydoc Yjs文档
 * @returns {Object} JSON表示的文档内容
 */
function yjsToJson(ydoc) {
  try {
    // 获取Yjs中的文本内容
    const ytext = ydoc.getText("prosemirror");
    const content = ytext.toString();

    // 获取格式信息（如果有的话）
    const ymap = ydoc.getMap("meta");
    const meta = ymap.toJSON();

    // 简单的JSON结构
    return {
      type: "doc",
      content: content
        ? [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: content,
                },
              ],
            },
          ]
        : [
            {
              type: "paragraph",
              content: [],
            },
          ],
      meta: meta,
      // 保存完整的Yjs状态用于恢复
      yjsState: Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64"),
    };
  } catch (err) {
    console.error("Yjs转JSON失败:", err);
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
      yjsState: Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64"),
    };
  }
}

/**
 * 将JSON格式转换回Yjs文档
 * @param {Object} jsonContent JSON内容
 * @param {Y.Doc} ydoc 目标Yjs文档
 */
function jsonToYjs(jsonContent, ydoc) {
  try {
    if (jsonContent.yjsState) {
      // 如果有保存的Yjs状态，直接恢复
      const state = Buffer.from(jsonContent.yjsState, "base64");
      Y.applyUpdate(ydoc, new Uint8Array(state));
    } else if (jsonContent.content) {
      // 否则从JSON内容重建
      const ytext = ydoc.getText("prosemirror");
      let textContent = "";

      // 提取文本内容
      const extractText = (nodes) => {
        nodes.forEach((node) => {
          if (node.type === "text") {
            textContent += node.text || "";
          } else if (node.content) {
            extractText(node.content);
          }
        });
      };

      extractText(jsonContent.content);

      if (textContent) {
        ytext.insert(0, textContent);
      }

      // 恢复元数据
      if (jsonContent.meta) {
        const ymap = ydoc.getMap("meta");
        Object.entries(jsonContent.meta).forEach(([key, value]) => {
          ymap.set(key, value);
        });
      }
    }
  } catch (err) {
    console.error("JSON转Yjs失败:", err);
  }
}

/**
 * 保存Yjs文档状态并转换为JSON存储
 * @param {string} docId 文档唯一标识
 * @param {Y.Doc} ydoc 当前 Y.Doc
 * @param {string} userId 用户ID
 * @param {string} teamId 团队ID
 */
export async function saveDocState(docId, ydoc, userId, teamId = null) {
  try {
    await connectMongo();

    // 将Yjs转换为JSON格式
    const jsonContent = yjsToJson(ydoc);

    const result = await Doc.updateOne(
      { docId },
      {
        $set: {
          content: jsonContent,
          lastUpdated: new Date(),
        },
        $inc: {
          version: 1,
        },
        $setOnInsert: {
          ownerId: userId,
          teamId: teamId,
          participants: [{ userId, role: "owner" }],
          createdAt: new Date(),
          title: "未命名文档",
        },
      },
      { upsert: true }
    );

    console.log(`✅ 保存文档 ${docId} 状态成功`);
    return result;
  } catch (err) {
    console.error("❌ 保存文档状态失败:", err);
    throw err;
  }
}

/**
 * 从数据库加载JSON内容并转换回Yjs文档
 * @param {string} docId 文档唯一标识
 * @param {Y.Doc} ydoc 当前 Y.Doc
 */
export async function loadDocState(docId, ydoc) {
  console.log("📄 Loading docId:", docId);

  try {
    await connectMongo();

    const doc = await Doc.findOne({ docId });

    if (!doc || !doc.content) {
      console.log(`ℹ️ 文档 ${docId} 尚无持久化状态，创建新文档`);
      return false;
    }

    // 将JSON内容转换回Yjs
    jsonToYjs(doc.content, ydoc);

    console.log(`✅ 加载文档 ${docId} 成功 (${doc.title || "未命名文档"})`);
    return true;
  } catch (err) {
    console.error("❌ 加载文档状态失败:", err);
    return false;
  }
}

/**
 * 获取文档JSON内容（用于API访问）
 * @param {string} docId 文档唯一标识
 */
export async function loadDocContent(docId) {
  try {
    await connectMongo();

    const doc = await Doc.findOne({ docId }).populate(
      "ownerId",
      "username email"
    );

    if (!doc) {
      console.log(`ℹ️ 文档 ${docId} 不存在`);
      return null;
    }

    return {
      docId: doc.docId,
      title: doc.title,
      content: doc.content || {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [],
          },
        ],
      },
      teamId: doc.teamId,
      ownerId: doc.ownerId,
      participants: doc.participants,
      createdAt: doc.createdAt,
      lastUpdated: doc.lastUpdated,
      version: doc.version,
    };
  } catch (err) {
    console.error("❌ 加载文档内容失败:", err);
    throw err;
  }
}

/**
 * 保存JSON文档内容（用于API更新）
 * @param {string} docId 文档唯一标识
 * @param {Object} content JSON格式的文档内容
 * @param {string} userId 用户ID
 * @param {string} teamId 团队ID
 */
export async function saveDocContent(docId, content, userId, teamId = null) {
  try {
    await connectMongo();

    const result = await Doc.updateOne(
      { docId },
      {
        $set: {
          content: content,
          lastUpdated: new Date(),
        },
        $setOnInsert: {
          ownerId: userId,
          teamId: teamId,
          participants: [{ userId, role: "owner" }],
          createdAt: new Date(),
          title: "未命名文档",
        },
      },
      { upsert: true }
    );

    console.log(`✅ 保存文档 ${docId} 内容成功`);
    return result;
  } catch (err) {
    console.error("❌ 保存文档内容失败:", err);
    throw err;
  }
}

/**
 * 获取文档基本信息
 * @param {string} docId 文档ID
 */
export async function getDocumentInfo(docId) {
  try {
    await connectMongo();

    const doc = await Doc.findOne({ docId })
      .populate("ownerId", "username email")
      .populate("teamId", "name description")
      .select(
        "docId title teamId ownerId createdAt lastUpdated participants version"
      );

    return doc;
  } catch (err) {
    console.error("❌ 获取文档信息失败:", err);
    throw err;
  }
}

/**
 * 更新文档标题
 * @param {string} docId 文档ID
 * @param {string} title 新标题
 */
export async function updateDocumentTitle(docId, title) {
  try {
    await connectMongo();

    const result = await Doc.updateOne(
      { docId },
      {
        $set: {
          title: title,
          lastUpdated: new Date(),
        },
      }
    );

    console.log(`✅ 更新文档 ${docId} 标题成功: ${title}`);
    return result;
  } catch (err) {
    console.error("❌ 更新文档标题失败:", err);
    throw err;
  }
}

/**
 * 删除文档
 * @param {string} docId 文档ID
 */
export async function deleteDocument(docId) {
  try {
    await connectMongo();

    const result = await Doc.deleteOne({ docId });
    console.log(`✅ 删除文档 ${docId} 成功`);
    return result;
  } catch (err) {
    console.error("❌ 删除文档失败:", err);
    throw err;
  }
}
