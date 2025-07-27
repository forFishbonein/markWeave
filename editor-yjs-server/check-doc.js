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

async function checkDoc() {
  try {
    console.log("🔍 连接到MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB连接成功");

    const doc = await Doc.findOne({ docId: "crdt-performance-test-doc" });
    console.log("\n📊 数据库中的文档状态:", doc ? "存在" : "不存在");

    if (doc) {
      console.log("📄 文档内容长度:", JSON.stringify(doc.content).length);
      console.log("🕒 最后更新时间:", doc.lastUpdated);
      console.log("📝 文档标题:", doc.title);
      console.log("🔢 版本号:", doc.version);
    } else {
      console.log("❌ 文档不存在于数据库中");
    }

    // 检查docs集合中的所有文档
    const allDocs = await Doc.find({}).select(
      "docId title lastUpdated version"
    );
    console.log("\n📋 docs集合中的所有文档:");
    allDocs.forEach((d) => {
      console.log(
        `  - ${d.docId}: ${d.title} (v${d.version}, ${d.lastUpdated})`
      );
    });
  } catch (err) {
    console.error("❌ 检查失败:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkDoc();
