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

  // 加载团队成员信息
  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTeamDetails(teamId);
      setTeam(response);
    } catch (error) {
      console.error('加载团队成员失败:', error);
      message.error('加载团队成员失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      loadTeamMembers();
    }
  }, [teamId]);

  // 邀请成员逻辑
  const handleInvite = async (values) => {
    try {
      setInviting(true);
      await apiService.inviteMember(teamId, {
        email: values.email,
        role: values.role === '管理员' ? 'admin' : 'member',
      });

      message.success('邀请已发送');
      inviteForm.resetFields();
      // 重新加载团队信息
      await loadTeamMembers();
    } catch (error) {
      console.error('邀请成员失败:', error);
      message.error('邀请成员失败：' + error.message);
    } finally {
      setInviting(false);
    }
  };

  // 移除成员逻辑
  const handleRemove = (member) => {
    Modal.confirm({
      title: '确认移除该成员？',
      content: `移除后 ${member.userId.username} 将无法访问团队内容。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiService.removeMember(teamId, member.userId._id);
          message.success('成员已移除');
          await loadTeamMembers();
        } catch (error) {
          console.error('移除成员失败:', error);
          message.error('移除成员失败：' + error.message);
        }
      },
    });
  };

  // 获取角色显示文本
  const getRoleText = (role) => {
    switch (role) {
      case 'owner':
        return '所有者';
      case 'admin':
        return '管理员';
      default:
        return '成员';
    }
  };

  // 获取角色标签颜色
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

  // 检查当前用户是否有权限操作
  const canManageMembers = () => {
    if (!team || !user) return false;
    const currentUserMember = team.members?.find(m => m.userId._id === user.userId);
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
        成员管理
      </h3>

      {/* 邀请成员表单 */}
      {canManageMembers() && (
        <div style={{
          background: '#fafafa',
          padding: 20,
          borderRadius: 8,
          marginBottom: 24
        }}>
          <h4 style={{ marginBottom: 16, color: '#333' }}>邀请新成员</h4>
          <Form
            form={inviteForm}
            layout="inline"
            onFinish={handleInvite}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input
                placeholder="请输入成员邮箱"
                prefix={<MailOutlined />}
                style={{ width: 240 }}
              />
            </Form.Item>

            <Form.Item
              name="role"
              initialValue="成员"
            >
              <Select style={{ width: 120 }}>
                <Select.Option value="成员">成员</Select.Option>
                <Select.Option value="管理员">管理员</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={inviting}
              >
                发送邀请
              </Button>
            </Form.Item>
          </Form>
        </div>
      )}

      {/* 成员列表 */}
      <List
        dataSource={team?.members || []}
        renderItem={(member) => (
          <List.Item
            actions={[
              <Tag
                color={getRoleColor(member.role)}
                icon={member.role === 'owner' ? <CrownOutlined /> : null}
              >
                {getRoleText(member.role)}
              </Tag>,
              ...(canManageMembers() && member.role !== 'owner' && member.userId._id !== user?.userId ? [
                <Button
                  danger
                  size="small"
                  onClick={() => handleRemove(member)}
                >
                  移除
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
                    <Tag size="small" color="green">我</Tag>
                  )}
                </div>
              }
              description={
                <div>
                  <div style={{ color: '#666' }}>{member.userId.email}</div>
                  <div style={{ color: '#999', fontSize: 12 }}>
                    加入时间：{new Date(member.joinedAt).toLocaleDateString()}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
        locale={{
          emptyText: '暂无成员'
        }}
      />
    </div>
  );
};

export default MemberList;
