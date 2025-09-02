# MarkWeave Collaborative Editor

A real-time collaborative document editing system based on React and Node.js, supporting multi-user simultaneous editing, team management, and document permission control. This project implements both CRDT (Yjs) and OT (ShareDB) collaborative algorithms, providing comprehensive performance comparison and testing systems.

## 🌟 Core Features

- **Dual Algorithm Support**: Supports both CRDT (Yjs) and OT (ShareDB) collaborative algorithms
- **Real-time Collaboration**: Multi-user real-time editing with automatic conflict resolution
- **Performance Monitoring**: Built-in performance monitoring system supporting latency, bandwidth, operation frequency and other metrics
- **Benchmark Testing**: Complete automated benchmark testing suite
- **Team Management**: Complete user, team, and document permission management
- **Rich Text Editing**: Professional rich text editor based on ProseMirror

## Technology Stack

### Frontend

- **React 18** - User interface framework
- **Ant Design** - UI component library
- **React Router** - Route management
- **ProseMirror** - Rich text editor core
- **Yjs** - CRDT collaborative synchronization
- **ShareDB** - OT collaborative synchronization
- **Playwright** - Automated testing and benchmarking

### Backend

- **Node.js + Express** - Web server
- **MongoDB** - Database storage
- **WebSocket** - Real-time communication
- **JWT** - User authentication
- **Yjs** - CRDT document synchronization
- **ShareDB** - OT document synchronization

## System Architecture

### Overall Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 React    │    │   后端 Node.js  │    │   数据存储      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 编辑器组件  │ │    │ │ API 服务器  │ │    │ │  MongoDB    │ │
│ │ (ProseMirror)│ │◄──►│ │ (Express)   │ │◄──►│ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │                 │
│ │ CRDT/OT     │ │    │ │ WebSocket   │ │    │                 │
│ │ 同步引擎    │ │◄──►│ │ 服务器      │ │    │                 │
│ └─────────────┘ │    │ └─────────────┘ │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Collaborative Algorithm Architecture

#### CRDT (Yjs) Implementation

- **Data Model**: Dual sequence model (ychars + yformatOps)
- **Conflict Resolution**: Remove-wins, Last-writer-wins, Format stacking
- **Synchronization Mechanism**: WebSocket + State vector synchronization

#### OT (ShareDB) Implementation

- **Data Model**: Delta operation sequence
- **Conflict Resolution**: Operational Transformation
- **Synchronization Mechanism**: WebSocket + Operation sequence synchronization

## Project Structure

```
markWeave/
├── mark-weave-editor/              # 前端React应用
│   ├── src/
│   │   ├── components/             # React组件
│   │   │   ├── AlgorithmComparison/    # 算法对比组件
│   │   │   ├── DocumentList/           # 文档列表组件
│   │   │   ├── EditorPage/             # 编辑器页面组件
│   │   │   └── ...
│   │   ├── contexts/               # React Context
│   │   ├── crdt/                   # CRDT核心实现
│   │   │   ├── crdtActions.js          # CRDT操作定义
│   │   │   ├── crdtUtils.js            # CRDT工具函数
│   │   │   ├── crdtSync.js             # CRDT同步逻辑
│   │   │   └── index.js                # CRDT入口
│   │   ├── hooks/                  # 自定义Hooks
│   │   │   ├── useYjsEditor.js         # Yjs编辑器Hook
│   │   │   └── useOTEditor.js          # OT编辑器Hook
│   │   ├── services/               # API服务
│   │   ├── utils/                  # 工具函数
│   │   │   ├── YjsPerformanceMonitor.js    # Yjs性能监控
│   │   │   ├── otPerformanceMonitor.js     # OT性能监控
│   │   │   └── benchmarkApi.js             # 基准测试API
│   │   └── plugins/                # ProseMirror插件
│   ├── tests/                      # 测试文件
│   │   ├── crdt/                       # CRDT算法测试
│   │   ├── scripts/                    # 测试脚本
│   │   └── test-results/               # 测试结果
│   ├── benchmark/                  # 基准测试
│   │   ├── scenarios/                  # 测试场景
│   │   └── results/                    # 基准测试结果
│   └── package.json
├── editor-yjs-server/              # 后端Node.js服务
│   ├── controllers/                # 控制器
│   ├── models/                     # 数据模型
│   ├── routes/                     # API路由
│   ├── middleware/                 # 中间件
│   ├── services/                   # 服务层
│   │   ├── otServer.js                 # OT服务器实现
│   │   └── emailService.js             # 邮件服务
│   ├── utils/                      # 工具函数
│   ├── persistence.js              # 数据持久化
│   └── server.js                   # 服务器入口
└── README.md
```

## Quick Start

### 1. Environment Setup

Ensure you have installed:

- Node.js (recommended v18+)
- MongoDB database access
- Chrome/Chromium browser (for benchmarking)

### 2. Backend Setup

```bash
# Enter backend directory
cd editor-yjs-server

# Install dependencies
npm install

# Create environment variable file
touch .env
```

Add the following configuration to the `.env` file:

```env
PORT=1234
JWT_SECRET=507f33ced828ca054b5203e38780a7216dc67f51d16beab04dd95b1a361aea81ad794c69f10275332276898369caf1f6e86e3cfb4946bcd3afc1f388b3128c69

# Database configuration
DB_USERNAME=markWeave
DB_PASSWORD=eBkwPRfcdHHkdHYt
DB_HOST=8.130.52.237
DB_PORT=27017
DB_NAME=markweave

# Email service configuration (optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Frontend Setup

```bash
# Enter frontend directory
cd mark-weave-editor

# Install dependencies
npm install

# Create environment variable file
touch .env
```

Add the following configuration to the `.env` file:

```env
REACT_APP_API_URL=http://localhost:1234/api
REACT_APP_WS_URL=ws://localhost:1234
REACT_APP_OT_WS_URL=ws://localhost:1235
```

### 4. Start Applications

**Start Backend Service:**

```bash
cd editor-yjs-server
npm start
# Or use development mode (auto-restart)
npm run dev
```

Backend service will start at:

- API Server: http://localhost:1234/api
- Yjs WebSocket: ws://localhost:1234
- OT WebSocket: ws://localhost:1235

**Start Frontend Application:**

```bash
cd mark-weave-editor
npm start
```

Frontend application will start at: http://localhost:3000

### 5. Access Applications

- **Main Application**: http://localhost:3000
- **CRDT Performance Test**: http://localhost:3000/performance-lab-crdt
- **OT Performance Test**: http://localhost:3000/performance-lab-ot
- **Backend API**: http://localhost:1234/api

## Testing System

### CRDT Algorithm Testing

```bash
cd mark-weave-editor

# Run all CRDT tests
npm run test:crdt

# Run and save test results
npm run test:save

# Run and generate clean test report
npm run test:clean

# Run concurrent tests and save results
npm run test:concurrent:save
```

### Test Suite Description

1. **Basic Function Tests** (`tests/crdt/`)

   - `benchmark.test.js` - Performance benchmark test
   - `concurrent.test.js` - Concurrent operation test (17 test cases)
   - `deterministic.test.js` - Deterministic convergence test
   - `fuzz.test.js` - Randomized consistency test (6 test cases)
   - `multiMark.test.js` - Multi-format stacking test (7 test cases)
   - `removeWins.test.js` - Remove-wins strategy test

2. **Test Result Management**
   - Test results are saved in the `tests/test-results/` directory
   - Supports detailed logs and summary reports
   - Automatically generates timestamped filenames

## Benchmarking System

### Automated Benchmarking

Benchmarking uses Playwright for automated browser testing, simulating real-user collaborative scenarios.

```bash
cd mark-weave-editor

# Install Playwright (first run)
npx playwright install

# Run CRDT benchmark
cd benchmark/scenarios
node crdt_dual_user.js [benchmark1|benchmark2|benchmark3|benchmark4|all]

# Run OT benchmark
node ot_dual_user.js [benchmark1|benchmark2|benchmark3|benchmark4|all]

# Run multi-benchmark analysis
cd ..
node runMultiBenchmarkAnalysis.js
```

### Benchmarking Scenarios

1. **benchmark1**: Basic concurrent input test

   - Two users simultaneously input simple text
   - Test core conflict resolution capabilities

2. **benchmark2**: Long text collaboration test

   - Continuous long text input
   - Test sustained performance and stability

3. **benchmark3**: Rich text format collaboration test

   - Different users insert text and apply formats to the same area
   - Test format conflict resolution

4. **benchmark4**: Format range overlap test
   - Two users apply the same format to overlapping selections
   - Test complex format merging logic

### Performance Metrics

System monitors the following performance metrics:

- **Latency Metrics**: End-to-end latency, operation latency, network latency
- **Bandwidth Metrics**: Sent/received bytes, message count
- **Operation Metrics**: Operation frequency, key press frequency, document update frequency
- **Stability Metrics**: Connection status, error rate, synchronization success rate

## System Implementation Architecture

### Collaborative Algorithm Implementation

#### CRDT (Yjs) Implementation Details

1. **Data Model** (`src/crdt/index.js`)

   ```javascript
   // Dual sequence model
   const ydoc = new Y.Doc();
   const ychars = ydoc.getArray("_ychars"); // Character sequence
   const yformatOps = ydoc.getArray("_yformatOps"); // Format operation sequence
   ```

2. **Core Operations** (`src/crdt/crdtActions.js`)

   - `insertChar()` - Character insertion operation
   - `insertText()` - Batch text insertion
   - `deleteChars()` - Character deletion (tombstone)
   - `addBold()`, `removeBold()` - Format operations
   - `addItalic()`, `removeItalic()` - Italic operation

3. **Conflict Resolution Strategy** (`src/crdt/crdtUtils.js`)

   - **Remove-wins**: Deletion operations take precedence over format operations
   - **Last-writer-wins**: Deterministic conflict resolution based on timestamp
   - **Format stacking**: Heterogeneous format stacking, homogeneous format merging
   - **Anchor semantics**: Stable character ID anchors

4. **Synchronization Mechanism** (`src/crdt/crdtSync.js`)
   - Bidirectional synchronization: ProseMirror ↔ Yjs
   - Debounced persistence: Merge updates within 500ms
   - WebSocket real-time synchronization

#### OT (ShareDB) Implementation Details

1. **Data Model** (`src/hooks/useOTEditor.js`)

   ```javascript
   // Delta operation sequence
   const doc = connection.get("documents", docId);
   doc.subscribe(); // Subscribe to document changes
   ```

2. **Operational Transformation** (`services/otServer.js`)

   - Delta operation format
   - Operation serialization and deserialization
   - Automatic operational transformation and conflict resolution

3. **Synchronization Mechanism**
   - Operation-based synchronization
   - Real-time operation broadcast
   - State consistency guarantee

### Performance Monitoring System

#### Yjs Performance Monitoring (`src/utils/YjsPerformanceMonitor.js`)

- WebSocket message interception
- End-to-end latency measurement
- Document update frequency statistics
- Memory usage monitoring

#### OT Performance Monitoring (`src/utils/otPerformanceMonitor.js`)

- ShareDB operation monitoring
- Network latency measurement
- Operation frequency statistics
- Connection status monitoring

### Editor Integration

#### ProseMirror Integration

- **Schema Definition** (`src/plugins/schema.js`): Document structure definition
- **Shortcut Mapping** (`src/plugins/keymap.js`): Formatting shortcuts
- **Utility Functions** (`src/plugins/utils.js`): Selection and format judgment

#### Bidirectional Data Binding

- **CRDT → ProseMirror**: `convertCRDTToProseMirrorDoc()`
- **ProseMirror → CRDT**: Transaction listening and operation conversion
- **Format Synchronization**: Mark state synchronized in real-time

## Functional Features

### ✅ Implemented Features

1. **User System**

   - User registration/login
   - JWT authentication
   - User profile management

2. **Team Management**

   - Create teams
   - Team member management
   - Email invitation system
   - Permission control (owner/admin/member)

3. **Document Management**

   - Create documents
   - Document list and search
   - Document permission management
   - Document version control

4. **Real-time Collaborative Editing**

   - CRDT (Yjs) collaborative algorithm
   - OT (ShareDB) collaborative algorithm
   - Multi-user online status display
   - Real-time cursor synchronization
   - Rich text format support (bold, italic, link)

5. **Performance Monitoring and Analysis**
   - Real-time performance metric collection
   - Algorithm performance comparison
   - Visual performance reports
   - Automated benchmark testing

### 🚧 Features Under Development

1. **Advanced Editing Features**

   - More rich text formats (underline, strikethrough, color)
   - Table support
   - Image insertion
   - Code block syntax highlighting

2. **Collaboration Enhancement**
   - Comment system
   - Version history
   - Conflict visualization
   - Collaborative session playback

## Running and Testing Guide

### Development Environment Startup

1. **Start Backend Service**

```bash
cd editor-yjs-server
npm install
npm start
```

2. **Start Frontend Application**

```bash
cd mark-weave-editor
npm install
npm start
```

3. **Verify Service Status**

- Backend health check: http://localhost:1234/api
- Frontend application: http://localhost:3000
- WebSocket connection: Check `window.provider` status in browser console

### Test Command Details

#### Unit Tests and Integration Tests

```bash
cd mark-weave-editor

# Run all tests
npm test

# Run CRDT-related tests
npm run test:crdt

# Run specific test files
npm test -- tests/crdt/concurrent.test.js

# Run specific test cases
npm test -- --testNamePattern="Basic concurrent insert"
```

#### Test Result Management

```bash
# Save detailed test results (JSON + text logs)
npm run test:save

# Generate clean test summary report
npm run test:clean

# Run concurrent tests and save Markdown report
npm run test:concurrent:save
```

Test result files:

- `tests/test-results/latest-clean-summary.txt` - Latest test summary
- `tests/test-results/latest-clean-test-log.txt` - Latest detailed logs
- `tests/test-results/clean-test-summary-[timestamp].txt` - Historical summary
- `tests/test-results/clean-test-log-[timestamp].txt` - Historical detailed logs

#### Benchmarking and Performance Evaluation

```bash
cd mark-weave-editor

# Ensure both backend and frontend services are running
# Then run the benchmark tests

# Single CRDT benchmark
cd benchmark/scenarios
node crdt_dual_user.js benchmark1  # Basic concurrent input
node crdt_dual_user.js benchmark2  # Long text collaboration
node crdt_dual_user.js benchmark3  # Rich text format collaboration
node crdt_dual_user.js benchmark4  # Format range overlap

# Run all CRDT benchmark tests
node crdt_dual_user.js all

# Single OT benchmark
node ot_dual_user.js benchmark1
node ot_dual_user.js benchmark2
node ot_dual_user.js benchmark3
node ot_dual_user.js benchmark4

# Run all OT benchmark tests
node ot_dual_user.js all

# Generate comparison analysis report
cd ..
node runMultiBenchmarkAnalysis.js
```

Benchmarking results:

- `benchmark/results/crdt_dual_user_*_result.json` - CRDT test results
- `benchmark/results/ot_dual_user_*_result.json` - OT test results
- `benchmark/results/crdt_benchmark_report.html` - CRDT visualization report
- `benchmark/results/ot_benchmark_report.html` - OT visualization report
- `benchmark/results/multi_benchmark_report.html` - Algorithm comparison report

### Performance Monitoring Usage

#### Real-time Performance Monitoring

1. **CRDT Performance Monitoring**

```javascript
// In browser console
window.getPerformanceStats(); // Get real-time performance data
window.forceInitCrdtMonitor(); // Force initialize monitor
```

2. **OT Performance Monitoring**

```javascript
// In browser console
window.otMonitor.getAggregatedMetrics(); // Get aggregated metrics
window.otMonitor.startMonitoring(window.otClient); // Start monitoring
```

#### Performance Data API

```bash
# Get OT server performance metrics
curl http://localhost:1234/api/ot/metrics

# Reset OT performance metrics
curl -X POST http://localhost:1234/api/ot/metrics/reset
```

## API Documentation

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user information

### Team Management

- `POST /api/teams` - Create team
- `GET /api/teams` - Get user teams
- `GET /api/teams/:teamId` - Get team details
- `PUT /api/teams/:teamId` - Update team information
- `POST /api/teams/:teamId/invites` - Invite members
- `DELETE /api/teams/:teamId/members/:memberId` - Remove member

### Document Management

- `POST /api/documents` - Create document
- `GET /api/documents/team/:teamId` - Get team documents
- `GET /api/documents/:docId` - Get document details
- `PUT /api/documents/:docId` - Update document
- `DELETE /api/documents/:docId` - Delete document

### Document Synchronization

- `GET /api/doc/:docId` - Get document content
- `PUT /api/doc/:docId` - Save document content
- `PUT /api/doc/:docId/title` - Update document title
- `POST /api/doc` - CRDT synchronization update
- `GET /api/initial` - Get initial document state

### Performance Monitoring

- `GET /api/ot/metrics` - Get OT performance metrics
- `POST /api/ot/metrics/reset` - Reset OT performance metrics

## Development Guide

### Add New API Endpoints

1. Add routes in `editor-yjs-server/routes/`
2. Add controller logic in `editor-yjs-server/controllers/`
3. Add business logic in `editor-yjs-server/services/`
4. Add API calls in `mark-weave-editor/src/services/api.js`

### Add New React Components

1. Create components in `mark-weave-editor/src/components/`
2. Use `useAuth` hook to get user status
3. Use `apiService` for API calls
4. Use `useYjsEditor` or `useOTEditor` for collaborative editing

### Extend CRDT Operations

1. Add new operations in `src/crdt/crdtActions.js`
2. Add utility functions in `src/crdt/crdtUtils.js`
3. Call new operations in editor components
4. Add corresponding test cases

### Performance Testing Development

1. Add new tests in `tests/crdt/`
2. Add new benchmark test scenarios in `benchmark/scenarios/`
3. Update performance monitors to support new metrics
4. Add new metrics processing in analysis scripts

## Database Design

### User Model

```javascript
{
  email: String,
  username: String,
  password: String,
  avatar: String,
  roles: [String],
  createdAt: Date,
  lastLogin: Date
}
```

### Team Model

```javascript
{
  name: String,
  description: String,
  ownerId: ObjectId,
  members: [{
    userId: ObjectId,
    role: String, // 'owner' | 'admin' | 'member'
    joinedAt: Date
  }],
  createdAt: Date
}
```

### Doc Model

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
  content: Object, // Document content in JSON format
  version: Number,
  createdAt: Date,
  lastUpdated: Date
}
```

### TeamInvite Model

```javascript
{
  teamId: ObjectId,
  inviterUserId: ObjectId,
  inviteeEmail: String,
  token: String,
  expiresAt: Date,
  status: String, // 'pending' | 'accepted' | 'expired'
  createdAt: Date
}
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**

   - Check if backend service is running
   - Confirm ports 1234 and 1235 are not in use
   - Check firewall settings

2. **Test Failed**

   - Ensure MongoDB connection is normal
   - Check test database permissions
   - Run `npm run test:clean` to see detailed errors

3. **Benchmark Failed**

   - Ensure Chrome/Chromium is installed
   - Run `npx playwright install` to install browser
   - Ensure both backend and frontend services are running

4. **Performance Monitoring No Data**
   - Check browser console for errors
   - Confirm `window.provider` and `window.otClient` are initialized
   - Manually call `window.forceInitCrdtMonitor()` or `window.otMonitor.startMonitoring()`

### Debugging Tips

1. **CRDT Debugging**

```javascript
// Browser console
console.log(window.ydoc.getArray("_ychars").toArray());
console.log(window.ydoc.getArray("_yformatOps").toArray());
```

2. **OT Debugging**

```javascript
// Browser console
console.log(window.otClient.doc.data);
console.log(window.otClient.connection.state);
```

3. **Performance Debugging**

```javascript
// View real-time performance data
setInterval(() => {
  console.log(window.getPerformanceStats());
}, 1000);
```

## Contributing Guidelines

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Use ESLint and Prettier for code formatting
- Follow React Hooks best practices
- Add corresponding test cases for new features
- Keep API documentation up-to-date

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details

## Contact

If you have any questions or suggestions, please contact us via:

- Email: your-email@example.com
- GitHub Issues: [Project Issues Page](https://github.com/your-username/markWeave/issues)

---

**MarkWeave** - Make collaborative editing simple and efficient!🚀

## Technical Paper Support

- CRDT vs OT algorithm performance comparison
- Real-time collaborative editing system architecture design
- Conflict resolution strategy implementation and validation
- Large-scale concurrent testing and performance evaluation
