import React from 'react';
import { Input, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import '../DocumentList/documentList.css';

const Toolbar = ({ searchValue, setSearchValue, onNew }) => (
  <div className="doclist-toolbar">
    <Input.Search
      placeholder="搜索文档..."
      value={searchValue}
      onChange={e => setSearchValue(e.target.value)}
      style={{ width: 200 }}
    />
    <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>新建</Button>
  </div>
);

export default Toolbar;
