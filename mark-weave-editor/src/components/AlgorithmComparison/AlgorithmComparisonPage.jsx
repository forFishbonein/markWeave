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
    message.success('🚀 开始算法性能对比！请在两个编辑器中进行操作');
  };

  // 停止对比
  const handleStopComparison = () => {
    setIsComparing(false);
    message.info('⏹️ 已停止算法性能对比');
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
    message.success('🔄 已重置所有对比数据');
  };

  // 导出对比数据
  const handleExportComparison = () => {
    if (!comparisonData) {
      message.error('没有可导出的对比数据');
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

    message.success('📊 算法对比数据已导出');
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
      case 'crdt': return <Tag color="green">CRDT 胜出</Tag>;
      case 'ot': return <Tag color="blue">OT 胜出</Tag>;
      default: return <Tag color="gold">平局</Tag>;
    }
  };

  // 对比历史表格列
  const historyColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
      width: 80
    },
    {
      title: 'CRDT延迟',
      dataIndex: 'crdtLatency',
      key: 'crdtLatency',
      render: (latency) => `${latency.toFixed(1)}ms`,
      width: 90
    },
    {
      title: 'OT延迟',
      dataIndex: 'otLatency',
      key: 'otLatency',
      render: (latency) => `${latency.toFixed(1)}ms`,
      width: 90
    },
    {
      title: '延迟胜者',
      key: 'latencyWinner',
      render: (_, record) => {
        const winner = getWinner(record.crdtLatency, record.otLatency, 'lower');
        return getWinnerTag(winner);
      },
      width: 90
    },
    {
      title: 'CRDT操作',
      dataIndex: 'crdtOps',
      key: 'crdtOps',
      width: 80
    },
    {
      title: 'OT操作',
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
            <span>CRDT vs OT 算法性能对比</span>
            <Tag color="purple">实时对比分析</Tag>
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
              {isComparing ? '停止对比' : '开始对比'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetAll}
              disabled={isComparing}
            >
              重置全部
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportComparison}
              disabled={!comparisonData}
            >
              导出对比
            </Button>
            <Button
              icon={<GlobalOutlined />}
              onClick={() => {
                window.open(window.location.href, '_blank', 'width=1200,height=800');
                message.success('✅ 新窗口已打开！可进行多窗口协作对比测试');
              }}
              type="primary"
              ghost
            >
              多窗口测试
            </Button>
          </Space>
        }
      >
        {/* 对比说明 */}
        <Alert
          message="🔬 算法性能实时对比"
          description="在同一页面中并排对比Yjs CRDT和ShareDB OT算法的性能表现，包括延迟、吞吐量、带宽使用等关键指标。支持多窗口协作测试。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {isComparing && (
          <Alert
            message="⚡ 对比进行中"
            description="请在下方两个编辑器中进行操作，系统将实时对比两种算法的性能表现。"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 实时对比结果 */}
        {comparisonData && (
          <Card
            title={
              <Space>
                <TrophyOutlined />
                <span>实时对比结果</span>
                <Tag color="gold">总体胜者: {calculateOverallWinner(comparisonData).toUpperCase()}</Tag>
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="平均延迟对比"
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
                    title="P95延迟对比"
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
                    title="吞吐量对比"
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
                    title="带宽使用对比"
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
                    title="活跃用户对比"
                    value={`${comparisonData.users.crdt} vs ${comparisonData.users.ot}`}
                    suffix="个"
                    valueStyle={{ color: getWinnerColor(comparisonData.users.winner) }}
                    prefix={<GlobalOutlined />}
                  />
                  {getWinnerTag(comparisonData.users.winner)}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="操作总数对比"
                    value={`${comparisonData.operations.crdt} vs ${comparisonData.operations.ot}`}
                    suffix="次"
                    valueStyle={{ color: getWinnerColor(comparisonData.operations.winner) }}
                    prefix={<DashboardOutlined />}
                  />
                  {getWinnerTag(comparisonData.operations.winner)}
                </Card>
              </Col>
            </Row>

            {/* 🔥 新增：扩展指标对比 */}
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="网络延迟对比"
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
                    title="键盘输入对比"
                    value={`${comparisonData.keystrokes.crdt} vs ${comparisonData.keystrokes.ot}`}
                    suffix="次"
                    valueStyle={{ color: getWinnerColor(comparisonData.keystrokes.winner) }}
                    prefix={<ExperimentOutlined />}
                  />
                  {getWinnerTag(comparisonData.keystrokes.winner)}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="数据样本对比"
                    value={`${comparisonData.dataQuality.crdt.latencySamples} vs ${comparisonData.dataQuality.ot.latencySamples}`}
                    suffix="个"
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

            {/* 🔥 新增：数据质量状态 */}
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card size="small" title="CRDT 数据质量" style={{ backgroundColor: '#f6ffed' }}>
                  <div style={{ fontSize: '12px' }}>
                    <div>📊 延迟样本: {comparisonData.dataQuality.crdt.latencySamples} 个</div>
                    <div>🔄 最近样本: {comparisonData.dataQuality.crdt.recentSamples} 个</div>
                    <div>🌐 网络样本: {comparisonData.dataQuality.crdt.networkSamples} 个</div>
                    <div>⏱️ 监控时长: {comparisonData.dataQuality.crdt.monitoringDuration.toFixed(1)}s</div>
                    <div>🔗 连接状态: {comparisonData.dataQuality.crdt.isConnected ? '✅ 已连接' : '❌ 未连接'}</div>
                    {/* 🔥 新增：数据质量指标 */}
                    {crdtMetrics?.dataQuality && (
                      <>
                        <div>🎯 计算方法: {crdtMetrics.dataQuality.calculationMethod}</div>
                        <div>📈 置信度: {crdtMetrics.dataQuality.confidence}</div>
                        <div>⏰ 时间窗口: {crdtMetrics.dataQuality.timeWindow / 1000}s</div>
                      </>
                    )}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="OT 数据质量" style={{ backgroundColor: '#f0f8ff' }}>
                  <div style={{ fontSize: '12px' }}>
                    <div>📊 延迟样本: {comparisonData.dataQuality.ot.latencySamples} 个</div>
                    <div>🔄 最近样本: {comparisonData.dataQuality.ot.recentSamples} 个</div>
                    <div>🌐 网络样本: {comparisonData.dataQuality.ot.networkSamples} 个</div>
                    <div>⏱️ 监控时长: {comparisonData.dataQuality.ot.monitoringDuration.toFixed(1)}s</div>
                    <div>🔗 连接状态: {comparisonData.dataQuality.ot.isConnected ? '✅ 已连接' : '❌ 未连接'}</div>
                    <div>🎯 真实数据: {comparisonData.dataQuality.ot.hasRealData ? '✅ 真实' : '⚠️ 模拟'}</div>
                    {/* 🔥 新增：数据质量指标 */}
                    {otMetrics?.dataQuality && (
                      <>
                        <div>🎯 计算方法: {otMetrics.dataQuality.calculationMethod}</div>
                        <div>📈 置信度: {otMetrics.dataQuality.confidence}</div>
                        <div>⏰ 时间窗口: {otMetrics.dataQuality.timeWindow / 1000}s</div>
                      </>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        )}

        {/* 并排编辑器对比 */}
        <Row gutter={16}>
          <Col span={12}>
            <Card
              title={
                <Space>
                  <FireOutlined style={{ color: '#52c41a' }} />
                  <span>Yjs CRDT 算法</span>
                  <Tag color="green">去中心化</Tag>
                </Space>
              }
              size="small"
              style={{ height: '100%' }}
            >
              <YjsEditorWithMonitoring
                ref={crdtRef}
                docId="crdt-performance-test-doc"
                title="CRDT 性能测试"
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
                  <span>ShareDB OT 算法</span>
                  <Tag color="blue">中心化</Tag>
                </Space>
              }
              size="small"
              style={{ height: '100%' }}
            >
              <OTEditorWithMonitoring
                ref={otRef}
                docId="ot-performance-test-doc"
                collection="documents"
                title="OT 性能测试"
                showMetrics={false}
                onMetricsUpdate={setOtMetrics}
              />
            </Card>
          </Col>
        </Row>

        {/* 对比历史 */}
        {comparisonHistory.length > 0 && (
          <Card
            title={
              <Space>
                <BarChartOutlined />
                <span>对比历史记录</span>
                <Tag color="purple">最近 {comparisonHistory.length} 个数据点</Tag>
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

        {/* 测试指南 */}
        {!isComparing && (
          <Card
            title="📖 对比测试指南"
            size="small"
            style={{ marginTop: 16 }}
          >
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <p><strong>1. 开始对比：</strong>点击"开始对比"按钮启动实时性能监控</p>
              <p><strong>2. 单窗口测试：</strong>在左右两个编辑器中分别输入内容，观察性能差异</p>
              <p><strong>3. 多窗口测试：</strong>点击"多窗口测试"打开新窗口，进行协作编辑对比</p>
              <p><strong>4. 数据分析：</strong>实时查看延迟、吞吐量、带宽等关键指标对比</p>
              <p><strong>5. 导出数据：</strong>点击"导出对比"保存完整的对比数据用于学术分析</p>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default AlgorithmComparisonPage;