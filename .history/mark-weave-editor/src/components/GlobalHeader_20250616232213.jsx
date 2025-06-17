import React from 'react';
import { Layout, Avatar, Dropdown, Menu } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Header } = Layout;

const menu = (
  <Menu>
    <Menu.Item key="profile">个人信息</Menu.Item>
    <Menu.Item key="logout">退出登录</Menu.Item>
  </Menu>
);

const GlobalHeader = () => (
  <Header style={{ background: '#fff', padding: '0 32px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', zIndex: 100 }}>
    <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: 1, color: '#1677ff' }}>
      MarkWeave
    </div>
    <div style={{ flex: 1 }} />
    <Dropdown overlay={menu} placement="bottomRight">
      <Avatar size={36} icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
    </Dropdown>
  </Header>
);

export default GlobalHeader;