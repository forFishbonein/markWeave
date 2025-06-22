# MarkWeave 协作编辑器

一个基于 React 和 Node.js 的实时协作文档编辑系统，支持多人同时编辑、团队管理和文档权限控制。

## 技术栈

### 前端

- **React 18** - 用户界面框架
- **Ant Design** - UI 组件库
- **React Router** - 路由管理
- **Yjs** - CRDT 协作同步

### 后端

- **Node.js + Express** - Web 服务器
- **MongoDB** - 数据库存储
- **WebSocket** - 实时通信
- **JWT** - 用户认证
- **Yjs** - 文档同步

## 项目结构

```
markWeave/
├── mark-weave-editor/          # 前端React应用
│   ├── src/
│   │   ├── components/         # React组件
│   │   ├── contexts/           # React Context
│   │   ├── services/           # API服务
│   │   └── hooks/              # 自定义Hooks
│   └── package.json
├── editor-yjs-server/          # 后端Node.js服务
│   ├── controllers/            # 控制器
│   ├── models/                 # 数据模型
│   ├── routes/                 # API路由
│   ├── middleware/             # 中间件
│   ├── services/               # 服务层
│   ├── utils/                  # 工具函数
│   └── server.js               # 服务器入口
└── README.md
```

## 快速开始

### 1. 环境配置

确保您已安装：

- Node.js (建议 v18+)
- MongoDB 数据库访问权限

### 2. 后端设置

```bash
# 进入后端目录
cd editor-yjs-server

# 安装依赖
npm install

# 创建环境变量文件
touch .env
```

在 `.env` 文件中添加以下配置：

```env
PORT=1234
JWT_SECRET=507f33ced828ca054b5203e38780a7216dc67f51d16beab04dd95b1a361aea81ad794c69f10275332276898369caf1f6e86e3cfb4946bcd3afc1f388b3128c69

DB_USERNAME=markWeave
DB_PASSWORD=eBkwPRfcdHHkdHYt
DB_HOST=8.130.52.237
DB_PORT=27017
DB_NAME=markweave
```

### 3. 前端设置

```bash
# 进入前端目录
cd mark-weave-editor

# 安装依赖
npm install

# 创建环境变量文件
touch .env
```

在 `.env` 文件中添加以下配置：

```env
REACT_APP_API_URL=http://localhost:1234/api
REACT_APP_WS_URL=ws://localhost:1234
```

### 4. 启动应用

**启动后端服务：**

```bash
cd editor-yjs-server
npm start
# 或者使用开发模式（自动重启）
npm run dev
```

**启动前端应用：**

```bash
cd mark-weave-editor
npm start
```

### 5. 访问应用

- 前端应用：http://localhost:3000
- 后端 API：http://localhost:1234/api
- WebSocket：ws://localhost:1234

## 功能特性

### ✅ 已实现功能

1. **用户系统**

   - 用户注册/登录
   - JWT 身份验证
   - 用户资料管理

2. **团队管理**

   - 创建团队
   - 团队成员管理
   - 权限控制（所有者/管理员/成员）

3. **文档管理**

   - 创建文档
   - 文档列表
   - 文档权限管理

4. **实时协作**
   - WebSocket 连接
   - Yjs CRDT 同步
   - 多人在线状态

### 🚧 开发中功能

1. **文档编辑器**

   - ProseMirror 集成
   - 富文本编辑
   - 协作光标

2. **团队协作**
   - 成员邀请
   - 文档分享
   - 评论系统

## API 文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户信息

### 团队管理

- `POST /api/teams` - 创建团队
- `GET /api/teams` - 获取用户团队
- `GET /api/teams/:teamId` - 获取团队详情
- `PUT /api/teams/:teamId` - 更新团队信息
- `POST /api/teams/:teamId/invites` - 邀请成员
- `DELETE /api/teams/:teamId/members/:memberId` - 移除成员

### 文档管理

- `POST /api/documents` - 创建文档
- `GET /api/documents/team/:teamId` - 获取团队文档
- `GET /api/documents/:docId` - 获取文档详情
- `PUT /api/documents/:docId` - 更新文档
- `DELETE /api/documents/:docId` - 删除文档

## 开发指南

### 添加新的 API 端点

1. 在 `editor-yjs-server/routes/` 中添加路由
2. 在 `editor-yjs-server/controllers/` 中添加控制器逻辑
3. 在 `editor-yjs-server/services/` 中添加业务逻辑
4. 在前端 `mark-weave-editor/src/services/api.js` 中添加 API 调用

### 添加新的 React 组件

1. 在 `mark-weave-editor/src/components/` 中创建组件
2. 使用 `useAuth` Hook 获取用户状态
3. 使用 `apiService` 进行 API 调用

## 数据库设计

### User 模型

```javascript
{
  email: String,
  username: String,
  password: String,
  avatar: String,
  createdAt: Date,
  lastLogin: Date
}
```

### Team 模型

```javascript
{
  name: String,
  description: String,
  ownerId: ObjectId,
  members: [{
    userId: ObjectId,
    role: String,
    joinedAt: Date
  }],
  createdAt: Date
}
```

### Doc 模型

```javascript
{
  docId: String,
  title: String,
  teamId: ObjectId,
  ownerId: ObjectId,
  participants: [{
    userId: ObjectId,
    role: String
  }],
  state: Buffer,
  version: Number,
  createdAt: Date,
  lastUpdated: Date
}
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱：your-email@example.com
- GitHub Issues：[项目 Issues 页面](https://github.com/your-username/markWeave/issues)

---

**MarkWeave** - 让协作编辑变得简单高效！
