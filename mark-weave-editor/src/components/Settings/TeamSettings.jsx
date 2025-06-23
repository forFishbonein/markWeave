import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Spin, Divider, Modal } from 'antd';
import { useParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { TextArea } = Input;

const TeamSettings = () => {
  const { teamId } = useParams();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load team information
  const loadTeamInfo = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTeamDetails(teamId);
      setTeam(response);
      // Fill form
      form.setFieldsValue({
        name: response.name,
        description: response.description || '',
      });
    } catch (error) {
      console.error('Failed to load team information:', error);
      message.error('Failed to load team information: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      loadTeamInfo();
    }
  }, [teamId]);

  // Save team settings
  const handleSave = async (values) => {
    try {
      setSaving(true);
      await apiService.updateTeam(teamId, {
        name: values.name,
        description: values.description,
      });

      message.success('Team settings saved successfully');
      await loadTeamInfo(); // Reload team information
    } catch (error) {
      console.error('Failed to save team settings:', error);
      message.error('Failed to save team settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Check if user is team owner
  const isOwner = () => {
    if (!team || !user) return false;
    return team.ownerId === user.userId;
  };

  // Delete team (dangerous operation)
  const handleDeleteTeam = () => {
    Modal.confirm({
      title: 'Confirm to delete team?',
      content: 'This operation cannot be undone, and all documents in the team will also be deleted. Please proceed with caution!',
      okText: 'Confirm Delete',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          // This requires backend API for team deletion
          message.info('Team deletion feature is not yet available');
        } catch (error) {
          message.error('Failed to delete team: ' + error.message);
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      padding: 32,
      minHeight: 600,
      margin: '0',
      boxSizing: 'border-box'
    }}>
      <h3 style={{
        fontSize: 20,
        fontWeight: 600,
        marginBottom: 24,
        color: '#333'
      }}>
        Team Settings
      </h3>

      {!isOwner() && (
        <div style={{
          background: '#fff7e6',
          border: '1px solid #ffd591',
          borderRadius: 6,
          padding: 12,
          marginBottom: 24,
          color: '#d48806'
        }}>
          Only team owners can modify team settings
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 500 }}
        onFinish={handleSave}
        disabled={!isOwner()}
      >
        <Form.Item
          label="Team Name"
          name="name"
          rules={[
            { required: true, message: 'Please enter team name' },
            { min: 2, message: 'Team name must be at least 2 characters' },
            { max: 50, message: 'Team name must be at most 50 characters' }
          ]}
        >
          <Input
            placeholder="Enter team name"
            size="large"
            style={{ borderRadius: 6 }}
          />
        </Form.Item>

        <Form.Item
          label="Team Description"
          name="description"
          rules={[
            { max: 200, message: 'Team description must be at most 200 characters' }
          ]}
        >
          <TextArea
            placeholder="Enter team description (optional)"
            rows={4}
            style={{ borderRadius: 6 }}
          />
        </Form.Item>

        {isOwner() && (
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              size="large"
              style={{ borderRadius: 6 }}
            >
              Save Settings
            </Button>
          </Form.Item>
        )}
      </Form>

      {/* Team information display */}
      <Divider />

      <div style={{ marginBottom: 24 }}>
        <h4 style={{ color: '#333', marginBottom: 16 }}>Team Information</h4>
        <div style={{ color: '#666', lineHeight: 1.8 }}>
          <div><strong>Team ID:</strong> {team?._id}</div>
          <div><strong>Created:</strong> {new Date(team?.createdAt).toLocaleString()}</div>
          <div><strong>Members:</strong> {team?.memberCount || 0} members</div>
          <div><strong>Owner:</strong> {team?.ownerId?.username || 'Unknown'}</div>
        </div>
      </div>

      {/* Danger zone */}
      {isOwner() && (
        <>
          <Divider />
          <div style={{
            border: '1px solid #ff7875',
            borderRadius: 6,
            padding: 20,
            background: '#fff2f0'
          }}>
            <h4 style={{ color: '#cf1322', marginBottom: 12 }}>Danger Zone</h4>
            <p style={{ color: '#8c8c8c', marginBottom: 16 }}>
              Once you delete a team, all related data will be unrecoverable. Please proceed with caution.
            </p>
            <Button
              danger
              onClick={handleDeleteTeam}
              style={{ borderRadius: 6 }}
            >
              Delete Team
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamSettings;
