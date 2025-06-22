import React from 'react';
import { Layout, Avatar, Dropdown, Menu, message } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header } = Layout;

const GlobalHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'profile':
        // 可以导航到个人信息页面
        message.info('个人信息功能待开发');
        break;
      case 'settings':
        // 可以导航到设置页面
        message.info('设置功能待开发');
        break;
      case 'logout':
        logout();
        message.success('已退出登录');
        navigate('/login');
        break;
      default:
        break;
    }
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        个人信息
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <Header style={{
      background: '#fff',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      zIndex: 100,
      borderBottom: '1px solid #f0f0f0'
    }}>
      <div style={{
        fontWeight: 700,
        fontSize: 20,
        letterSpacing: 1,
        color: '#1677ff',
        cursor: 'pointer'
      }}
        onClick={() => navigate('/home')}
      >
        MarkWeave
      </div>

      <div style={{ flex: 1 }} />

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666', fontSize: 14 }}>
            欢迎，{user.username || user.email}
          </span>
          <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
            <Avatar
              size={36}
              icon={<UserOutlined />}
              style={{
                cursor: 'pointer',
                backgroundColor: '#1677ff'
              }}
            />
          </Dropdown>
        </div>
      )}
    </Header>
  );
};

export default GlobalHeader;