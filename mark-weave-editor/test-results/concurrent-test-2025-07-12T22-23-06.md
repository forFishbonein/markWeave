# 并发插入完整测试套件结果

**测试时间**: 2025/7/13 06:23:06  
**测试文件**: `tests/crdt/concurrent.test.js`  
**测试命令**: `npm run test:crdt -- --testNamePattern="并发插入完整测试套件"`

---

## 测试输出

```

> mark-weave-editor@0.1.0 test:crdt
> jest --runInBand --verbose --testNamePattern=并发插入完整测试套件

  console.log
    📋 测试场景: 两客户端在文档开头同时插入不同字符

      at Object.log (tests/crdt/concurrent.test.js:47:13)

  console.log
    基础文档: hello

      at Object.log (tests/crdt/concurrent.test.js:48:13)

  console.log
    A插入字符 "A" opId: 1752358987349@client

      at Object.log (tests/crdt/concurrent.test.js:58:13)

  console.log
    B插入字符 "B" opId: 1752358987349@client

      at Object.log (tests/crdt/concurrent.test.js:59:13)

  console.log
    🎯 最终结果: "helloBA"

      at Object.log (tests/crdt/concurrent.test.js:68:13)

  console.log
    
    === 最终字符排序分析 ===

      at log (tests/crdt/concurrent.test.js:11:13)

  console.log
    [0] "h" → opId: 1752358987336_0@client (时间戳: 1752358987336_0)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [1] "e" → opId: 1752358987336_1@client (时间戳: 1752358987336_1)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [2] "l" → opId: 1752358987336_2@client (时间戳: 1752358987336_2)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [3] "l" → opId: 1752358987336_3@client (时间戳: 1752358987336_3)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [4] "o" → opId: 1752358987337_4@client (时间戳: 1752358987337_4)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [5] "B" → opId: 1752358987349@client (时间戳: 1752358987349)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [6] "A" → opId: 1752358987349@client (时间戳: 1752358987349)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    🔧 准备插入基础文档

      at Object.log (tests/crdt/concurrent.test.js:86:13)

  console.log
    🔧 A客户端ychars初始长度: 0

      at Object.log (tests/crdt/concurrent.test.js:87:13)

  console.log
    🔧 A插入后长度: 9

      at Object.log (tests/crdt/concurrent.test.js:89:13)

  console.log
    🔧 A快照: start_end

      at Object.log (tests/crdt/concurrent.test.js:90:13)

  console.log
    🔧 A的字符详情:

      at Object.log (tests/crdt/concurrent.test.js:94:15)

  console.log
      [0] "s" opId:1752358987356_0@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
      [1] "t" opId:1752358987356_1@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
      [2] "a" opId:1752358987356_2@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
      [3] "r" opId:1752358987356_3@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
      [4] "t" opId:1752358987356_4@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
      [5] "_" opId:1752358987356_5@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
      [6] "e" opId:1752358987356_6@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
      [7] "n" opId:1752358987356_7@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
      [8] "d" opId:1752358987356_8@client

      at log (tests/crdt/concurrent.test.js:98:17)
          at Array.forEach (<anonymous>)

  console.log
    🔧 B同步后长度: 9

      at Object.log (tests/crdt/concurrent.test.js:103:13)

  console.log
    🔧 B快照: start_end

      at Object.log (tests/crdt/concurrent.test.js:104:13)

  console.log
    📋 测试场景: 两客户端在下划线后同时插入

      at Object.log (tests/crdt/concurrent.test.js:106:13)

  console.log
    基础文档: start_end

      at Object.log (tests/crdt/concurrent.test.js:107:13)

  console.log
    🔍 调试字符查找:

      at Object.log (tests/crdt/concurrent.test.js:110:13)

  console.log
    字符数组长度: 9

      at Object.log (tests/crdt/concurrent.test.js:111:13)

  console.log
      [0] "s" opId:1752358987356_0@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
      [1] "t" opId:1752358987356_1@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
      [2] "a" opId:1752358987356_2@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
      [3] "r" opId:1752358987356_3@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
      [4] "t" opId:1752358987356_4@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
      [5] "_" opId:1752358987356_5@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
      [6] "e" opId:1752358987356_6@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
      [7] "n" opId:1752358987356_7@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
      [8] "d" opId:1752358987356_8@client deleted:false

      at log (tests/crdt/concurrent.test.js:117:15)
          at Array.forEach (<anonymous>)

  console.log
        检查字符: "s" (是下划线吗: false)

      at log (tests/crdt/concurrent.test.js:122:15)
          at Array.find (<anonymous>)

  console.log
        检查字符: "t" (是下划线吗: false)

      at log (tests/crdt/concurrent.test.js:122:15)
          at Array.find (<anonymous>)

  console.log
        检查字符: "a" (是下划线吗: false)

      at log (tests/crdt/concurrent.test.js:122:15)
          at Array.find (<anonymous>)

  console.log
        检查字符: "r" (是下划线吗: false)

      at log (tests/crdt/concurrent.test.js:122:15)
          at Array.find (<anonymous>)

  console.log
        检查字符: "t" (是下划线吗: false)

      at log (tests/crdt/concurrent.test.js:122:15)
          at Array.find (<anonymous>)

  console.log
        检查字符: "_" (是下划线吗: true)

      at log (tests/crdt/concurrent.test.js:122:15)
          at Array.find (<anonymous>)

  console.log
    下划线字符对象: <ref *2> YMap {
      _item: <ref *1> Item {
        id: ID { client: 1031799899, clock: 20 },
        length: 1,
        origin: ID { client: 1031799899, clock: 16 },
        left: Item {
          id: [ID],
          length: 1,
          origin: [ID],
          left: [Item],
          right: [Circular *1],
          rightOrigin: null,
          parent: [YArray],
          parentSub: null,
          redone: null,
          content: [ContentType],
          info: 10
        },
        right: Item {
          id: [ID],
          length: 1,
          origin: [ID],
          left: [Circular *1],
          right: [Item],
          rightOrigin: null,
          parent: [YArray],
          parentSub: null,
          redone: null,
          content: [ContentType],
          info: 10
        },
        rightOrigin: null,
        parent: YArray {
          _item: null,
          _map: Map(0) {},
          _start: [Item],
          doc: [Doc],
          _length: 9,
          _eH: [EventHandler],
          _dEH: [EventHandler],
          _searchMarker: [Array],
          _prelimContent: null
        },
        parentSub: null,
        redone: null,
        content: ContentType { type: [Circular *2] },
        info: 10
      },
      _map: Map(3) {
        'opId' => Item {
          id: [ID],
          length: 1,
          origin: null,
          left: null,
          right: null,
          rightOrigin: null,
          parent: [Circular *2],
          parentSub: 'opId',
          redone: null,
          content: [ContentAny],
          info: 2
        },
        'ch' => Item {
          id: [ID],
          length: 1,
          origin: null,
          left: null,
          right: null,
          rightOrigin: null,
          parent: [Circular *2],
          parentSub: 'ch',
          redone: null,
          content: [ContentAny],
          info: 2
        },
        'deleted' => Item {
          id: [ID],
          length: 1,
          origin: null,
          left: null,
          right: null,
          rightOrigin: null,
          parent: [Circular *2],
          parentSub: 'deleted',
          redone: null,
          content: [ContentAny],
          info: 2
        }
      },
      _start: null,
      doc: Doc {
        _observers: Map(2) { 'load' => [Set], 'sync' => [Set] },
        gc: true,
        gcFilter: [Function: gcFilter],
        clientID: 1031799899,
        guid: '9a776f86-6b58-4bf1-b749-1e9cfb9fda4d',
        collectionid: null,
        share: Map(2) { 'chars' => [YArray], 'formatOps' => [YArray] },
        store: StructStore {
          clients: [Map],
          pendingStructs: null,
          pendingDs: null
        },
        _transaction: null,
        _transactionCleanups: [],
        subdocs: Set(0) {},
        _item: null,
        shouldLoad: true,
        autoLoad: false,
        meta: null,
        isLoaded: false,
        isSynced: false,
        isDestroyed: false,
        whenLoaded: Promise { <pending> },
        whenSynced: Promise { <pending> }
      },
      _length: 0,
      _eH: EventHandler { l: [] },
      _dEH: EventHandler { l: [] },
      _searchMarker: null,
      _prelimContent: null
    }

      at Object.log (tests/crdt/concurrent.test.js:130:13)

  console.log
    下划线 "_" 的opId: 1752358987356_5@client

      at Object.log (tests/crdt/concurrent.test.js:131:13)

  console.log
    插入后各自状态:

      at Object.log (tests/crdt/concurrent.test.js:137:13)

  console.log
    A: start_Xend

      at Object.log (tests/crdt/concurrent.test.js:138:13)

  console.log
    B: start_Yend

      at Object.log (tests/crdt/concurrent.test.js:139:13)

  console.log
    🎯 最终结果: "start_XYend"

      at Object.log (tests/crdt/concurrent.test.js:148:13)

  console.log
    ✅ 字符正确插入在下划线后

      at Object.log (tests/crdt/concurrent.test.js:163:15)

  console.log
    📋 测试场景: 两客户端同时插入多个字符

      at Object.log (tests/crdt/concurrent.test.js:186:13)

  console.log
    基础文档: base

      at Object.log (tests/crdt/concurrent.test.js:187:13)

  console.log
    A插入后: AAAbase

      at Object.log (tests/crdt/concurrent.test.js:193:13)

  console.log
    B插入后: BBBbase

      at Object.log (tests/crdt/concurrent.test.js:194:13)

  console.log
    🎯 最终结果: "BBBAAAbase"

      at Object.log (tests/crdt/concurrent.test.js:203:13)

  console.log
    
    === 多字符插入结果分析 ===

      at log (tests/crdt/concurrent.test.js:11:13)

  console.log
    [0] "B" → opId: 1752358987371_0@client (时间戳: 1752358987371_0)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [1] "B" → opId: 1752358987371_1@client (时间戳: 1752358987371_1)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [2] "B" → opId: 1752358987371_2@client (时间戳: 1752358987371_2)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [3] "A" → opId: 1752358987371_0@client (时间戳: 1752358987371_0)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [4] "A" → opId: 1752358987371_1@client (时间戳: 1752358987371_1)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [5] "A" → opId: 1752358987371_2@client (时间戳: 1752358987371_2)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [6] "b" → opId: 1752358987370_0@client (时间戳: 1752358987370_0)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [7] "a" → opId: 1752358987370_1@client (时间戳: 1752358987370_1)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [8] "s" → opId: 1752358987370_2@client (时间戳: 1752358987370_2)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [9] "e" → opId: 1752358987370_3@client (时间戳: 1752358987370_3)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    📋 测试场景: 三客户端在开头同时插入

      at Object.log (tests/crdt/concurrent.test.js:226:13)

  console.log
    基础文档: start

      at Object.log (tests/crdt/concurrent.test.js:227:13)

  console.log
    插入后各客户端状态:

      at Object.log (tests/crdt/concurrent.test.js:234:13)

  console.log
    A: start1

      at Object.log (tests/crdt/concurrent.test.js:235:13)

  console.log
    B: start2

      at Object.log (tests/crdt/concurrent.test.js:236:13)

  console.log
    C: start3

      at Object.log (tests/crdt/concurrent.test.js:237:13)

  console.log
    🎯 最终结果:

      at Object.log (tests/crdt/concurrent.test.js:255:13)

  console.log
    A: start132

      at Object.log (tests/crdt/concurrent.test.js:256:13)

  console.log
    B: start132

      at Object.log (tests/crdt/concurrent.test.js:257:13)

  console.log
    C: start132

      at Object.log (tests/crdt/concurrent.test.js:258:13)

  console.log
    
    === 三客户端插入排序分析 ===

      at log (tests/crdt/concurrent.test.js:11:13)

  console.log
    [0] "s" → opId: 1752358987375_0@client (时间戳: 1752358987375_0)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [1] "t" → opId: 1752358987375_1@client (时间戳: 1752358987375_1)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [2] "a" → opId: 1752358987375_2@client (时间戳: 1752358987375_2)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [3] "r" → opId: 1752358987375_3@client (时间戳: 1752358987375_3)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [4] "t" → opId: 1752358987375_4@client (时间戳: 1752358987375_4)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [5] "1" → opId: 1752358987376@client (时间戳: 1752358987376)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [6] "3" → opId: 1752358987376@client (时间戳: 1752358987376)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [7] "2" → opId: 1752358987376@client (时间戳: 1752358987376)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    ✅ 字符插入在文档末尾（修改后的行为）

      at Object.log (tests/crdt/concurrent.test.js:271:15)

  console.log
    📋 测试场景: 模拟两用户快速连续输入

      at Object.log (tests/crdt/concurrent.test.js:289:13)

  console.log
    基础文档: doc

      at Object.log (tests/crdt/concurrent.test.js:290:13)

  console.log
    快速输入后:

      at Object.log (tests/crdt/concurrent.test.js:300:13)

  console.log
    A: doc_end

      at Object.log (tests/crdt/concurrent.test.js:301:13)

  console.log
    B: doc!

      at Object.log (tests/crdt/concurrent.test.js:302:13)

  console.log
    🎯 最终结果: "doc_end!"

      at Object.log (tests/crdt/concurrent.test.js:311:13)

  console.log
    📝 分析结果: "doc_end!"

      at Object.log (tests/crdt/concurrent.test.js:325:13)

  console.log
    ✅ 字符插入顺序合理（A先于B）

      at Object.log (tests/crdt/concurrent.test.js:329:15)

  console.log
    📋 测试场景: 混合并发操作 - A插入，B删除

      at Object.log (tests/crdt/concurrent.test.js:343:13)

  console.log
    基础文档: hello world

      at Object.log (tests/crdt/concurrent.test.js:344:13)

  console.log
    操作后:

      at Object.log (tests/crdt/concurrent.test.js:350:13)

  console.log
    A: hello worldX

      at Object.log (tests/crdt/concurrent.test.js:351:13)

  console.log
    B: helloorld

      at Object.log (tests/crdt/concurrent.test.js:352:13)

  console.log
    🎯 最终结果: "helloorldX"

      at Object.log (tests/crdt/concurrent.test.js:361:13)

  console.log
    
    === 混合操作后的可见字符 ===

      at log (tests/crdt/concurrent.test.js:11:13)

  console.log
    [0] "h" → opId: 1752358987386_0@client (时间戳: 1752358987386_0)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [1] "e" → opId: 1752358987386_1@client (时间戳: 1752358987386_1)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [2] "l" → opId: 1752358987386_2@client (时间戳: 1752358987386_2)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [3] "l" → opId: 1752358987386_3@client (时间戳: 1752358987386_3)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [4] "o" → opId: 1752358987386_4@client (时间戳: 1752358987386_4)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [5] "o" → opId: 1752358987386_7@client (时间戳: 1752358987386_7)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [6] "r" → opId: 1752358987386_8@client (时间戳: 1752358987386_8)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [7] "l" → opId: 1752358987386_9@client (时间戳: 1752358987386_9)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [8] "d" → opId: 1752358987386_10@client (时间戳: 1752358987386_10)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [9] "X" → opId: 1752358987387@client (时间戳: 1752358987387)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    实际结果分析: "helloorldX"

      at Object.log (tests/crdt/concurrent.test.js:373:13)

  console.log
    ✅ 删除操作生效，删除了'w '字符

      at Object.log (tests/crdt/concurrent.test.js:384:15)

  console.log
    📋 测试场景: 空文档上的并发插入

      at Object.log (tests/crdt/concurrent.test.js:403:13)

  console.log
    插入后:

      at Object.log (tests/crdt/concurrent.test.js:409:13)

  console.log
    A: A

      at Object.log (tests/crdt/concurrent.test.js:410:13)

  console.log
    B: B

      at Object.log (tests/crdt/concurrent.test.js:411:13)

  console.log
    🎯 空文档并发插入结果: "AB"

      at Object.log (tests/crdt/concurrent.test.js:420:13)

  console.log
    结果长度: 2

      at Object.log (tests/crdt/concurrent.test.js:421:13)

  console.log
    📋 测试场景: 深入分析时间戳和排序规则

      at Object.log (tests/crdt/concurrent.test.js:445:13)

  console.log
    插入时间分析:

      at Object.log (tests/crdt/concurrent.test.js:454:13)

  console.log
      开始时间: 1752358987395

      at Object.log (tests/crdt/concurrent.test.js:455:13)

  console.log
      中间时间: 1752358987395 (时差: 0ms)

      at Object.log (tests/crdt/concurrent.test.js:456:13)

  console.log
      结束时间: 1752358987395 (时差: 0ms)

      at Object.log (tests/crdt/concurrent.test.js:457:13)

  console.log
    实际opId:

      at Object.log (tests/crdt/concurrent.test.js:463:13)

  console.log
      A的opId: 1752358987395@client

      at Object.log (tests/crdt/concurrent.test.js:464:13)

  console.log
      B的opId: 1752358987395@client

      at Object.log (tests/crdt/concurrent.test.js:465:13)

  console.log
    🔍 期望顺序: 按时间戳排序, 实际顺序: T1T2

      at log (tests/crdt/concurrent.test.js:24:13)

  console.log
       字符 "T1" 时间戳: 1752358987395

      at log (tests/crdt/concurrent.test.js:33:15)
          at Array.forEach (<anonymous>)

  console.log
       字符 "T2" 时间戳: 1752358987395

      at log (tests/crdt/concurrent.test.js:33:15)
          at Array.forEach (<anonymous>)

  console.log
    🎯 最终排序: "T1T2"

      at Object.log (tests/crdt/concurrent.test.js:474:13)

PASS tests/crdt/concurrent.test.js
  并发插入完整测试套件
    ✓ 基础并发插入 - 两客户端开头同时插入 (22 ms)
    ✓ 中间位置并发插入 - 在指定字符后同时插入 (15 ms)
    ✓ 多字符并发插入 - 使用insertText (5 ms)
    ✓ 三客户端并发插入 - 复杂并发场景 (8 ms)
    ✓ 连续并发插入 - 模拟快速输入 (3 ms)
    ✓ 混合操作并发 - 插入+删除+格式化 (7 ms)
    ✓ 边界情况 - 空文档并发插入 (2 ms)
    ✓ 时间戳分析 - 验证排序规则 (5 ms)

Test Suites: 7 skipped, 1 passed, 1 of 8 total
Tests:       7 skipped, 8 passed, 15 total
Snapshots:   0 total
Time:        0.667 s, estimated 1 s
Ran all test suites with tests matching "并发插入完整测试套件".
```

---

## 测试分析

### 测试概览
- 测试文件: `tests/crdt/concurrent.test.js`
- 测试套件: 并发插入完整测试套件
- 退出代码: 0
- 测试状态: ✅ 通过

### 包含的测试用例
从 `tests/crdt/concurrent.test.js` 中的测试：

1. **基础并发插入** - 两客户端开头同时插入
2. **中间位置并发插入** - 在指定字符后同时插入 ✅ **核心修复验证**
3. **多字符并发插入** - 使用insertText
4. **三客户端并发插入** - 复杂并发场景
5. **连续并发插入** - 模拟快速输入
6. **混合操作并发** - 插入+删除+格式化
7. **边界情况** - 空文档并发插入
8. **时间戳分析** - 验证排序规则

### 关键修复验证
✅ 字符正确插入在下划线后（修复验证）
✅ 字符插入位置准确
✅ 所有测试通过

### 重要结果摘要
✅ **核心问题已修复**: 字符现在正确插入在下划线后，格式为 `start_XYend` 而不是之前错误的 `start_endXY`

### 测试统计
```
Tests:       7 skipped, 8 passed, 15 total
```

**生成时间**: 2025/7/13 06:23:07
**源文件**: tests/crdt/concurrent.test.js
**输出文件**: /Users/aaron/Desktop/6200 毕业论文/markWeave/mark-weave-editor/test-results/concurrent-test-2025-07-12T22-23-06.md
