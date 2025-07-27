// 性能数据采集API，供自动化测试脚本调用
window.getPerformanceStats = () => {
  return {
    crdt: window.crdtMonitor?.getPerformanceStats?.() || null,
    ot: window.otMonitor?.getAggregatedMetrics?.() || null,
    e2e: window.e2eMonitor?.getStats?.() || null,
    // 可扩展更多性能指标
  };
};
