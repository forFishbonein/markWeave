import React, { useState, useEffect } from 'react';
import { Button, Card, List, Modal, Input, message, Spin, Form, Empty } from 'antd';
import { PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

const { TextArea } = Input;

const Home = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  // 加载用户团队
  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserTeams();
      setTeams(response || []);
    } catch (error) {
      console.error('加载团队失败:', error);
      message.error('加载团队失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // 创建团队
  const handleCreateTeam = async (values) => {
    try {
      setCreating(true);
      const response = await apiService.createTeam({
        name: values.name,
        description: values.description || '',
      });

      message.success('团队创建成功');
      setCreateModalOpen(false);
      createForm.resetFields();
      await loadTeams(); // 重新加载团队列表
    } catch (error) {
      console.error('创建团队失败:', error);
      message.error('创建团队失败：' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleModalCancel = () => {
    setCreateModalOpen(false);
    createForm.resetFields();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '40px 24px',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 600,
          color: '#1890ff',
          margin: 0,
          marginBottom: 8
        }}>
          我的团队
        </h1>
        <p style={{
          fontSize: 16,
          color: '#666',
          margin: 0
        }}>
          管理您的协作团队，开始高效的文档编辑
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
          style={{
            borderRadius: 8,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }}
        >
          创建团队
        </Button>
      </div>

      {teams.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: '#999' }}>
              还没有加入任何团队<br />
              创建或加入一个团队开始协作吧
            </span>
          }
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            创建团队
          </Button>
        </Empty>
      ) : (
        <List
          grid={{
            gutter: [24, 24],
            xs: 1,
            sm: 2,
            md: 2,
            lg: 3,
            xl: 3,
            xxl: 4
          }}
          dataSource={teams}
          renderItem={team => (
            <List.Item>
              <Card
                hoverable
                style={{
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
                actions={[
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate(`/team/${team._id}/documents`)}
                    style={{ fontWeight: 500 }}
                  >
                    进入团队 →
                  </Button>
                ]}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <TeamOutlined style={{
                      fontSize: 20,
                      color: '#1890ff',
                      marginRight: 8
                    }} />
                    <h3 style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#333'
                    }}>
                      {team.name}
                    </h3>
                  </div>

                  {team.description && (
                    <p style={{
                      color: '#666',
                      margin: '8px 0',
                      fontSize: 14,
                      lineHeight: 1.5
                    }}>
                      {team.description}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#999',
                  fontSize: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <UserOutlined style={{ marginRight: 4 }} />
                    {team.memberCount || 0} 成员
                  </div>
                  <div>
                    {new Date(team.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}

      {/* 创建团队弹窗 */}
      <Modal
        title="创建新团队"
        open={createModalOpen}
        onCancel={handleModalCancel}
        footer={null}
        width={500}
        style={{ top: 100 }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateTeam}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            label="团队名称"
            name="name"
            rules={[
              { required: true, message: '请输入团队名称' },
              { min: 2, message: '团队名称至少2个字符' },
              { max: 50, message: '团队名称最多50个字符' }
            ]}
          >
            <Input
              placeholder="请输入团队名称"
              size="large"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            label="团队描述"
            name="description"
            rules={[
              { max: 200, message: '描述最多200个字符' }
            ]}
          >
            <TextArea
              placeholder="简要描述团队的用途或目标（可选）"
              rows={3}
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button
                onClick={handleModalCancel}
                style={{ borderRadius: 6 }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={creating}
                style={{ borderRadius: 6 }}
              >
                创建团队
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Home;
