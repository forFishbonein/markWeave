import React, { useState } from 'react';
import { Button, Card, List, Modal, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [teams, setTeams] = useState([
    { id: 'team1', name: '团队A', desc: '这是团队A的描述' },
    { id: 'team2', name: '团队B', desc: '这是团队B的描述' },
  ]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [joinTeamId, setJoinTeamId] = useState('');
  const navigate = useNavigate();

  // 创建团队逻辑
  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      message.error('请输入团队名称');
      return;
    }
    const newTeam = {
      id: `team${Date.now()}`,
      name: newTeamName,
      desc: '新创建的团队',
    };
    setTeams([...teams, newTeam]);
    setCreateModalOpen(false);
    setNewTeamName('');
    message.success('团队创建成功');
  };

  // 加入团队逻辑
  const handleJoinTeam = () => {
    if (!joinTeamId.trim()) {
      message.error('请输入团队ID');
      return;
    }
    // mock: 直接加入（实际应校验ID并请求后端）
    setTeams([...teams, { id: joinTeamId, name: `团队${joinTeamId}`, desc: '加入的团队' }]);
    setJoinModalOpen(false);
    setJoinTeamId('');
    message.success('加入团队成功');
  };

  return (
    <div style={{ maxWidth: 800, margin: '60px auto', padding: 24 }}>
      <h2>我的团队</h2>
      <div style={{ marginBottom: 24 }}>
        <Button type="primary" style={{ marginRight: 12 }} onClick={() => setCreateModalOpen(true)}>创建团队</Button>
        <Button onClick={() => setJoinModalOpen(true)}>加入团队</Button>
      </div>
      <List
        grid={{ gutter: 16, column: 2 }}
        dataSource={teams}
        renderItem={team => (
          <List.Item>
            <Card title={team.name} extra={<Button type="link" onClick={() => navigate(`/team/${team.id}/documents`)}>进入</Button>}>
              {team.desc}
            </Card>
          </List.Item>
        )}
      />
      {/* 创建团队弹窗 */}
      <Modal
        title="创建团队"
        open={createModalOpen}
        onOk={handleCreateTeam}
        onCancel={() => setCreateModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="请输入团队名称"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
        />
      </Modal>
      {/* 加入团队弹窗 */}
      <Modal
        title="加入团队"
        open={joinModalOpen}
        onOk={handleJoinTeam}
        onCancel={() => setJoinModalOpen(false)}
        okText="加入"
        cancelText="取消"
      >
        <Input
          placeholder="请输入团队ID"
          value={joinTeamId}
          onChange={e => setJoinTeamId(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default Home;
