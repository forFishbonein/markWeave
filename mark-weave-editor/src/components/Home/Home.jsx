import React, { useState, useEffect } from 'react';
import { Button, Card, List, Modal, Input, message, Spin, Form, Empty } from 'antd';
import { PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import './Home.css';

const { TextArea } = Input;

const Home = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  // Load user teams
  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserTeams();

      // Check if response is array (direct team data)
      if (Array.isArray(response)) {
        setTeams(response);
      } else if (response.success && response.data) {
        setTeams(response.data || []);
      } else {
        setTeams([]);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      message.error('Failed to load teams: ' + error.message);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // Create team
  const handleCreateTeam = async (values) => {
    try {
      setCreating(true);
      const response = await apiService.createTeam({
        name: values.name,
        description: values.description || '',
      });

      message.success('Team created successfully');
      setCreateModalOpen(false);
      createForm.resetFields();
      await loadTeams(); // Reload team list
    } catch (error) {
      console.error('Failed to create team:', error);
      message.error('Failed to create team: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleModalCancel = () => {
    setCreateModalOpen(false);
    createForm.resetFields();
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-header">
          <h1 className="home-title">My Teams</h1>
          <p className="home-subtitle">Manage your collaborative teams and start efficient document editing</p>
        </div>

        <div className="home-actions">
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            className="create-team-btn"
          >
            Create Team
          </Button>
        </div>

        {teams.length === 0 ? (
          <div className="empty-state">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  You haven't joined any teams yet<br />
                  Create or join a team to start collaborating
                </span>
              }
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
                className="create-team-btn"
                style={{ marginTop: 16 }}
              >
                Create Team
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="teams-grid">
            <List
              grid={{
                gutter: [24, 24],
                xs: 1,
                sm: 2,
                md: 2,
                lg: 3,
                xl: 3,
                xxl: 4
              }}
              dataSource={teams}
              renderItem={team => (
                <List.Item>
                  <Card
                    className="team-card"
                    bodyStyle={{ padding: 0 }}
                    actions={[
                      <Button
                        type="link"
                        onClick={() => navigate(`/team/${team._id}/documents`)}
                        className="team-enter-btn"
                      >
                        Enter Team →
                      </Button>
                    ]}
                  >
                    <div className="team-card-body">
                      <div className="team-header">
                        <TeamOutlined className="team-icon" />
                        <h3 className="team-name">{team.name}</h3>
                      </div>

                      {team.description && (
                        <p className="team-description">
                          {team.description}
                        </p>
                      )}

                      <div className="team-meta">
                        <div className="team-members">
                          <UserOutlined style={{ marginRight: 4 }} />
                          {team.memberCount || 0} members
                        </div>
                        <div className="team-date">
                          {new Date(team.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Create team modal */}
        <Modal
          title="Create New Team"
          open={createModalOpen}
          onCancel={handleModalCancel}
          footer={null}
          width={500}
          className="create-modal"
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateTeam}
            style={{ marginTop: 24 }}
          >
            <Form.Item
              label="Team Name"
              name="name"
              rules={[
                { required: true, message: 'Please enter team name' },
                { min: 2, message: 'Team name must be at least 2 characters' },
                { max: 50, message: 'Team name cannot exceed 50 characters' }
              ]}
            >
              <Input
                placeholder="Enter team name"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              label="Team Description"
              name="description"
              rules={[
                { max: 200, message: 'Description cannot exceed 200 characters' }
              ]}
            >
              <TextArea
                placeholder="Brief description of team purpose or goals (optional)"
                rows={3}
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  onClick={handleModalCancel}
                  style={{ borderRadius: 8 }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={creating}
                  style={{
                    borderRadius: 8,
                    background: '#3b82f6',
                    borderColor: '#3b82f6'
                  }}
                >
                  Create Team
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default Home;
