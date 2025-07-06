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
    // 当OT客户端连接成功时，初始化性能监控器
    if (otClient && isConnected && !performanceMonitorRef.current) {
      performanceMonitorRef.current = new OTPerformanceMonitor();
      console.log("✅ [OT监控] 初始化性能监控器");
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
            windowCount: collaborationState.activeUsers,
            multiWindow: collaborationState.isMultiWindow,
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
                networkLatency: enhancedStats.avgNetworkLatency,
                samples: enhancedStats.recentLatencySamples,
                pending: enhancedStats.pendingOperations,
                windows: enhancedStats.windowCount || 1
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
      message.error('OT客户端未连接，请等待连接建立');
      return;
    }

    if (!performanceMonitorRef.current) {
      performanceMonitorRef.current = new OTPerformanceMonitor();
    }

    console.log("🚀 开始OT性能监控", {
      otClient: !!otClient,
      isConnected,
      hasWebSocket: !!(otClient && otClient.ws),
      webSocketState: otClient?.ws?.readyState
    });

    setIsMonitoring(true);
    setPerformanceData(null);
    setLatencyHistory([]);

    performanceMonitorRef.current.startMonitoring(otClient);
    message.success('🚀 已开始OT性能监控，请在编辑器中输入内容');

    // 添加调试信息
    setTimeout(() => {
      console.log("🔍 监控状态检查:", {
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
    message.info('⏹️ 已停止OT性能监控');
  };

  const handleReset = () => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.resetMetrics();
    }
    setPerformanceData(null);
    setLatencyHistory([]);
    message.success('🔄 OT监控数据已重置');
  };

  const handleExportData = () => {
    if (!performanceData) {
      message.error('没有可导出的数据');
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

    message.success('📊 OT性能数据已导出');
  };

  const handleMultiWindowTest = () => {
    const newWindow = window.open(
      window.location.href,
      '_blank',
      'width=900,height=700'
    );

    if (newWindow) {
      message.success('✅ 新窗口已打开！数据将自动同步，请在两个窗口中同时编辑测试');
    }
  };

  const handlePing = () => {
    if (otClient && isConnected) {
      otClient.ping();
      message.info('已发送ping请求');
    }
  };

  const handleTestOperation = () => {
    if (!otClient || !isConnected) {
      message.error('OT客户端未连接');
      return;
    }

    console.log("🧪 [TEST] 手动触发测试操作");

    // 手动创建一个测试操作
    const testOp = {
      ops: [{ retain: 0 }, { insert: "测试文本" }]
    };

    try {
      otClient.submitOperation(collection, docId, testOp);
      message.success('已发送测试操作');
      console.log("✅ [TEST] 测试操作发送成功");
    } catch (error) {
      console.error("❌ [TEST] 测试操作失败:", error);
      message.error('测试操作失败');
    }
  };

  const getLatencyColor = (latency) => {
    if (latency < 50) return '#52c41a';
    if (latency < 150) return '#faad14';
    if (latency < 500) return '#fa8c16';
    return '#f5222d';
  };

  const getLatencyLevel = (latency) => {
    if (latency < 50) return '优秀';
    if (latency < 150) return '良好';
    if (latency < 500) return '一般';
    return '需优化';
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
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
      width: 80
    },
    {
      title: '延迟(ms)',
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
      title: 'P95(ms)',
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
      title: '窗口',
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
        <Card title="OT协作编辑器" size="small">
          <div style={{ marginBottom: '12px' }}>
            <Space>
              <Button
                type={isMonitoring ? "default" : "primary"}
                icon={isMonitoring ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
                size="small"
                disabled={!isConnected}
              >
                {isMonitoring ? '停止监控' : '开始监控'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={isMonitoring}
                size="small"
              >
                重置
              </Button>
              <Tag color={isConnected ? 'green' : 'red'} size="small">
                {isConnected ? '已连接' : '未连接'}
              </Tag>
              {performanceData && (
                <Tag color="blue" size="small">
                  延迟: {performanceData.avgLatency.toFixed(1)}ms
                </Tag>
              )}
            </Space>
          </div>

          <div
            ref={editorRef}
            style={editorStyle}
            placeholder="在此输入内容进行OT性能测试..."
          />

          <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#f6f8fa', borderRadius: '4px', fontSize: '11px' }}>
            <Row gutter={8}>
              <Col span={12}>
                <Space size="small">
                  <strong>文档:</strong>
                  <span>{docId}</span>
                </Space>
              </Col>
              <Col span={12}>
                {performanceData && (
                  <Space size="small">
                    <span>操作: {performanceData.operationsCount}</span>
                    <span>连接: {performanceData.activeConnections}</span>
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
            <span>ShareDB OT 多窗口同步性能监控</span>
            <Tag color="purple">实时同步版本</Tag>
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
              {isMonitoring ? '停止监控' : '开始监控'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={isMonitoring}
            >
              重置数据
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportData}
              disabled={!performanceData}
            >
              导出数据
            </Button>
            <Button
              icon={<GlobalOutlined />}
              onClick={handleMultiWindowTest}
              type="primary"
              ghost
            >
              打开新窗口
            </Button>
          </Space>
        }
      >
        {/* 多窗口同步说明 */}
        <Alert
          message="🔄 多窗口实时同步监控"
          description="支持多窗口数据实时同步，P95延迟基于最近数据计算，确保数据准确性。打开多个窗口同时编辑，数据将自动合并显示。"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {performanceData && performanceData.windowCount > 1 && (
          <Alert
            message={`🌐 检测到 ${performanceData.windowCount} 个监控窗口`}
            description="数据已自动合并多个窗口的性能指标，显示的是所有窗口的综合性能表现。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!isMonitoring && (
          <Alert
            message="多窗口测试指南"
            description="1. 点击'开始监控' → 2. 点击'打开新窗口' → 3. 在两个窗口中同时编辑 → 4. 观察实时同步的性能数据"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16}>
          {/* 左侧：OT编辑器 */}
          <Col span={12}>
            <Card
              title="实时协作编辑器"
              size="small"
            // extra={
            //   <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            //     <span style={{
            //       fontSize: 12,
            //       padding: '2px 8px',
            //       borderRadius: 4,
            //       backgroundColor: isConnected ? '#f6ffed' : '#fff2f0',
            //       color: isConnected ? '#52c41a' : '#ff4d4f',
            //       border: `1px solid ${isConnected ? '#b7eb8f' : '#ffccc7'}`
            //     }}>
            //       {isConnected ? (
            //         <>
            //           <WifiOutlined /> 已连接
            //         </>
            //       ) : (
            //         <>
            //           <DisconnectOutlined /> 未连接
            //         </>
            //       )}
            //     </span>
            //     <Button
            //       size="small"
            //       onClick={handlePing}
            //       disabled={!isConnected}
            //     >
            //       测试延迟
            //     </Button>
            //     <Button
            //       size="small"
            //       onClick={handleTestOperation}
            //       disabled={!isConnected}
            //       type="primary"
            //       ghost
            //     >
            //       测试操作
            //     </Button>
            //   </div>
            // }
            >
              <div
                ref={editorRef}
                style={editorStyle}
                placeholder="在此输入内容，支持多窗口实时同步监控..."
              />

              <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f6f8fa', borderRadius: '4px', fontSize: '12px' }}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Space size="small">
                      <strong>连接:</strong>
                      <Tag color={isConnected ? 'green' : 'red'} size="small">
                        {isConnected ? '已连接' : '未连接'}
                      </Tag>
                    </Space>
                  </Col>
                  <Col span={12}>
                    {performanceData && (
                      <Space size="small">
                        <SyncOutlined style={{ color: '#1890ff' }} />
                        <span>窗口: {performanceData.windowCount || 1}</span>
                        <span>待处理: {performanceData.pendingOperations}</span>
                      </Space>
                    )}
                  </Col>
                </Row>
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                  文档ID: {docId}
                  {performanceData && (
                    <span style={{ marginLeft: '8px' }}>窗口ID: {performanceData.windowId?.slice(-8) || 'N/A'}</span>
                  )}
                </div>
              </div>
            </Card>
          </Col>

          {/* 右侧：性能监控 */}
          <Col span={12}>
            <Card title="实时性能数据" size="small">
              {performanceData ? (
                <div>
                  {/* 核心指标 */}
                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                        <Statistic
                          title="实时OT延迟"
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
                          基于最近 {performanceData.recentLatencySamples || 0} 个样本
                        </div>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                        <Statistic
                          title="实时P95延迟"
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
                          动态计算，实时更新
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* 操作统计 */}
                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <Statistic
                        title="文档更新"
                        value={performanceData.operationsCount}
                        suffix="次"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<EditOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="键盘输入"
                        value={performanceData.keystrokes || 0}
                        suffix="次"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<DashboardOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="总样本"
                        value={performanceData.latencySamples || 0}
                        suffix="个"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Col>
                  </Row>

                  {/* 多窗口同步状态 */}
                  <div style={{ marginBottom: 16, padding: '8px', backgroundColor: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Space size="small">
                          <GlobalOutlined style={{ color: '#1890ff' }} />
                          <span><strong>窗口数:</strong> {performanceData.windowCount || 1}</span>
                        </Space>
                      </Col>
                      <Col span={8}>
                        <Space size="small">
                          <ClockCircleOutlined style={{ color: '#52c41a' }} />
                          <span><strong>最近样本:</strong> {performanceData.recentLatencySamples || 0}</span>
                        </Space>
                      </Col>
                      <Col span={8}>
                        <Space size="small">
                          <SyncOutlined style={{ color: '#fa8c16' }} />
                          <span><strong>待处理:</strong> {performanceData.pendingOperations}</span>
                        </Space>
                      </Col>
                    </Row>
                  </div>

                  {/* 网络统计 */}
                  <div style={{ marginBottom: 16, fontSize: '12px' }}>
                    <strong>网络传输：</strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span>发送: {(performanceData.bytesSent / 1024).toFixed(2)} KB</span>
                      <span>接收: {(performanceData.bytesReceived / 1024).toFixed(2)} KB</span>
                      <span>带宽: {(performanceData.bytesPerSecond / 1024).toFixed(2)} KB/s</span>
                    </div>
                    {performanceData.avgNetworkLatency > 0 && (
                      <div style={{ marginTop: '4px', color: '#666' }}>
                        网络延迟: {performanceData.avgNetworkLatency.toFixed(1)}ms
                      </div>
                    )}
                  </div>

                  {/* 监控状态 */}
                  <div style={{ marginBottom: 16 }}>
                    <Space size="small">
                      <Tag color="green">监控中</Tag>
                      <span>时长: {(performanceData.monitoringDuration || 0).toFixed(1)}s</span>
                      <Tag color="blue">实时同步</Tag>
                    </Space>
                  </div>

                  {/* 延迟历史表格 */}
                  {latencyHistory.length > 0 && (
                    <div>
                      <strong>延迟历史：</strong>
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
                      <div style={{ fontSize: '16px', color: '#666' }}>等待性能数据...</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                        请在左侧编辑器中输入内容
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '16px', color: '#666' }}>点击"开始监控"开始收集数据</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                        多窗口同步版本：实时P95计算，数据自动合并
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 详细统计 */}
        {performanceData && (
          <Card title="详细统计信息" size="small" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic
                  title="平均操作大小"
                  value={performanceData.bytesSent / Math.max(performanceData.operationsCount, 1)}
                  suffix="字节"
                  precision={0}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="网络效率"
                  value={performanceData.operationsCount / Math.max(performanceData.bytesSent / 1024, 1)}
                  suffix="ops/KB"
                  precision={2}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="冲突率"
                  value={performanceData.conflictResolutions / Math.max(performanceData.operationsCount, 1) * 100}
                  suffix="%"
                  precision={1}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="连接稳定性"
                  value={performanceData.activeConnections > 0 ? 100 : 0}
                  suffix="%"
                  valueStyle={{ color: performanceData.activeConnections > 0 ? '#52c41a' : '#f5222d' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="协作用户"
                  value={collaborationState.activeUsers || 1}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="监控时长"
                  value={performanceData.uptime / 1000}
                  suffix="秒"
                  precision={1}
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