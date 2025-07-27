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

async function debugAPI() {
  try {
    console.log("🔍 连接到MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB连接成功");

    // 测试API响应
    console.log("\n🌐 测试API响应...");
    const response = await fetch(
      "http://localhost:1234/api/initial?docId=crdt-performance-test-doc"
    );
    if (response.ok) {
      const data = await response.json();
      console.log("✅ API响应成功");
      console.log("📄 完整API响应:", JSON.stringify(data, null, 2));
      console.log("📄 update字段长度:", data.update ? data.update.length : 0);
      console.log("📄 update字段内容:", data.update);

      // 解码base64数据
      if (data.update) {
        try {
          const decoded = Buffer.from(data.update, "base64");
          console.log("📄 解码后的数据长度:", decoded.length);
          console.log("📄 解码后的数据:", decoded);
        } catch (err) {
          console.log("❌ 解码失败:", err.message);
        }
      }
    } else {
      console.log("❌ API响应失败:", response.status);
    }
  } catch (err) {
    console.error("❌ 调试失败:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

debugAPI();
