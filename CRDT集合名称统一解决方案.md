# CRDT集合名称统一解决方案

## 🎯 问题描述

用户发现MongoDB中创建了新的`o_documents`集合，但希望：
- **CRDT文档**使用现有的`docs`集合中的`crdt-performance-test-doc`
- **OT文档**使用现有的`documents`集合中的`ot-performance-test-doc`

## 🔍 问题根源分析

### y-websocket的默认行为
- **y-websocket**使用默认的集合名称前缀`o_`
- 自动创建`o_documents`集合存储Yjs文档
- 没有直接的配置选项来指定集合名称

### 现有集合结构
- **docs集合**：存储CRDT文档（通过Doc模型）
- **documents集合**：存储OT文档（通过ShareDB）

## ✅ 解决方案

### 1. 修改CRDT持久化逻辑

在`editor-yjs-server/persistence.js`中添加特殊处理：

#### saveDocState函数增强
```javascript
export async function saveDocState(docId, ydoc, userId, teamId = null) {
  // 检查是否是CRDT性能测试文档，如果是，使用docs集合
  if (docId === 'crdt-performance-test-doc') {
    console.log(`📄 [CRDT] 保存性能测试文档到docs集合: ${docId}`);
    
    const result = await Doc.updateOne(
      { docId },
      {
        $set: {
          content: jsonContent,
          lastUpdated: new Date(),
        },
        $inc: { version: 1 },
        $setOnInsert: {
          ownerId: userId || null,
          teamId: teamId || null,
          participants: userId ? [{ userId, role: "owner" }] : [],
          createdAt: new Date(),
          title: "CRDT性能测试文档",
        },
      },
      { upsert: true }
    );
    
    console.log(`✅ [CRDT] 保存文档 ${docId} 到docs集合成功`);
    return result;
  }
  
  // 其他文档继续使用原来的逻辑...
}
```

#### loadDocState函数增强
```javascript
export async function loadDocState(docId, ydoc) {
  const doc = await Doc.findOne({ docId });
  
  if (!doc || !doc.content) {
    if (docId === 'crdt-performance-test-doc') {
      console.log(`ℹ️ [CRDT] 性能测试文档 ${docId} 尚无持久化状态，创建新文档`);
    } else {
      console.log(`ℹ️ 文档 ${docId} 尚无持久化状态，创建新文档`);
    }
    return false;
  }
  
  jsonToYjs(doc.content, ydoc);
  
  if (docId === 'crdt-performance-test-doc') {
    console.log(`✅ [CRDT] 从docs集合加载文档 ${docId} 成功`);
  } else {
    console.log(`✅ 加载文档 ${docId} 成功`);
  }
  return true;
}
```

### 2. OT文档已经正确配置

OT文档通过以下配置正确使用`documents`集合：
```javascript
// OTEditorWithMonitoring.jsx
docId="ot-performance-test-doc"
collection="documents"
```

## 📊 最终集合映射

| 算法类型 | 文档ID | 集合名称 | 存储方式 |
|---------|--------|----------|----------|
| CRDT | `crdt-performance-test-doc` | `docs` | Doc模型 (Mongoose) |
| OT | `ot-performance-test-doc` | `documents` | ShareDB |

## 🎯 实现效果

### 1. 避免创建新集合
- ✅ 不再创建`o_documents`集合
- ✅ 使用现有的`docs`和`documents`集合

### 2. 数据一致性
- ✅ CRDT性能测试文档存储在`docs`集合
- ✅ OT性能测试文档存储在`documents`集合
- ✅ 两个算法使用相同的文档ID命名风格

### 3. 日志清晰
- ✅ 特殊标记`[CRDT]`标识性能测试文档操作
- ✅ 清晰显示文档存储位置和状态

## 🔧 技术实现细节

### 文档ID检测机制
```javascript
if (docId === 'crdt-performance-test-doc') {
  // 使用docs集合的特殊处理
}
```

### 集合模型重用
- **CRDT**：重用现有的`Doc`模型（Mongoose）
- **OT**：继续使用ShareDB的`documents`集合

### 数据格式兼容
- 保持与现有Doc模型的完全兼容
- 支持JSON到Yjs的双向转换
- 维护版本控制和元数据

## 🎉 总结

通过在CRDT持久化层添加特殊的文档ID检测逻辑，成功实现了：

1. **集合统一**：使用现有集合而不创建新集合
2. **命名一致**：两个算法使用统一的文档ID风格
3. **功能完整**：保持所有原有功能不变
4. **日志清晰**：便于调试和监控

这个解决方案既满足了用户的需求，又保持了系统的整洁性和一致性。
