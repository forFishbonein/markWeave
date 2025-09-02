// Debug tool: for testing API connection
import apiService from "../services/api";

export const testApiConnection = async () => {
  console.log("🔍 Starting API connection test...");

  try {
    // Test basic API connection
    const response = await fetch(apiService.getBaseURL() + "/api/test", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("✅ API server connection normal");
    } else {
      console.log("❌ API server connection failed:", response.status);
    }
  } catch (error) {
    console.log("❌ API connection error:", error.message);
    console.log("💡 Please check:");
    console.log(
      "   1. Backend service started (npm start in editor-yjs-server directory)"
    );
    console.log("   2. Port is correct (default 3001)");
    console.log("   3. CORS settings are correct");
  }
};

export const debugAPI = {
  // Test user authentication
  async testAuth() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("❌ Authentication token not found");
        return;
      }

      const user = await apiService.getCurrentUser();
      console.log("✅ User authentication successful:", user);
    } catch (error) {
      console.log("❌ User authentication failed:", error.message);
    }
  },

  // Test team API
  async testTeams() {
    try {
      const teams = await apiService.getUserTeams();
      console.log("✅ Team list:", teams);
    } catch (error) {
      console.log("❌ Get teams failed:", error.message);
    }
  },

  // Test Documents API
  async testDocuments(teamId) {
    try {
      const docs = await apiService.getTeamDocuments(teamId);
      console.log("✅ Document list:", docs);
    } catch (error) {
      console.log("❌ Get documents failed:", error.message);
    }
  },
};

// Available in browser console:
// import { testApiConnection, debugAPI } from './utils/debug'
// testApiConnection()
// debugAPI.testAuth()
// debugAPI.testTeams()
