import React, { useState } from 'react';
import { Button, Table, Input, Modal, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

const DocumentList = () => {
  const [documents, setDocuments] = useState([
    { key: '1', name: '团队文档1', updated: '2024-06-15' },
    { key: '2', name: '团队文档2', updated: '2024-06-14' },
  ]);
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const navigate = useNavigate();
  const { teamId } = useParams();

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '最后更新时间', dataIndex: 'updated', key: 'updated' },
  ];

  // 新建文档逻辑
  const handleCreateDoc = () => {
    if (!newDocName.trim()) {
      message.error('请输入文档名称');
      return;
    }
    const newDoc = {
      key: Date.now().toString(),
      name: newDocName,
      updated: new Date().toISOString().slice(0, 10),
    };
    setDocuments([...documents, newDoc]);
    setNewDocModalOpen(false);
    setNewDocName('');
    message.success('文档创建成功');
  };

  return (
    <div style={{ width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 32, minHeight: 600, margin: '0', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 20, fontWeight: 600 }}>文档列表</span>
        <Button type="primary" onClick={() => setNewDocModalOpen(true)}>新建文档</Button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Input.Search placeholder="搜索文档..." style={{ width: 240 }} />
      </div>
      <Table
        dataSource={documents}
        columns={columns}
        rowClassName="doclist-row"
        onRow={record => ({ onClick: () => navigate(`/team/${teamId}/editor/${record.key}`) })}
        pagination={false}
      />
      {/* 新建文档弹窗 */}
      <Modal
        title="新建文档"
        open={newDocModalOpen}
        onOk={handleCreateDoc}
        onCancel={() => setNewDocModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="请输入文档名称"
          value={newDocName}
          onChange={e => setNewDocName(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default DocumentList;
