const fs = require("fs");
const path = require("path");

/**
 * OT性能分析器
 */
class OTAnalyzer {
  constructor() {
    this.resultsDir = path.join(__dirname, "results");
    this.outputDir = path.join(__dirname, "results"); // 改为results文件夹
  }

  /**
   * 读取OT测试结果
   */
  loadOTResults() {
    const results = {};

    // 读取单个基准测试结果
    for (let i = 1; i <= 4; i++) {
      const resultPath = path.join(
        this.resultsDir,
        `ot_dual_user_benchmark${i}_result.json`
      );
      if (fs.existsSync(resultPath)) {
        try {
          results[`benchmark${i}`] = JSON.parse(
            fs.readFileSync(resultPath, "utf8")
          );
        } catch (error) {
          console.warn(`⚠️ 无法读取 benchmark${i} 结果:`, error.message);
        }
      }
    }

    // 读取汇总结果
    const allResultsPath = path.join(
      this.resultsDir,
      "ot_dual_user_all_results.json"
    );
    if (fs.existsSync(allResultsPath)) {
      try {
        const allResults = JSON.parse(fs.readFileSync(allResultsPath, "utf8"));
        Object.assign(results, allResults);
      } catch (error) {
        console.warn(`⚠️ 无法读取汇总结果:`, error.message);
      }
    }

    return results;
  }

  /**
   * 分析性能数据
   */
  analyzePerformance(results) {
    const analysis = {
      summary: {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        averageLatency: 0,
        averageThroughput: 0,
        totalBytesTransferred: 0,
        totalMessages: 0,
      },
      benchmarks: {},
      recommendations: [],
    };

    let totalLatency = 0;
    let totalThroughput = 0;
    let totalBytes = 0;
    let totalMessages = 0;
    let latencyCount = 0;
    let throughputCount = 0;

    for (const [benchmarkName, result] of Object.entries(results)) {
      if (result.error) {
        analysis.summary.failedTests++;
        analysis.benchmarks[benchmarkName] = {
          status: "failed",
          error: result.error,
        };
        continue;
      }

      analysis.summary.successfulTests++;
      analysis.summary.totalTests++;

      const benchmarkAnalysis = {
        status: "success",
        name: result.name,
        description: result.description,
        timestamp: result.timestamp,
        userA: this.analyzeUserData(result.userA),
        userB: this.analyzeUserData(result.userB),
        synchronization: this.analyzeSynchronization(
          result.userA,
          result.userB
        ),
      };

      // 累计统计数据
      if (result.userA?.stats) {
        const stats = result.userA.stats;
        if (stats.avgLatency) {
          totalLatency += stats.avgLatency;
          latencyCount++;
        }
        if (stats.opsPerSecond) {
          totalThroughput += stats.opsPerSecond;
          throughputCount++;
        }
        if (stats.bytesSent) {
          totalBytes += stats.bytesSent;
        }
        if (stats.messagesSent) {
          totalMessages += stats.messagesSent;
        }
      }

      if (result.userB?.stats) {
        const stats = result.userB.stats;
        if (stats.avgLatency) {
          totalLatency += stats.avgLatency;
          latencyCount++;
        }
        if (stats.opsPerSecond) {
          totalThroughput += stats.opsPerSecond;
          throughputCount++;
        }
        if (stats.bytesSent) {
          totalBytes += stats.bytesSent;
        }
        if (stats.messagesSent) {
          totalMessages += stats.messagesSent;
        }
      }

      analysis.benchmarks[benchmarkName] = benchmarkAnalysis;
    }

    // 计算平均值
    if (latencyCount > 0) {
      analysis.summary.averageLatency = totalLatency / latencyCount;
    }
    if (throughputCount > 0) {
      analysis.summary.averageThroughput = totalThroughput / throughputCount;
    }
    analysis.summary.totalBytesTransferred = totalBytes;
    analysis.summary.totalMessages = totalMessages;

    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * 分析用户数据
   */
  analyzeUserData(userData) {
    if (!userData?.stats) {
      return { status: "no_data" };
    }

    const stats = userData.stats;
    return {
      status: "success",
      email: userData.email,
      content: userData.content,
      performance: {
        latency: {
          average: stats.avgLatency || 0,
          p95: stats.p95Latency || 0,
          samples: stats.latencySamples || 0,
        },
        throughput: {
          operationsPerSecond: stats.opsPerSecond || 0,
          keystrokesPerSecond: stats.keystrokesPerSecond || 0,
          messagesPerSecond: stats.messagesPerSecond || 0,
        },
        network: {
          bytesSent: stats.bytesSent || 0,
          bytesReceived: stats.bytesReceived || 0,
          messagesSent: stats.messagesSent || 0,
          messagesReceived: stats.messagesReceived || 0,
        },
        operations: {
          total: stats.operationsCount || 0,
          pending: stats.pendingOperations || 0,
          conflicts: stats.conflictResolutions || 0,
        },
        monitoring: {
          duration: stats.monitoringDuration || 0,
          uptime: stats.uptime || 0,
          isConnected: stats.isConnected || false,
        },
      },
    };
  }

  /**
   * 分析同步质量
   */
  analyzeSynchronization(userA, userB) {
    const contentA = userA?.content || "";
    const contentB = userB?.content || "";

    // 简单的同步质量评估
    const lengthDiff = Math.abs(contentA.length - contentB.length);
    const maxLength = Math.max(contentA.length, contentB.length);
    const syncQuality =
      maxLength > 0 ? (1 - lengthDiff / maxLength) * 100 : 100;

    return {
      contentLengthA: contentA.length,
      contentLengthB: contentB.length,
      lengthDifference: lengthDiff,
      syncQuality: syncQuality,
      isSynchronized: syncQuality > 90, // 90%以上认为同步良好
      contentA: contentA,
      contentB: contentB,
    };
  }

  /**
   * 生成性能建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // 基于延迟的建议
    if (analysis.summary.averageLatency > 100) {
      recommendations.push({
        type: "latency",
        priority: "high",
        message: "平均延迟较高，建议优化网络连接或减少操作频率",
        metric: analysis.summary.averageLatency,
        threshold: 100,
      });
    }

    // 基于吞吐量的建议
    if (analysis.summary.averageThroughput < 1) {
      recommendations.push({
        type: "throughput",
        priority: "medium",
        message: "操作吞吐量较低，建议检查客户端性能",
        metric: analysis.summary.averageThroughput,
        threshold: 1,
      });
    }

    // 基于同步质量的建议
    for (const [benchmarkName, benchmark] of Object.entries(
      analysis.benchmarks
    )) {
      if (
        benchmark.synchronization &&
        !benchmark.synchronization.isSynchronized
      ) {
        recommendations.push({
          type: "synchronization",
          priority: "high",
          message: `${benchmarkName} 同步质量较差，可能存在冲突解决问题`,
          benchmark: benchmarkName,
          syncQuality: benchmark.synchronization.syncQuality,
        });
      }
    }

    return recommendations;
  }

  /**
   * 生成分析报告
   */
  generateReport(analysis) {
    const report = {
      title: "OT性能分析报告",
      timestamp: new Date().toISOString(),
      summary: analysis.summary,
      benchmarks: analysis.benchmarks,
      recommendations: analysis.recommendations,
      metadata: {
        algorithm: "OT (Operational Transformation)",
        testFramework: "Playwright",
        analysisTool: "OTAnalyzer",
      },
    };

    return report;
  }

  /**
   * 保存分析报告
   */
  saveReport(report) {
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // 保存JSON报告
    const jsonPath = path.join(this.outputDir, "ot_benchmark_report.json");
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // 保存HTML报告
    const htmlPath = path.join(this.outputDir, "ot_benchmark_report.html");
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlPath, htmlContent);

    console.log("📊 OT分析报告已保存:");
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);

    return { json: jsonPath, html: htmlPath };
  }

  /**
   * 生成HTML报告
   */
  generateHTMLReport(report) {
    // 计算性能指标
    const benchmarks = Object.values(report.benchmarks).filter(
      (b) => b.status === "success"
    );
    const avgLatency =
      benchmarks.length > 0
        ? benchmarks.reduce(
            (sum, b) =>
              sum +
              (b.userA?.performance?.latency?.average || 0) +
              (b.userB?.performance?.latency?.average || 0),
            0
          ) /
          (benchmarks.length * 2)
        : 0;
    const avgBandwidth =
      benchmarks.length > 0
        ? benchmarks.reduce(
            (sum, b) =>
              sum +
              (b.userA?.performance?.network?.bytesSent || 0) +
              (b.userB?.performance?.network?.bytesSent || 0),
            0
          ) /
          (benchmarks.length * 2)
        : 0;
    const avgOperations =
      benchmarks.length > 0
        ? benchmarks.reduce(
            (sum, b) =>
              sum +
              (b.userA?.performance?.throughput?.operationsPerSecond || 0) +
              (b.userB?.performance?.throughput?.operationsPerSecond || 0),
            0
          ) /
          (benchmarks.length * 2)
        : 0;

    // 找到最佳和最差性能
    const latencyData = benchmarks.map((b) => ({
      name: b.name,
      latency:
        ((b.userA?.performance?.latency?.average || 0) +
          (b.userB?.performance?.latency?.average || 0)) /
        2,
    }));
    const bestPerformance = latencyData.reduce(
      (min, b) => (b.latency < min.latency ? b : min),
      latencyData[0] || {}
    );
    const worstPerformance = latencyData.reduce(
      (max, b) => (b.latency > max.latency ? b : max),
      latencyData[0] || {}
    );

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OT Multi-Benchmark Performance Analysis Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #e74c3c;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #e74c3c;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .summary-card p {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            color: #e74c3c;
        }
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .benchmark-details {
            margin: 20px 0;
        }
        .benchmark-card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 10px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .benchmark-card h3 {
            color: #2c3e50;
            margin-top: 0;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .metric {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        .metric-label {
            font-size: 12px;
            color: #7f8c8d;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
        }
        .recommendations {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .recommendation {
            margin: 10px 0;
            padding: 10px;
            background: #fff;
            border-radius: 5px;
            border-left: 4px solid #f39c12;
        }
        .priority-high { border-left-color: #e74c3c; }
        .priority-medium { border-left-color: #f39c12; }
        .priority-low { border-left-color: #27ae60; }
    </style>
</head>
<body>
    <div class="container">
        <h1>OT Multi-Benchmark Performance Analysis Report</h1>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Benchmarks</h3>
                <p>${benchmarks.length}</p>
            </div>
            <div class="summary-card">
                <h3>Average Latency</h3>
                <p>${avgLatency.toFixed(2)} ms</p>
            </div>
            <div class="summary-card">
                <h3>Average Bandwidth</h3>
                <p>${avgBandwidth.toFixed(2)} KB/s</p>
            </div>
            <div class="summary-card">
                <h3>Average Operations</h3>
                <p>${avgOperations.toFixed(2)} ops/s</p>
            </div>
        </div>

        <h2>Benchmark Performance Comparison</h2>

        <div class="chart-container">
            <canvas id="latencyChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="bandwidthChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="operationsChart" width="400" height="200"></canvas>
        </div>

        <h2>Detailed Benchmark Results</h2>
        <div class="benchmark-details">
            ${benchmarks
              .map(
                (benchmark) => `
                <div class="benchmark-card">
                    <h3>${benchmark.name}</h3>
                    <p><strong>描述:</strong> ${benchmark.description}</p>
                    <p><strong>测试类型:</strong> ${
                      benchmark.testType || "unknown"
                    }</p>
                    <p><strong>时间戳:</strong> ${new Date(
                      benchmark.timestamp
                    ).toLocaleString()}</p>

                    <div class="metrics-grid">
                        <div class="metric">
                            <div class="metric-label">Average Latency</div>
                            <div class="metric-value">${
                              ((benchmark.userA?.performance?.latency
                                ?.average || 0) +
                                (benchmark.userB?.performance?.latency
                                  ?.average || 0)) /
                              2
                            } ms</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">P95 Latency</div>
                            <div class="metric-value">${
                              ((benchmark.userA?.performance?.latency?.p95 ||
                                0) +
                                (benchmark.userB?.performance?.latency?.p95 ||
                                  0)) /
                              2
                            } ms</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Bandwidth Usage</div>
                            <div class="metric-value">${
                              ((benchmark.userA?.performance?.network
                                ?.bytesSent || 0) +
                                (benchmark.userB?.performance?.network
                                  ?.bytesSent || 0)) /
                              2
                            } bytes</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Operation Rate</div>
                            <div class="metric-value">${
                              ((benchmark.userA?.performance?.throughput
                                ?.operationsPerSecond || 0) +
                                (benchmark.userB?.performance?.throughput
                                  ?.operationsPerSecond || 0)) /
                              2
                            } ops/s</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Total Operations</div>
                            <div class="metric-value">${
                              (benchmark.userA?.performance?.operations
                                ?.total || 0) +
                              (benchmark.userB?.performance?.operations
                                ?.total || 0)
                            }</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Collaborators</div>
                            <div class="metric-value">2</div>
                        </div>
                    </div>
                </div>
            `
              )
              .join("")}
        </div>

        <h2>Performance Recommendations</h2>
        <div class="recommendations">
            ${
              report.recommendations.length > 0
                ? report.recommendations
                    .map(
                      (rec) => `
                    <div class="recommendation priority-${rec.priority}">
                        <strong>${rec.type.toUpperCase()}</strong> (优先级: ${
                        rec.priority
                      })
                        <p>${rec.message}</p>
                        ${rec.metric ? `<p>指标: ${rec.metric}</p>` : ""}
                    </div>
                `
                    )
                    .join("")
                : "<p>所有基准测试表现良好，无需特别优化建议。</p>"
            }
        </div>

        <h2>Best/Worst Performance Benchmarks</h2>
        <div class="benchmark-details">
            <div class="benchmark-card">
                <h3>🏆 Best Performance: ${bestPerformance.name}</h3>
                <p>Average Latency: ${bestPerformance.latency.toFixed(2)} ms</p>
            </div>
            <div class="benchmark-card">
                <h3>⚠️ Worst Performance: ${worstPerformance.name}</h3>
                <p>Average Latency: ${worstPerformance.latency.toFixed(
                  2
                )} ms</p>
            </div>
        </div>
    </div>

    <script>
        // 延迟对比图表
        new Chart(document.getElementById('latencyChart'), {
            type: 'bar',
            data: {
                labels: [${benchmarks.map((b) => `"${b.name}"`).join(",")}],
                datasets: [
                    {
                        label: 'Average Latency (ms)',
                        data: [${benchmarks
                          .map(
                            (b) =>
                              ((b.userA?.performance?.latency?.average || 0) +
                                (b.userB?.performance?.latency?.average || 0)) /
                              2
                          )
                          .join(",")}],
                        backgroundColor: 'rgba(231, 76, 60, 0.5)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'P95 Latency (ms)',
                        data: [${benchmarks
                          .map(
                            (b) =>
                              ((b.userA?.performance?.latency?.p95 || 0) +
                                (b.userB?.performance?.latency?.p95 || 0)) /
                              2
                          )
                          .join(",")}],
                        backgroundColor: 'rgba(155, 89, 182, 0.5)',
                        borderColor: 'rgba(155, 89, 182, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '延迟性能对比'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '延迟 (ms)'
                        }
                    }
                }
            }
        });

        // 带宽对比图表
        new Chart(document.getElementById('bandwidthChart'), {
            type: 'bar',
            data: {
                labels: [${benchmarks.map((b) => `"${b.name}"`).join(",")}],
                datasets: [{
                    label: 'Bandwidth Usage (bytes)',
                    data: [${benchmarks
                      .map(
                        (b) =>
                          ((b.userA?.performance?.network?.bytesSent || 0) +
                            (b.userB?.performance?.network?.bytesSent || 0)) /
                          2
                      )
                      .join(",")}],
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Bandwidth Usage Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Bandwidth (KB/s)'
                        }
                    }
                }
            }
        });

        // 操作频率对比图表
        new Chart(document.getElementById('operationsChart'), {
            type: 'bar',
            data: {
                labels: [${benchmarks.map((b) => `"${b.name}"`).join(",")}],
                datasets: [{
                    label: 'Operation Rate (ops/s)',
                    data: [${benchmarks
                      .map(
                        (b) =>
                          ((b.userA?.performance?.throughput
                            ?.operationsPerSecond || 0) +
                            (b.userB?.performance?.throughput
                              ?.operationsPerSecond || 0)) /
                          2
                      )
                      .join(",")}],
                    backgroundColor: 'rgba(46, 204, 113, 0.5)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Operation Rate Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Operation Rate (ops/s)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;
  }

  /**
   * 运行完整分析
   */
  run() {
    console.log("🔍 开始OT性能分析...");

    const results = this.loadOTResults();
    if (Object.keys(results).length === 0) {
      console.log("❌ 未找到OT测试结果文件");
      return;
    }

    console.log(`📊 找到 ${Object.keys(results).length} 个测试结果`);

    const analysis = this.analyzePerformance(results);
    const report = this.generateReport(analysis);
    const savedPaths = this.saveReport(report);

    console.log("✅ OT性能分析完成");
    console.log(`📈 平均延迟: ${analysis.summary.averageLatency.toFixed(2)}ms`);
    console.log(
      `🚀 平均吞吐量: ${analysis.summary.averageThroughput.toFixed(2)} ops/s`
    );
    console.log(`💡 生成 ${analysis.recommendations.length} 条建议`);

    return savedPaths;
  }
}

// 运行分析
if (require.main === module) {
  const analyzer = new OTAnalyzer();
  analyzer.run();
}

module.exports = OTAnalyzer;
