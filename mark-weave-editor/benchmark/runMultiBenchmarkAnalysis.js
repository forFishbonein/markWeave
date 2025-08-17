/**
 * CRDT/OT Multi-Benchmark Analyzer & HTML Report (single file)
 * Usage:
 *   node crdt-multi-benchmark-report.js
 *   node crdt-multi-benchmark-report.js --dir ./benchmark/results
 */

const fs = require("fs");
const path = require("path");

/* ------------------------- Analyzer Class ------------------------- */

class MultiBenchmarkAnalyzer {
  constructor() {
    this.allResults = {};
    this.analysis = {};
    this.resultsDir = null; // Selected results directory
  }

  // Smart loader: supports --dir and auto-tries common folders; accepts crdt_/ot_ prefixes
  loadAllResults(passedDir) {
    const candidates = [];
    if (passedDir) candidates.push(path.resolve(passedDir));

    // Common candidate paths (priority order)
    candidates.push(
      path.join(__dirname, "../results"),
      path.join(__dirname, "./results"),
      path.join(process.cwd(), "results"),
      path.join(__dirname, "results"),
      path.join(process.cwd(), "benchmark", "results"),
      path.join(__dirname, "../benchmark/results")
    );

    const tried = new Set();
    let selected = null;
    for (const dir of candidates) {
      const d = path.resolve(dir);
      if (tried.has(d)) continue;
      tried.add(d);
      if (fs.existsSync(d)) {
        selected = d;
        break;
      }
    }

    if (!selected) {
      console.error("❌ Results directory not found. Tried:");
      [...tried].forEach((d) => console.error("  -", d));
      return false;
    }

    this.resultsDir = selected;
    console.log("📁 Using results directory:", this.resultsDir);

    const files = fs.readdirSync(this.resultsDir);
    const resultFiles = files.filter((f) =>
      /^(crdt|ot)_dual_user_.*_result\.json$/.test(f)
    );

    console.log(`📄 Found ${resultFiles.length} result file(s)`);
    resultFiles.forEach((file) => {
      try {
        const p = path.join(this.resultsDir, file);
        const json = JSON.parse(fs.readFileSync(p, "utf8"));
        if (json.benchmark && json.benchmarkInfo && json.benchmarkInfo.name) {
          this.allResults[json.benchmark] = json;
          console.log(
            `✅ Loaded: ${json.benchmark} - ${json.benchmarkInfo.name}`
          );
        } else {
          console.log(`⏭️ Skip (not single result): ${file}`);
        }
      } catch (e) {
        console.error(`❌ Failed to parse ${file}:`, e.message);
      }
    });

    return Object.keys(this.allResults).length > 0;
  }

  analyzeAllBenchmarks() {
    const analysis = {
      summary: {},
      benchmarks: {},
      comparisons: {},
      recommendations: [],
    };

    const names = Object.keys(this.allResults);
    console.log(`🔍 Analyzing ${names.length} benchmark(s)...`);

    names.forEach((k) => {
      analysis.benchmarks[k] = this.analyzeSingleBenchmark(this.allResults[k]);
    });

    analysis.comparisons = this.generateBenchmarkComparisons(
      analysis.benchmarks
    );
    analysis.summary = this.generateSummary(analysis.benchmarks);
    analysis.recommendations = this.generateRecommendations(
      analysis.benchmarks
    );

    this.analysis = analysis;
    return analysis;
  }

  analyzeSingleBenchmark(result) {
    if (!result.benchmarkInfo || !result.benchmarkInfo.name) {
      throw new Error(
        `Invalid benchmark data: ${JSON.stringify(result, null, 2)}`
      );
    }

    const out = {
      name: result.benchmarkInfo.name, // expected English
      description: result.benchmarkInfo.description,
      testType: result.benchmarkInfo.testType,
      timestamp: result.timestamp,
      users: {},
      summary: {},
    };

    if (result.userA && (result.userA.crdt || result.userA.stats)) {
      out.users.userA = this.analyzeUserData(
        result.userA.crdt || result.userA.stats
      );
    }
    if (result.userB && (result.userB.crdt || result.userB.stats)) {
      out.users.userB = this.analyzeUserData(
        result.userB.crdt || result.userB.stats
      );
    }

    const users = Object.keys(out.users);
    if (users.length) {
      const avg = (arr) => this.calculateAverage(arr);

      out.summary = {
        avgLatency: avg(users.map((u) => out.users[u].latency.avg)),
        avgP95Latency: avg(users.map((u) => out.users[u].latency.p95)),
        avgBandwidth: avg(users.map((u) => out.users[u].network.bandwidth)),
        avgOperationsPerSecond: avg(
          users.map((u) => out.users[u].operations.perSecond)
        ),
        totalOperations: users.reduce(
          (s, u) => s + (out.users[u].operations.total || 0),
          0
        ),
        avgE2ELatency: avg(users.map((u) => out.users[u].e2e.avgLatency)),
        avgE2EP95Latency: avg(users.map((u) => out.users[u].e2e.p95Latency)),
        totalCollaborators: Math.max(
          ...users.map((u) => out.users[u].collaboration.activeCollaborators)
        ),
      };
    }

    return out;
  }

  // Map CRDT/OT field names into a unified schema
  analyzeUserData(d) {
    return {
      latency: {
        avg: d.avgLatency ?? d.avgLatencyMs ?? 0,
        p95: d.p95Latency ?? d.p95LatencyMs ?? 0,
        samples: d.latencySamples ?? 0,
      },
      network: {
        avgLatency: d.avgNetworkLatency ?? 0,
        bandwidth:
          d.bandwidthKBps ?? (d.bytesPerSecond ? d.bytesPerSecond / 1024 : 0), // KB/s
        sentBytes: d.sentBytes ?? d.bytesSent ?? 0,
        receivedBytes: d.receivedBytes ?? d.bytesReceived ?? 0,
      },
      operations: {
        total: d.documentUpdates ?? d.operationsCount ?? 0,
        perSecond: d.updatesPerSecond ?? d.opsPerSecond ?? 0, // ops/s
        keystrokes: d.keystrokes ?? 0,
        keystrokesPerSecond: d.keystrokesPerSecond ?? 0,
      },
      collaboration: {
        activeCollaborators: d.activeCollaborators ?? 2,
        awarenessChanges: d.totalAwarenessChanges ?? 0,
      },
      e2e: {
        avgLatency: d.avgE2ELatency ?? d.avgEndToEndLatency ?? 0,
        p95Latency: d.p95E2ELatency ?? d.p95EndToEndLatency ?? 0,
        samples: d.e2eSamples ?? 0,
      },
    };
  }

  generateBenchmarkComparisons(benchmarks) {
    const keys = Object.keys(benchmarks);
    const by = (picker) => keys.map((k) => picker(benchmarks[k].summary));

    return {
      orderedKeys: keys,
      latency: {
        avg: by((s) => s.avgLatency),
        p95: by((s) => s.avgP95Latency),
      },
      bandwidth: {
        kbps: by((s) => s.avgBandwidth),
      },
      operations: {
        ops: by((s) => s.avgOperationsPerSecond),
      },
      e2e: {
        avg: by((s) => s.avgE2ELatency),
        p95: by((s) => s.avgE2EP95Latency ?? 0),
      },
    };
  }

  generateSummary(benchmarks) {
    const keys = Object.keys(benchmarks);
    const S = keys.map((k) => benchmarks[k].summary);
    const avg = (arr) => this.calculateAverage(arr);

    const bestIdx = S.reduce(
      (best, s, i) => (s.avgLatency < S[best].avgLatency ? i : best),
      0
    );
    const worstIdx = S.reduce(
      (worst, s, i) => (s.avgLatency > S[worst].avgLatency ? i : worst),
      0
    );

    return {
      totalBenchmarks: keys.length,
      overallAvgLatency: avg(S.map((x) => x.avgLatency)),
      overallAvgP95Latency: avg(S.map((x) => x.avgP95Latency)),
      overallAvgBandwidth: avg(S.map((x) => x.avgBandwidth)),
      overallAvgOperationsPerSecond: avg(
        S.map((x) => x.avgOperationsPerSecond)
      ),
      overallAvgE2ELatency: avg(S.map((x) => x.avgE2ELatency)),
      bestPerformingBenchmark: {
        name: benchmarks[keys[bestIdx]].name,
        avgLatency: S[bestIdx].avgLatency,
      },
      worstPerformingBenchmark: {
        name: benchmarks[keys[worstIdx]].name,
        avgLatency: S[worstIdx].avgLatency,
      },
    };
  }

  generateRecommendations(benchmarks) {
    const recs = [];
    const sum = this.generateSummary(benchmarks);

    if (sum.overallAvgLatency > 100) {
      recs.push({
        type: "latency",
        priority: "high",
        message:
          "Overall average latency is high. Consider optimizing transport and batching.",
        benchmark: sum.worstPerformingBenchmark.name,
      });
    }
    if (sum.overallAvgBandwidth > 1000) {
      recs.push({
        type: "bandwidth",
        priority: "medium",
        message:
          "Bandwidth usage is high. Consider compression and reducing update frequency.",
        benchmark: sum.worstPerformingBenchmark.name,
      });
    }
    if (sum.overallAvgOperationsPerSecond > 50) {
      recs.push({
        type: "operations",
        priority: "low",
        message:
          "High operation rate handled well. Keep monitoring for saturation.",
        benchmark: sum.bestPerformingBenchmark.name,
      });
    }

    return recs;
  }

  // Build chart data with consistent ordering (avoid 'undefined' labels)
  generateChartData(analysis) {
    const orderedKeys = analysis.comparisons.orderedKeys;
    const labels = orderedKeys.map((k) => analysis.benchmarks[k].name);

    const pick = (arr) => orderedKeys.map((_, i) => Number(arr[i] ?? 0));

    return {
      labels,
      latency: {
        avg: pick(analysis.comparisons.latency.avg),
        p95: pick(analysis.comparisons.latency.p95),
      },
      bandwidth: {
        kbps: pick(analysis.comparisons.bandwidth.kbps),
      },
      operations: {
        ops: pick(analysis.comparisons.operations.ops),
      },
      e2e: {
        avg: pick(analysis.comparisons.e2e.avg),
        p95: pick(analysis.comparisons.e2e.p95),
      },
    };
  }

  saveAnalysis(outputPath) {
    const outDir = this.resultsDir || path.join(__dirname, "results");
    const fullPath =
      outputPath || path.join(outDir, "multi_benchmark_analysis.json");

    try {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(
        fullPath,
        JSON.stringify(this.analysis, null, 2),
        "utf8"
      );
      console.log(`✅ Analysis saved: ${fullPath}`);
      return true;
    } catch (e) {
      console.error("❌ Failed to save analysis:", e.message);
      return false;
    }
  }

  // helpers
  calculateAverage(values) {
    const v = values.filter((x) => x !== null && x !== undefined && !isNaN(x));
    if (!v.length) return 0;
    return v.reduce((s, x) => s + x, 0) / v.length;
  }
}

/* ------------------------- HTML Report ------------------------- */

function fmt2(n) {
  return Number(n || 0).toFixed(2);
}

function generateMultiBenchmarkReport(analysis, chartData) {
  const detailsHTML = Object.keys(analysis.benchmarks)
    .map((k) => {
      const b = analysis.benchmarks[k];
      const s = b.summary;
      return `
      <div class="benchmark-card">
        <h3>${b.name}</h3>
        <p><strong>Description:</strong> ${b.description || "-"}</p>
        <p><strong>Test Type:</strong> ${b.testType || "-"}</p>
        <p><strong>Timestamp:</strong> ${new Date(b.timestamp).toLocaleString(
          "en-US"
        )}</p>
        <div class="metrics-grid">
          <div class="metric"><div class="metric-label">Average Latency</div><div class="metric-value">${fmt2(
            s.avgLatency
          )} ms</div></div>
          <div class="metric"><div class="metric-label">P95 Latency</div><div class="metric-value">${fmt2(
            s.avgP95Latency
          )} ms</div></div>
          <div class="metric"><div class="metric-label">E2E Avg</div><div class="metric-value">${fmt2(
            s.avgE2ELatency
          )} ms</div></div>
          <div class="metric"><div class="metric-label">E2E P95</div><div class="metric-value">${fmt2(
            s.avgE2EP95Latency
          )} ms</div></div>
          <div class="metric"><div class="metric-label">Bandwidth</div><div class="metric-value">${fmt2(
            s.avgBandwidth
          )} KB/s</div></div>
          <div class="metric"><div class="metric-label">Operation Rate</div><div class="metric-value">${fmt2(
            s.avgOperationsPerSecond
          )} ops/s</div></div>
          <div class="metric"><div class="metric-label">Total Operations</div><div class="metric-value">${
            s.totalOperations || 0
          }</div></div>
          <div class="metric"><div class="metric-label">Collaborators</div><div class="metric-value">${
            s.totalCollaborators || 0
          }</div></div>
        </div>
      </div>`;
    })
    .join("");

  const recHTML =
    analysis.recommendations.length > 0
      ? analysis.recommendations
          .map(
            (r) => `
        <div class="recommendation priority-${r.priority}">
          <strong>${r.type.toUpperCase()} - ${r.priority.toUpperCase()}</strong><br/>
          ${r.message}<br/>
          <em>Related Benchmark: ${r.benchmark}</em>
        </div>`
          )
          .join("")
      : "<p>All benchmarks look good. No special recommendations.</p>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>CRDT/OT Multi-Benchmark Performance Analysis Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body{font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:20px;background:#f5f5f5}
    .container{max-width:1200px;margin:0 auto;background:#fff;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.1)}
    h1{color:#2c3e50;text-align:center;margin-bottom:30px;border-bottom:3px solid #3498db;padding-bottom:10px}
    h2{color:#34495e;margin:30px 0 15px}
    /* ⬇⬇⬇ Force summary to one row with 5 cards */
    .summary-grid{
      display:grid;
      grid-template-columns: repeat(5, minmax(200px, 1fr)); /* one line, 5 columns */
      gap:20px;
      margin-bottom:30px;
    }
    .summary-card{background:#ecf0f1;padding:20px;border-radius:8px;border-left:4px solid #3498db}
    .summary-card h3{margin:0 0 10px;color:#2c3e50}
    .summary-card p{margin:0;font-size:24px;font-weight:bold;color:#e74c3c}
    .chart-container{margin:30px 0;padding:20px;background:#f8f9fa;border-radius:8px}
    .benchmark-details{margin:20px 0}
    .benchmark-card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:10px 0;box-shadow:0 2px 4px rgba(0,0,0,.1)}
    .benchmark-card h3{color:#2c3e50;margin-top:0}
    .metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:15px}
    .metric{background:#f8f9fa;padding:10px;border-radius:5px;text-align:center}
    .metric-label{font-size:12px;color:#7f8c8d;margin-bottom:5px}
    .metric-value{font-size:18px;font-weight:bold;color:#2c3e50}
    .recommendations{background:#fff3cd;border:1px solid #ffeaa7;border-radius:8px;padding:20px;margin:20px 0}
    .recommendation{margin:10px 0;padding:10px;background:#fff;border-radius:5px;border-left:4px solid #f39c12}
    .priority-high{border-left-color:#e74c3c}.priority-medium{border-left-color:#f39c12}.priority-low{border-left-color:#27ae60}
  </style>
</head>
<body>
  <div class="container">
    <h1>CRDT/OT Multi-Benchmark Performance Analysis Report</h1>

    <div class="summary-grid">
      <div class="summary-card"><h3>Total Benchmarks</h3><p>${
        analysis.summary.totalBenchmarks
      }</p></div>
      <div class="summary-card"><h3>Average Latency</h3><p>${fmt2(
        analysis.summary.overallAvgLatency
      )} ms</p></div>
      <div class="summary-card"><h3>Average Bandwidth</h3><p>${fmt2(
        analysis.summary.overallAvgBandwidth
      )} KB/s</p></div>
      <div class="summary-card"><h3>Average Operations</h3><p>${fmt2(
        analysis.summary.overallAvgOperationsPerSecond
      )} ops/s</p></div>
      <div class="summary-card"><h3>Average E2E Latency</h3><p>${fmt2(
        analysis.summary.overallAvgE2ELatency
      )} ms</p></div>
    </div>

    <h2>Benchmark Performance Comparison</h2>
    <div class="chart-container"><canvas id="latencyChart" width="400" height="200"></canvas></div>
    <div class="chart-container"><canvas id="bandwidthChart" width="400" height="200"></canvas></div>
    <div class="chart-container"><canvas id="operationsChart" width="400" height="200"></canvas></div>
    <div class="chart-container"><canvas id="e2eChart" width="400" height="200"></canvas></div>

    <h2>Detailed Benchmark Results</h2>
    <div class="benchmark-details">
      ${detailsHTML}
    </div>

    <h2>Recommendations</h2>
    <div class="recommendations">
      ${recHTML}
    </div>

    <h2>Best/Worst Performance</h2>
    <div class="benchmark-details">
      <div class="benchmark-card">
        <h3>🏆 Best Performance: ${
          analysis.summary.bestPerformingBenchmark.name
        }</h3>
        <p>Average Latency: ${fmt2(
          analysis.summary.bestPerformingBenchmark.avgLatency
        )} ms</p>
      </div>
      <div class="benchmark-card">
        <h3>⚠️ Worst Performance: ${
          analysis.summary.worstPerformingBenchmark.name
        }</h3>
        <p>Average Latency: ${fmt2(
          analysis.summary.worstPerformingBenchmark.avgLatency
        )} ms</p>
      </div>
    </div>
  </div>

  <script>
    const labels = ${JSON.stringify(chartData.labels)};

    // Latency chart
    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Average Latency (ms)', data: ${JSON.stringify(
            chartData.latency.avg
          )}, backgroundColor: 'rgba(54,162,235,0.5)', borderColor: 'rgba(54,162,235,1)', borderWidth: 1 },
          { label: 'P95 Latency (ms)', data: ${JSON.stringify(
            chartData.latency.p95
          )}, backgroundColor: 'rgba(255,99,132,0.5)', borderColor: 'rgba(255,99,132,1)', borderWidth: 1 }
        ]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'Latency Comparison' } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Latency (ms)' } } } }
    });

    // Bandwidth chart
    new Chart(document.getElementById('bandwidthChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Bandwidth (KB/s)', data: ${JSON.stringify(
            chartData.bandwidth.kbps
          )}, backgroundColor: 'rgba(75,192,192,0.5)', borderColor: 'rgba(75,192,192,1)', borderWidth: 1 }
        ]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'Bandwidth Usage Comparison' } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Bandwidth (KB/s)' } } } }
    });

    // Operations chart
    new Chart(document.getElementById('operationsChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Operation Rate (ops/s)', data: ${JSON.stringify(
            chartData.operations.ops
          )}, backgroundColor: 'rgba(255,205,86,0.5)', borderColor: 'rgba(255,205,86,1)', borderWidth: 1 }
        ]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'Operation Rate Comparison' } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Operation Rate (ops/s)' } } } }
    });

    // E2E chart
    new Chart(document.getElementById('e2eChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'E2E Avg (ms)', data: ${JSON.stringify(
            chartData.e2e.avg
          )}, backgroundColor: 'rgba(153,102,255,0.5)', borderColor: 'rgba(153,102,255,1)', borderWidth: 1 },
          { label: 'E2E P95 (ms)', data: ${JSON.stringify(
            chartData.e2e.p95
          )}, backgroundColor: 'rgba(201,203,207,0.5)', borderColor: 'rgba(201,203,207,1)', borderWidth: 1 }
        ]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'E2E Latency Comparison' } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Latency (ms)' } } } }
    });
  </script>
</body>
</html>`;
}

/* ------------------------- Runner ------------------------- */

async function runMultiBenchmarkAnalysis() {
  console.log("🚀 Start multi-benchmark analysis (CRDT/OT)…\n");

  // Parse --dir=xxx
  const dirArg = process.argv.find((a) => a.startsWith("--dir="));
  const passedDir = dirArg ? dirArg.split("=")[1] : undefined;

  const analyzer = new MultiBenchmarkAnalyzer();

  console.log("📁 Loading results…");
  const ok = analyzer.loadAllResults(passedDir);
  if (!ok) {
    console.error(
      "❌ No benchmark results found. Please run the benchmarks first."
    );
    return;
  }

  console.log("\n🔍 Analyzing…");
  const analysis = analyzer.analyzeAllBenchmarks();

  console.log("\n💾 Saving analysis JSON…");
  analyzer.saveAnalysis(); // save into selected results dir

  console.log("\n📊 Preparing chart data…");
  const chartData = analyzer.generateChartData(analysis);

  console.log("\n📄 Generating HTML report…");
  const html = generateMultiBenchmarkReport(analysis, chartData);

  const outDir = analyzer.resultsDir || path.join(__dirname, "results");
  const outPath = path.join(outDir, "crdt_benchmark_report.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");

  console.log(`✅ HTML report written: ${outPath}`);
  console.log("🎉 Done.");
}

if (require.main === module) {
  runMultiBenchmarkAnalysis().catch(console.error);
}

module.exports = { MultiBenchmarkAnalyzer, runMultiBenchmarkAnalysis };
