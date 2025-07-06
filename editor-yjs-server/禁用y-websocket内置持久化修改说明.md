# 禁用 y-websocket 内置持久化修改说明

## �� 问题描述

之前发现 MongoDB 中会自动创建 `o_documents` 集合，这是由 y-websocket 库的内置持久化机制造成的。

## 🔍 问题根源

### y-websocket 的默认行为
- `setupWSConnection` 函数检测到 MongoDB 连接时，会自动启用内置持久化
- 默认使用 `o_` 前缀 + `documents` = `o_documents` 集合
- 与我们自定义的 `persistence.js` 形成了双重持久化

### 之前的问题
```javascript
// 之前的代码 - 会创建 o_documents 集合
setupWSConnection(ws, req, { gc: true, doc: ydoc });
```

## ✅ 解决方案

### 修改后的代码
```javascript
// 修改后的代码 - 禁用内置持久化
setupWSConnection(ws, req, { 
  gc: true, 
  doc: ydoc,
  // 禁用内置持久化机制
  persistence: {
    provider: null,
    bindState: () => {},
    writeState: () => {}
  }
});
```

### 修改的关键点
1. **添加 persistence 配置**：明确禁用内置持久化
2. **保留垃圾回收**：`gc: true` 保持内存管理
3. **使用自定义持久化**：继续使用 `persistence.js` 保存到 `docs` 集合

## 📊 修改效果

### 修改前
- ✅ 自定义持久化：`persistence.js` → `docs` 集合
- ❌ 内置持久化：`y-websocket` → `o_documents` 集合（不需要）

### 修改后
- ✅ 自定义持久化：`persistence.js` → `docs` 集合
- ⚠️ 内置持久化：已禁用，不再创建 `o_documents` 集合

## 🚀 验证方法

### 1. 重启服务器
```bash
cd editor-yjs-server
npm start
```

### 2. 测试连接
- 打开前端应用
- 连接到任何文档
- 检查 MongoDB 是否还会创建新的 `o_documents` 集合

### 3. 检查日志
应该看到：
```
✅ WebSocket 连接已建立，使用自定义持久化 (禁用 o_documents 集合创建)
```

## 🔧 技术细节

### persistence 配置解释
```javascript
persistence: {
  provider: null,        // 不使用任何持久化提供者
  bindState: () => {},   // 空的状态绑定函数
  writeState: () => {}   // 空的状态写入函数
}
```

这个配置告诉 y-websocket：
- 不要使用内置的持久化机制
- 不要自动创建数据库集合
- 让我们的 `persistence.js` 完全负责持久化

## 📋 注意事项

1. **功能不受影响**：WebSocket 实时同步功能完全正常
2. **性能不受影响**：只是禁用了不需要的持久化
3. **数据安全**：我们的自定义持久化继续正常工作

## 🎯 预期结果

修改后，系统将：
- ✅ 继续使用 `docs` 集合存储文档
- ✅ 保持所有 WebSocket 实时同步功能
- ✅ 不再创建不需要的 `o_documents` 集合
- ✅ 避免双重持久化的资源浪费

这样就解决了 `o_documents` 集合被意外创建的问题！
