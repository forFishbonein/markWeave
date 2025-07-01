import React, { useState, useEffect } from 'react';
import { List, Select, Input, Button, message, Modal, Spin, Form, Avatar, Tag } from 'antd';
import { UserOutlined, MailOutlined, CrownOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MemberList = () => {
  const { teamId } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteForm] = Form.useForm();

  // Load team member information
  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTeamDetails(teamId);
      setTeam(response);
    } catch (error) {
      console.error('Failed to load team members:', error);
      message.error('Failed to load team members: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      loadTeamMembers();
    }
  }, [teamId]);

  // Invite member logic
  const handleInvite = async (values) => {
    try {
      setInviting(true);
      await apiService.inviteMember(teamId, {
        email: values.email,
        role: values.role === 'Administrator' ? 'admin' : 'member',
      });

      message.success('Invitation sent');
      inviteForm.resetFields();
      // Reload team information
      await loadTeamMembers();
    } catch (error) {
      console.error('Failed to invite member:', error);
      message.error('Failed to invite member: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  // Remove member logic
  const handleRemove = (member) => {
    Modal.confirm({
      title: 'Confirm to remove this member?',
      content: `After removal, ${member.userId.username} will not be able to access team content.`,
      okText: 'Confirm',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await apiService.removeMember(teamId, member.userId._id);
          message.success('Member removed');
          await loadTeamMembers();
        } catch (error) {
          console.error('Failed to remove member:', error);
          message.error('Failed to remove member: ' + error.message);
        }
      },
    });
  };

  // Get role display text
  const getRoleText = (role) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Administrator';
      default:
        return 'Member';
    }
  };

  // Get role tag color
  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'gold';
      case 'admin':
        return 'blue';
      default:
        return 'default';
    }
  };

  // Check if current user has permission to manage
  const canManageMembers = () => {
    if (!team || !user) {
      console.log('canManageMembers: 缺少team或user数据', { team: !!team, user: !!user });
      return false;
    }
    const currentUserMember = team.members?.find(m => m.userId._id === user.userId);
    console.log('canManageMembers: 当前用户成员信息', {
      currentUserMember,
      userId: user.userId,
      members: team.members?.map(m => ({ id: m.userId._id, role: m.role }))
    });
    return currentUserMember && (currentUserMember.role === 'owner' || currentUserMember.role === 'admin');
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
        Member Management
      </h3>

      {/* Invite member form - 临时强制显示用于测试 */}
      {(canManageMembers() || true) && (
        <div style={{
          background: '#fafafa',
          padding: 20,
          borderRadius: 8,
          marginBottom: 24
        }}>
          <h4 style={{ marginBottom: 16, color: '#333' }}>Invite New Member</h4>
          <Form
            form={inviteForm}
            layout="inline"
            onFinish={handleInvite}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter a valid email address' }
              ]}
            >
              <Input
                placeholder="Enter member email"
                prefix={<MailOutlined />}
                style={{ width: 240 }}
              />
            </Form.Item>

            <Form.Item
              name="role"
              initialValue="Member"
            >
              <Select style={{ width: 120 }}>
                <Select.Option value="Member">Member</Select.Option>
                <Select.Option value="Administrator">Administrator</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={inviting}
              >
                Send Invitation
              </Button>
            </Form.Item>
          </Form>
        </div>
      )}

      {/* Member list */}
      <List
        dataSource={team?.members || []}
        renderItem={(member) => (
          <List.Item
            actions={[
              <Tag
                key="role"
                color={getRoleColor(member.role)}
                icon={member.role === 'owner' ? <CrownOutlined /> : null}
              >
                {getRoleText(member.role)}
              </Tag>,
              ...(canManageMembers() && member.role !== 'owner' && member.userId._id !== user?.userId ? [
                <Button
                  key="remove"
                  danger
                  size="small"
                  onClick={() => handleRemove(member)}
                >
                  Remove
                </Button>
              ] : [])
            ]}
            style={{ padding: '16px 0' }}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                />
              }
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500 }}>
                    {member.userId.username}
                  </span>
                  {member.userId._id === user?.userId && (
                    <Tag size="small" color="green">Me</Tag>
                  )}
                </div>
              }
              description={
                <div>
                  <div style={{ color: '#666' }}>{member.userId.email}</div>
                  <div style={{ color: '#999', fontSize: 12 }}>
                    Joined: {new Date(member.joinedAt).toLocaleDateString()}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
        locale={{
          emptyText: 'No members'
        }}
      />
    </div>
  );
};

export default MemberList;
