// Performance data collection API for automated test scripts
window.getPerformanceStats = () => {
  return {
    crdt: window.crdtMonitor?.getPerformanceStats?.() || null,
    ot: window.otMonitor?.getAggregatedMetrics?.() || null,
    e2e: window.e2eMonitor?.getStats?.() || null,
    // Can extend more performance metrics
  };
};
