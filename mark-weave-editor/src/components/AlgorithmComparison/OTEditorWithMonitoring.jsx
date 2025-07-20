/*
 * @FilePath: OTEditorWithMonitoring.jsx
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: OT算法性能监控组件，集成ShareDB编辑器和真实性能监控面板
 */

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Row, Col, Card, Button, Space, Statistic, Progress, Table, Tag, Alert, message, Input } from 'antd';
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
  SyncOutlined,
  WifiOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import { useOTEditor } from '../../hooks/useOTEditor';
import OTPerformanceMonitor from '../../utils/otPerformanceMonitor';

const OTEditorWithMonitoring = forwardRef(({
  docId = 'ot-performance-test-doc',
  collection = 'documents',
  title = null,
  showMetrics = true,
  onMetricsUpdate = null
}, ref) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);

  const editorRef = useRef(null);
  const performanceMonitorRef = useRef(null);
  const refreshTimer = useRef(null);

  // 使用OT编辑器Hook - 获取协作状态
  const [editorView, otClient, isConnected, editorUtils] = useOTEditor(
    docId,
    collection,
    editorRef
  );

  // 获取多窗口协作状态
  const collaborationState = editorUtils?.getCollaborationState ? editorUtils.getCollaborationState() : {
    userStates: [],
    activeUsers: 0,
    isMultiWindow: false
  };

  // 暴露重置方法给父组件
  useImperativeHandle(ref, () => ({
    resetMetrics: handleReset,
    getMetrics: () => performanceMonitorRef.current?.getAggregatedMetrics() || {}
  }));

  useEffect(() => {
    // OT 客户端连接成功时，初始化性能监控器
    if (otClient && isConnected && !performanceMonitorRef.current) {
      performanceMonitorRef.current = new OTPerformanceMonitor();
      console.log("✅ [OT监控] 初始化性能监控器");
    }
    // 自动开始监控
    if (otClient && isConnected && !isMonitoring) {
      handleStartMonitoring();
    }
    return () => {
      cleanup();
    };
  }, [otClient, isConnected]);

  // 监控数据刷新
  useEffect(() => {
    if (isMonitoring && performanceMonitorRef.current) {
      refreshTimer.current = setInterval(() => {
        const stats = performanceMonitorRef.current.getAggregatedMetrics();
        if (stats) {
          // 合并协作状态数据
          const enhancedStats = {
            ...stats,
            // 不再覆盖 windowCount 和 multiWindow，直接用 stats 的真实值
            userStates: collaborationState.userStates,
            activeUsers: collaborationState.activeUsers,
          };

          setPerformanceData(enhancedStats);

          // 通知父组件指标更新 - 🔥 统一指标格式
          if (onMetricsUpdate) {
            onMetricsUpdate({
              // 基本操作指标
              operationsCount: enhancedStats.operationsCount || 0,
              avgLatency: enhancedStats.avgLatency || 0,
              p95Latency: enhancedStats.p95Latency || 0,

              // 网络传输指标
              bytesSent: enhancedStats.bytesSent || 0,
              bytesReceived: enhancedStats.bytesReceived || 0,

              // 协作用户指标
              activeUsers: enhancedStats.activeUsers || enhancedStats.windowCount || 1,

              // 🔥 修复：统一计算方式
              opsPerSecond: enhancedStats.opsPerSecond || 0,
              bytesPerSecond: enhancedStats.bytesPerSecond || 0,

              // 额外指标
              keystrokes: enhancedStats.keystrokes || 0,
              keystrokesPerSecond: enhancedStats.keystrokesPerSecond || 0,
              pendingOperations: enhancedStats.pendingOperations || 0,
              totalOperationSize: enhancedStats.totalOperationSize || 0,
              avgOperationSize: enhancedStats.avgOperationSize || 0,

              // 网络延迟指标
              avgNetworkLatency: enhancedStats.avgNetworkLatency || 0,
              networkLatencySamples: enhancedStats.networkLatencySamples || 0,

              // 监控状态
              monitoringDuration: enhancedStats.monitoringDuration || 0,
              isConnected: enhancedStats.isConnected || false,
              windowId: enhancedStats.windowId || '',

              // 数据样本统计
              latencySamples: enhancedStats.latencySamples || 0,
              recentLatencySamples: enhancedStats.recentLatencySamples || 0,

              // OT特有指标
              activeConnections: enhancedStats.activeConnections || 0,
              conflictResolutions: enhancedStats.conflictResolutions || 0,
              messagesSent: enhancedStats.messagesSent || 0,
              messagesReceived: enhancedStats.messagesReceived || 0,
              messagesPerSecond: enhancedStats.messagesPerSecond || 0,

              // 多窗口状态
              multiWindow: enhancedStats.multiWindow || false,
              windowCount: enhancedStats.windowCount || 1,

              // 数据源标识
              algorithm: 'OT',
              dataSource: enhancedStats.dataSource || 'sharedb-real-monitoring',
              hasRealNetworkData: enhancedStats.hasRealNetworkData || false,
              hasRealLatencyData: enhancedStats.hasRealLatencyData || false,

              // 运行时间
              uptime: enhancedStats.uptime || 0
            });
          }

          // 更新延迟历史
          if (enhancedStats.avgLatency > 0) {
            setLatencyHistory(prev => {
              const newHistory = [...prev, {
                timestamp: Date.now(),
                latency: enhancedStats.avgLatency,
                p95: enhancedStats.p95Latency,
                e2eLatency: enhancedStats.avgE2ELatency || 0,
                networkLatency: enhancedStats.avgNetworkLatency,
                samples: enhancedStats.recentLatencySamples,
                pending: enhancedStats.pendingOperations
              }];
              return newHistory.slice(-30); // 保持最近30个数据点
            });
          }
        }
      }, 400); // 🔧 优化：每400ms刷新一次，与4秒P95窗口形成10倍合理关系
    } else {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
        refreshTimer.current = null;
      }
    }

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [isMonitoring, onMetricsUpdate, collaborationState]);

  /**
   * 清理资源
   */
  const cleanup = () => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
    }
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.stopMonitoring();
    }
    if (editorUtils && editorUtils.cleanup) {
      editorUtils.cleanup();
    }
  };

  const handleStartMonitoring = () => {
    if (!otClient || !isConnected) {
      message.error('OT client not connected, please wait for connection');
      return;
    }

    if (!performanceMonitorRef.current) {
      performanceMonitorRef.current = new OTPerformanceMonitor();
    }

    console.log("🚀 Starting OT performance monitoring", {
      otClient: !!otClient,
      isConnected,
      hasWebSocket: !!(otClient && otClient.ws),
      webSocketState: otClient?.ws?.readyState
    });

    setIsMonitoring(true);
    setPerformanceData(null);
    setLatencyHistory([]);

    performanceMonitorRef.current.startMonitoring(otClient);
    message.success('🚀 OT performance monitoring started, please input content in the editor');

    // Add debug information
    setTimeout(() => {
      console.log("🔍 Monitoring status check:", {
        isMonitoring: performanceMonitorRef.current?.isMonitoring,
        hasClient: !!performanceMonitorRef.current?.otClient,
        pendingOps: performanceMonitorRef.current?.metrics?.pendingOperations?.length || 0
      });
    }, 1000);
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.stopMonitoring();
    }
    message.info('⏹️ OT performance monitoring stopped');
  };

  const handleReset = () => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.resetMetrics();
    }
    setPerformanceData(null);
    setLatencyHistory([]);
    message.success('🔄 OT monitoring data reset');
  };

  const handleExportData = () => {
    if (!performanceData) {
      message.error('No data available for export');
      return;
    }

    const academicData = {
      algorithm: 'ShareDB OT',
      testInfo: {
        documentId: docId,
        collection: collection,
        testDuration: performanceData.uptime,
        timestamp: new Date().toISOString(),
        multiWindow: performanceData.multiWindow,
        windowCount: performanceData.windowCount
      },
      performanceMetrics: {
        operationsCount: performanceData.operationsCount,
        avgLatency: performanceData.avgLatency,
        p95Latency: performanceData.p95Latency,
        networkLatency: performanceData.avgNetworkLatency,
        bytesSent: performanceData.bytesSent,
        bytesReceived: performanceData.bytesReceived,
        opsPerSecond: performanceData.opsPerSecond,
        bytesPerSecond: performanceData.bytesPerSecond,
        conflictResolutions: performanceData.conflictResolutions
      },
      latencyHistory: latencyHistory,
      rawData: performanceData
    };

    // 下载JSON文件
    const blob = new Blob([JSON.stringify(academicData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ot-performance-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('📊 OT performance data exported');
  };



  const handlePing = () => {
    if (otClient && isConnected) {
      otClient.ping();
      message.info('Ping request sent');
    }
  };

  const handleTestOperation = () => {
    if (!otClient || !isConnected) {
      message.error('OT client not connected');
      return;
    }

    console.log("🧪 [TEST] Manually triggering test operation");

    // Manually create a test operation
    const testOp = {
      ops: [{ retain: 0 }, { insert: "Test Text" }]
    };

    try {
      otClient.submitOperation(collection, docId, testOp);
      message.success('Test operation sent');
      console.log("✅ [TEST] Test operation sent successfully");
    } catch (error) {
      console.error("❌ [TEST] Test operation failed:", error);
      message.error('Test operation failed');
    }
  };

  const getLatencyColor = (latency) => {
    if (latency < 50) return '#52c41a';
    if (latency < 150) return '#faad14';
    if (latency < 500) return '#fa8c16';
    return '#f5222d';
  };

  const getLatencyLevel = (latency) => {
    if (latency < 50) return 'Excellent';
    if (latency < 150) return 'Good';
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    outline: 'none'
  };

  const latencyColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
      width: 80
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
      width: 80
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
      width: 80
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
      width: 80
    }
  ];

  // If showMetrics is false, only show editor part
  if (!showMetrics) {
    return (
      <div style={{ padding: '12px' }}>
        <Card title="OT Collaborative Editor" size="small">
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
            placeholder="Enter content here for OT performance testing..."
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
                    <span>Connections: {performanceData.activeConnections}</span>
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
            <span>OT Performance Monitor</span>
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
              disabled={!isConnected}
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
          {/* Left: OT Editor */}
          <Col span={12}>
            <Card
              title="Real-time Collaborative Editor"
              size="small"
            >
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
                    <span style={{ marginLeft: '8px' }}>Window ID: {performanceData.windowId?.slice(-8) || 'N/A'}</span>
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
                          Based on recent {performanceData.recentLatencySamples || 0} samples
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
                        value={performanceData.operationsCount}
                        suffix="times"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<EditOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Keystrokes"
                        value={performanceData.keystrokes || 0}
                        suffix="times"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<DashboardOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Total Samples"
                        value={performanceData.latencySamples || 0}
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
                          <span><strong>Recent Samples:</strong> {performanceData.recentLatencySamples || 0}</span>
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
                      <span>Sent: {(performanceData.bytesSent / 1024).toFixed(2)} KB</span>
                      <span>Received: {(performanceData.bytesReceived / 1024).toFixed(2)} KB</span>
                      <span>Bandwidth: {(performanceData.bytesPerSecond / 1024).toFixed(2)} KB/s</span>
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
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Network Samples"
                  value={performanceData.networkLatencySamples}
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
                  title="E2E Samples"
                  value={performanceData.e2eSamples || 0}
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Update Rate"
                  value={performanceData.opsPerSecond}
                  suffix="ops/s"
                  precision={2}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Average Operation Size"
                  value={performanceData.avgOperationSize}
                  suffix="bytes"
                  precision={0}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Card>
    </div>
  );
});

export default OTEditorWithMonitoring;