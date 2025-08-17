const fs = require("fs");
const path = require("path");

/**
 * OT Performance Analyzer (all-English HTML, 2-decimal formatting)
 */
class OTAnalyzer {
  constructor() {
    this.resultsDir = path.join(__dirname, "results");
    this.outputDir = path.join(__dirname, "results");
  }

  /**
   * Load OT test results
   */
  loadOTResults() {
    const results = {};

    // Single benchmark results
    for (let i = 1; i <= 4; i++) {
      const p = path.join(
        this.resultsDir,
        `ot_dual_user_benchmark${i}_result.json`
      );
      if (fs.existsSync(p)) {
        try {
          results[`benchmark${i}`] = JSON.parse(fs.readFileSync(p, "utf8"));
        } catch (e) {
          console.warn(`⚠️ Failed to read benchmark${i}:`, e.message);
        }
      }
    }

    // Summary results — merge only the "results" field if present
    const summaryCandidates = [
      "ot_dual_user_all_benchmarks_result.json",
      "ot_dual_user_all_results.json",
    ];
    for (const file of summaryCandidates) {
      const full = path.join(this.resultsDir, file);
      if (fs.existsSync(full)) {
        try {
          const all = JSON.parse(fs.readFileSync(full, "utf8"));
          if (all && typeof all.results === "object") {
            Object.assign(results, all.results);
          } else {
            console.warn(`⚠️ ${file} has no "results" field, ignored.`);
          }
        } catch (e) {
          console.warn(`⚠️ Failed to read ${file}:`, e.message);
        }
      }
    }

    return results;
  }

  /**
   * Analyze performance
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

    const isValid = (r) => r && typeof r === "object";

    for (const [key, result] of Object.entries(results)) {
      if (!isValid(result)) continue;

      analysis.summary.totalTests++;

      if (result.error) {
        analysis.summary.failedTests++;
        analysis.benchmarks[key] = {
          status: "failed",
          error: result.error,
          name: result.name || key,
        };
        continue;
      }

      analysis.summary.successfulTests++;

      const bench = {
        status: "success",
        name: (result.name && String(result.name)) || String(key),
        description: result.description || "",
        timestamp: result.timestamp,
        userA: this.analyzeUserData(result.userA),
        userB: this.analyzeUserData(result.userB),
        synchronization: this.analyzeSynchronization(
          result.userA,
          result.userB
        ),
        e2e: result.e2e || null,
      };

      // Accumulate stats (A)
      if (result.userA?.stats) {
        const s = result.userA.stats;
        if (s.avgLatency != null) {
          totalLatency += s.avgLatency;
          latencyCount++;
        }
        if (s.opsPerSecond != null) {
          totalThroughput += s.opsPerSecond;
          throughputCount++;
        }
        if (s.bytesSent != null) totalBytes += s.bytesSent;
        if (s.messagesSent != null) totalMessages += s.messagesSent;
      }
      // Accumulate stats (B)
      if (result.userB?.stats) {
        const s = result.userB.stats;
        if (s.avgLatency != null) {
          totalLatency += s.avgLatency;
          latencyCount++;
        }
        if (s.opsPerSecond != null) {
          totalThroughput += s.opsPerSecond;
          throughputCount++;
        }
        if (s.bytesSent != null) totalBytes += s.bytesSent;
        if (s.messagesSent != null) totalMessages += s.messagesSent;
      }

      analysis.benchmarks[key] = bench;
    }

    if (latencyCount > 0)
      analysis.summary.averageLatency = totalLatency / latencyCount;
    if (throughputCount > 0)
      analysis.summary.averageThroughput = totalThroughput / throughputCount;
    analysis.summary.totalBytesTransferred = totalBytes;
    analysis.summary.totalMessages = totalMessages;

    analysis.recommendations = this.generateRecommendations(analysis);
    return analysis;
  }

  /**
   * Analyze single user data
   */
  analyzeUserData(userData) {
    if (!userData?.stats) return { status: "no_data" };

    const s = userData.stats;
    return {
      status: "success",
      email: userData.email,
      content: userData.content,
      performance: {
        latency: {
          average: s.avgLatency || 0,
          p95: s.p95Latency || 0,
          samples: s.latencySamples || 0,
        },
        e2e: {
          average: s.avgE2ELatency || 0,
          p95: s.p95E2ELatency || s.p95E2E || 0, // compatibility
          samples: s.e2eSamples || 0,
        },
        throughput: {
          operationsPerSecond: s.opsPerSecond || 0,
          keystrokesPerSecond: s.keystrokesPerSecond || 0,
          messagesPerSecond: s.messagesPerSecond || 0,
        },
        network: {
          bytesSent: s.bytesSent || 0,
          bytesReceived: s.bytesReceived || 0,
          messagesSent: s.messagesSent || 0,
          messagesReceived: s.messagesReceived || 0,
        },
        operations: {
          total: s.operationsCount || 0,
          pending: s.pendingOperations || 0,
          conflicts: s.conflictResolutions || 0,
        },
        monitoring: {
          duration: s.monitoringDuration || 0,
          uptime: s.uptime || 0,
          isConnected: s.isConnected || false,
        },
      },
    };
  }

  /**
   * Analyze synchronization quality
   */
  analyzeSynchronization(userA, userB) {
    const contentA = userA?.content || "";
    const contentB = userB?.content || "";
    const lengthDiff = Math.abs(contentA.length - contentB.length);
    const maxLength = Math.max(contentA.length, contentB.length);
    const syncQuality =
      maxLength > 0 ? (1 - lengthDiff / maxLength) * 100 : 100;
    return {
      contentLengthA: contentA.length,
      contentLengthB: contentB.length,
      lengthDifference: lengthDiff,
      syncQuality,
      isSynchronized: syncQuality > 90,
      contentA,
      contentB,
    };
  }

  /**
   * Recommendations
   */
  generateRecommendations(analysis) {
    const recs = [];
    if (analysis.summary.averageLatency > 100) {
      recs.push({
        type: "latency",
        priority: "high",
        message:
          "Average latency is high. Consider optimizing network or batching operations.",
        metric: analysis.summary.averageLatency,
        threshold: 100,
      });
    }
    if (analysis.summary.averageThroughput < 1) {
      recs.push({
        type: "throughput",
        priority: "medium",
        message:
          "Operation throughput is low. Check client performance and event handling.",
        metric: analysis.summary.averageThroughput,
        threshold: 1,
      });
    }
    for (const b of Object.values(analysis.benchmarks)) {
      if (b?.synchronization && !b.synchronization.isSynchronized) {
        recs.push({
          type: "synchronization",
          priority: "high",
          message: `${b.name} shows poor synchronization. Conflict resolution might be incorrect.`,
          benchmark: b.name,
          syncQuality: b.synchronization.syncQuality,
        });
      }
    }
    return recs;
  }

  /**
   * Build report object
   */
  generateReport(analysis) {
    return {
      title: "OT Performance Report",
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
  }

  /**
   * Save report (JSON + HTML)
   */
  saveReport(report) {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    const jsonPath = path.join(this.outputDir, "ot_benchmark_report.json");
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    const htmlPath = path.join(this.outputDir, "ot_benchmark_report.html");
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlPath, htmlContent);

    console.log("📊 Report saved:");
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
    return { json: jsonPath, html: htmlPath };
  }

  /**
   * Generate all-English HTML with 2-decimal numbers
   */
  generateHTMLReport(report) {
    const fmt = (n) => (Number.isFinite(n) ? Number(n).toFixed(2) : "0.00");
    const intf = (n) => (Number.isFinite(n) ? Math.round(n) : 0);
    const toEN = (ts) =>
      ts ? new Date(ts).toLocaleString("en-US", { hour12: false }) : "-";

    // Successful entries only
    const rows = Object.values(report.benchmarks).filter(
      (b) =>
        b &&
        b.status === "success" &&
        typeof b.name === "string" &&
        b.name.trim().length > 0
    );

    // Series arrays (aligned)
    const labels = rows.map((b) => b.name);
    const avgLatencyArr = rows.map(
      (b) =>
        ((b.userA?.performance?.latency?.average || 0) +
          (b.userB?.performance?.latency?.average || 0)) /
        2
    );
    const p95LatencyArr = rows.map(
      (b) =>
        ((b.userA?.performance?.latency?.p95 || 0) +
          (b.userB?.performance?.latency?.p95 || 0)) /
        2
    );
    const bandwidthArr = rows.map(
      (b) =>
        ((b.userA?.performance?.network?.bytesSent || 0) +
          (b.userB?.performance?.network?.bytesSent || 0)) /
        2
    );
    const opsArr = rows.map(
      (b) =>
        ((b.userA?.performance?.throughput?.operationsPerSecond || 0) +
          (b.userB?.performance?.throughput?.operationsPerSecond || 0)) /
        2
    );
    const e2eAvgArr = rows.map(
      (b) =>
        ((b.userA?.performance?.e2e?.average || 0) +
          (b.userB?.performance?.e2e?.average || 0)) /
        2
    );
    const e2eP95Arr = rows.map(
      (b) =>
        ((b.userA?.performance?.e2e?.p95 || 0) +
          (b.userB?.performance?.e2e?.p95 || 0)) /
        2
    );

    // Summary cards
    const avgLatency = rows.length
      ? avgLatencyArr.reduce((a, b) => a + b, 0) / rows.length
      : 0;
    const avgBandwidth = rows.length
      ? bandwidthArr.reduce((a, b) => a + b, 0) / rows.length
      : 0;
    const avgOperations = rows.length
      ? opsArr.reduce((a, b) => a + b, 0) / rows.length
      : 0;
    const avgE2E = rows.length
      ? e2eAvgArr.reduce((a, b) => a + b, 0) / rows.length
      : 0;

    const latencyData = rows.map((b, i) => ({
      name: labels[i],
      latency: avgLatencyArr[i],
    }));
    const bestPerformance =
      latencyData.length > 0
        ? latencyData.reduce(
            (min, x) => (x.latency < min.latency ? x : min),
            latencyData[0]
          )
        : { name: "-", latency: 0 };
    const worstPerformance =
      latencyData.length > 0
        ? latencyData.reduce(
            (max, x) => (x.latency > max.latency ? x : max),
            latencyData[0]
          )
        : { name: "-", latency: 0 };

    // Pre-serialize arrays to avoid undefined
    const labelsJSON = JSON.stringify(labels);
    const avgLatencyJSON = JSON.stringify(avgLatencyArr);
    const p95LatencyJSON = JSON.stringify(p95LatencyArr);
    const bandwidthJSON = JSON.stringify(bandwidthArr);
    const opsJSON = JSON.stringify(opsArr);
    const e2eAvgJSON = JSON.stringify(e2eAvgArr);
    const e2eP95JSON = JSON.stringify(e2eP95Arr);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OT Multi-Benchmark Performance Analysis Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; margin:0; padding:20px; background:#f5f5f5; }
    .container { max-width:1200px; margin:0 auto; background:#fff; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
    h1 { color:#2c3e50; text-align:center; margin-bottom:30px; border-bottom:3px solid #e74c3c; padding-bottom:10px; }
    h2 { color:#34495e; margin:30px 0 15px; }
    .summary-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px; }
    .summary-card { background:#ecf0f1; padding:16px; border-radius:8px; border-left:4px solid #e74c3c; }
    .summary-card h3 { margin:0 0 8px; color:#2c3e50; font-size:14px; }
    .summary-card p { margin:0; font-size:22px; font-weight:700; color:#e74c3c; }
    .chart-container { margin: 30px 0; padding: 20px; background:#f8f9fa; border-radius:8px; }
    .benchmark-details { margin: 20px 0; }
    .benchmark-card { background:#fff; border:1px solid #ddd; border-radius:8px; padding:20px; margin:10px 0; box-shadow:0 2px 4px rgba(0,0,0,.06); }
    .benchmark-card h3 { margin-top:0; }
    .metrics-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:12px; margin-top:12px; }
    .metric { background:#f8f9fa; padding:10px; border-radius:6px; text-align:center; }
    .metric-label { font-size:12px; color:#7f8c8d; margin-bottom:4px; }
    .metric-value { font-size:18px; font-weight:700; color:#2c3e50; }
    .recommendations { background:#fff3cd; border:1px solid #ffeaa7; border-radius:8px; padding:20px; margin:20px 0; }
    .recommendation { margin:10px 0; padding:10px; background:#fff; border-radius:6px; border-left:4px solid #f39c12; }
    .priority-high { border-left-color:#e74c3c; }
    .priority-medium { border-left-color:#f39c12; }
    .priority-low { border-left-color:#27ae60; }
  </style>
</head>
<body>
  <div class="container">
    <h1>OT Multi-Benchmark Performance Analysis Report</h1>

    <div class="summary-grid">
      <div class="summary-card"><h3>Total Benchmarks</h3><p>${
        rows.length
      }</p></div>
      <div class="summary-card"><h3>Average Latency</h3><p>${fmt(
        avgLatency
      )} ms</p></div>
      <div class="summary-card"><h3>Average Bandwidth</h3><p>${fmt(
        avgBandwidth
      )} bytes</p></div>
      <div class="summary-card"><h3>Average Operations</h3><p>${fmt(
        avgOperations
      )} ops/s</p></div>
      <div class="summary-card"><h3>Average E2E Latency</h3><p>${fmt(
        avgE2E
      )} ms</p></div>
    </div>

    <h2>Benchmark Performance Comparison</h2>

    <div class="chart-container">
      <canvas id="latencyChart" height="200"></canvas>
    </div>

    <div class="chart-container">
      <canvas id="bandwidthChart" height="200"></canvas>
    </div>

    <div class="chart-container">
      <canvas id="operationsChart" height="200"></canvas>
    </div>

    <div class="chart-container">
      <canvas id="e2eChart" height="200"></canvas>
    </div>

    <h2>Detailed Benchmark Results</h2>
    <div class="benchmark-details">
      ${rows
        .map(
          (b) => `
        <div class="benchmark-card">
          <h3>${b.name}</h3>
          <p><strong>Description:</strong> ${b.description || ""}</p>
          <p><strong>Timestamp:</strong> ${toEN(b.timestamp)}</p>
          <div class="metrics-grid">
            <div class="metric"><div class="metric-label">Average Latency</div><div class="metric-value">${fmt(
              ((b.userA?.performance?.latency?.average || 0) +
                (b.userB?.performance?.latency?.average || 0)) /
                2
            )} ms</div></div>
            <div class="metric"><div class="metric-label">P95 Latency</div><div class="metric-value">${fmt(
              ((b.userA?.performance?.latency?.p95 || 0) +
                (b.userB?.performance?.latency?.p95 || 0)) /
                2
            )} ms</div></div>
            <div class="metric"><div class="metric-label">E2E Avg</div><div class="metric-value">${fmt(
              ((b.userA?.performance?.e2e?.average || 0) +
                (b.userB?.performance?.e2e?.average || 0)) /
                2
            )} ms</div></div>
            <div class="metric"><div class="metric-label">E2E P95</div><div class="metric-value">${fmt(
              ((b.userA?.performance?.e2e?.p95 || 0) +
                (b.userB?.performance?.e2e?.p95 || 0)) /
                2
            )} ms</div></div>
            <div class="metric"><div class="metric-label">Bandwidth (bytes)</div><div class="metric-value">${fmt(
              ((b.userA?.performance?.network?.bytesSent || 0) +
                (b.userB?.performance?.network?.bytesSent || 0)) /
                2
            )}</div></div>
            <div class="metric"><div class="metric-label">Ops Rate</div><div class="metric-value">${fmt(
              ((b.userA?.performance?.throughput?.operationsPerSecond || 0) +
                (b.userB?.performance?.throughput?.operationsPerSecond || 0)) /
                2
            )} ops/s</div></div>
            <div class="metric"><div class="metric-label">Total Operations</div><div class="metric-value">${intf(
              (b.userA?.performance?.operations?.total || 0) +
                (b.userB?.performance?.operations?.total || 0)
            )}</div></div>
          </div>
        </div>`
        )
        .join("")}
    </div>

    <h2>Performance Recommendations</h2>
    <div class="recommendations">
      ${
        report.recommendations.length
          ? report.recommendations
              .map(
                (r) => `
          <div class="recommendation priority-${r.priority}">
            <strong>${r.type.toUpperCase()}</strong> (Priority: ${r.priority})
            <p>${r.message}</p>
            ${r.metric ? `<p>Metric: ${fmt(r.metric)}</p>` : ""}
          </div>`
              )
              .join("")
          : "<p>All benchmarks look good. No special actions required.</p>"
      }
    </div>

    <h2>Best/Worst Performance Benchmarks</h2>
    <div class="benchmark-details">
      <div class="benchmark-card">
        <h3>🏆 Best Performance: ${bestPerformance.name}</h3>
        <p>Average Latency: ${fmt(bestPerformance.latency)} ms</p>
      </div>
      <div class="benchmark-card">
        <h3>⚠️ Worst Performance: ${worstPerformance.name}</h3>
        <p>Average Latency: ${fmt(worstPerformance.latency)} ms</p>
      </div>
    </div>
  </div>

  <script>
    const labels = ${labelsJSON};

    // Latency comparison
    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Average Latency (ms)', data: ${avgLatencyJSON}, borderWidth: 1, backgroundColor: 'rgba(231, 76, 60, 0.5)', borderColor: 'rgba(231, 76, 60, 1)' },
          { label: 'P95 Latency (ms)', data: ${p95LatencyJSON}, borderWidth: 1, backgroundColor: 'rgba(155, 89, 182, 0.5)', borderColor: 'rgba(155, 89, 182, 1)' }
        ]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Latency Comparison' } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Latency (ms)' } } }
      }
    });

    // Bandwidth comparison
    new Chart(document.getElementById('bandwidthChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Bandwidth (bytes)', data: ${bandwidthJSON}, borderWidth: 1, backgroundColor: 'rgba(52, 152, 219, 0.5)', borderColor: 'rgba(52, 152, 219, 1)' }
        ]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Bandwidth Usage Comparison' } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Bytes' } } }
      }
    });

    // Operation rate
    new Chart(document.getElementById('operationsChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Operation Rate (ops/s)', data: ${opsJSON}, borderWidth: 1, backgroundColor: 'rgba(46, 204, 113, 0.5)', borderColor: 'rgba(46, 204, 113, 1)' }
        ]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Operation Rate Comparison' } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'ops/s' } } }
      }
    });

    // E2E latency
    new Chart(document.getElementById('e2eChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'E2E Avg (ms)', data: ${e2eAvgJSON}, borderWidth: 1, backgroundColor: 'rgba(54, 162, 235, 0.5)', borderColor: 'rgba(54, 162, 235, 1)' },
          { label: 'E2E P95 (ms)', data: ${e2eP95JSON}, borderWidth: 1, backgroundColor: 'rgba(153, 102, 255, 0.5)', borderColor: 'rgba(153, 102, 255, 1)' }
        ]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'E2E Latency Comparison' } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Latency (ms)' } } }
      }
    });
  </script>
</body>
</html>
    `;
  }

  /**
   * Run
   */
  run() {
    console.log("🔍 Start OT performance analysis...");
    const results = this.loadOTResults();
    if (Object.keys(results).length === 0) {
      console.log("❌ No OT result files found");
      return;
    }
    console.log(`📊 Found ${Object.keys(results).length} result entries`);

    const analysis = this.analyzePerformance(results);
    const report = this.generateReport(analysis);
    const saved = this.saveReport(report);

    console.log("✅ Analysis done");
    console.log(
      `📈 Avg latency: ${analysis.summary.averageLatency.toFixed(2)} ms`
    );
    console.log(
      `🚀 Avg throughput: ${analysis.summary.averageThroughput.toFixed(
        2
      )} ops/s`
    );
    console.log(`💡 Recommendations: ${analysis.recommendations.length}`);
    return saved;
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new OTAnalyzer();
  analyzer.run();
}

module.exports = OTAnalyzer;
