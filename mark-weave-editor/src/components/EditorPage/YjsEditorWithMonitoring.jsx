/*
 * @FilePath: YjsEditorWithMonitoring.jsx
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: 集成编辑器和多窗口同步的真实性能监控面板
 */

import React, { useRef, useEffect, useState } from 'react';
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

const YjsEditorWithMonitoring = ({ docId = 'performance-test-doc' }) => {
  const editorRef = useRef(null);
  const [editorView, awareness, provider] = useYjsEditor(docId, editorRef);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);

  const monitorRef = useRef(null);
  const refreshTimer = useRef(null);

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
      }, 500); // 每500ms刷新一次，更实时
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
    if (!ydoc || !awareness || !provider) {
      message.error('编辑器未完全初始化，请稍后再试');
      return;
    }

    setIsMonitoring(true);
    setPerformanceData(null);
    setLatencyHistory([]);

    monitorRef.current.startMonitoring(ydoc, awareness, provider);
    message.success('🚀 已开始多窗口同步性能监控，请在编辑器中输入内容');
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    if (monitorRef.current) {
      monitorRef.current.stopMonitoring();
    }
    message.info('⏹️ 已停止性能监控');
  };

  const handleReset = () => {
    if (monitorRef.current) {
      monitorRef.current.reset();
    }
    setPerformanceData(null);
    setLatencyHistory([]);
    message.success('🔄 监控数据已重置');
  };

  const handleExportData = () => {
    if (!monitorRef.current) return;

    const academicData = monitorRef.current.exportAcademicData();
    if (!academicData) {
      message.error('没有可导出的数据');
      return;
    }

    // 下载JSON文件
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

    message.success('📊 多窗口学术数据已导出');
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

  const getLatencyColor = (latency) => {
    if (latency < 20) return '#52c41a';
    if (latency < 100) return '#faad14';
    if (latency < 500) return '#fa8c16';
    return '#f5222d';
  };

  const getLatencyLevel = (latency) => {
    if (latency < 20) return '优秀';
    if (latency < 100) return '良好';
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const latencyColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
      width: 70
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
      width: 70
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
      width: 70
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

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>Yjs CRDT 多窗口同步性能监控</span>
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

        {performanceData && performanceData.totalWindows > 1 && (
          <Alert
            message={`🌐 检测到 ${performanceData.totalWindows} 个监控窗口`}
            description="数据已自动合并多个窗口的性能指标，显示的是所有窗口的综合性能表现。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!isMonitoring && (
          <Alert
            message="�� 多窗口测试指南"
            description="1. 点击'开始监控' → 2. 点击'打开新窗口' → 3. 在两个窗口中同时编辑 → 4. 观察实时同步的性能数据"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16}>
          {/* 左侧：编辑器 */}
          <Col span={12}>
            <Card title="实时协作编辑器" size="small">
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
                      <Tag color={provider && provider.ws && provider.ws.readyState === WebSocket.OPEN ? 'green' : 'red'} size="small">
                        {provider && provider.ws && provider.ws.readyState === WebSocket.OPEN ? '已连接' : '未连接'}
                      </Tag>
                    </Space>
                  </Col>
                  <Col span={12}>
                    {performanceData && (
                      <Space size="small">
                        <SyncOutlined style={{ color: '#1890ff' }} />
                        <span>窗口: {performanceData.totalWindows}</span>
                        <span>待处理: {performanceData.pendingOperations}</span>
                      </Space>
                    )}
                  </Col>
                </Row>
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                  文档ID: {docId}
                  {performanceData && (
                    <span style={{ marginLeft: '8px' }}>窗口ID: {performanceData.windowId.slice(-8)}</span>
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
                          title="实时CRDT延迟"
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
                          基于最近 {performanceData.recentLatencySamples} 个样本
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
                        value={performanceData.documentUpdates}
                        suffix="次"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<EditOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="键盘输入"
                        value={performanceData.keystrokes}
                        suffix="次"
                        valueStyle={{ fontSize: '14px' }}
                        prefix={<DashboardOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="总样本"
                        value={performanceData.latencySamples}
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
                          <span><strong>窗口数:</strong> {performanceData.totalWindows}</span>
                        </Space>
                      </Col>
                      <Col span={8}>
                        <Space size="small">
                          <ClockCircleOutlined style={{ color: '#52c41a' }} />
                          <span><strong>最近样本:</strong> {performanceData.recentLatencySamples}</span>
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
                      <span>发送: {(performanceData.sentBytes / 1024).toFixed(2)} KB</span>
                      <span>接收: {(performanceData.receivedBytes / 1024).toFixed(2)} KB</span>
                      <span>带宽: {performanceData.bandwidthKBps.toFixed(2)} KB/s</span>
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
                      <span>时长: {performanceData.monitoringDuration.toFixed(1)}s</span>
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
                  title="更新频率"
                  value={performanceData.updatesPerSecond}
                  suffix="次/秒"
                  precision={2}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="平均更新大小"
                  value={performanceData.avgUpdateSize}
                  suffix="字节"
                  precision={0}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="输入频率"
                  value={performanceData.keystrokesPerSecond}
                  suffix="次/秒"
                  precision={2}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="活跃用户"
                  value={performanceData.activeCollaborators}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="同步窗口"
                  value={performanceData.totalWindows}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="网络样本"
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
};

export default YjsEditorWithMonitoring;
