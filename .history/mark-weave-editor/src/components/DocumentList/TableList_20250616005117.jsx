import React from 'react';
import { Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../DocumentList/documentList.css';

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '最后更新时间', dataIndex: 'updated', key: 'updated' },
];

const TableList = ({ documents }) => {
  const navigate = useNavigate();
  return (
    <Table
      dataSource={documents}
      columns={columns}
      rowClassName="doclist-row"
      onRow={record => ({ onClick: () => navigate(`/editor/${record.key}`) })}
      pagination={false}
      style={{ marginTop: 16 }}
    />
  );
};

export default TableList;
