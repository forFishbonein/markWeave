const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:1234/api";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // 获取基础URL
  getBaseURL() {
    return this.baseURL;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem("token");

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || data.message || "请求失败");
      }

      return data;
    } catch (error) {
      console.error("API请求错误:", error);
      throw error;
    }
  }

  // 认证相关API
  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async getProfile() {
    return this.request("/auth/profile");
  }

  // 便捷方法，和 getProfile 功能相同
  async getCurrentUser() {
    return this.getProfile();
  }

  // 团队相关API
  async createTeam(teamData) {
    return this.request("/teams", {
      method: "POST",
      body: JSON.stringify(teamData),
    });
  }

  async getUserTeams() {
    return this.request("/teams");
  }

  async getTeamDetails(teamId) {
    return this.request(`/teams/${teamId}`);
  }

  async updateTeam(teamId, teamData) {
    return this.request(`/teams/${teamId}`, {
      method: "PUT",
      body: JSON.stringify(teamData),
    });
  }

  async inviteMember(teamId, inviteData) {
    return this.request(`/teams/${teamId}/invite`, {
      method: "POST",
      body: JSON.stringify(inviteData),
    });
  }

  async removeMember(teamId, memberId) {
    return this.request(`/teams/${teamId}/members/${memberId}`, {
      method: "DELETE",
    });
  }

  // 文档相关API
  async createDocument(documentData) {
    return this.request("/documents", {
      method: "POST",
      body: JSON.stringify(documentData),
    });
  }

  async getTeamDocuments(teamId) {
    return this.request(`/documents/team/${teamId}`);
  }

  async getDocumentDetails(docId) {
    return this.request(`/documents/${docId}`);
  }

  // 便捷方法，和 getDocumentDetails 功能相同
  async getDocument(docId) {
    return this.getDocumentDetails(docId);
  }

  async updateDocument(docId, documentData) {
    return this.request(`/documents/${docId}`, {
      method: "PUT",
      body: JSON.stringify(documentData),
    });
  }

  async deleteDocument(docId) {
    return this.request(`/documents/${docId}`, {
      method: "DELETE",
    });
  }

  // 文档内容相关API
  async getDocumentContent(docId) {
    return this.request(`/doc/${docId}`);
  }

  async saveDocumentContent(docId, content, userId, teamId) {
    return this.request(`/doc/${docId}`, {
      method: "PUT",
      body: JSON.stringify({ content, userId, teamId }),
    });
  }

  async updateDocumentTitle(docId, title) {
    return this.request(`/doc/${docId}/title`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }
}

const apiService = new ApiService();
export default apiService;
