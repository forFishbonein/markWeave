import React, { useState, useEffect } from 'react';
import { Menu, Button, message, Spin } from 'antd';
import { FileTextOutlined, UserOutlined, SettingOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import apiService from '../../services/api';
import './TeamSidebar.css';

const TeamSidebar = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamInfo = async () => {
      if (!teamId) return;

      try {
        // Load team information
        const response = await apiService.getTeamDetails(teamId);
        // Backend directly returns team object, no need to check success field
        setTeam(response);
        console.log('Team info loaded successfully:', response);
      } catch (error) {
        console.error('Failed to load team information:', error);
        message.error('Failed to load team information: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadTeamInfo();
  }, [teamId]);

  // Parse current active menu
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/documents')) return 'documents';
    if (path.includes('/members')) return 'members';
    if (path.includes('/team-settings')) return 'settings';
    return 'documents';
  };

  const menuItems = [
    {
      key: 'documents',
      icon: <FileTextOutlined />,
      label: 'Documents',
      onClick: () => navigate(`/team/${teamId}/documents`),
    },
    {
      key: 'members',
      icon: <UserOutlined />,
      label: 'Members',
      onClick: () => navigate(`/team/${teamId}/members`),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Team Settings',
      onClick: () => navigate(`/team/${teamId}/team-settings`),
    },
  ];

  return (
    <div className="team-sidebar">
      {/* Back button */}
      <div className="team-sidebar-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/home')}
          className="back-btn"
        >
          Back to Team List
        </Button>
      </div>

      {/* Team information */}
      <div className="team-info">
        {loading ? (
          <Spin size="small" />
        ) : (
          <>
            <h3 className="team-name">{team?.name || 'Unknown Team'}</h3>
          </>
        )}
      </div>

      {/* Navigation menu */}
      <Menu
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        className="team-menu"
        items={menuItems}
      />
    </div>
  );
};

export default TeamSidebar;
