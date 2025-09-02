import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import TeamSidebar from './TeamSidebar';

const TeamLayout = () => {
  const { teamId } = useParams();
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#fafbfc'
    }}>
      <TeamSidebar teamId={teamId} />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 40px',
        minWidth: 0,
        background: '#fafbfc'
      }}>
        {/* Optional top bar TeamHeader */}
        <Outlet />
      </div>
    </div>
  );
};

export default TeamLayout;
