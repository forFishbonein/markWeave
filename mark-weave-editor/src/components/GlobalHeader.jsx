import React from 'react';
import { Layout, Dropdown, Avatar, message } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
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
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1890ff',
        cursor: 'pointer'
      }} onClick={() => navigate('/home')}>
        MarkWeave
      </div>

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