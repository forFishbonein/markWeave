import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import TeamSidebar from './TeamSidebar';

const TeamLayout = () => {
  const { teamId } = useParams();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa' }}>
      <TeamSidebar teamId={teamId} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 可选顶部栏 TeamHeader */}
        <Outlet />
      </div>
    </div>
  );
};

export default TeamLayout;
