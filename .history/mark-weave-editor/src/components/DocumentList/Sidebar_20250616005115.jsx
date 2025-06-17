import React from 'react';
import { Menu, Button } from 'antd';
import { TeamOutlined, UserOutlined, SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import '../DocumentList/documentList.css';

const Sidebar = ({ activeTab, setActiveTab }) => {
  return (
    <div className="doclist-sider">
      <div className="doclist-team">
        <Button icon={<TeamOutlined />}>Team name</Button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[activeTab]}
        style={{ height: '100%', borderRight: 0 }}
        onClick={({ key }) => setActiveTab(key)}
      >
        <Menu.Item key="documents" icon={<TeamOutlined />}>文档</Menu.Item>
        <Menu.Item key="members" icon={<UserOutlined />}>成员</Menu.Item>
        <Menu.Item key="settings" icon={<SettingOutlined />}>设置</Menu.Item>
        <Menu.Item key="help" icon={<QuestionCircleOutlined />}>帮助</Menu.Item>
      </Menu>
      <div className="doclist-settings">设置</div>
    </div>
  );
};

export default Sidebar;
