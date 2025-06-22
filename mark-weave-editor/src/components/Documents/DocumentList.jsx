import React, { useState, useEffect } from 'react';
import { Button, Table, Input, Modal, message, Spin, Form, Empty } from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { teamId } = useParams();

  // 加载团队文档
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTeamDocuments(teamId);
      setDocuments(response || []);
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      loadDocuments();
    }
  }, [teamId]);

  const columns = [
    {
      title: '名称',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {text}
        </div>
      ),
    },
    {
      title: '创建者',
      dataIndex: 'ownerId',
      key: 'owner',
      render: (owner) => owner?.username || '未知',
    },
    {
      title: '最后更新时间',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (date) => new Date(date).toLocaleString(),
    },
  ];

  // 新建文档逻辑
  const handleCreateDoc = async (values) => {
    try {
      setCreating(true);
      const response = await apiService.createDocument({
        title: values.title,
        teamId: teamId,
      });

      message.success('文档创建成功');
      setNewDocModalOpen(false);
      createForm.resetFields();
      await loadDocuments(); // 重新加载文档列表
    } catch (error) {
      console.error('创建文档失败:', error);
      message.error('创建文档失败：' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleModalCancel = () => {
    setNewDocModalOpen(false);
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
      width: '100%',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      padding: 32,
      minHeight: 600,
      margin: '0',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <h2 style={{
          fontSize: 20,
          fontWeight: 600,
          margin: 0,
          color: '#333'
        }}>
          文档列表
        </h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setNewDocModalOpen(true)}
          size="large"
          style={{ borderRadius: 6 }}
        >
          新建文档
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索文档..."
          style={{ width: 300 }}
          size="large"
        />
      </div>

      {documents.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: '#999' }}>
              还没有创建任何文档<br />
              点击上方按钮创建第一个文档
            </span>
          }
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setNewDocModalOpen(true)}
          >
            新建文档
          </Button>
        </Empty>
      ) : (
        <Table
          dataSource={documents}
          columns={columns}
          rowClassName="doclist-row"
          onRow={record => ({
            onClick: () => navigate(`/team/${teamId}/editor/${record._id}`),
            style: { cursor: 'pointer' }
          })}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: true,
          }}
        />
      )}

      {/* 新建文档弹窗 */}
      <Modal
        title="新建文档"
        open={newDocModalOpen}
        onCancel={handleModalCancel}
        footer={null}
        width={500}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateDoc}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            label="文档标题"
            name="title"
            rules={[
              { required: true, message: '请输入文档标题' },
              { min: 1, message: '文档标题不能为空' },
              { max: 100, message: '文档标题最多100个字符' }
            ]}
          >
            <Input
              placeholder="请输入文档标题"
              size="large"
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
                创建文档
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentList;
