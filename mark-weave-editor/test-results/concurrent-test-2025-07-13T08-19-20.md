# 并发插入完整测试套件结果

**测试时间**: 2025/7/13 16:19:20  
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
    基础文档:

      at Object.log (tests/crdt/concurrent.test.js:48:13)

  console.log
    A插入字符 "A" opId: undefined

      at Object.log (tests/crdt/concurrent.test.js:58:13)

  console.log
    B插入字符 "B" opId: 1752394761216@client

      at Object.log (tests/crdt/concurrent.test.js:59:13)

  console.log
    🎯 最终结果: "helloAB"

      at Object.log (tests/crdt/concurrent.test.js:68:13)

  console.log
    
    === 最终字符排序分析 ===

      at log (tests/crdt/concurrent.test.js:11:13)

  console.log
    [0] "h" → opId: 1752394761199_0@client (时间戳: 1752394761199_0)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [1] "e" → opId: 1752394761200_1@client (时间戳: 1752394761200_1)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [2] "l" → opId: 1752394761200_2@client (时间戳: 1752394761200_2)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [3] "l" → opId: 1752394761200_3@client (时间戳: 1752394761200_3)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [4] "o" → opId: 1752394761200_4@client (时间戳: 1752394761200_4)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [5] "A" → opId: 1752394761215@client (时间戳: 1752394761215)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [6] "B" → opId: 1752394761216@client (时间戳: 1752394761216)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    🔧 准备插入基础文档

      at Object.log (tests/crdt/concurrent.test.js:86:13)

  console.log
    🔧 A客户端ychars初始长度: 0

      at Object.log (tests/crdt/concurrent.test.js:87:13)

  console.log
    🔧 A插入后长度: 0

      at Object.log (tests/crdt/concurrent.test.js:89:13)

  console.log
    🔧 A快照:

      at Object.log (tests/crdt/concurrent.test.js:90:13)

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
    基础文档:

      at Object.log (tests/crdt/concurrent.test.js:107:13)

  console.log
    🔍 调试字符查找:

      at Object.log (tests/crdt/concurrent.test.js:110:13)

  console.log
    字符数组长度: 0

      at Object.log (tests/crdt/concurrent.test.js:111:13)

  console.log
    下划线字符对象: undefined

      at Object.log (tests/crdt/concurrent.test.js:130:13)

  console.log
    下划线 "_" 的opId: null

      at Object.log (tests/crdt/concurrent.test.js:131:13)

  console.log
    插入后各自状态:

      at Object.log (tests/crdt/concurrent.test.js:137:13)

  console.log
    A:

      at Object.log (tests/crdt/concurrent.test.js:138:13)

  console.log
    B: start_endXY

      at Object.log (tests/crdt/concurrent.test.js:139:13)

  console.log
    🎯 最终结果: "start_endXY"

      at Object.log (tests/crdt/concurrent.test.js:148:13)

  console.log
    ⚠️ 字符插入在文档末尾（应该在下划线后）

      at Object.log (tests/crdt/concurrent.test.js:168:17)

  console.log
    💡 问题：下划线opId为null，需要修复查找逻辑

      at Object.log (tests/crdt/concurrent.test.js:169:17)

  console.log
    📋 测试场景: 两客户端同时插入多个字符

      at Object.log (tests/crdt/concurrent.test.js:186:13)

  console.log
    基础文档:

      at Object.log (tests/crdt/concurrent.test.js:187:13)

  console.log
    A插入后:

      at Object.log (tests/crdt/concurrent.test.js:193:13)

  console.log
    B插入后: BBBAAAbase

      at Object.log (tests/crdt/concurrent.test.js:194:13)

  console.log
    🎯 最终结果: "BBBAAAbase"

      at Object.log (tests/crdt/concurrent.test.js:203:13)

  console.log
    
    === 多字符插入结果分析 ===

      at log (tests/crdt/concurrent.test.js:11:13)

  console.log
    [0] "B" → opId: 1752394761232_21@client (时间戳: 1752394761232_21)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [1] "B" → opId: 1752394761232_22@client (时间戳: 1752394761232_22)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [2] "B" → opId: 1752394761232_23@client (时间戳: 1752394761232_23)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [3] "A" → opId: 1752394761232_18@client (时间戳: 1752394761232_18)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [4] "A" → opId: 1752394761232_19@client (时间戳: 1752394761232_19)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [5] "A" → opId: 1752394761232_20@client (时间戳: 1752394761232_20)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [6] "b" → opId: 1752394761231_14@client (时间戳: 1752394761231_14)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [7] "a" → opId: 1752394761231_15@client (时间戳: 1752394761231_15)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [8] "s" → opId: 1752394761231_16@client (时间戳: 1752394761231_16)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [9] "e" → opId: 1752394761231_17@client (时间戳: 1752394761231_17)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    📋 测试场景: 三客户端在开头同时插入

      at Object.log (tests/crdt/concurrent.test.js:226:13)

  console.log
    基础文档:

      at Object.log (tests/crdt/concurrent.test.js:227:13)

  console.log
    插入后各客户端状态:

      at Object.log (tests/crdt/concurrent.test.js:234:13)

  console.log
    A:

      at Object.log (tests/crdt/concurrent.test.js:235:13)

  console.log
    B:

      at Object.log (tests/crdt/concurrent.test.js:236:13)

  console.log
    C: start123

      at Object.log (tests/crdt/concurrent.test.js:237:13)

  console.log
    🎯 最终结果:

      at Object.log (tests/crdt/concurrent.test.js:255:13)

  console.log
    A: start123

      at Object.log (tests/crdt/concurrent.test.js:256:13)

  console.log
    B: start123

      at Object.log (tests/crdt/concurrent.test.js:257:13)

  console.log
    C: start123

      at Object.log (tests/crdt/concurrent.test.js:258:13)

  console.log
    
    === 三客户端插入排序分析 ===

      at log (tests/crdt/concurrent.test.js:11:13)

  console.log
    [0] "s" → opId: 1752394761239_24@client (时间戳: 1752394761239_24)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [1] "t" → opId: 1752394761239_25@client (时间戳: 1752394761239_25)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [2] "a" → opId: 1752394761239_26@client (时间戳: 1752394761239_26)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [3] "r" → opId: 1752394761239_27@client (时间戳: 1752394761239_27)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [4] "t" → opId: 1752394761239_28@client (时间戳: 1752394761239_28)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [5] "1" → opId: 1752394761240@client (时间戳: 1752394761240)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [6] "2" → opId: 1752394761240@client (时间戳: 1752394761240)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [7] "3" → opId: 1752394761240@client (时间戳: 1752394761240)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    ✅ 字符插入在文档末尾（修改后的行为）

      at Object.log (tests/crdt/concurrent.test.js:271:15)

  console.log
    📋 测试场景: 模拟两用户快速连续输入

      at Object.log (tests/crdt/concurrent.test.js:289:13)

  console.log
    基础文档:

      at Object.log (tests/crdt/concurrent.test.js:290:13)

  console.log
    快速输入后:

      at Object.log (tests/crdt/concurrent.test.js:300:13)

  console.log
    A:

      at Object.log (tests/crdt/concurrent.test.js:301:13)

  console.log
    B: !_enddoc

      at Object.log (tests/crdt/concurrent.test.js:302:13)

  console.log
    🎯 最终结果: "!_enddoc"

      at Object.log (tests/crdt/concurrent.test.js:311:13)

  console.log
    📝 分析结果: "!_enddoc"

      at Object.log (tests/crdt/concurrent.test.js:325:13)

  console.log
    ⚠️ 字符插入顺序不同于预期，但包含所有必要字符

      at Object.log (tests/crdt/concurrent.test.js:331:15)

  console.log
    📋 测试场景: 混合并发操作 - A插入，B删除

      at Object.log (tests/crdt/concurrent.test.js:343:13)

  console.log
    基础文档:

      at Object.log (tests/crdt/concurrent.test.js:344:13)

  console.log
    操作后:

      at Object.log (tests/crdt/concurrent.test.js:350:13)

  console.log
    A:

      at Object.log (tests/crdt/concurrent.test.js:351:13)

  console.log
    B: helloorldX

      at Object.log (tests/crdt/concurrent.test.js:352:13)

  console.log
    🎯 最终结果: "helloorldX"

      at Object.log (tests/crdt/concurrent.test.js:361:13)

  console.log
    
    === 混合操作后的可见字符 ===

      at log (tests/crdt/concurrent.test.js:11:13)

  console.log
    [0] "h" → opId: 1752394761248_37@client (时间戳: 1752394761248_37)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [1] "e" → opId: 1752394761248_38@client (时间戳: 1752394761248_38)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [2] "l" → opId: 1752394761248_39@client (时间戳: 1752394761248_39)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [3] "l" → opId: 1752394761248_40@client (时间戳: 1752394761248_40)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [4] "o" → opId: 1752394761248_41@client (时间戳: 1752394761248_41)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [5] "o" → opId: 1752394761248_44@client (时间戳: 1752394761248_44)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [6] "r" → opId: 1752394761248_45@client (时间戳: 1752394761248_45)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [7] "l" → opId: 1752394761248_46@client (时间戳: 1752394761248_46)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [8] "d" → opId: 1752394761248_47@client (时间戳: 1752394761248_47)

      at log (tests/crdt/concurrent.test.js:15:15)
          at Array.forEach (<anonymous>)

  console.log
    [9] "X" → opId: 1752394761249@client (时间戳: 1752394761249)

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
    A:

      at Object.log (tests/crdt/concurrent.test.js:410:13)

  console.log
    B: AB

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
      开始时间: 1752394761259

      at Object.log (tests/crdt/concurrent.test.js:455:13)

  console.log
      中间时间: 1752394761259 (时差: 0ms)

      at Object.log (tests/crdt/concurrent.test.js:456:13)

  console.log
      结束时间: 1752394761259 (时差: 0ms)

      at Object.log (tests/crdt/concurrent.test.js:457:13)

  console.log
    实际opId:

      at Object.log (tests/crdt/concurrent.test.js:463:13)

  console.log
      A的opId: undefined

      at Object.log (tests/crdt/concurrent.test.js:464:13)

  console.log
      B的opId: 1752394761259@client

      at Object.log (tests/crdt/concurrent.test.js:465:13)

  console.log
    🔍 期望顺序: 按时间戳排序, 实际顺序: T1T2

      at log (tests/crdt/concurrent.test.js:24:13)

  console.log
       字符 "T1" 时间戳: 1752394761259

      at log (tests/crdt/concurrent.test.js:33:15)
          at Array.forEach (<anonymous>)

  console.log
       字符 "T2" 时间戳: 1752394761259

      at log (tests/crdt/concurrent.test.js:33:15)
          at Array.forEach (<anonymous>)

  console.log
    🎯 最终排序: "T1T2"

      at Object.log (tests/crdt/concurrent.test.js:474:13)

  console.log
    📋 测试场景: 三客户端极速并发插入

      at Object.log (tests/crdt/concurrent.test.js:484:13)

  console.log
    📋 测试场景: 模拟网络分区和延迟同步

      at Object.log (tests/crdt/concurrent.test.js:546:13)

  console.log
    分区期间 A-B 同步后:

      at Object.log (tests/crdt/concurrent.test.js:563:13)

  console.log
    A-B 状态:

      at Object.log (tests/crdt/concurrent.test.js:564:13)

  console.log
    C 孤立状态: start12isolated

      at Object.log (tests/crdt/concurrent.test.js:565:13)

  console.log
    网络恢复前:

      at Object.log (tests/crdt/concurrent.test.js:575:13)

  console.log
    A-B:

      at Object.log (tests/crdt/concurrent.test.js:576:13)

  console.log
    C: _network_partitionedstart12isolated

      at Object.log (tests/crdt/concurrent.test.js:577:13)

  console.log
    🎯 网络恢复后最终状态:

      at Object.log (tests/crdt/concurrent.test.js:593:13)

  console.log
    A: _network_partitionedstart12isolated

      at Object.log (tests/crdt/concurrent.test.js:594:13)

  console.log
    B: _network_partitionedstart12isolated

      at Object.log (tests/crdt/concurrent.test.js:595:13)

  console.log
    C: _network_partitionedstart12isolated

      at Object.log (tests/crdt/concurrent.test.js:596:13)

  console.log
    📋 测试场景: 10客户端大规模并发压力测试

      at Object.log (tests/crdt/concurrent.test.js:608:13)

  console.log
    基础文档:

      at Object.log (tests/crdt/concurrent.test.js:622:13)

  console.log
    执行了 30 个并发操作

      at Object.log (tests/crdt/concurrent.test.js:643:13)

  console.log
    🎯 大规模并发最终结果:

      at Object.log (tests/crdt/concurrent.test.js:660:13)

  console.log
    最终文档: _9_2_9_0_8_2_8_0_7_2_7_0_6_2_6_0_5_2_5_0_4_2_4__3_2_3_0_2_2_2_0_1_2_1_0_0_2_0_0shared_document

      at Object.log (tests/crdt/concurrent.test.js:661:13)

  console.log
    文档长度: 94

      at Object.log (tests/crdt/concurrent.test.js:662:13)

  console.log
    📋 测试场景: 乱序消息同步测试

      at Object.log (tests/crdt/concurrent.test.js:680:13)

  console.log
    模拟乱序同步...

      at Object.log (tests/crdt/concurrent.test.js:699:13)

  console.log
    🎯 乱序同步最终结果:

      at Object.log (tests/crdt/concurrent.test.js:721:13)

  console.log
    A: C1B1A1

      at Object.log (tests/crdt/concurrent.test.js:722:13)

  console.log
    B: C1B1A1

      at Object.log (tests/crdt/concurrent.test.js:723:13)

  console.log
    C: B2A2C1B1A1

      at Object.log (tests/crdt/concurrent.test.js:724:13)

  console.log
    📋 测试场景: 相同时间戳冲突解决

      at Object.log (tests/crdt/concurrent.test.js:742:13)

  console.log
    创建了相同时间戳的操作

      at Object.log (tests/crdt/concurrent.test.js:755:15)

  console.log
    🎯 相同时间戳冲突解决结果: AB

      at Object.log (tests/crdt/concurrent.test.js:767:15)

  console.log
    📋 测试场景: 模拟网络丢包和消息丢失

      at Object.log (tests/crdt/concurrent.test.js:784:13)

  console.log
    生成了 4 个更新

      at Object.log (tests/crdt/concurrent.test.js:805:13)

  console.log
    丢包后交付情况:

      at Object.log (tests/crdt/concurrent.test.js:827:13)

  console.log
    A收到: 0 个更新

      at Object.log (tests/crdt/concurrent.test.js:828:13)

  console.log
    B收到: 1 个更新

      at Object.log (tests/crdt/concurrent.test.js:829:13)

  console.log
    C收到: 0 个更新

      at Object.log (tests/crdt/concurrent.test.js:830:13)

  console.log
    丢包后状态:

      at Object.log (tests/crdt/concurrent.test.js:837:13)

  console.log
    A:

      at Object.log (tests/crdt/concurrent.test.js:838:13)

  console.log
    B:

      at Object.log (tests/crdt/concurrent.test.js:839:13)

  console.log
    C: base1234

      at Object.log (tests/crdt/concurrent.test.js:840:13)

  console.log
    🎯 网络恢复后最终状态:

      at Object.log (tests/crdt/concurrent.test.js:853:13)

  console.log
    A: base123

      at Object.log (tests/crdt/concurrent.test.js:854:13)

  console.log
    B: base123

      at Object.log (tests/crdt/concurrent.test.js:855:13)

  console.log
    C: base1234

      at Object.log (tests/crdt/concurrent.test.js:856:13)

  console.log
    📋 测试场景: 模拟不同网络延迟

      at Object.log (tests/crdt/concurrent.test.js:873:13)

  console.log
    模拟按延迟顺序传输:

      at Object.log (tests/crdt/concurrent.test.js:911:13)

  console.log
    第1步: C → [A, B] (延迟50ms)

      at log (tests/crdt/concurrent.test.js:913:15)
          at Array.forEach (<anonymous>)

  console.log
      状态: A="startABC", B="startABC", C="startABC"

      at log (tests/crdt/concurrent.test.js:923:15)
          at Array.forEach (<anonymous>)

  console.log
    第2步: A → [B, C] (延迟100ms)

      at log (tests/crdt/concurrent.test.js:913:15)
          at Array.forEach (<anonymous>)

  console.log
      状态: A="startABC", B="startABC", C="startABC"

      at log (tests/crdt/concurrent.test.js:923:15)
          at Array.forEach (<anonymous>)

  console.log
    第3步: B → [A, C] (延迟300ms)

      at log (tests/crdt/concurrent.test.js:913:15)
          at Array.forEach (<anonymous>)

  console.log
      状态: A="startABC", B="startABC", C="startABC"

      at log (tests/crdt/concurrent.test.js:923:15)
          at Array.forEach (<anonymous>)

  console.log
    🎯 延迟模拟最终结果:

      at Object.log (tests/crdt/concurrent.test.js:930:13)

  console.log
    A: startABC

      at Object.log (tests/crdt/concurrent.test.js:931:13)

  console.log
    B: startABC

      at Object.log (tests/crdt/concurrent.test.js:932:13)

  console.log
    C: startABC

      at Object.log (tests/crdt/concurrent.test.js:933:13)

  console.log
    📋 测试场景: 模拟网络重复传输

      at Object.log (tests/crdt/concurrent.test.js:948:13)

  console.log
    原始状态:

      at Object.log (tests/crdt/concurrent.test.js:957:13)

  console.log
    B添加X后: originalX

      at Object.log (tests/crdt/concurrent.test.js:958:13)

  console.log
    A第一次收到更新: originalX

      at Object.log (tests/crdt/concurrent.test.js:962:13)

  console.log
    模拟重复传输相同更新...

      at Object.log (tests/crdt/concurrent.test.js:965:13)

  console.log
    第2次应用后: originalX

      at Object.log (tests/crdt/concurrent.test.js:968:15)

  console.log
    第3次应用后: originalX

      at Object.log (tests/crdt/concurrent.test.js:968:15)

  console.log
    第4次应用后: originalX

      at Object.log (tests/crdt/concurrent.test.js:968:15)

  console.log
    第5次应用后: originalX

      at Object.log (tests/crdt/concurrent.test.js:968:15)

  console.log
    第6次应用后: originalX

      at Object.log (tests/crdt/concurrent.test.js:968:15)

  console.log
    🎯 重复传输处理结果:

      at Object.log (tests/crdt/concurrent.test.js:974:13)

  console.log
    A: originalX

      at Object.log (tests/crdt/concurrent.test.js:975:13)

  console.log
    B: originalX

      at Object.log (tests/crdt/concurrent.test.js:976:13)

  console.log
    📋 测试场景: 模拟网络带宽限制和批量传输

      at Object.log (tests/crdt/concurrent.test.js:992:13)

  console.log
    生成了 20 个单独更新

      at Object.log (tests/crdt/concurrent.test.js:1001:13)

  console.log
    A当前状态:

      at Object.log (tests/crdt/concurrent.test.js:1002:13)

  console.log
    分成 4 个批次传输

      at Object.log (tests/crdt/concurrent.test.js:1011:13)

  console.log
    传输批次 1/4 (5个更新)

      at log (tests/crdt/concurrent.test.js:1015:15)
          at Array.forEach (<anonymous>)

  console.log
    批次1后B状态: 01234567890123456789

      at log (tests/crdt/concurrent.test.js:1021:15)
          at Array.forEach (<anonymous>)

  console.log
    传输批次 2/4 (5个更新)

      at log (tests/crdt/concurrent.test.js:1015:15)
          at Array.forEach (<anonymous>)

  console.log
    批次2后B状态: 01234567890123456789

      at log (tests/crdt/concurrent.test.js:1021:15)
          at Array.forEach (<anonymous>)

  console.log
    传输批次 3/4 (5个更新)

      at log (tests/crdt/concurrent.test.js:1015:15)
          at Array.forEach (<anonymous>)

  console.log
    批次3后B状态: 01234567890123456789

      at log (tests/crdt/concurrent.test.js:1021:15)
          at Array.forEach (<anonymous>)

  console.log
    传输批次 4/4 (5个更新)

      at log (tests/crdt/concurrent.test.js:1015:15)
          at Array.forEach (<anonymous>)

  console.log
    批次4后B状态: 01234567890123456789

      at log (tests/crdt/concurrent.test.js:1021:15)
          at Array.forEach (<anonymous>)

  console.log
    🎯 批量传输最终结果:

      at Object.log (tests/crdt/concurrent.test.js:1027:13)

  console.log
    A:

      at Object.log (tests/crdt/concurrent.test.js:1028:13)

  console.log
    B: 01234567890123456789

      at Object.log (tests/crdt/concurrent.test.js:1029:13)

FAIL tests/crdt/concurrent.test.js
  并发插入完整测试套件
    ✓ 基础并发插入 - 两客户端开头同时插入 (30 ms)
    ✓ 中间位置并发插入 - 在指定字符后同时插入 (8 ms)
    ✓ 多字符并发插入 - 使用insertText (7 ms)
    ✓ 三客户端并发插入 - 复杂并发场景 (6 ms)
    ✓ 连续并发插入 - 模拟快速输入 (3 ms)
    ✓ 混合操作并发 - 插入+删除+格式化 (6 ms)
    ✓ 边界情况 - 空文档并发插入 (5 ms)
    ✓ 时间戳分析 - 验证排序规则 (3 ms)
    ✕ 极速并发插入 - 模拟高频输入场景
    ✓ 网络分区模拟 - 部分同步场景 (5 ms)
    ✓ 大规模并发压力测试 - 10客户端同时操作 (18 ms)
    ✕ 乱序同步测试 - 模拟网络延迟和重排 (3 ms)
    ✓ 冲突解决一致性 - 相同时间戳处理 (1 ms)
    ✕ 网络丢包模拟 - 随机丢失更新 (3 ms)
    ✓ 网络延迟模拟 - 不同延迟下的同步 (5 ms)
    ✓ 网络重复传输模拟 - 处理重复消息 (3 ms)
    ✕ 网络带宽限制模拟 - 批量更新优化 (4 ms)

  ● 并发插入完整测试套件 › 极速并发插入 - 模拟高频输入场景

    TypeError: Cannot read properties of undefined (reading 'opId')

      491 |     // 极速并发插入（模拟快速打字）
      492 |     const baseChars = A.ychars.toArray();
    > 493 |     const lastCharId = baseChars[baseChars.length - 1].opId;
          |                                                        ^
      494 |
      495 |     // 在很短时间内连续插入
      496 |     for (let i = 0; i < 5; i++) {

      at Object.opId (tests/crdt/concurrent.test.js:493:56)

  ● 并发插入完整测试套件 › 乱序同步测试 - 模拟网络延迟和重排

    expect(received).toBe(expected) // Object.is equality

    Expected: "B2A2C1B1A1"
    Received: "C1B1A1"

      726 |     // 验证即使乱序接收，最终状态仍然一致
      727 |     expect(finalA).toBe(finalB);
    > 728 |     expect(finalB).toBe(finalC);
          |                    ^
      729 |
      730 |     // 验证所有内容都包含
      731 |     expect(finalA).toContain("A1");

      at Object.toBe (tests/crdt/concurrent.test.js:728:20)

  ● 并发插入完整测试套件 › 网络丢包模拟 - 随机丢失更新

    expect(received).toBe(expected) // Object.is equality

    Expected: "base1234"
    Received: "base123"

      858 |     // 验证最终一致性
      859 |     expect(finalA).toBe(finalB);
    > 860 |     expect(finalB).toBe(finalC);
          |                    ^
      861 |     expect(finalA).toContain("base");
      862 |     expect(finalA).toContain("1");
      863 |     expect(finalA).toContain("2");

      at Object.toBe (tests/crdt/concurrent.test.js:860:20)

  ● 并发插入完整测试套件 › 网络带宽限制模拟 - 批量更新优化

    expect(received).toBe(expected) // Object.is equality

    Expected: "01234567890123456789"
    Received: ""

      1030 |
      1031 |     // 验证最终一致性
    > 1032 |     expect(finalA).toBe(finalB);
           |                    ^
      1033 |     
      1034 |     // 验证所有数字都存在
      1035 |     for (let i = 0; i < 10; i++) {

      at Object.toBe (tests/crdt/concurrent.test.js:1032:20)

Test Suites: 1 failed, 7 skipped, 1 of 8 total
Tests:       4 failed, 27 skipped, 13 passed, 44 total
Snapshots:   0 total
Time:        0.882 s, estimated 2 s
Ran all test suites with tests matching "并发插入完整测试套件".
```

---

## 测试分析

### 测试概览
- 测试文件: `tests/crdt/concurrent.test.js`
- 测试套件: 并发插入完整测试套件
- 退出代码: 1
- 测试状态: ❌ 失败

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
❌ 字符正确插入在下划线后（修复验证）
✅ 字符插入位置准确
❌ 所有测试通过

### 重要结果摘要
⚠️ 需要检查字符插入位置

### 测试统计
```
Tests:       4 failed, 27 skipped, 13 passed, 44 total
```

**生成时间**: 2025/7/13 16:19:21
**源文件**: tests/crdt/concurrent.test.js
**输出文件**: /Users/aaron/Desktop/6200 毕业论文/markWeave/mark-weave-editor/test-results/concurrent-test-2025-07-13T08-19-20.md
