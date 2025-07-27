import mongoose from "mongoose";
import Doc from "./models/Doc.js";

const username = "markWeave";
const password = "eBkwPRfcdHHkdHYt";
const host = "8.130.52.237";
const port = "27017";
const dbName = "markweave";

const MONGODB_URI = `mongodb://${encodeURIComponent(
  username
)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;

async function testFrontendCache() {
  try {
    console.log("🔍 连接到MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB连接成功");

    // 1. 检查数据库中的文档
    const doc = await Doc.findOne({ docId: "crdt-performance-test-doc" });
    console.log("\n📊 数据库中的文档状态:", doc ? "存在" : "不存在");

    if (doc) {
      console.log("📄 文档内容长度:", JSON.stringify(doc.content).length);
      console.log("🕒 最后更新时间:", doc.lastUpdated);
    }

    // 2. 测试API响应
    console.log("\n🌐 测试API响应...");
    const response = await fetch(
      "http://localhost:1234/api/initial?docId=crdt-performance-test-doc"
    );
    if (response.ok) {
      const data = await response.json();
      console.log("✅ API响应成功");
      console.log("📄 API返回数据长度:", data.update ? data.update.length : 0);
    } else {
      console.log("❌ API响应失败:", response.status);
    }

    // 3. 检查所有相关文档
    const allDocs = await Doc.find({}).select(
      "docId title lastUpdated version"
    );
    console.log("\n📋 数据库中所有文档:");
    allDocs.forEach((d) => {
      console.log(
        `  - ${d.docId}: ${d.title} (v${d.version}, ${d.lastUpdated})`
      );
    });
  } catch (err) {
    console.error("❌ 测试失败:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testFrontendCache();
