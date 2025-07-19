# OT 富文本操作错误修复说明

## 🚨 问题描述

**执行 bold 等富文本操作时出现 "Error sanitizing op" 错误**

```
Error sanitizing op emitted from subscription documents ot-performance-test-doc {
  src: '2c83d752d5da9da9ec358a131b9c112a',
  seq: 33,
  v: 2336,
  op: Delta { ops: [ [Object], [Object], [Object], [Object] ] },
  c: 'documents',
  d: 'ot-performance-test-doc',
  m: undefined
} [Function (anonymous)]
❌ [OT SERVER] 提交操作失败: Error
```

## 🔍 问题根源

### 不正确的 Delta 操作格式

**错误的操作格式**（包含非标准属性）：

```javascript
deltaOps.push({
  retain: retainLength,
  attributes: { bold: true },
  // ❌ 这些属性不是标准Delta格式！
  multiWindow: true, // ShareDB无法识别
  timestamp: Date.now(), // ShareDB无法识别
});
```

**正确的 Delta 操作格式**：

```javascript
deltaOps.push({
  retain: retainLength,
  attributes: { bold: true }, // ✅ 只包含标准的attributes
});
```

### ShareDB rich-text 期望的标准格式

ShareDB rich-text 只识别以下标准的 Delta 操作：

#### 1. **插入操作**

```javascript
{ insert: "text", attributes: { bold: true, italic: true } }
```

#### 2. **保留操作**（用于格式变更）

```javascript
{ retain: 5, attributes: { bold: true } }  // 对5个字符添加粗体
```

#### 3. **删除操作**

```javascript
{ delete: 3 }  // 删除3个字符
```

#### 4. **任何额外的属性都会导致错误**

```javascript
// ❌ 错误：包含非标准属性
{ retain: 5, attributes: { bold: true }, multiWindow: true, timestamp: 123 }

// ✅ 正确：只包含标准属性
{ retain: 5, attributes: { bold: true } }
```

## ✅ 修复方案

### 修复 AddMarkStep（添加格式）

```javascript
// 修复前
deltaOps.push({
  retain: retainLength,
  attributes: attrs,
  // 多窗口同步标识
  multiWindow: true, // ❌ 非标准属性
  timestamp: Date.now(), // ❌ 非标准属性
});

// 修复后
deltaOps.push({
  retain: retainLength,
  attributes: attrs, // ✅ 只保留标准的attributes
});
```

### 修复 RemoveMarkStep（移除格式）

```javascript
// 修复前
deltaOps.push({
  retain: retainLength,
  attributes: attrs,
  // 多窗口同步标识
  multiWindow: true, // ❌ 非标准属性
  timestamp: Date.now(), // ❌ 非标准属性
});

// 修复后
deltaOps.push({
  retain: retainLength,
  attributes: attrs, // ✅ 只保留标准的attributes
});
```

## 🧪 验证方法

### 1. **测试 bold 操作**

1. 选中一段文字
2. 按 `Ctrl+B`（或 `Cmd+B`）添加粗体
3. 检查控制台是否还有错误

### 2. **测试 italic 操作**

1. 选中一段文字
2. 按 `Ctrl+I`（或 `Cmd+I`）添加斜体
3. 检查控制台是否还有错误

### 3. **检查操作格式**

控制台应该显示：

```
✅ 正确日志：
🔥 [OT] 处理步骤 0: { stepType: "AddMarkStep", from: 5, to: 10 }
🔍 [DEBUG] 准备提交的操作: {
  isArray: true,
  op: [{ retain: 5 }, { retain: 5, attributes: { bold: true } }]
}
✅ [OT] 格式添加操作提交成功

❌ 如果仍有错误：
Error sanitizing op emitted from subscription...
❌ [OT SERVER] 提交操作失败: Error
```

## 🎯 支持的富文本格式

### 当前支持的格式

```javascript
// 粗体
{ retain: 5, attributes: { bold: true } }

// 斜体
{ retain: 5, attributes: { italic: true } }

// 移除粗体
{ retain: 5, attributes: { bold: null } }

// 移除斜体
{ retain: 5, attributes: { italic: null } }

// 组合格式
{ insert: "text", attributes: { bold: true, italic: true } }
```

### 扩展其他格式

如果要支持更多格式，只需在 switch 语句中添加：

```javascript
switch (mark.type.name) {
  case "bold":
    attrs.bold = true;
    break;
  case "em":
    attrs.italic = true;
    break;
  case "underline":
    attrs.underline = true; // 新增下划线支持
    break;
  case "code":
    attrs.code = true; // 新增代码格式支持
    break;
  default:
    break;
}
```

## ⚠️ 重要提醒

1. **严格遵循 Delta 标准**：ShareDB rich-text 对操作格式要求非常严格
2. **不添加自定义属性**：任何非标准属性都会导致错误
3. **测试所有格式操作**：确保添加、移除格式都能正常工作
4. **检查组合格式**：同时应用多种格式（如粗体+斜体）

## 🚀 预期结果

修复后：

- ✅ **Bold 操作正常**：`Ctrl+B` 可以正确添加/移除粗体
- ✅ **Italic 操作正常**：`Ctrl+I` 可以正确添加/移除斜体
- ✅ **多窗口同步**：富文本格式在多个窗口间正确同步
- ✅ **无错误日志**：不再出现 "Error sanitizing op" 错误

核心原则：**只发送 ShareDB 能够理解的标准 Delta 操作格式**！
