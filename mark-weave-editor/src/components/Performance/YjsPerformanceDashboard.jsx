/*
 * @FilePath: YjsPerformanceDashboard.jsx
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: Yjs真实性能监控面板 - 学术级数据可视化
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Button, Space, Tag, Divider, Alert } from 'antd';
import {
  LineChartOutlined,
  DashboardOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import YjsPerformanceMonitor from '../../utils/YjsPerformanceMonitor';

const YjsPerformanceDashboard = ({ provider, awareness, yjsDoc }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [academicReport, setAcademicReport] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(1000);

  const performanceMonitor = useRef(null);
  const refreshTimer = useRef(null);

  useEffect(() => {
    // 初始化性能监控器
    if (!performanceMonitor.current) {
      performanceMonitor.current = new YjsPerformanceMonitor();
    }

    return () => {
      if (performanceMonitor.current) {
        performanceMonitor.current.stopMonitoring();
      }
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isMonitoring && performanceMonitor.current) {
      // 开始监控
      performanceMonitor.current.startMonitoring(provider, awareness);

      // 设置定时刷新
      refreshTimer.current = setInterval(() => {
        const report = performanceMonitor.current.getComprehensiveReport();
        setPerformanceData(report);

        // 更新延迟历史
        if (report.network.latency.average > 0) {
          setLatencyHistory(prev => {
            const newHistory = [...prev, {
              timestamp: Date.now(),
              latency: report.network.latency.average,
              p95: report.network.latency.p95
            }];
            return newHistory.slice(-50); // 保持最近50个数据点
          });
        }
      }, refreshInterval);
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
  }, [isMonitoring, provider, awareness, refreshInterval]);

  // 监听Yjs文档变化
  useEffect(() => {
    if (yjsDoc && performanceMonitor.current) {
      const handleUpdate = (update, origin) => {
        performanceMonitor.current.recordYjsOperation({
          type: 'document-update',
          updateSize: update.length,
          origin,
          position: null
        });
      };

      yjsDoc.on('update', handleUpdate);
      return () => yjsDoc.off('update', handleUpdate);
    }
  }, [yjsDoc]);

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    setPerformanceData(null);
    setLatencyHistory([]);
    console.log('🚀 开始Yjs性能监控');
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    if (performanceMonitor.current) {
      performanceMonitor.current.stopMonitoring();
    }
    console.log('⏹️ 停止Yjs性能监控');
  };

  const handleReset = () => {
    if (performanceMonitor.current) {
      performanceMonitor.current.reset();
    }
    setPerformanceData(null);
    setLatencyHistory([]);
    setAcademicReport(null);
    console.log('🔄 重置性能监控数据');
  };

  const handleExportData = () => {
    if (performanceMonitor.current) {
      const academicData = performanceMonitor.current.exportAcademicData();
      setAcademicReport(academicData);

      // 下载JSON文件
      const blob = new Blob([JSON.stringify(academicData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yjs-performance-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📊 学术数据已导出');
    }
  };

  const getLatencyColor = (latency) => {
    if (latency < 50) return '#52c41a';
    if (latency < 100) return '#faad14';
    if (latency < 200) return '#fa8c16';
    return '#f5222d';
  };

  const getThroughputColor = (throughput) => {
    if (throughput > 10) return '#52c41a';
    if (throughput > 5) return '#faad14';
    if (throughput > 1) return '#fa8c16';
    return '#f5222d';
  };

  const getNetworkEfficiencyLevel = (score) => {
    if (score > 0.8) return { level: '优秀', color: '#52c41a' };
    if (score > 0.6) return { level: '良好', color: '#faad14' };
    if (score > 0.4) return { level: '一般', color: '#fa8c16' };
    return { level: '需改进', color: '#f5222d' };
  };

  const collaborationColumns = [
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: '会话时长',
      dataIndex: 'sessionDuration',
      key: 'sessionDuration',
      render: (duration) => `${duration.toFixed(1)}s`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '活跃' : '离线'}
        </Tag>
      ),
    },
  ];

  const latencyColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
    },
    {
      title: '平均延迟 (ms)',
      dataIndex: 'latency',
      key: 'latency',
      render: (latency) => (
        <span style={{ color: getLatencyColor(latency) }}>
          {latency.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'P95延迟 (ms)',
      dataIndex: 'p95',
      key: 'p95',
      render: (p95) => (
        <span style={{ color: getLatencyColor(p95) }}>
          {p95.toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>Yjs CRDT 真实性能监控</span>
            <Tag color="blue">学术级数据收集</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              type={isMonitoring ? "default" : "primary"}
              icon={isMonitoring ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
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
              导出学术数据
            </Button>
          </Space>
        }
      >
        <Alert
          message="真实性能监控说明"
          description="此监控器收集真实的Yjs CRDT性能数据，包括网络延迟、用户操作、协作冲突等指标。数据可用于学术研究和论文分析。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {!isMonitoring && !performanceData && (
          <Alert
            message="开始监控提示"
            description="点击&quot;开始监控&quot;按钮开始收集真实的Yjs性能数据。建议在多个窗口中同时编辑文档以获得更丰富的协作数据。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {performanceData && (
          <>
            {/* 核心性能指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均延迟"
                    value={performanceData.network.latency.average}
                    suffix="ms"
                    precision={2}
                    valueStyle={{ color: getLatencyColor(performanceData.network.latency.average) }}
                    prefix={<ThunderboltOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="P95延迟"
                    value={performanceData.network.latency.p95}
                    suffix="ms"
                    precision={2}
                    valueStyle={{ color: getLatencyColor(performanceData.network.latency.p95) }}
                    prefix={<LineChartOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="吞吐量"
                    value={performanceData.network.throughput.messagesPerSecond}
                    suffix="msg/s"
                    precision={1}
                    valueStyle={{ color: getThroughputColor(performanceData.network.throughput.messagesPerSecond) }}
                    prefix={<DashboardOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="活跃用户"
                    value={performanceData.collaboration.activeUsers}
                    suffix={`/ ${performanceData.collaboration.totalUsers}`}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<TeamOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* 网络性能详情 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="网络性能详情" size="small">
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="已发送消息"
                        value={performanceData.network.reliability.messagesSent}
                        suffix="条"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="已接收消息"
                        value={performanceData.network.reliability.messagesReceived}
                        suffix="条"
                      />
                    </Col>
                  </Row>
                  <Divider />
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="带宽使用"
                        value={performanceData.network.throughput.bandwidthKBps}
                        suffix="KB/s"
                        precision={2}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="延迟样本"
                        value={performanceData.network.latency.measurements}
                        suffix="个"
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="用户活动统计" size="small">
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="Yjs操作"
                        value={performanceData.userActivity.yjsOperations}
                        suffix="次"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="操作频率"
                        value={performanceData.userActivity.actionsPerSecond}
                        suffix="次/s"
                        precision={2}
                      />
                    </Col>
                  </Row>
                  <Divider />
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="编辑效率"
                        value={performanceData.userActivity.editingEfficiency}
                        precision={3}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="会话时长"
                        value={performanceData.userActivity.sessionDuration}
                        suffix="s"
                        precision={1}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* 学术指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card title="学术性能指标" size="small">
                  <Row gutter={16}>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', color: '#666' }}>网络效率</div>
                        <Progress
                          type="circle"
                          percent={Math.round(performanceData.academicMetrics.networkEfficiency.overallScore * 100)}
                          width={80}
                          strokeColor={getNetworkEfficiencyLevel(performanceData.academicMetrics.networkEfficiency.overallScore).color}
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px' }}>
                          <Tag color={getNetworkEfficiencyLevel(performanceData.academicMetrics.networkEfficiency.overallScore).color}>
                            {getNetworkEfficiencyLevel(performanceData.academicMetrics.networkEfficiency.overallScore).level}
                          </Tag>
                        </div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', color: '#666' }}>协作效率</div>
                        <Progress
                          type="circle"
                          percent={Math.round(performanceData.academicMetrics.collaborationEfficiency.efficiency * 100)}
                          width={80}
                          strokeColor="#52c41a"
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px' }}>
                          冲突率: {(performanceData.academicMetrics.collaborationEfficiency.conflictRatio * 100).toFixed(1)}%
                        </div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', color: '#666' }}>用户体验</div>
                        <Progress
                          type="circle"
                          percent={Math.round(performanceData.academicMetrics.userExperience.overallScore * 100)}
                          width={80}
                          strokeColor="#1890ff"
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px' }}>
                          响应性: {(performanceData.academicMetrics.userExperience.responsiveness * 100).toFixed(0)}%
                        </div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', color: '#666' }}>操作复杂度</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                          {performanceData.academicMetrics.operationalComplexity.operationsPerByte.toFixed(4)}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '12px' }}>
                          <Tag color="orange">
                            {performanceData.academicMetrics.operationalComplexity.complexity}
                          </Tag>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* 协作用户列表 */}
            {performanceData.collaboration.userSessions.length > 0 && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Card title="协作用户" size="small">
                    <Table
                      dataSource={performanceData.collaboration.userSessions}
                      columns={collaborationColumns}
                      pagination={false}
                      size="small"
                      rowKey="user"
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="延迟历史" size="small">
                    <Table
                      dataSource={latencyHistory.slice(-5)}
                      columns={latencyColumns}
                      pagination={false}
                      size="small"
                      rowKey="timestamp"
                    />
                  </Card>
                </Col>
              </Row>
            )}

            {/* 监控状态 */}
            <Row gutter={16}>
              <Col span={24}>
                <Card title="监控状态" size="small">
                  <Space>
                    <Tag color="green">监控中</Tag>
                    <span>监控时长: {performanceData.monitoringDuration.toFixed(1)}s</span>
                    <span>|</span>
                    <span>连接状态: {performanceData.network.reliability.connectionStability ? '已连接' : '未连接'}</span>
                    <span>|</span>
                    <span>刷新间隔: {refreshInterval}ms</span>
                  </Space>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* 学术报告预览 */}
        {academicReport && (
          <Card
            title="学术数据报告"
            style={{ marginTop: 16 }}
            extra={
              <Tag color="blue">
                数据完整性: {academicReport.dataIntegrity.networkSamples} 网络样本
              </Tag>
            }
          >
            <Alert
              message="数据导出成功"
              description={`已导出 ${academicReport.dataIntegrity.networkSamples} 个网络样本、${academicReport.dataIntegrity.latencySamples} 个延迟测量、${academicReport.dataIntegrity.userActionSamples} 个用户操作记录。数据可用于学术研究和性能分析。`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <pre style={{
              backgroundColor: '#f6f8fa',
              padding: '16px',
              borderRadius: '6px',
              fontSize: '12px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {JSON.stringify(academicReport, null, 2)}
            </pre>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default YjsPerformanceDashboard;