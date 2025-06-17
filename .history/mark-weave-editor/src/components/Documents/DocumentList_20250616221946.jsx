import React from 'react';
import { Button, Table, Input } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

const mockDocuments = [
  { key: '1', name: '团队文档1', updated: '2024-06-15' },
  { key: '2', name: '团队文档2', updated: '2024-06-14' },
];

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '最后更新时间', dataIndex: 'updated', key: 'updated' },
];

const DocumentList = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  return (
    <div style={{ width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 32, minHeight: 600, margin: '0', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 20, fontWeight: 600 }}>文档列表</span>
        <Button type="primary">新建文档</Button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Input.Search placeholder="搜索文档..." style={{ width: 240 }} />
      </div>
      <Table
        dataSource={mockDocuments}
        columns={columns}
        rowClassName="doclist-row"
        onRow={record => ({ onClick: () => navigate(`/team/${teamId}/editor/${record.key}`) })}
        pagination={false}
      />
    </div>
  );
};

export default DocumentList;
