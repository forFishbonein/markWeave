# 诊断文档ID问题

## 🔍 问题分析

你遇到的问题是应用仍在创建`comparison-crdt-doc`文档，但代码中已经修改为使用`crdt-performance-test-doc`。

## 📋 可能的原因

### 1. 浏览器缓存问题
- **问题**：浏览器缓存了旧的JavaScript代码
- **解决方案**：强制刷新浏览器

### 2. 应用未重启
- **问题**：开发服务器还在运行旧版本代码
- **解决方案**：重启开发服务器

### 3. WebSocket连接残留
- **问题**：旧的WebSocket连接还在使用旧的docId
- **解决方案**：重启后端服务器

### 4. 多个页面同时打开
- **问题**：有其他页面/标签页还在使用旧的docId
- **解决方案**：关闭所有相关页面

## 🛠️ 解决步骤

### 步骤1：确认代码修改
```bash
# 检查AlgorithmComparisonPage.jsx中的docId
grep -n "docId=" src/components/AlgorithmComparison/AlgorithmComparisonPage.jsx
```

### 步骤2：清理缓存
```bash
# 清理构建缓存
rm -rf node_modules/.cache
rm -rf build

# 重新构建
npm run build
```

### 步骤3：重启所有服务
```bash
# 重启前端开发服务器
# 在mark-weave-editor目录下
npm start

# 重启Yjs服务器
# 在editor-yjs-server目录下
npm start

# 重启OT服务器
# 在editor-yjs-server目录下
node otServer.js
```

### 步骤4：清理浏览器
- 关闭所有相关的浏览器标签页
- 清理浏览器缓存（Ctrl+Shift+Delete）
- 或者使用无痕模式打开应用

## 🔍 验证修改是否生效

### 检查当前代码状态
```bash
# 确认CRDT编辑器的docId
grep -A 3 -B 3 "crdt-performance-test-doc" src/components/AlgorithmComparison/AlgorithmComparisonPage.jsx

# 确认OT编辑器的docId
grep -A 3 -B 3 "ot-performance-test-doc" src/components/AlgorithmComparison/AlgorithmComparisonPage.jsx
```

### 预期结果
应该看到：
```javascript
<YjsEditorWithMonitoring
  ref={crdtRef}
  docId="crdt-performance-test-doc"
  title="CRDT 性能测试"
  showMetrics={false}
  onMetricsUpdate={setCrdtMetrics}
/>

<OTEditorWithMonitoring
  ref={otRef}
  docId="ot-performance-test-doc"
  collection="documents"
  title="OT 性能测试"
  showMetrics={false}
  onMetricsUpdate={setOtMetrics}
/>
```

## 🎯 测试验证

### 1. 打开对比页面
- 访问 `/algorithm-comparison-lab`
- 检查浏览器开发者工具的Network标签
- 观察WebSocket连接使用的docId

### 2. 检查数据库
- 查看MongoDB中创建的文档
- 确认是否还有新的`comparison-crdt-doc`创建

### 3. 检查日志
- 查看前端控制台日志
- 查看后端服务器日志
- 确认使用的docId

## 🚨 如果问题仍然存在

### 可能的其他原因
1. **硬编码的docId**：某个地方可能有硬编码的旧docId
2. **配置文件**：检查是否有配置文件定义了docId
3. **环境变量**：检查是否有环境变量影响docId
4. **第三方缓存**：检查是否有代理或CDN缓存

### 深度排查
```bash
# 搜索所有可能的comparison-crdt-doc引用
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "comparison-crdt-doc"

# 搜索所有可能的comparison相关引用
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs grep -n "comparison.*doc"
```

## 💡 建议的立即行动

1. **立即重启所有服务**：
   - 停止所有正在运行的开发服务器
   - 重新启动前端、Yjs服务器、OT服务器

2. **清理浏览器状态**：
   - 关闭所有浏览器标签页
   - 清理浏览器缓存
   - 使用无痕模式测试

3. **验证修改**：
   - 确认代码中确实使用了新的docId
   - 检查Network标签中的WebSocket连接
   - 观察数据库中的文档创建

4. **监控日志**：
   - 观察前端控制台日志
   - 观察后端服务器日志
   - 确认使用的docId是否正确

## 📞 如果仍有问题

如果按照上述步骤操作后问题仍然存在，请提供：
1. 浏览器开发者工具的Network截图
2. 前端控制台的日志
3. 后端服务器的日志
4. MongoDB中的文档列表

这样我们可以进一步诊断问题的根源。

**记住：最关键的是重启所有服务并清理浏览器缓存！**
