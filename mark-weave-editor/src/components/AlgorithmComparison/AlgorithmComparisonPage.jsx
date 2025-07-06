/*
 * @FilePath: AlgorithmComparisonPage.jsx
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: CRDT vs OT 算法性能对比页面，在同一页面中并排显示两个算法的性能指标
 */

import React, { useState, useRef, useEffect } from 'react';
import { Row, Col, Card, Button, Space, Statistic, Table, Tag, Alert, message, Divider, Progress } from 'antd';
import {
  ExperimentOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  DashboardOutlined,
  GlobalOutlined,
  SwapOutlined,
  BarChartOutlined,
  FieldTimeOutlined,
  TrophyOutlined,
  FireOutlined,
  RocketOutlined
} from '@ant-design/icons';
import YjsEditorWithMonitoring from './YjsEditorWithMonitoring';
import OTEditorWithMonitoring from './OTEditorWithMonitoring';

const AlgorithmComparisonPage = () => {
  const [crdtMetrics, setCrdtMetrics] = useState(null);
  const [otMetrics, setOtMetrics] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonHistory, setComparisonHistory] = useState([]);

  const crdtRef = useRef(null);
  const otRef = useRef(null);
  const comparisonTimer = useRef(null);

  // 监控数据更新
  useEffect(() => {
    if (isComparing && (crdtMetrics || otMetrics)) {
      const comparison = generateComparison(crdtMetrics, otMetrics);
      setComparisonData(comparison);

      // 更新对比历史
      if (crdtMetrics && otMetrics) {
        setComparisonHistory(prev => {
          const newHistory = [...prev, {
            timestamp: Date.now(),
            crdtLatency: crdtMetrics.avgLatency || 0,
            otLatency: otMetrics.avgLatency || 0,
            crdtOps: crdtMetrics.operationsCount || 0,
            otOps: otMetrics.operationsCount || 0,
            crdtUsers: crdtMetrics.activeUsers || 0,
            otUsers: otMetrics.activeUsers || 0
          }];
          return newHistory.slice(-20); // 保留最近20个对比点
        });
      }
    }
  }, [crdtMetrics, otMetrics, isComparing]);

  // 定期更新对比数据
  useEffect(() => {
    if (!isComparing) return;

    const interval = setInterval(() => {
      if (crdtMetrics && otMetrics) {
        const comparison = generateComparison(crdtMetrics, otMetrics);
        setComparisonData(comparison);

        // 记录对比历史
        const historyRecord = {
          key: Date.now(),
          timestamp: Date.now(),
          crdtLatency: crdtMetrics.avgLatency || 0,
          otLatency: otMetrics.avgLatency || 0,
          crdtOps: crdtMetrics.operationsCount || 0,
          otOps: otMetrics.operationsCount || 0,
          crdtP95: crdtMetrics.p95Latency || 0,
          otP95: otMetrics.p95Latency || 0,
          latencyWinner: comparison.latency.winner,
          p95LatencyWinner: comparison.p95Latency.winner,
          throughputWinner: comparison.throughput.winner,
          // 🔥 新增：数据质量记录
          crdtDataQuality: crdtMetrics.dataQuality || {},
          otDataQuality: otMetrics.dataQuality || {}
        };

        setComparisonHistory(prev => [...prev.slice(-49), historyRecord]);
      }
    }, 200); // 🔥 优化：从500ms改为200ms，提升响应速度

    return () => clearInterval(interval);
  }, [isComparing, crdtMetrics, otMetrics]);

  // 生成对比数据 - 🔥 统一指标处理
  const generateComparison = (crdtData, otData) => {
    if (!crdtData && !otData) return null;

    const crdt = crdtData || {};
    const ot = otData || {};

    // 🔥 调试信息：显示接收到的指标
    console.log('📊 [对比] CRDT指标:', {
      operationsCount: crdt.operationsCount,
      avgLatency: crdt.avgLatency,
      opsPerSecond: crdt.opsPerSecond,
      bytesPerSecond: crdt.bytesPerSecond,
      activeUsers: crdt.activeUsers,
      algorithm: crdt.algorithm,
      dataSource: crdt.dataSource
    });

    console.log('📊 [对比] OT指标:', {
      operationsCount: ot.operationsCount,
      avgLatency: ot.avgLatency,
      opsPerSecond: ot.opsPerSecond,
      bytesPerSecond: ot.bytesPerSecond,
      activeUsers: ot.activeUsers,
      algorithm: ot.algorithm,
      dataSource: ot.dataSource
    });

    return {
      latency: {
        crdt: crdt.avgLatency || 0,
        ot: ot.avgLatency || 0,
        winner: getWinner(crdt.avgLatency || 0, ot.avgLatency || 0, 'lower')
      },
      p95Latency: {
        crdt: crdt.p95Latency || 0,
        ot: ot.p95Latency || 0,
        winner: getWinner(crdt.p95Latency || 0, ot.p95Latency || 0, 'lower')
      },
      throughput: {
        crdt: crdt.opsPerSecond || 0,
        ot: ot.opsPerSecond || 0,
        winner: getWinner(crdt.opsPerSecond || 0, ot.opsPerSecond || 0, 'higher')
      },
      bandwidth: {
        crdt: crdt.bytesPerSecond || 0,
        ot: ot.bytesPerSecond || 0,
        winner: getWinner(crdt.bytesPerSecond || 0, ot.bytesPerSecond || 0, 'lower')
      },
      users: {
        crdt: crdt.activeUsers || 0,
        ot: ot.activeUsers || 0,
        winner: getWinner(crdt.activeUsers || 0, ot.activeUsers || 0, 'higher')
      },
      operations: {
        crdt: crdt.operationsCount || 0,
        ot: ot.operationsCount || 0,
        winner: getWinner(crdt.operationsCount || 0, ot.operationsCount || 0, 'higher')
      },
      // 🔥 新增：网络延迟对比
      networkLatency: {
        crdt: crdt.avgNetworkLatency || 0,
        ot: ot.avgNetworkLatency || 0,
        winner: getWinner(crdt.avgNetworkLatency || 0, ot.avgNetworkLatency || 0, 'lower')
      },
      // 🔥 新增：键盘输入对比
      keystrokes: {
        crdt: crdt.keystrokes || 0,
        ot: ot.keystrokes || 0,
        winner: getWinner(crdt.keystrokes || 0, ot.keystrokes || 0, 'higher')
      },
      // 🔥 新增：数据质量对比
      dataQuality: {
        crdt: {
          latencySamples: crdt.latencySamples || 0,
          recentSamples: crdt.recentLatencySamples || 0,
          networkSamples: crdt.networkLatencySamples || 0,
          isConnected: crdt.isConnected || false,
          monitoringDuration: crdt.monitoringDuration || 0
        },
        ot: {
          latencySamples: ot.latencySamples || 0,
          recentSamples: ot.recentLatencySamples || 0,
          networkSamples: ot.networkLatencySamples || 0,
          isConnected: ot.isConnected || false,
          monitoringDuration: ot.monitoringDuration || 0,
          hasRealData: ot.hasRealLatencyData || false
        }
      }
    };
  };

  // 判断胜者
  const getWinner = (crdtValue, otValue, type) => {
    if (crdtValue === 0 && otValue === 0) return 'tie';
    if (crdtValue === 0) return 'ot';
    if (otValue === 0) return 'crdt';

    if (type === 'lower') {
      return crdtValue < otValue ? 'crdt' : otValue < crdtValue ? 'ot' : 'tie';
    } else {
      return crdtValue > otValue ? 'crdt' : otValue > crdtValue ? 'ot' : 'tie';
    }
  };

  // 开始对比
  const handleStartComparison = () => {
    setIsComparing(true);
    setComparisonHistory([]);
    message.success('🚀 Algorithm performance comparison started! Please operate in both editors');
  };

  // 停止对比
  const handleStopComparison = () => {
    setIsComparing(false);
    message.info('⏹️ Algorithm performance comparison stopped');
  };

  // 重置所有数据
  const handleResetAll = () => {
    if (crdtRef.current) {
      crdtRef.current.resetMetrics();
    }
    if (otRef.current) {
      otRef.current.resetMetrics();
    }
    setCrdtMetrics(null);
    setOtMetrics(null);
    setComparisonData(null);
    setComparisonHistory([]);
    message.success('🔄 All comparison data has been reset');
  };

  // 导出对比数据
  const handleExportComparison = () => {
    if (!comparisonData) {
      message.error('No comparison data available for export');
      return;
    }

    const exportData = {
      comparisonInfo: {
        timestamp: new Date().toISOString(),
        algorithms: ['Yjs CRDT', 'ShareDB OT'],
        testDuration: Date.now() - (comparisonHistory[0]?.timestamp || Date.now()),
        totalSamples: comparisonHistory.length
      },
      currentComparison: comparisonData,
      crdtMetrics: crdtMetrics,
      otMetrics: otMetrics,
      comparisonHistory: comparisonHistory,
      summary: {
        avgLatencyWinner: comparisonData.latency.winner,
        p95LatencyWinner: comparisonData.p95Latency.winner,
        throughputWinner: comparisonData.throughput.winner,
        bandwidthWinner: comparisonData.bandwidth.winner,
        overallWinner: calculateOverallWinner(comparisonData)
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algorithm-comparison-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('📊 Algorithm comparison data exported');
  };

  // 计算总体胜者
  const calculateOverallWinner = (data) => {
    if (!data) return 'tie';

    const scores = { crdt: 0, ot: 0 };
    Object.values(data).forEach(metric => {
      if (metric.winner === 'crdt') scores.crdt++;
      else if (metric.winner === 'ot') scores.ot++;
    });

    return scores.crdt > scores.ot ? 'crdt' : scores.ot > scores.crdt ? 'ot' : 'tie';
  };

  // 获取胜者颜色
  const getWinnerColor = (winner) => {
    switch (winner) {
      case 'crdt': return '#52c41a';
      case 'ot': return '#1890ff';
      default: return '#faad14';
    }
  };

  // 获取胜者标签
  const getWinnerTag = (winner) => {
    switch (winner) {
      case 'crdt': return <Tag color="green">CRDT Wins</Tag>;
      case 'ot': return <Tag color="blue">OT Wins</Tag>;
      default: return <Tag color="gold">Tie</Tag>;
    }
  };

  // 对比历史表格列
  const historyColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
      width: 80
    },
    {
      title: 'CRDT Latency',
      dataIndex: 'crdtLatency',
      key: 'crdtLatency',
      render: (latency) => `${latency.toFixed(1)}ms`,
      width: 90
    },
    {
      title: 'OT Latency',
      dataIndex: 'otLatency',
      key: 'otLatency',
      render: (latency) => `${latency.toFixed(1)}ms`,
      width: 90
    },
    {
      title: 'Latency Winner',
      key: 'latencyWinner',
      render: (_, record) => {
        const winner = getWinner(record.crdtLatency, record.otLatency, 'lower');
        return getWinnerTag(winner);
      },
      width: 90
    },
    {
      title: 'CRDT Ops',
      dataIndex: 'crdtOps',
      key: 'crdtOps',
      width: 80
    },
    {
      title: 'OT Ops',
      dataIndex: 'otOps',
      key: 'otOps',
      width: 80
    }
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        title={
          <Space>
            <FieldTimeOutlined />
            <span>CRDT vs OT Algorithm Performance Comparison</span>
            <Tag color="purple">Real-time Analysis</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              type={isComparing ? "default" : "primary"}
              icon={isComparing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={isComparing ? handleStopComparison : handleStartComparison}
              size="large"
            >
              {isComparing ? 'Stop Comparison' : 'Start Comparison'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetAll}
              disabled={isComparing}
            >
              Reset All
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportComparison}
              disabled={!comparisonData}
            >
              Export Data
            </Button>
            <Button
              icon={<GlobalOutlined />}
              onClick={() => {
                window.open(window.location.href, '_blank', 'width=1200,height=800');
                message.success('✅ New window opened! You can now perform multi-window collaboration testing');
              }}
              type="primary"
              ghost
            >
              Multi-window Test
            </Button>
          </Space>
        }
      >
        {/* Comparison description */}
        <Alert
          message="🔬 Real-time Algorithm Performance Comparison"
          description="Compare the performance of Yjs CRDT and ShareDB OT algorithms side by side, including key metrics such as latency, throughput, and bandwidth usage. Supports multi-window collaboration testing."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {isComparing && (
          <Alert
            message="⚡ Comparison in Progress"
            description="Please operate in both editors below, the system will compare the performance of both algorithms in real-time."
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Real-time comparison results */}
        {comparisonData && (
          <Card
            title={
              <Space>
                <TrophyOutlined />
                <span>Real-time Comparison Results</span>
                <Tag color="gold">Overall Winner: {calculateOverallWinner(comparisonData).toUpperCase()}</Tag>
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Average Latency Comparison"
                    value={`${comparisonData.latency.crdt.toFixed(1)} vs ${comparisonData.latency.ot.toFixed(1)}`}
                    suffix="ms"
                    valueStyle={{ color: getWinnerColor(comparisonData.latency.winner) }}
                    prefix={<ThunderboltOutlined />}
                  />
                  {getWinnerTag(comparisonData.latency.winner)}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="P95 Latency Comparison"
                    value={`${comparisonData.p95Latency.crdt.toFixed(1)} vs ${comparisonData.p95Latency.ot.toFixed(1)}`}
                    suffix="ms"
                    valueStyle={{ color: getWinnerColor(comparisonData.p95Latency.winner) }}
                    prefix={<LineChartOutlined />}
                  />
                  {getWinnerTag(comparisonData.p95Latency.winner)}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Throughput Comparison"
                    value={`${comparisonData.throughput.crdt.toFixed(1)} vs ${comparisonData.throughput.ot.toFixed(1)}`}
                    suffix="ops/s"
                    valueStyle={{ color: getWinnerColor(comparisonData.throughput.winner) }}
                    prefix={<RocketOutlined />}
                  />
                  {getWinnerTag(comparisonData.throughput.winner)}
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Bandwidth Usage Comparison"
                    value={`${(comparisonData.bandwidth.crdt / 1024).toFixed(1)} vs ${(comparisonData.bandwidth.ot / 1024).toFixed(1)}`}
                    suffix="KB/s"
                    valueStyle={{ color: getWinnerColor(comparisonData.bandwidth.winner) }}
                    prefix={<BarChartOutlined />}
                  />
                  {getWinnerTag(comparisonData.bandwidth.winner)}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Active Users Comparison"
                    value={`${comparisonData.users.crdt} vs ${comparisonData.users.ot}`}
                    valueStyle={{ color: getWinnerColor(comparisonData.users.winner) }}
                    prefix={<GlobalOutlined />}
                  />
                  {getWinnerTag(comparisonData.users.winner)}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Total Operations Comparison"
                    value={`${comparisonData.operations.crdt} vs ${comparisonData.operations.ot}`}
                    valueStyle={{ color: getWinnerColor(comparisonData.operations.winner) }}
                    prefix={<DashboardOutlined />}
                  />
                  {getWinnerTag(comparisonData.operations.winner)}
                </Card>
              </Col>
            </Row>

            {/* Extended metrics comparison */}
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Network Latency Comparison"
                    value={`${comparisonData.networkLatency.crdt.toFixed(1)} vs ${comparisonData.networkLatency.ot.toFixed(1)}`}
                    suffix="ms"
                    valueStyle={{ color: getWinnerColor(comparisonData.networkLatency.winner) }}
                    prefix={<GlobalOutlined />}
                  />
                  {getWinnerTag(comparisonData.networkLatency.winner)}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Keystrokes Comparison"
                    value={`${comparisonData.keystrokes.crdt} vs ${comparisonData.keystrokes.ot}`}
                    valueStyle={{ color: getWinnerColor(comparisonData.keystrokes.winner) }}
                    prefix={<ExperimentOutlined />}
                  />
                  {getWinnerTag(comparisonData.keystrokes.winner)}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Data Samples Comparison"
                    value={`${comparisonData.dataQuality.crdt.latencySamples} vs ${comparisonData.dataQuality.ot.latencySamples}`}
                    valueStyle={{
                      color: getWinnerColor(
                        getWinner(
                          comparisonData.dataQuality.crdt.latencySamples,
                          comparisonData.dataQuality.ot.latencySamples,
                          'higher'
                        )
                      )
                    }}
                    prefix={<LineChartOutlined />}
                  />
                  {getWinnerTag(
                    getWinner(
                      comparisonData.dataQuality.crdt.latencySamples,
                      comparisonData.dataQuality.ot.latencySamples,
                      'higher'
                    )
                  )}
                </Card>
              </Col>
            </Row>

            {/* Data quality status */}
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card size="small" title="CRDT Data Quality" style={{ backgroundColor: '#f6ffed' }}>
                  <div style={{ fontSize: '12px' }}>
                    <div>📊 Latency Samples: {comparisonData.dataQuality.crdt.latencySamples}</div>
                    <div>🔄 Recent Samples: {comparisonData.dataQuality.crdt.recentSamples}</div>
                    <div>🌐 Network Samples: {comparisonData.dataQuality.crdt.networkSamples}</div>
                    <div>⏱️ Monitoring Duration: {comparisonData.dataQuality.crdt.monitoringDuration.toFixed(1)}s</div>
                    <div>🔗 Connection Status: {comparisonData.dataQuality.crdt.isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                    {crdtMetrics?.dataQuality && (
                      <>
                        <div>🎯 Calculation Method: {crdtMetrics.dataQuality.calculationMethod}</div>
                        <div>📈 Confidence: {crdtMetrics.dataQuality.confidence}</div>
                        <div>⏰ Time Window: {crdtMetrics.dataQuality.timeWindow / 1000}s</div>
                      </>
                    )}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="OT Data Quality" style={{ backgroundColor: '#f0f8ff' }}>
                  <div style={{ fontSize: '12px' }}>
                    <div>📊 Latency Samples: {comparisonData.dataQuality.ot.latencySamples}</div>
                    <div>🔄 Recent Samples: {comparisonData.dataQuality.ot.recentSamples}</div>
                    <div>🌐 Network Samples: {comparisonData.dataQuality.ot.networkSamples}</div>
                    <div>⏱️ Monitoring Duration: {comparisonData.dataQuality.ot.monitoringDuration.toFixed(1)}s</div>
                    <div>🔗 Connection Status: {comparisonData.dataQuality.ot.isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                    <div>🎯 Real Data: {comparisonData.dataQuality.ot.hasRealData ? '✅ Real' : '⚠️ Simulated'}</div>
                    {otMetrics?.dataQuality && (
                      <>
                        <div>🎯 Calculation Method: {otMetrics.dataQuality.calculationMethod}</div>
                        <div>📈 Confidence: {otMetrics.dataQuality.confidence}</div>
                        <div>⏰ Time Window: {otMetrics.dataQuality.timeWindow / 1000}s</div>
                      </>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        )}

        {/* Side-by-side editor comparison */}
        <Row gutter={16}>
          <Col span={12}>
            <Card
              title={
                <Space>
                  <FireOutlined style={{ color: '#52c41a' }} />
                  <span>Yjs CRDT Algorithm</span>
                  <Tag color="green">Decentralized</Tag>
                </Space>
              }
              size="small"
              style={{ height: '100%' }}
            >
              <YjsEditorWithMonitoring
                ref={crdtRef}
                docId="crdt-performance-test-doc"
                title="CRDT Performance Test"
                showMetrics={false}
                onMetricsUpdate={setCrdtMetrics}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card
              title={
                <Space>
                  <SwapOutlined style={{ color: '#1890ff' }} />
                  <span>ShareDB OT Algorithm</span>
                  <Tag color="blue">Centralized</Tag>
                </Space>
              }
              size="small"
              style={{ height: '100%' }}
            >
              <OTEditorWithMonitoring
                ref={otRef}
                docId="ot-performance-test-doc"
                collection="documents"
                title="OT Performance Test"
                showMetrics={false}
                onMetricsUpdate={setOtMetrics}
              />
            </Card>
          </Col>
        </Row>

        {/* Comparison history */}
        {comparisonHistory.length > 0 && (
          <Card
            title={
              <Space>
                <BarChartOutlined />
                <span>Comparison History</span>
                <Tag color="purple">Last {comparisonHistory.length} Data Points</Tag>
              </Space>
            }
            size="small"
            style={{ marginTop: 16 }}
          >
            <Table
              dataSource={comparisonHistory.slice(-10)}
              columns={historyColumns}
              pagination={false}
              size="small"
              rowKey="timestamp"
            />
          </Card>
        )}

        {/* Testing guide */}
        {!isComparing && (
          <Card
            title="📖 Comparison Testing Guide"
            size="small"
            style={{ marginTop: 16 }}
          >
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <p><strong>1. Start Comparison:</strong> Click "Start Comparison" button to begin real-time performance monitoring</p>
              <p><strong>2. Single Window Test:</strong> Input content in both editors to observe performance differences</p>
              <p><strong>3. Multi-window Test:</strong> Click "Multi-window Test" to open new windows for collaborative editing comparison</p>
              <p><strong>4. Data Analysis:</strong> View real-time comparisons of key metrics including latency, throughput, and bandwidth</p>
              <p><strong>5. Export Data:</strong> Click "Export Data" to save complete comparison data for academic analysis</p>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default AlgorithmComparisonPage;