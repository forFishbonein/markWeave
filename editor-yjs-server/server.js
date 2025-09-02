/*
 * @FilePath: server.js
 * @Author: Aron
 * @Date: 2025-03-04 19:18:16
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-09-03 04:40:05
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
// Add JSON body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

// API routes
app.use("/api", apiRoutes);

// Document content related API
app.get("/api/doc/:docId", async (req, res) => {
  const { docId } = req.params;

  try {
    const doc = await loadDocContent(docId);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Documentsdoes not exist",
      });
    }

    res.json({
      success: true,
      data: doc,
    });
  } catch (err) {
    console.error("Get documents failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get document",
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
      message: "Missing document content",
    });
  }

  try {
    await saveDocContent(docId, content, userId, teamId);

    res.json({
      success: true,
      message: "DocumentsSave successful",
    });
  } catch (err) {
    console.error("Saved documentfailed:", err);
    res.status(500).json({
      success: false,
      message: "Saved documentfailed",
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
      message: "Title cannot be empty",
    });
  }

  try {
    await updateDocumentTitle(docId, title.trim());

    res.json({
      success: true,
      message: "Title updated successfully",
    });
  } catch (err) {
    console.error("Failed to update title:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update title",
      error: err.message,
    });
  }
});

// CRDT sync related API endpoints
app.post("/api/doc", async (req, res) => {
  const { id, content } = req.body; // content is base64 encoded Yjs update

  if (!id || !content) {
    return res.status(400).json({ error: "Missing docId or update content" });
  }

  try {
    const ydoc = await getYDoc(id);
    const uint8 = Uint8Array.from(Buffer.from(content, "base64"));
    Y.applyUpdate(ydoc, uint8);
    // ⚡ Persist immediately to avoid data loss if server restarts during debounce period
    // await saveDocState(id, ydoc);
    // saveDocState will be automatically called in debounce
    res.json({ message: "Update applied" });
  } catch (err) {
    console.error("Error applying update:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/initial", async (req, res) => {
  const { docId } = req.query;

  if (!docId) {
    return res.status(400).json({ error: "Missing docId parameter" });
  }

  try {
    const ydoc = await getYDoc(docId);
    const stateBase64 = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
      "base64"
    );
    res.json({ docId, update: stateBase64 });
  } catch (err) {
    console.error("Failed to load initial document:", err);
    res.status(500).json({ error: err.message });
  }
});

// OT performance metrics API
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
      message: "OT server not started",
    });
  }
});

app.post("/api/ot/metrics/reset", (req, res) => {
  if (otServer) {
    otServer.resetMetrics();
    res.json({
      success: true,
      message: "OT performance metrics reset",
    });
  } else {
    res.status(503).json({
      success: false,
      message: "OT server not started",
    });
  }
});

// Error handling middleware
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

// Yjs document management
const docs = new Map();

async function getYDoc(roomName) {
  console.log("📄 Loading document:", roomName);

  if (docs.has(roomName)) {
    return docs.get(roomName);
  }

  const ydoc = new Y.Doc();

  // Load document state from database
  await loadDocState(roomName, ydoc);

  // Set up persistence (debounce handling) - shorten delay to avoid data loss
  const persist = debounce(
    async () => {
      try {
        await saveDocState(roomName, ydoc);
        console.log(`💾 Document ${roomName} auto-save successful`);
      } catch (err) {
        console.error(`❌ Document ${roomName} auto-save failed:`, err);
      }
    },
    500, // Merge updates within 500ms (faster response)
    { maxWait: 2000 } // Must save at least once every 2 seconds (more frequent saves)
  );

  ydoc.on("update", persist);
  docs.set(roomName, ydoc);

  return ydoc;
}

// Periodically force save all documents (prevent data loss from long periods without updates)
setInterval(async () => {
  if (docs.size > 0) {
    console.log(`⏰ Starting periodic save for ${docs.size} documents...`);
    for (const [docId, ydoc] of docs.entries()) {
      try {
        await saveDocState(docId, ydoc);
        console.log(`⏰ Periodic save for document ${docId} successful`);
      } catch (err) {
        console.error(`❌ Periodic save for document ${docId} failed:`, err);
      }
    }
    console.log(`✅ Periodic save completed`);
  }
}, 30000); // Execute every 30 seconds

// WebSocket handling
wss.on("connection", async (ws, req) => {
  try {
    const url = new URL(req.url, `ws://${req.headers.host}`);
    const roomName = url.pathname.slice(1) || "default-room";

    console.log("🔌 WebSocket connection:", roomName);

    const ydoc = await getYDoc(roomName);

    // 🔥 Disable y-websocket built-in persistence to avoid creating o_documents collection
    // We use our own persistence.js for persistence to docs collection
    setupWSConnection(ws, req, {
      gc: true,
      doc: ydoc,
      // Disable built-in persistence mechanism
      persistence: {
        provider: null,
        bindState: () => {},
        writeState: () => {},
      },
    });

    console.log(
      "✅ WebSocket connection established, using custom persistence (disabled o_documents collection creation)"
    );
  } catch (error) {
    console.error("❌ WebSocket connection error:", error);
    ws.close();
  }
});

// Initialize OT server
let otServer = null;

async function initializeOTServer() {
  try {
    otServer = new OTServer();
    await otServer.initialize();
    otServer.startWebSocketServer(1235); // OT server runs on port 1235
    console.log("✅ OT server startup successful");
  } catch (error) {
    console.error("❌ OT server startup failed:", error);
  }
}

const PORT = process.env.PORT || 1234;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server available at ws://localhost:${PORT}`);
  console.log(`🌐 API server available at http://localhost:${PORT}/api`);

  // Start OT server
  await initializeOTServer();
});

// --------------------------
// Actively write all document states to database before process exit
// --------------------------
async function flushAllDocs() {
  try {
    const docCount = docs.size;
    console.log(`💾 Persisting all in-memory ${docCount} Y.Doc instances ...`);

    let successCount = 0;
    let failCount = 0;

    for (const [docId, ydoc] of docs.entries()) {
      try {
        await saveDocState(docId, ydoc);
        successCount++;
        console.log(`✅ Exit save document ${docId} successful`);
      } catch (err) {
        failCount++;
        console.error(`❌ Exit save document ${docId} failed:`, err);
      }
    }

    console.log(
      `🎯 Persistence completed: successful ${successCount}/${docCount} documents, failed ${failCount}`
    );
  } catch (err) {
    console.error("❌ Failed to persist all documents:", err);
  }
}

// Trigger persistence before common exit signals (SIGINT Ctrl+C, SIGTERM) and abnormal process exit
["SIGINT", "SIGTERM", "beforeExit"].forEach((event) => {
  process.on(event, async () => {
    await flushAllDocs();
    if (event !== "beforeExit") process.exit(0);
  });
});
