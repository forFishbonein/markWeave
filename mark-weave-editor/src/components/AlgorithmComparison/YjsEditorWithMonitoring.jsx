/*
 * @FilePath: YjsEditorWithMonitoring.jsx
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: 集成编辑器和多窗口同步的真实性能监控面板
 */

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Row, Col, Card, Button, Space, Statistic, Progress, Table, Tag, Alert, message } from 'antd';
import {
  EditOutlined,
  BarChartOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  ExperimentOutlined,
  LineChartOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useYjsEditor } from '../../hooks/useYjsEditor';
import YjsPerformanceMonitor from '../../utils/YjsPerformanceMonitor';
import { ydoc } from '../../crdt';

const YjsEditorWithMonitoring = forwardRef(({
  docId = 'crdt-performance-test-doc',
  title = null,
  showMetrics = true,
  onMetricsUpdate = null
}, ref) => {
  const editorRef = useRef(null);
  const [editorView, awareness, provider, isConnected, ydoc] = useYjsEditor(docId, editorRef);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);

  const monitorRef = useRef(null);
  const refreshTimer = useRef(null);

  // 暴露重置方法给父组件
  useImperativeHandle(ref, () => ({
    resetMetrics: handleReset
  }));

  // 初始化监控器
  useEffect(() => {
    if (!monitorRef.current) {
      monitorRef.current = new YjsPerformanceMonitor();
    }
    // 自动开始监控
    if (ydoc && provider && awareness && isConnected && !isMonitoring) {
      handleStartMonitoring();
    }
    return () => {
      if (monitorRef.current) {
        monitorRef.current.stopMonitoring();
      }
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [ydoc, provider, awareness, isConnected]);

  // 监控数据刷新 - 只在有实际变化时更新
  useEffect(() => {
    if (isMonitoring && monitorRef.current) {
      // 初始加载时获取一次数据
      const initialStats = monitorRef.current.getPerformanceStats();
      if (initialStats) {
        setPerformanceData(initialStats);
        if (onMetricsUpdate) {
          onMetricsUpdate({
            // 基本操作指标
            operationsCount: initialStats.documentUpdates || 0,
            avgLatency: initialStats.avgLatency || 0,
            p95Latency: initialStats.p95Latency || 0,

            // 网络传输指标
            bytesSent: initialStats.sentBytes || 0,
            bytesReceived: initialStats.receivedBytes || 0,

            // 协作用户指标
            activeUsers: initialStats.totalWindows || 0,

            // 🔥 修复：统一计算方式
            opsPerSecond: initialStats.updatesPerSecond || 0,
            bytesPerSecond: (initialStats.bandwidthKBps || 0) * 1024,

            // 额外指标
            keystrokes: initialStats.keystrokes || 0,
            keystrokesPerSecond: initialStats.keystrokesPerSecond || 0,
            pendingOperations: initialStats.pendingOperations || 0,
            totalUpdateSize: initialStats.totalUpdateSize || 0,
            avgUpdateSize: initialStats.avgUpdateSize || 0,

            // 网络延迟指标
            avgNetworkLatency: initialStats.avgNetworkLatency || 0,
            networkLatencySamples: initialStats.networkLatencySamples || 0,

            // 🔥 新增：端到端延迟指标
            avgE2ELatency: initialStats.avgE2ELatency || 0,
            p95E2ELatency: initialStats.p95E2ELatency || 0,
            e2eSamples: initialStats.e2eSamples || 0,

            // 监控状态
            monitoringDuration: initialStats.monitoringDuration || 0,
            isConnected: initialStats.isConnected || false,
            windowId: initialStats.windowId || '',

            // 数据样本统计
            latencySamples: initialStats.latencySamples || 0,
            recentLatencySamples: initialStats.recentLatencySamples || 0,

            // 协作统计
            activeCollaborators: initialStats.activeCollaborators || 0,
            totalAwarenessChanges: initialStats.totalAwarenessChanges || 0,

            // 数据源标识
            algorithm: 'CRDT',
            dataSource: 'yjs-real-monitoring'
          });
        }
      }

      // 只在用户操作时更新，而不是定时刷新
      const handleUserActivity = () => {
        const stats = monitorRef.current.getPerformanceStats();
        if (stats) {
          setPerformanceData(stats);
          if (onMetricsUpdate) {
            onMetricsUpdate({
              operationsCount: stats.documentUpdates || 0,
              avgLatency: stats.avgLatency || 0,
              p95Latency: stats.p95Latency || 0,
              bytesSent: stats.sentBytes || 0,
              bytesReceived: stats.receivedBytes || 0,
              activeUsers: stats.totalWindows || 0,
              opsPerSecond: stats.updatesPerSecond || 0,
              bytesPerSecond: (stats.bandwidthKBps || 0) * 1024,
              keystrokes: stats.keystrokes || 0,
              keystrokesPerSecond: stats.keystrokesPerSecond || 0,
              pendingOperations: stats.pendingOperations || 0,
              totalUpdateSize: stats.totalUpdateSize || 0,
              avgUpdateSize: stats.avgUpdateSize || 0,
              avgNetworkLatency: stats.avgNetworkLatency || 0,
              networkLatencySamples: stats.networkLatencySamples || 0,
              avgE2ELatency: stats.avgE2ELatency || 0,
              p95E2ELatency: stats.p95E2ELatency || 0,
              e2eSamples: stats.e2eSamples || 0,
              monitoringDuration: stats.monitoringDuration || 0,
              isConnected: stats.isConnected || false,
              windowId: stats.windowId || '',
              latencySamples: stats.latencySamples || 0,
              recentLatencySamples: stats.recentLatencySamples || 0,
              activeCollaborators: stats.activeCollaborators || 0,
              totalAwarenessChanges: stats.totalAwarenessChanges || 0,
              algorithm: 'CRDT',
              dataSource: 'yjs-real-monitoring'
            });
          }

          // 更新延迟历史 - 只在有新数据时更新
          if (stats.recentLatencySamples > 0) {
            setLatencyHistory(prev => {
              const newHistory = [...prev, {
                timestamp: Date.now(),
                latency: stats.avgLatency,
                p95: stats.p95Latency,
                e2eLatency: stats.avgE2ELatency || 0,
                networkLatency: stats.avgNetworkLatency,
                samples: stats.recentLatencySamples,
                pending: stats.pendingOperations
              }];
              return newHistory.slice(-30);
            });
          }
        }
      };

      // 监听用户操作事件
      document.addEventListener('keydown', handleUserActivity);
      document.addEventListener('mousedown', handleUserActivity);

      return () => {
        document.removeEventListener('keydown', handleUserActivity);
        document.removeEventListener('mousedown', handleUserActivity);
      };
    } else {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
        refreshTimer.current = null;
      }
    }
  }, [isMonitoring, onMetricsUpdate]);

  const handleStartMonitoring = () => {
    // 🔥 修复：使用hook返回的ydoc，确保与provider一致
    if (!ydoc || !awareness || !provider || !isConnected) {
      message.error('Editor not fully initialized or not connected, please try again later');
      return;
    }

    console.log("🔧 [DEBUG] 使用hook返回的ydoc:", {
      hasYdoc: !!ydoc,
      hasAwareness: !!awareness,
      hasProvider: !!provider,
      isConnected
    });

    setIsMonitoring(true);
    setPerformanceData(null);
    setLatencyHistory([]);

    monitorRef.current.startMonitoring(ydoc, awareness, provider);
    message.success('🚀 Performance monitoring started, please input content in the editor');
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    if (monitorRef.current) {
      monitorRef.current.stopMonitoring();
    }
    message.info('⏹️ Performance monitoring stopped');
  };

  const handleReset = () => {
    if (monitorRef.current) {
      monitorRef.current.reset();
    }
    setPerformanceData(null);
    setLatencyHistory([]);
    message.success('🔄 Monitoring data reset');
  };

  const handleExportData = () => {
    if (!monitorRef.current) return;

    const academicData = monitorRef.current.exportAcademicData();
    if (!academicData) {
      message.error('No data available for export');
      return;
    }

    // Download JSON file
    const blob = new Blob([JSON.stringify(academicData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yjs-performance-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('📊 Academic data exported');
  };



  const getLatencyColor = (latency) => {
    if (latency < 20) return '#52c41a';
    if (latency < 100) return '#faad14';
    if (latency < 500) return '#fa8c16';
    return '#f5222d';
  };

  const getLatencyLevel = (latency) => {
    if (latency < 20) return 'Excellent';
    if (latency < 100) return 'Good';
    if (latency < 500) return 'Fair';
    return 'Needs Improvement';
  };

  const editorStyle = {
    minHeight: '300px',
    padding: '16px',
    border: '1px solid #d9d9d9',
    borderRadius: '6px',
    backgroundColor: '#fff',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const latencyColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
      width: 70
    },
    {
      title: 'Latency (ms)',
      dataIndex: 'latency',
      key: 'latency',
      render: (latency) => (
        <span style={{ color: getLatencyColor(latency), fontWeight: 'bold' }}>
          {latency.toFixed(1)}
        </span>
      ),
      width: 70
    },
    {
      title: 'P95 (ms)',
      dataIndex: 'p95',
      key: 'p95',
      render: (p95) => (
        <span style={{ color: getLatencyColor(p95), fontSize: '12px' }}>
          {p95.toFixed(1)}
        </span>
      ),
      width: 70
    },
    {
      title: 'E2E (ms)',
      dataIndex: 'e2eLatency',
      key: 'e2eLatency',
      render: (e2eLatency) => (
        <span style={{ color: getLatencyColor(e2eLatency || 0), fontSize: '12px' }}>
          {(e2eLatency || 0).toFixed(1)}
        </span>
      ),
      width: 70
    }
  ];

  // 如果showMetrics为false，只显示编辑器部分
  if (!showMetrics) {
    return (
      <div style={{ padding: '12px' }}>
        <Card title="CRDT Collaborative Editor" size="small">
          <div style={{ marginBottom: '12px' }}>
            <Space>
              <Button
                type={isMonitoring ? "default" : "primary"}
                icon={isMonitoring ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
                size="small"
                disabled={!isConnected}
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={isMonitoring}
                size="small"
              >
                Reset
              </Button>
              <Tag color={isConnected ? 'green' : 'red'} size="small">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Tag>
              {performanceData && (
                <Tag color="blue" size="small">
                  Latency: {performanceData.avgLatency.toFixed(1)}ms
                </Tag>
              )}
            </Space>
          </div>

          <div
            ref={editorRef}
            style={editorStyle}
            placeholder="Enter content here for CRDT performance testing..."
          />

          <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#f6f8fa', borderRadius: '4px', fontSize: '11px' }}>
            <Row gutter={8}>
              <Col span={12}>
                <Space size="small">
                  <strong>Document:</strong>
                  <span>{docId}</span>
                </Space>
              </Col>
              <Col span={12}>
                {performanceData && (
                  <Space size="small">
                    <span>Operations: {performanceData.operationsCount}</span>
                  </Space>
                )}
              </Col>
            </Row>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>CRDT Performance Monitor</span>
            <Tag color="purple">Real-time Sync Version</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              type={isMonitoring ? "default" : "primary"}
              icon={isMonitoring ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
              size="large"
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={isMonitoring}
            >
              Reset Data
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportData}
              disabled={!performanceData}
            >
              Export Data
            </Button>

          </Space>
        }
      >


        <Row gutter={16}>
          {/* Left: Editor */}
          <Col span={12}>
            <Card title="Real-time Collaborative Editor" size="small">
              <div
                ref={editorRef}
                style={editorStyle}
                placeholder="Enter content here, supports real-time sync monitoring..."
              />

              <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f6f8fa', borderRadius: '4px', fontSize: '12px' }}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Space size="small">
                      <strong>Connection:</strong>
                      <Tag color={isConnected ? 'green' : 'red'} size="small">
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </Tag>
                    </Space>
                  </Col>
                  <Col span={12}>
                    {performanceData && (
                      <Space size="small">
                        <SyncOutlined style={{ color: '#1890ff' }} />
                        <span>Pending: {performanceData.pendingOperations}</span>
                      </Space>
                    )}
                  </Col>
                </Row>
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                  Document ID: {docId}
                  {performanceData && (
                    <span style={{ marginLeft: '8px' }}>Window ID: {performanceData.windowId.slice(-8)}</span>
                  )}
                </div>
              </div>
            </Card>
          </Col>

          {/* Right: Performance Monitor */}
          <Col span={12}>
            <Card title="Real-time Performance Data" size="small">
              {performanceData ? (
                <div>
                  {/* Core Metrics */}
                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                        <Statistic
                          title="Real-time Latency"
                          value={performanceData.avgLatency}
                          suffix="ms"
                          precision={1}
                          valueStyle={{
                            color: getLatencyColor(performanceData.avgLatency),
                            fontSize: '22px',
                            fontWeight: 'bold'
                          }}
                          prefix={<ThunderboltOutlined />}
                        />
                        <Tag color={getLatencyColor(performanceData.avgLatency)} style={{ marginTop: '4px' }}>
                          {getLatencyLevel(performanceData.avgLatency)}
                        </Tag>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                          Based on recent {performanceData.recentLatencySamples} samples
                        </div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                        <Statistic
                          title="Real-time P95 Latency"
                          value={performanceData.p95Latency}
                          suffix="ms"
                          precision={1}
                          valueStyle={{
                            color: getLatencyColor(performanceData.p95Latency),
                            fontSize: '22px',
                            fontWeight: 'bold'
                          }}
                          prefix={<LineChartOutlined />}
                        />
                        <Tag color={getLatencyColor(performanceData.p95Latency)} style={{ marginTop: '4px' }}>
                          {getLatencyLevel(performanceData.p95Latency)}
                        </Tag>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                          Dynamically calculated, real-time updates
                        </div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                        <Statistic
                          title="Real-time E2E Latency"
                          value={performanceData.avgE2ELatency || 0}
                          suffix="ms"
                          precision={1}
                          valueStyle={{
                            color: getLatencyColor(performanceData.avgE2ELatency || 0),
                            fontSize: '22px',
                            fontWeight: 'bold'
                          }}
                          prefix={<GlobalOutlined />}
                        />
                        <Tag color={getLatencyColor(performanceData.avgE2ELatency || 0)} style={{ marginTop: '4px' }}>
                          {getLatencyLevel(performanceData.avgE2ELatency || 0)}
                        </Tag>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                          {performanceData.e2eSamples || 0} WebSocket samples
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* Operation Statistics */}
                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <Statistic
                        title="Document Updates"
                        value={performanceData.documentUpdates}
                        suffix="times"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<EditOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Keystrokes"
                        value={performanceData.keystrokes}
                        suffix="times"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<DashboardOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Total Samples"
                        value={performanceData.latencySamples}
                        suffix=""
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Col>
                  </Row>

                  {/* Sync Status */}
                  <div style={{ marginBottom: 16, padding: '8px', backgroundColor: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Space size="small">
                          <ClockCircleOutlined style={{ color: '#52c41a' }} />
                          <span><strong>Recent Samples:</strong> {performanceData.recentLatencySamples}</span>
                        </Space>
                      </Col>
                      <Col span={12}>
                        <Space size="small">
                          <SyncOutlined style={{ color: '#fa8c16' }} />
                          <span><strong>Pending:</strong> {performanceData.pendingOperations}</span>
                        </Space>
                      </Col>
                    </Row>
                  </div>

                  {/* Network Statistics */}
                  <div style={{ marginBottom: 16, fontSize: '12px' }}>
                    <strong>Network Transfer:</strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span>Sent: {(performanceData.sentBytes / 1024).toFixed(2)} KB</span>
                      <span>Received: {(performanceData.receivedBytes / 1024).toFixed(2)} KB</span>
                      <span>Bandwidth: {performanceData.bandwidthKBps.toFixed(2)} KB/s</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: '#666' }}>
                      {performanceData.avgNetworkLatency > 0 && (
                        <span>Network Latency: {performanceData.avgNetworkLatency.toFixed(1)}ms</span>
                      )}
                      {performanceData.avgE2ELatency > 0 && (
                        <span>E2E Latency: {performanceData.avgE2ELatency.toFixed(1)}ms ({performanceData.e2eSamples || 0} samples)</span>
                      )}
                    </div>
                  </div>

                  {/* Monitoring Status */}
                  <div style={{ marginBottom: 16 }}>
                    <Space size="small">
                      <Tag color="green">Monitoring</Tag>
                      <span>Duration: {performanceData.monitoringDuration.toFixed(1)}s</span>
                      <Tag color="blue">Real-time Sync</Tag>
                    </Space>
                  </div>

                  {/* Latency History Table */}
                  {latencyHistory.length > 0 && (
                    <div>
                      <strong>Latency History:</strong>
                      <Table
                        dataSource={latencyHistory.slice(-6)}
                        columns={latencyColumns}
                        pagination={false}
                        size="small"
                        style={{ marginTop: '8px' }}
                        rowKey="timestamp"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  {isMonitoring ? (
                    <div>
                      <div style={{ fontSize: '16px', color: '#666' }}>Waiting for performance data...</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                        Please input content in the editor on the left
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '16px', color: '#666' }}>Click "Start Monitoring" to begin collecting data</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                        Real-time Sync Version: Real-time P95 calculation and E2E latency monitoring
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Detailed Statistics */}
        {performanceData && (
          <Card title="Detailed Statistics" size="small" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic
                  title="Input Rate"
                  value={performanceData.keystrokesPerSecond}
                  suffix="keys/s"
                  precision={2}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="E2E P95 Latency"
                  value={performanceData.p95E2ELatency || 0}
                  suffix="ms"
                  precision={1}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Network Samples"
                  value={performanceData.networkLatencySamples}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="E2E Samples"
                  value={performanceData.e2eSamples || 0}
                  valueStyle={{ color: '#a0d911' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Update Rate"
                  value={performanceData.updatesPerSecond}
                  suffix="ops/s"
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Average Operation Size"
                  value={performanceData.avgUpdateSize}
                  suffix="bytes"
                  precision={0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Card>
    </div>
  );
});

export default YjsEditorWithMonitoring;
