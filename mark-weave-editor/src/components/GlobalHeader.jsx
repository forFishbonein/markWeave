import React from 'react';
import { Layout, Dropdown, Avatar, message, Button, Space } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BarChartOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const GlobalHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    // Can navigate to profile page
    message.info('Profile feature is under development');
  };

  const handleSettingsClick = () => {
    // Can navigate to settings page
    message.info('Settings feature is under development');
  };

  const handleLogout = () => {
    logout();
    message.success('Logged out successfully');
    navigate('/login');
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: handleProfileClick,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: handleSettingsClick,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <Header style={{
      background: '#fff',
      padding: '0 24px',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
    }}>
      {/* Left: Logo */}
      <div style={{
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1890ff',
        cursor: 'pointer',
        marginRight: '40px'
      }} onClick={() => navigate('/home')}>
        MarkWeave
      </div>

      {/* Left-center: Performance analysis toolbar */}
      <Space size="large" style={{ flex: 1 }}>
        <Button
          type="text"
          icon={<BarChartOutlined />}
          onClick={() => navigate('/performance-lab-crdt')}
          style={{
            color: '#52c41a',
            fontWeight: 500,
            height: '32px',
            padding: '4px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.color = '#389e0d';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = '#52c41a';
          }}
        >
          CRDT Performance
        </Button>
        <Button
          type="text"
          icon={<SwapOutlined />}
          onClick={() => navigate('/performance-lab-ot')}
          style={{
            color: '#fa8c16',
            fontWeight: 500,
            height: '32px',
            padding: '4px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.color = '#d46b08';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = '#fa8c16';
          }}
        >
          OT Performance
        </Button>

      </Space>

      {/* Right: User menu */}
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          transition: 'background-color 0.2s'
        }}>
          <Avatar
            icon={<UserOutlined />}
            style={{ marginRight: '8px' }}
          />
          <span style={{ color: '#333' }}>
            Hello, {user?.username || user?.email || 'User'}
          </span>
        </div>
      </Dropdown>
    </Header>
  );
};

export default GlobalHeader;