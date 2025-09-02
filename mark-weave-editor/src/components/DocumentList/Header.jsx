import React from 'react';
import { Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import '../DocumentList/documentList.css';

const tabTitles = {
  documents: 'Document List',
  members: 'Member Management',
  settings: 'Settings',
  help: 'Help',
};

const Header = ({ activeTab, onFilter }) => (
  <div className="doclist-header">
    <span className="doclist-title">{tabTitles[activeTab]}</span>
    {activeTab === 'documents' && (
      <Button icon={<FilterOutlined />} onClick={onFilter}>Filter</Button>
    )}
  </div>
);

export default Header;
