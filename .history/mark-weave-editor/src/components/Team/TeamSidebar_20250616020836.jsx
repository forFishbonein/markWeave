import React from 'react';
import { Menu, Button } from 'antd';
import { TeamOutlined, UserOutlined, SettingOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const TeamSidebar = ({ teamId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // 解析当前激活菜单
  const path = location.pathname;
  let selectedKey = 'documents';
  if (path.includes('/members')) selectedKey = 'members';
  else if (path.includes('/team-settings')) selectedKey = 'team-settings';
  else if (path.includes('/documents')) selectedKey = 'documents';
  else if (path.includes('/editor')) selectedKey = 'documents';

  return (
    <div style={{ width: 200, background: '#fafbfc', borderRight: '1px solid #eee', minHeight: '100vh', paddingTop: 24 }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Button icon={<TeamOutlined />}>Team name</Button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ height: '100%', borderRight: 0 }}
        onClick={({ key }) => {
          if (key === 'documents') navigate(`/team/${teamId}/documents`);
          if (key === 'members') navigate(`/team/${teamId}/members`);
          if (key === 'team-settings') navigate(`/team/${teamId}/team-settings`);
        }}
      >
        <Menu.Item key="documents" icon={<FileTextOutlined />}>文档</Menu.Item>
        <Menu.Item key="members" icon={<UserOutlined />}>成员</Menu.Item>
        <Menu.Item key="team-settings" icon={<SettingOutlined />}>团队设置</Menu.Item>
      </Menu>
    </div>
  );
};

export default TeamSidebar;
