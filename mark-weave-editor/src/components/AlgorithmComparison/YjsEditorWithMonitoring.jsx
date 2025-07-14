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
import RealYjsMonitor from '../../utils/RealYjsMonitor';
import { ydoc } from '../../crdt';

const YjsEditorWithMonitoring = forwardRef(({
  docId = 'crdt-performance-test-doc',
  title = null,
  showMetrics = true,
  onMetricsUpdate = null
}, ref) => {
  const editorRef = useRef(null);
  const [editorView, awareness, provider, isConnected] = useYjsEditor(docId, editorRef);
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
      monitorRef.current = new RealYjsMonitor();
    }

    return () => {
      if (monitorRef.current) {
        monitorRef.current.stopMonitoring();
      }
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, []);

  // 监控数据刷新 - 更频繁的更新
  useEffect(() => {
    if (isMonitoring && monitorRef.current) {
      refreshTimer.current = setInterval(() => {
        const stats = monitorRef.current.getPerformanceStats();
        if (stats) {
          setPerformanceData(stats);

          // 通知父组件指标更新 - 🔥 统一指标格式
          if (onMetricsUpdate) {
            onMetricsUpdate({
              // 基本操作指标
              operationsCount: stats.documentUpdates || 0,
              avgLatency: stats.avgLatency || 0,
              p95Latency: stats.p95Latency || 0,

              // 网络传输指标
              bytesSent: stats.sentBytes || 0,
              bytesReceived: stats.receivedBytes || 0,

              // 协作用户指标
              activeUsers: stats.totalWindows || 0,

              // 🔥 修复：统一计算方式
              opsPerSecond: stats.updatesPerSecond || 0,  // 使用已计算的值
              bytesPerSecond: (stats.bandwidthKBps || 0) * 1024,  // 转换为字节/秒

              // 额外指标
              keystrokes: stats.keystrokes || 0,
              keystrokesPerSecond: stats.keystrokesPerSecond || 0,
              pendingOperations: stats.pendingOperations || 0,
              totalUpdateSize: stats.totalUpdateSize || 0,
              avgUpdateSize: stats.avgUpdateSize || 0,

              // 网络延迟指标
              avgNetworkLatency: stats.avgNetworkLatency || 0,
              networkLatencySamples: stats.networkLatencySamples || 0,

              // 监控状态
              monitoringDuration: stats.monitoringDuration || 0,
              isConnected: stats.isConnected || false,
              windowId: stats.windowId || '',

              // 数据样本统计
              latencySamples: stats.latencySamples || 0,
              recentLatencySamples: stats.recentLatencySamples || 0,

              // 协作统计
              activeCollaborators: stats.activeCollaborators || 0,
              totalAwarenessChanges: stats.totalAwarenessChanges || 0,

              // 数据源标识
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
                networkLatency: stats.avgNetworkLatency,
                samples: stats.recentLatencySamples,
                pending: stats.pendingOperations,
                windows: stats.totalWindows
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
  }, [isMonitoring]);

  const handleStartMonitoring = () => {
    // 🔥 修复：使用实际的全局ydoc而不是hook返回的
    const actualYdoc = ydoc; // 从crdt模块导入的全局ydoc
    
    if (!actualYdoc || !awareness || !provider || !isConnected) {
      message.error('Editor not fully initialized or not connected, please try again later');
      return;
    }

    console.log("🔧 [DEBUG] 使用实际的ydoc:", {
      actualYdoc: !!actualYdoc,
      awareness: !!awareness,
      provider: !!provider,
      isConnected
    });

    setIsMonitoring(true);
    setPerformanceData(null);
    setLatencyHistory([]);

    monitorRef.current.startMonitoring(actualYdoc, awareness, provider);
    message.success('🚀 Multi-window sync performance monitoring started, please input content in the editor');
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
    a.download = `yjs-multi-window-performance-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('📊 Multi-window academic data exported');
  };

  const handleMultiWindowTest = () => {
    const newWindow = window.open(
      window.location.href,
      '_blank',
      'width=900,height=700'
    );

    if (newWindow) {
      message.success('✅ New window opened! Data will sync automatically, please edit in both windows to test');
    }
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
      title: 'Windows',
      dataIndex: 'windows',
      key: 'windows',
      render: (windows) => (
        <Tag color="blue" size="small">{windows}</Tag>
      ),
      width: 50
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
                    <span>Windows: {performanceData.totalWindows || 1}</span>
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
            <span>Yjs CRDT Multi-window Sync Performance Monitor</span>
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
            <Button
              icon={<GlobalOutlined />}
              onClick={handleMultiWindowTest}
              type="primary"
              ghost
            >
              Open New Window
            </Button>
          </Space>
        }
      >
        {/* Multi-window sync description */}
        <Alert
          message="🔄 Real-time Multi-window Sync Monitoring"
          description="Supports real-time data sync across multiple windows. P95 latency is calculated based on recent data to ensure accuracy. Open multiple windows to edit simultaneously, data will merge automatically."
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {performanceData && performanceData.totalWindows > 1 && (
          <Alert
            message={`🌐 Detected ${performanceData.totalWindows} Monitoring Windows`}
            description="Data has been automatically merged from all windows, showing combined performance metrics from all monitoring points."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!isMonitoring && (
          <Alert
            message="Multi-window Testing Guide"
            description="1. Click 'Start Monitoring' → 2. Click 'Open New Window' → 3. Edit simultaneously in both windows → 4. Observe real-time sync performance data"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16}>
          {/* Left: Editor */}
          <Col span={12}>
            <Card title="Real-time Collaborative Editor" size="small">
              <div
                ref={editorRef}
                style={editorStyle}
                placeholder="Enter content here, supports multi-window real-time sync monitoring..."
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
                        <span>Windows: {performanceData.totalWindows}</span>
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
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                        <Statistic
                          title="Real-time CRDT Latency"
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
                    <Col span={12}>
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

                  {/* Multi-window Sync Status */}
                  <div style={{ marginBottom: 16, padding: '8px', backgroundColor: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Space size="small">
                          <GlobalOutlined style={{ color: '#1890ff' }} />
                          <span><strong>Windows:</strong> {performanceData.totalWindows}</span>
                        </Space>
                      </Col>
                      <Col span={8}>
                        <Space size="small">
                          <ClockCircleOutlined style={{ color: '#52c41a' }} />
                          <span><strong>Recent Samples:</strong> {performanceData.recentLatencySamples}</span>
                        </Space>
                      </Col>
                      <Col span={8}>
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
                    {performanceData.avgNetworkLatency > 0 && (
                      <div style={{ marginTop: '4px', color: '#666' }}>
                        Network Latency: {performanceData.avgNetworkLatency.toFixed(1)}ms
                      </div>
                    )}
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
                        Multi-window Sync Version: Real-time P95 calculation, automatic data merging
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
                  title="Update Rate"
                  value={performanceData.updatesPerSecond}
                  suffix="ops/s"
                  precision={2}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Average Update Size"
                  value={performanceData.avgUpdateSize}
                  suffix="bytes"
                  precision={0}
                />
              </Col>
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
                  title="Active Users"
                  value={performanceData.activeCollaborators}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Sync Windows"
                  value={performanceData.totalWindows}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Network Samples"
                  value={performanceData.networkLatencySamples}
                  valueStyle={{ color: '#fa8c16' }}
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
