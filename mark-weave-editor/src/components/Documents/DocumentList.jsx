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

  // Load team documents
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTeamDocuments(teamId);
      setDocuments(response || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      message.error('Failed to load documents: ' + error.message);
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
      title: 'Name',
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
      title: 'Creator',
      dataIndex: 'ownerId',
      key: 'owner',
      render: (owner) => owner?.username || 'Unknown',
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (date) => new Date(date).toLocaleString(),
    },
  ];

  // Create new document logic
  const handleCreateDoc = async (values) => {
    try {
      setCreating(true);
      const response = await apiService.createDocument({
        title: values.title,
        teamId: teamId,
      });

      message.success('Document created successfully');
      setNewDocModalOpen(false);
      createForm.resetFields();
      await loadDocuments(); // Reload document list
    } catch (error) {
      console.error('Failed to create document:', error);
      message.error('Failed to create document: ' + error.message);
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
          Document List
        </h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setNewDocModalOpen(true)}
          size="large"
          style={{ borderRadius: 6 }}
        >
          New Document
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search documents..."
          style={{ width: 300 }}
          size="large"
        />
      </div>

      {documents.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: '#999' }}>
              No documents created yet<br />
              Click the button above to create your first document
            </span>
          }
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setNewDocModalOpen(true)}
          >
            New Document
          </Button>
        </Empty>
      ) : (
        <Table
          dataSource={documents}
          columns={columns}
          rowKey="docId"
          rowClassName="doclist-row"
          onRow={record => ({
            onClick: () => navigate(`/editor/${record.docId}`),
            style: { cursor: 'pointer' }
          })}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: true,
          }}
        />
      )}

      {/* New document modal */}
      <Modal
        title="New Document"
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
            label="Document Title"
            name="title"
            rules={[
              { required: true, message: 'Please enter document title' },
              { min: 1, message: 'Document title cannot be empty' },
              { max: 100, message: 'Document title must be at most 100 characters' }
            ]}
          >
            <Input
              placeholder="Enter document title"
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
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={creating}
                style={{ borderRadius: 6 }}
              >
                Create Document
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentList;
