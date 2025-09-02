const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:1234/api";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get base URL
  getBaseURL() {
    return this.baseURL;
  }

  // Common request method
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
        throw new Error(data.msg || data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("API request error:", error);
      throw error;
    }
  }

  // Authentication related API
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

  // Convenience method, same functionality as getProfile
  async getCurrentUser() {
    return this.getProfile();
  }

  // Team related API
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

  // Document related API
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

  // Convenience method, same functionality as getDocumentDetails
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

  // Document content related API
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
