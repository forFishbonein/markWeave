// 调试工具：用于测试API连接
import apiService from "../services/api";

export const testApiConnection = async () => {
  console.log("🔍 开始测试API连接...");

  try {
    // 测试基础API连接
    const response = await fetch(apiService.getBaseURL() + "/api/test", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("✅ API服务器连接正常");
    } else {
      console.log("❌ API服务器连接失败:", response.status);
    }
  } catch (error) {
    console.log("❌ API连接出错:", error.message);
    console.log("💡 请检查:");
    console.log("   1. 后端服务是否启动 (npm start 在 editor-yjs-server 目录)");
    console.log("   2. 端口是否正确 (默认3001)");
    console.log("   3. CORS设置是否正确");
  }
};

export const debugAPI = {
  // 测试用户认证
  async testAuth() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("❌ 没有找到认证token");
        return;
      }

      const user = await apiService.getCurrentUser();
      console.log("✅ 用户认证成功:", user);
    } catch (error) {
      console.log("❌ 用户认证失败:", error.message);
    }
  },

  // 测试团队API
  async testTeams() {
    try {
      const teams = await apiService.getUserTeams();
      console.log("✅ 团队列表:", teams);
    } catch (error) {
      console.log("❌ 获取团队失败:", error.message);
    }
  },

  // 测试文档API
  async testDocuments(teamId) {
    try {
      const docs = await apiService.getTeamDocuments(teamId);
      console.log("✅ 文档列表:", docs);
    } catch (error) {
      console.log("❌ 获取文档失败:", error.message);
    }
  },
};

// 在浏览器控制台中可以使用：
// import { testApiConnection, debugAPI } from './utils/debug'
// testApiConnection()
// debugAPI.testAuth()
// debugAPI.testTeams()
