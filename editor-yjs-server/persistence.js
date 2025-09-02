/*
 * @FilePath: persistence.js
 * @Author: Aron
 * @Date: 2025-03-04 14:17:32
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-09-03 04:42:34
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
 * Convert Yjs document to JSON format
 * @param {Y.Doc} ydoc Yjs document
 * @returns {Object} JSON representation of document content
 */
function yjsToJson(ydoc) {
  try {
    // Get text content from Yjs
    const ytext = ydoc.getText("prosemirror");
    const content = ytext.toString();

    // Get format info (if any)
    const ymap = ydoc.getMap("meta");
    const meta = ymap.toJSON();

    // Simple JSON structure
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
      // Save complete Yjs state for recovery
      yjsState: Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64"),
    };
  } catch (err) {
    console.error("Yjs to JSON failed:", err);
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
 * Convert JSON format back to Yjs document
 * @param {Object} jsonContent JSON content
 * @param {Y.Doc} ydoc Target Yjs document
 */
function jsonToYjs(jsonContent, ydoc) {
  try {
    if (jsonContent.yjsState) {
      // If saved Yjs state exists, restore directly
      const state = Buffer.from(jsonContent.yjsState, "base64");
      Y.applyUpdate(ydoc, new Uint8Array(state));
    } else if (jsonContent.content) {
      // Otherwise rebuild from JSON content
      const ytext = ydoc.getText("prosemirror");
      let textContent = "";

      // Extract text content
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

      // Restore metadata
      if (jsonContent.meta) {
        const ymap = ydoc.getMap("meta");
        Object.entries(jsonContent.meta).forEach(([key, value]) => {
          ymap.set(key, value);
        });
      }
    }
  } catch (err) {
    console.error("JSON to Yjs failed:", err);
  }
}

/**
 * Save Yjs document state and convert to JSON storage
 * @param {string} docId Document unique identifier
 * @param {Y.Doc} ydoc Current Y.Doc
 * @param {string} userId User ID (optional, only needed when creating document)
 * @param {string} teamId Team ID (optional, only needed when creating document)
 */
export async function saveDocState(docId, ydoc, userId = null, teamId = null) {
  try {
    await connectMongo();

    // Convert Yjs to JSON format
    const jsonContent = yjsToJson(ydoc);

    // Check if document already exists
    const existingDoc = await Doc.findOne({ docId });

    if (existingDoc) {
      // Document exists, only update content
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
        }
      );
      console.log(
        `✅ Updated document ${docId} content successfully (version: ${
          existingDoc.version + 1
        })`
      );
      return result;
    } else if (userId) {
      // Document doesn't exist and userId provided, create new document
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
            title: "Untitled Document",
          },
        },
        { upsert: true }
      );
      console.log(`✅ Created and saved document ${docId} successfully`);
      return result;
    } else {
      // Document doesn't exist and no userId provided, log warning but don't throw error
      console.warn(
        `⚠️ Document ${docId} doesn't exist and cannot be created (missing user info), skipping save`
      );
      return null;
    }
  } catch (err) {
    console.error("❌ Failed to save document state:", err);
    throw err;
  }
}

/**
 * Load JSON content from database and convert back to Yjs document
 * @param {string} docId Document unique identifier
 * @param {Y.Doc} ydoc Current Y.Doc
 */
export async function loadDocState(docId, ydoc) {
  console.log("📄 Loading docId:", docId);

  try {
    await connectMongo();

    const doc = await Doc.findOne({ docId });

    if (!doc || !doc.content) {
      console.log(
        `ℹ️ Document ${docId} has no persistent state yet, creating new document`
      );
      return false;
    }

    // Convert JSON content back to Yjs
    jsonToYjs(doc.content, ydoc);

    console.log(
      `✅ Loaded document ${docId} successful (${
        doc.title || "Untitled Document"
      })`
    );
    return true;
  } catch (err) {
    console.error("❌ Failed to load document state:", err);
    return false;
  }
}

/**
 * Get document JSON content (for API access)
 * @param {string} docId Document unique identifier
 */
export async function loadDocContent(docId) {
  try {
    await connectMongo();

    const doc = await Doc.findOne({ docId }).populate(
      "ownerId",
      "username email"
    );

    if (!doc) {
      console.log(`ℹ️ Document ${docId} does not exist`);
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
    console.error("❌ Failed to load document content:", err);
    throw err;
  }
}

/**
 * Save JSON document content (for API update)
 * @param {string} docId Document unique identifier
 * @param {Object} content JSON format document content
 * @param {string} userId User ID
 * @param {string} teamId Team ID
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
          title: "Untitled Document",
        },
      },
      { upsert: true }
    );

    console.log(`✅ Saved document ${docId} content successfully`);
    return result;
  } catch (err) {
    console.error("❌ Failed to save document content:", err);
    throw err;
  }
}

/**
 * Get document basic info
 * @param {string} docId Document ID
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
    console.error("❌ Failed to get document info:", err);
    throw err;
  }
}

/**
 * Update document title
 * @param {string} docId Document ID
 * @param {string} title New title
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

    console.log(`✅ Updated document ${docId} title successfully: ${title}`);
    return result;
  } catch (err) {
    console.error("❌ Failed to update document title:", err);
    throw err;
  }
}

/**
 * Delete document
 * @param {string} docId Document ID
 */
export async function deleteDocument(docId) {
  try {
    await connectMongo();

    const result = await Doc.deleteOne({ docId });
    console.log(`✅ Deleted document ${docId} successfully`);
    return result;
  } catch (err) {
    console.error("❌ Failed to delete document:", err);
    throw err;
  }
}
