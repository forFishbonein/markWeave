import React from 'react';
import { Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import '../DocumentList/documentList.css';

const tabTitles = {
  documents: '文档列表',
  members: '成员管理',
  settings: '设置',
  help: '帮助',
};

const Header = ({ activeTab, onFilter }) => (
  <div className="doclist-header">
    <span className="doclist-title">{tabTitles[activeTab]}</span>
    {activeTab === 'documents' && (
      <Button icon={<FilterOutlined />} onClick={onFilter}>筛选</Button>
    )}
  </div>
);

export default Header;
