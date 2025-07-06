/**
 * 性能调试工具 - 帮助监控数据更新频率和延迟
 */
class PerformanceDebugger {
  constructor() {
    this.updateHistory = [];
    this.startTime = Date.now();
    this.lastUpdateTime = Date.now();
    this.updateCount = 0;
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
    console.log('🔍 性能调试器已启用');
    
    // 每5秒输出统计信息
    this.debugInterval = setInterval(() => {
      this.logStatistics();
    }, 5000);
  }

  disable() {
    this.enabled = false;
    if (this.debugInterval) {
      clearInterval(this.debugInterval);
    }
    console.log('⏹️ 性能调试器已停用');
  }

  recordUpdate(component, data) {
    if (!this.enabled) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    this.updateHistory.push({
      timestamp: now,
      component,
      timeSinceLastUpdate,
      data: {
        avgLatency: data.avgLatency || 0,
        operationsCount: data.operationsCount || 0,
        activeUsers: data.activeUsers || 0
      }
    });

    this.updateCount++;
    this.lastUpdateTime = now;

    // 保持最近100个更新记录
    if (this.updateHistory.length > 100) {
      this.updateHistory.shift();
    }

    // 如果更新间隔异常，立即警告
    if (timeSinceLastUpdate > 1000) {
      console.warn(`⚠️ [${component}] 更新间隔异常: ${timeSinceLastUpdate}ms`);
    }
  }

  logStatistics() {
    if (this.updateHistory.length === 0) return;

    const totalTime = Date.now() - this.startTime;
    const updateFrequency = (this.updateCount / (totalTime / 1000)).toFixed(1);
    
    const recentUpdates = this.updateHistory.slice(-20);
    const avgInterval = recentUpdates.length > 1 
      ? recentUpdates.reduce((sum, update, index) => {
          if (index === 0) return sum;
          return sum + update.timeSinceLastUpdate;
        }, 0) / (recentUpdates.length - 1)
      : 0;

    console.log(`📊 性能调试统计 (最近5秒):`);
    console.log(`   更新频率: ${updateFrequency} 次/秒`);
    console.log(`   平均间隔: ${avgInterval.toFixed(0)}ms`);
    console.log(`   总更新次数: ${this.updateCount}`);
    
    // 按组件分组统计
    const componentStats = {};
    recentUpdates.forEach(update => {
      if (!componentStats[update.component]) {
        componentStats[update.component] = {
          count: 0,
          avgLatency: 0,
          avgOps: 0
        };
      }
      componentStats[update.component].count++;
      componentStats[update.component].avgLatency += update.data.avgLatency;
      componentStats[update.component].avgOps += update.data.operationsCount;
    });

    Object.keys(componentStats).forEach(component => {
      const stats = componentStats[component];
      console.log(`   ${component}: ${stats.count}次更新, 平均延迟: ${(stats.avgLatency/stats.count).toFixed(1)}ms`);
    });
  }

  getDebugInfo() {
    return {
      updateCount: this.updateCount,
      totalTime: Date.now() - this.startTime,
      updateHistory: this.updateHistory.slice(-10),
      isEnabled: this.enabled
    };
  }
}

// 创建全局调试器实例
const performanceDebugger = new PerformanceDebugger();

// 添加到window对象，方便控制台调用
if (typeof window !== 'undefined') {
  window.performanceDebugger = performanceDebugger;
  
  // 提供快捷方法
  window.enablePerformanceDebug = () => performanceDebugger.enable();
  window.disablePerformanceDebug = () => performanceDebugger.disable();
  window.getPerformanceDebugInfo = () => performanceDebugger.getDebugInfo();
}

export default performanceDebugger;
