# 并发插入测试结果导出

本项目提供了便捷的方式来运行现有的 `tests/crdt/concurrent.test.js` 文件中的并发插入测试，并将结果保存到Markdown文件中。

## 使用方法

### 方法1：使用npm脚本（推荐）

```bash
# 运行 tests/crdt/concurrent.test.js 中的并发插入测试并保存结果
npm run test:concurrent:save
```

### 方法2：使用shell脚本

```bash
# 运行shell脚本
./run-concurrent-tests.sh
```

### 方法3：只运行测试（不保存）

```bash
# 只运行 tests/crdt/concurrent.test.js 中的并发插入测试套件
npm run test:concurrent
```

### 方法4：手动保存

```bash
# 手动运行并保存到指定文件
npm run test:concurrent > my-test-results.md 2>&1
```

## 测试源文件

- **测试文件**: `tests/crdt/concurrent.test.js`
- **测试套件**: `并发插入完整测试套件`
- **运行命令**: `npm run test:crdt -- --testNamePattern="并发插入完整测试套件"`

## 输出文件

- **位置**: `test-results/` 目录
- **命名格式**: `concurrent-test-YYYY-MM-DDTHH-MM-SS.md`
- **内容包括**:
  - 完整的测试输出（来自 `tests/crdt/concurrent.test.js`）
  - 测试分析和总结
  - 关键修复验证状态

## 测试套件内容

`tests/crdt/concurrent.test.js` 中的"并发插入完整测试套件"包含以下8个测试用例：

1. **基础并发插入** - 两客户端开头同时插入
2. **中间位置并发插入** - 在指定字符后同时插入 ✅ **核心修复验证**
3. **多字符并发插入** - 使用insertText
4. **三客户端并发插入** - 复杂并发场景
5. **连续并发插入** - 模拟快速输入
6. **混合操作并发** - 插入+删除+格式化
7. **边界情况** - 空文档并发插入
8. **时间戳分析** - 验证排序规则

## 关键修复验证

这些测试特别验证了以下关键修复：

- ✅ 字符正确插入在afterId指定位置（而不是文档末尾）
- ✅ 时间戳排序正常工作（后插入的排在后面）
- ✅ 并发插入行为一致且可预测
- ✅ 客户端隔离机制正常工作

## 示例输出

```
🧪 开始运行并发插入测试套件...
📝 结果将保存到: test-results/concurrent-test-2025-07-12T22-16-41.md

[运行 tests/crdt/concurrent.test.js 测试过程...]

==================================================
✅ 测试完成！
📄 结果已保存到: test-results/concurrent-test-2025-07-12T22-16-41.md
📊 文件大小: 23.18 KB
📝 测试的是现有文件: tests/crdt/concurrent.test.js
```

## 文件结构

```
mark-weave-editor/
├── tests/crdt/
│   └── concurrent.test.js          # 源测试文件（被运行的测试）
├── test-results/                   # 测试结果输出目录
│   └── concurrent-test-*.md        # 生成的测试结果文件
├── save-concurrent-tests.js        # Node.js测试运行脚本
├── run-concurrent-tests.sh         # Shell测试运行脚本
└── package.json                    # 包含npm脚本配置
```

## 核心修复展示

生成的报告将展示关键修复验证：

```markdown
### 重要结果摘要
✅ **核心问题已修复**: 字符现在正确插入在下划线后，
格式为 `start_XYend` 而不是之前错误的 `start_endXY`
```

## 故障排除

如果遇到问题：

1. 确保所有依赖已安装：`npm install`
2. 确保现有测试文件存在：`ls tests/crdt/concurrent.test.js`
3. 确保测试环境正常：`npm run test:crdt`
4. 检查权限：`chmod +x run-concurrent-tests.sh`
5. 查看详细错误：添加 `--verbose` 参数