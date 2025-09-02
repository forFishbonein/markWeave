import React from 'react';
import { Menu, Button } from 'antd';
import { TeamOutlined, UserOutlined, SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import '../DocumentList/documentList.css';

const Sidebar = ({ activeTab = "documents", setActiveTab }) => {
  // Only bind click event when setActiveTab exists
  const menuProps = setActiveTab
    ? { onClick: ({ key }) => setActiveTab(key) }
    : {};

  return (
    <div className="doclist-sider">
      <div className="doclist-team">
        <Button icon={<TeamOutlined />}>Team name</Button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[activeTab]}
        style={{ height: '100%', borderRight: 0 }}
        {...menuProps}
      >
        <Menu.Item key="documents" icon={<TeamOutlined />}>Documents</Menu.Item>
        <Menu.Item key="members" icon={<UserOutlined />}>Member</Menu.Item>
        <Menu.Item key="settings" icon={<SettingOutlined />}>Settings</Menu.Item>
        <Menu.Item key="help" icon={<QuestionCircleOutlined />}>Help</Menu.Item>
      </Menu>
      <div className="doclist-settings">Settings</div>
    </div>
  );
};

export default Sidebar;
