import React, { useState, useEffect } from 'react';
import { Menu, Button, Spin, message } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  FileTextOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import apiService from '../../services/api';

const TeamSidebar = ({ teamId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  // 加载团队信息
  const loadTeamInfo = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTeamDetails(teamId);
      setTeam(response);
    } catch (error) {
      console.error('加载团队信息失败:', error);
      message.error('加载团队信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      loadTeamInfo();
    }
  }, [teamId]);

  // 解析当前激活菜单
  const path = location.pathname;
  let selectedKey = 'documents';
  if (path.includes('/members')) selectedKey = 'members';
  else if (path.includes('/team-settings')) selectedKey = 'team-settings';
  else if (path.includes('/documents')) selectedKey = 'documents';
  else if (path.includes('/editor')) selectedKey = 'documents';

  return (
    <div style={{
      width: 240,
      background: '#fafbfc',
      borderRight: '1px solid #eee',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 返回按钮 */}
      <div style={{
        padding: '16px 16px 0 16px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/home')}
          style={{
            width: '100%',
            textAlign: 'left',
            border: 'none',
            background: 'transparent',
            color: '#666',
            fontSize: 14
          }}
        >
          返回团队列表
        </Button>
      </div>

      {/* 团队信息 */}
      <div style={{
        padding: 20,
        textAlign: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        {loading ? (
          <Spin size="small" />
        ) : (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8
            }}>
              <TeamOutlined style={{
                fontSize: 20,
                color: '#1890ff',
                marginRight: 8
              }} />
              <span style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#333'
              }}>
                {team?.name || 'Team'}
              </span>
            </div>
            {team?.description && (
              <p style={{
                fontSize: 12,
                color: '#999',
                margin: 0,
                lineHeight: 1.4
              }}>
                {team.description}
              </p>
            )}
            <div style={{
              fontSize: 12,
              color: '#999',
              marginTop: 8
            }}>
              {team?.memberCount || 0} 名成员
            </div>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{
            height: '100%',
            borderRight: 0,
            background: 'transparent'
          }}
          onClick={({ key }) => {
            if (key === 'documents') navigate(`/team/${teamId}/documents`);
            if (key === 'members') navigate(`/team/${teamId}/members`);
            if (key === 'team-settings') navigate(`/team/${teamId}/team-settings`);
          }}
        >
          <Menu.Item
            key="documents"
            icon={<FileTextOutlined />}
            style={{ margin: '4px 12px', borderRadius: 6 }}
          >
            文档
          </Menu.Item>
          <Menu.Item
            key="members"
            icon={<UserOutlined />}
            style={{ margin: '4px 12px', borderRadius: 6 }}
          >
            成员
          </Menu.Item>
          <Menu.Item
            key="team-settings"
            icon={<SettingOutlined />}
            style={{ margin: '4px 12px', borderRadius: 6 }}
          >
            团队设置
          </Menu.Item>
        </Menu>
      </div>
    </div>
  );
};

export default TeamSidebar;
