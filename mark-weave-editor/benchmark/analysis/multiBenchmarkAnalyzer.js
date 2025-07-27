const fs = require("fs");
const path = require("path");

class MultiBenchmarkAnalyzer {
  constructor() {
    this.allResults = {};
    this.analysis = {};
  }

  // 加载所有基准测试结果
  loadAllResults(resultsDir = "../results") {
    const resultsPath = path.join(__dirname, resultsDir);

    if (!fs.existsSync(resultsPath)) {
      console.error("❌ 结果目录不存在:", resultsPath);
      return false;
    }

    const files = fs.readdirSync(resultsPath);
    const benchmarkFiles = files.filter(
      (file) =>
        file.startsWith("crdt_dual_user_") && file.endsWith("_result.json")
    );

    console.log(`📁 找到 ${benchmarkFiles.length} 个基准测试结果文件`);

    benchmarkFiles.forEach((file) => {
      try {
        const filePath = path.join(resultsPath, file);
        const data = fs.readFileSync(filePath, "utf8");
        const result = JSON.parse(data);

        // 检查文件结构，只处理单个基准测试结果
        if (
          result.benchmark &&
          result.benchmarkInfo &&
          result.benchmarkInfo.name
        ) {
          // 这是单个基准测试结果
          const benchmarkName = result.benchmark;
          this.allResults[benchmarkName] = result;

          console.log(
            `✅ 加载基准测试: ${benchmarkName} - ${result.benchmarkInfo.name}`
          );
        } else if (
          result.results &&
          Array.isArray(Object.keys(result.results))
        ) {
          // 这是汇总结果文件，跳过
          console.log(`⏭️ 跳过汇总文件: ${file}`);
        } else {
          // 其他格式的文件，跳过
          console.log(`⏭️ 跳过不支持格式的文件: ${file}`);
        }
      } catch (error) {
        console.error(`❌ 加载文件 ${file} 失败:`, error.message);
      }
    });

    return Object.keys(this.allResults).length > 0;
  }

  // 分析所有基准测试
  analyzeAllBenchmarks() {
    const analysis = {
      summary: {},
      benchmarks: {},
      comparisons: {},
      recommendations: [],
    };

    const benchmarkNames = Object.keys(this.allResults);
    console.log(`🔍 开始分析 ${benchmarkNames.length} 个基准测试...`);

    // 分析每个基准测试
    benchmarkNames.forEach((benchmarkName) => {
      const result = this.allResults[benchmarkName];
      analysis.benchmarks[benchmarkName] = this.analyzeSingleBenchmark(result);
    });

    // 生成基准测试间的比较
    analysis.comparisons = this.generateBenchmarkComparisons(
      analysis.benchmarks
    );

    // 生成汇总统计
    analysis.summary = this.generateSummary(analysis.benchmarks);

    // 生成建议
    analysis.recommendations = this.generateRecommendations(
      analysis.benchmarks
    );

    this.analysis = analysis;
    return analysis;
  }

  // 分析单个基准测试
  analyzeSingleBenchmark(result) {
    // 检查必要的数据结构
    if (!result.benchmarkInfo || !result.benchmarkInfo.name) {
      throw new Error(
        `基准测试数据缺少必要信息: ${JSON.stringify(result, null, 2)}`
      );
    }

    const analysis = {
      name: result.benchmarkInfo.name,
      description: result.benchmarkInfo.description,
      testType: result.benchmarkInfo.testType,
      timestamp: result.timestamp,
      users: {},
      summary: {},
    };

    // 分析用户A的数据
    if (result.userA && result.userA.crdt) {
      analysis.users.userA = this.analyzeUserData(result.userA.crdt);
    }

    // 分析用户B的数据
    if (result.userB && result.userB.crdt) {
      analysis.users.userB = this.analyzeUserData(result.userB.crdt);
    }

    // 计算汇总统计
    const users = Object.keys(analysis.users);
    if (users.length > 0) {
      analysis.summary = {
        avgLatency: this.calculateAverage(
          users.map((u) => analysis.users[u].latency.avg)
        ),
        avgP95Latency: this.calculateAverage(
          users.map((u) => analysis.users[u].latency.p95)
        ),
        avgBandwidth: this.calculateAverage(
          users.map((u) => analysis.users[u].network.bandwidth)
        ),
        avgOperationsPerSecond: this.calculateAverage(
          users.map((u) => analysis.users[u].operations.perSecond)
        ),
        avgE2ELatency: this.calculateAverage(
          users.map((u) => analysis.users[u].e2e.avgLatency)
        ),
        totalCollaborators: Math.max(
          ...users.map(
            (u) => analysis.users[u].collaboration.activeCollaborators
          )
        ),
      };
    }

    return analysis;
  }

  // 分析用户数据
  analyzeUserData(crdtData) {
    return {
      latency: {
        avg: crdtData.avgLatency,
        p95: crdtData.p95Latency,
        samples: crdtData.latencySamples,
      },
      network: {
        avgLatency: crdtData.avgNetworkLatency,
        bandwidth: crdtData.bandwidthKBps,
        sentBytes: crdtData.sentBytes,
        receivedBytes: crdtData.receivedBytes,
      },
      operations: {
        total: crdtData.documentUpdates,
        perSecond: crdtData.updatesPerSecond,
        keystrokes: crdtData.keystrokes,
        keystrokesPerSecond: crdtData.keystrokesPerSecond,
      },
      collaboration: {
        activeCollaborators: crdtData.activeCollaborators,
        awarenessChanges: crdtData.totalAwarenessChanges,
      },
      e2e: {
        avgLatency: crdtData.avgE2ELatency,
        p95Latency: crdtData.p95E2ELatency,
        samples: crdtData.e2eSamples,
      },
    };
  }

  // 生成基准测试间的比较
  generateBenchmarkComparisons(benchmarks) {
    const comparisons = {
      latencyComparison: {},
      bandwidthComparison: {},
      operationsComparison: {},
      e2eComparison: {},
    };

    const benchmarkNames = Object.keys(benchmarks);

    // 延迟比较
    benchmarkNames.forEach((name) => {
      const summary = benchmarks[name].summary;
      comparisons.latencyComparison[name] = {
        avgLatency: summary.avgLatency,
        p95Latency: summary.avgP95Latency,
      };
    });

    // 带宽比较
    benchmarkNames.forEach((name) => {
      const summary = benchmarks[name].summary;
      comparisons.bandwidthComparison[name] = {
        bandwidth: summary.avgBandwidth,
      };
    });

    // 操作频率比较
    benchmarkNames.forEach((name) => {
      const summary = benchmarks[name].summary;
      comparisons.operationsComparison[name] = {
        operationsPerSecond: summary.avgOperationsPerSecond,
      };
    });

    // E2E延迟比较
    benchmarkNames.forEach((name) => {
      const summary = benchmarks[name].summary;
      comparisons.e2eComparison[name] = {
        avgE2ELatency: summary.avgE2ELatency,
      };
    });

    return comparisons;
  }

  // 生成汇总统计
  generateSummary(benchmarks) {
    const benchmarkNames = Object.keys(benchmarks);
    const summaries = benchmarkNames.map((name) => benchmarks[name].summary);

    return {
      totalBenchmarks: benchmarkNames.length,
      overallAvgLatency: this.calculateAverage(
        summaries.map((s) => s.avgLatency)
      ),
      overallAvgP95Latency: this.calculateAverage(
        summaries.map((s) => s.avgP95Latency)
      ),
      overallAvgBandwidth: this.calculateAverage(
        summaries.map((s) => s.avgBandwidth)
      ),
      overallAvgOperationsPerSecond: this.calculateAverage(
        summaries.map((s) => s.avgOperationsPerSecond)
      ),
      overallAvgE2ELatency: this.calculateAverage(
        summaries.map((s) => s.avgE2ELatency)
      ),
      bestPerformingBenchmark: this.findBestPerformingBenchmark(benchmarks),
      worstPerformingBenchmark: this.findWorstPerformingBenchmark(benchmarks),
    };
  }

  // 找到性能最好的基准测试
  findBestPerformingBenchmark(benchmarks) {
    const benchmarkNames = Object.keys(benchmarks);
    let best = benchmarkNames[0];
    let bestScore = benchmarks[best].summary.avgLatency;

    benchmarkNames.forEach((name) => {
      const score = benchmarks[name].summary.avgLatency;
      if (score < bestScore) {
        best = name;
        bestScore = score;
      }
    });

    return {
      name: best,
      avgLatency: bestScore,
      benchmarkInfo: benchmarks[best],
    };
  }

  // 找到性能最差的基准测试
  findWorstPerformingBenchmark(benchmarks) {
    const benchmarkNames = Object.keys(benchmarks);
    let worst = benchmarkNames[0];
    let worstScore = benchmarks[worst].summary.avgLatency;

    benchmarkNames.forEach((name) => {
      const score = benchmarks[name].summary.avgLatency;
      if (score > worstScore) {
        worst = name;
        worstScore = score;
      }
    });

    return {
      name: worst,
      avgLatency: worstScore,
      benchmarkInfo: benchmarks[worst],
    };
  }

  // 生成建议
  generateRecommendations(benchmarks) {
    const recommendations = [];
    const summary = this.generateSummary(benchmarks);

    // 基于延迟的建议
    if (summary.overallAvgLatency > 100) {
      recommendations.push({
        type: "latency",
        priority: "high",
        message: "平均延迟较高，建议优化网络传输或减少操作频率",
        benchmark: summary.worstPerformingBenchmark.name,
      });
    }

    // 基于带宽的建议
    if (summary.overallAvgBandwidth > 1000) {
      recommendations.push({
        type: "bandwidth",
        priority: "medium",
        message: "带宽使用较高，建议优化数据传输效率",
        benchmark: summary.worstPerformingBenchmark.name,
      });
    }

    // 基于操作频率的建议
    if (summary.overallAvgOperationsPerSecond > 50) {
      recommendations.push({
        type: "operations",
        priority: "low",
        message: "操作频率较高，系统处理能力良好",
        benchmark: summary.bestPerformingBenchmark.name,
      });
    }

    return recommendations;
  }

  // 生成图表数据
  generateChartData() {
    const chartData = {
      latencyComparison: {
        labels: Object.keys(this.analysis.comparisons.latencyComparison),
        datasets: [
          {
            label: "平均延迟 (ms)",
            data: Object.values(
              this.analysis.comparisons.latencyComparison
            ).map((d) => d.avgLatency),
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
          {
            label: "P95延迟 (ms)",
            data: Object.values(
              this.analysis.comparisons.latencyComparison
            ).map((d) => d.p95Latency),
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      },
      bandwidthComparison: {
        labels: Object.keys(this.analysis.comparisons.bandwidthComparison),
        datasets: [
          {
            label: "带宽使用 (KB/s)",
            data: Object.values(
              this.analysis.comparisons.bandwidthComparison
            ).map((d) => d.bandwidth),
            backgroundColor: "rgba(75, 192, 192, 0.5)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      operationsComparison: {
        labels: Object.keys(this.analysis.comparisons.operationsComparison),
        datasets: [
          {
            label: "操作频率 (ops/s)",
            data: Object.values(
              this.analysis.comparisons.operationsComparison
            ).map((d) => d.operationsPerSecond),
            backgroundColor: "rgba(255, 205, 86, 0.5)",
            borderColor: "rgba(255, 205, 86, 1)",
            borderWidth: 1,
          },
        ],
      },
    };

    return chartData;
  }

  // 保存分析结果
  saveAnalysis(outputPath = "../results/multi_benchmark_analysis.json") {
    const fullPath = path.join(__dirname, outputPath);

    try {
      fs.writeFileSync(
        fullPath,
        JSON.stringify(this.analysis, null, 2),
        "utf8"
      );
      console.log(`✅ 分析结果已保存到: ${fullPath}`);
      return true;
    } catch (error) {
      console.error("❌ 保存分析结果失败:", error.message);
      return false;
    }
  }

  // 工具方法
  calculateAverage(values) {
    const validValues = values.filter(
      (v) => v !== null && v !== undefined && !isNaN(v)
    );
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  }
}

module.exports = MultiBenchmarkAnalyzer;
