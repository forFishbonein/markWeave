const MultiBenchmarkAnalyzer = require("./analysis/multiBenchmarkAnalyzer");
const path = require("path");

async function runMultiBenchmarkAnalysis() {
  console.log("🚀 开始多基准测试分析...\n");

  // 创建分析器实例
  const analyzer = new MultiBenchmarkAnalyzer();

  // 加载所有基准测试结果
  console.log("📁 加载基准测试结果...");
  const loadSuccess = analyzer.loadAllResults();

  if (!loadSuccess) {
    console.error("❌ 无法加载基准测试结果，请确保已运行基准测试");
    return;
  }

  // 分析所有基准测试
  console.log("\n🔍 分析基准测试数据...");
  const analysis = analyzer.analyzeAllBenchmarks();

  // 保存分析结果
  console.log("\n💾 保存分析结果...");
  analyzer.saveAnalysis();

  // 生成图表数据
  console.log("\n📊 生成图表数据...");
  const chartData = analyzer.generateChartData();

  // 创建HTML报告
  console.log("\n📄 生成HTML报告...");

  // 创建多基准测试的HTML报告
  const htmlContent = generateMultiBenchmarkReport(analysis, chartData);

  const reportPath = path.join(
    __dirname,
    "results/multi_benchmark_report.html"
  );
  require("fs").writeFileSync(reportPath, htmlContent, "utf8");

  console.log(`✅ HTML报告已生成: ${reportPath}`);
  console.log("\n🎉 多基准测试分析完成！");
}

function generateMultiBenchmarkReport(analysis, chartData) {
  const benchmarkNames = Object.keys(analysis.benchmarks);
  const benchmarkLabels = benchmarkNames.map(
    (name) => analysis.benchmarks[name].name
  );

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRDT多基准测试性能分析报告</title>
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
            border-bottom: 3px solid #3498db;
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
            border-left: 4px solid #3498db;
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
        <h1>CRDT多基准测试性能分析报告</h1>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>总基准测试数</h3>
                <p>${analysis.summary.totalBenchmarks}</p>
            </div>
            <div class="summary-card">
                <h3>整体平均延迟</h3>
                <p>${analysis.summary.overallAvgLatency.toFixed(2)} ms</p>
            </div>
            <div class="summary-card">
                <h3>整体平均带宽</h3>
                <p>${analysis.summary.overallAvgBandwidth.toFixed(2)} KB/s</p>
            </div>
            <div class="summary-card">
                <h3>整体操作频率</h3>
                <p>${analysis.summary.overallAvgOperationsPerSecond.toFixed(
                  2
                )} ops/s</p>
            </div>
        </div>

        <h2>基准测试性能对比</h2>

        <div class="chart-container">
            <canvas id="latencyChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="bandwidthChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="operationsChart" width="400" height="200"></canvas>
        </div>

        <h2>各基准测试详细结果</h2>
        <div class="benchmark-details">
            ${Object.keys(analysis.benchmarks)
              .map((benchmarkKey) => {
                const benchmark = analysis.benchmarks[benchmarkKey];
                return `
                <div class="benchmark-card">
                    <h3>${benchmark.name}</h3>
                    <p><strong>描述:</strong> ${benchmark.description}</p>
                    <p><strong>测试类型:</strong> ${benchmark.testType}</p>
                    <p><strong>时间戳:</strong> ${new Date(
                      benchmark.timestamp
                    ).toLocaleString()}</p>

                    <div class="metrics-grid">
                        <div class="metric">
                            <div class="metric-label">平均延迟</div>
                            <div class="metric-value">${benchmark.summary.avgLatency.toFixed(
                              2
                            )} ms</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">P95延迟</div>
                            <div class="metric-value">${benchmark.summary.avgP95Latency.toFixed(
                              2
                            )} ms</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">带宽使用</div>
                            <div class="metric-value">${benchmark.summary.avgBandwidth.toFixed(
                              2
                            )} KB/s</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">操作频率</div>
                            <div class="metric-value">${benchmark.summary.avgOperationsPerSecond.toFixed(
                              2
                            )} ops/s</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">E2E延迟</div>
                            <div class="metric-value">${benchmark.summary.avgE2ELatency.toFixed(
                              2
                            )} ms</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">协作者数</div>
                            <div class="metric-value">${
                              benchmark.summary.totalCollaborators
                            }</div>
                        </div>
                    </div>
                </div>
                `;
              })
              .join("")}
        </div>

        <h2>性能建议</h2>
        <div class="recommendations">
            ${
              analysis.recommendations.length > 0
                ? analysis.recommendations
                    .map(
                      (rec) => `
                    <div class="recommendation priority-${rec.priority}">
                        <strong>${rec.type.toUpperCase()} - ${rec.priority.toUpperCase()}</strong><br>
                        ${rec.message}<br>
                        <em>相关基准测试: ${rec.benchmark}</em>
                    </div>
                `
                    )
                    .join("")
                : "<p>所有基准测试表现良好，无需特别优化建议。</p>"
            }
        </div>

        <h2>最佳/最差性能基准测试</h2>
        <div class="benchmark-details">
            <div class="benchmark-card">
                <h3>🏆 最佳性能: ${
                  analysis.summary.bestPerformingBenchmark.name
                }</h3>
                <p>平均延迟: ${analysis.summary.bestPerformingBenchmark.avgLatency.toFixed(
                  2
                )} ms</p>
            </div>
            <div class="benchmark-card">
                <h3>⚠️ 最差性能: ${
                  analysis.summary.worstPerformingBenchmark.name
                }</h3>
                <p>平均延迟: ${analysis.summary.worstPerformingBenchmark.avgLatency.toFixed(
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
                labels: ${JSON.stringify(benchmarkLabels)},
                datasets: [
                    {
                        label: '平均延迟 (ms)',
                        data: ${JSON.stringify(
                          chartData.latencyComparison.datasets[0].data
                        )},
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'P95延迟 (ms)',
                        data: ${JSON.stringify(
                          chartData.latencyComparison.datasets[1].data
                        )},
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
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
                labels: ${JSON.stringify(benchmarkLabels)},
                datasets: [{
                    label: '带宽使用 (KB/s)',
                    data: ${JSON.stringify(
                      chartData.bandwidthComparison.datasets[0].data
                    )},
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '带宽使用对比'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '带宽 (KB/s)'
                        }
                    }
                }
            }
        });

        // 操作频率对比图表
        new Chart(document.getElementById('operationsChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(benchmarkLabels)},
                datasets: [{
                    label: '操作频率 (ops/s)',
                    data: ${JSON.stringify(
                      chartData.operationsComparison.datasets[0].data
                    )},
                    backgroundColor: 'rgba(255, 205, 86, 0.5)',
                    borderColor: 'rgba(255, 205, 86, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '操作频率对比'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '操作频率 (ops/s)'
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

// 运行分析
runMultiBenchmarkAnalysis().catch(console.error);
