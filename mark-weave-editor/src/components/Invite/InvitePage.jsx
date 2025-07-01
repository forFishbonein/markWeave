import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Spin, message, Result } from 'antd';
import { TeamOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

const InvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);

  // 加载邀请详情
  const loadInviteDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:1234/api'}/teams/invite/${token}`);
      const data = await response.json();

      if (data.success) {
        setInvite(data.invite);
      } else {
        setError(data.msg || '邀请无效');
      }
    } catch (error) {
      console.error('加载邀请详情失败:', error);
      setError('加载邀请详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadInviteDetails();
    }
  }, [token]);

  // 接受邀请
  const handleAcceptInvite = async () => {
    if (!isAuthenticated) {
      message.info('请先登录以接受邀请');
      navigate('/login', { state: { from: `/invite/${token}` } });
      return;
    }

    if (user.email !== invite.email) {
      message.error('当前登录的邮箱与邀请邮箱不匹配');
      return;
    }

    try {
      setAccepting(true);
      const response = await apiService.request(`/teams/invite/${token}/accept`, {
        method: 'POST'
      });

      if (response.success) {
        message.success('成功加入团队！');
        navigate(`/team/${response.team.id}/documents`);
      } else {
        message.error(response.msg || '接受邀请失败');
      }
    } catch (error) {
      console.error('接受邀请失败:', error);
      message.error('接受邀请失败: ' + error.message);
    } finally {
      setAccepting(false);
    }
  };

  // 拒绝邀请
  const handleRejectInvite = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:1234/api'}/teams/invite/${token}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (data.success) {
        message.success('已拒绝邀请');
        navigate('/');
      } else {
        message.error(data.msg || '拒绝邀请失败');
      }
    } catch (error) {
      console.error('拒绝邀请失败:', error);
      message.error('拒绝邀请失败');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#fafbfc'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#fafbfc'
      }}>
        <Result
          status="error"
          title="邀请无效"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#fafbfc',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          textAlign: 'center',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <TeamOutlined style={{ fontSize: 48, color: '#2563eb', marginBottom: 16 }} />
          <h1 style={{ margin: 0, color: '#333' }}>团队邀请</h1>
        </div>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <TeamOutlined style={{ marginRight: 8, color: '#666' }} />
            <strong>团队名称:</strong> {invite.teamName}
          </div>

          {invite.teamDescription && (
            <div style={{ marginBottom: 12 }}>
              <strong>团队描述:</strong> {invite.teamDescription}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <UserOutlined style={{ marginRight: 8, color: '#666' }} />
            <strong>邀请人:</strong> {invite.inviterName}
          </div>

          <div style={{ marginBottom: 12 }}>
            <MailOutlined style={{ marginRight: 8, color: '#666' }} />
            <strong>邀请邮箱:</strong> {invite.email}
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>角色:</strong> {invite.role === 'admin' ? '管理员' : '成员'}
          </div>

          <div style={{ color: '#666', fontSize: 14 }}>
            <strong>过期时间:</strong> {new Date(invite.expiresAt).toLocaleString()}
          </div>
        </div>

        {!isAuthenticated ? (
          <div>
            <p style={{ color: '#666', marginBottom: 16 }}>
              请先登录以接受邀请
            </p>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login', { state: { from: `/invite/${token}` } })}
              style={{ marginRight: 12 }}
            >
              登录
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/register', { state: { from: `/invite/${token}` } })}
            >
              注册
            </Button>
          </div>
        ) : user.email === invite.email ? (
          <div>
            <Button
              type="primary"
              size="large"
              loading={accepting}
              onClick={handleAcceptInvite}
              style={{ marginRight: 12 }}
            >
              接受邀请
            </Button>
            <Button
              size="large"
              onClick={handleRejectInvite}
            >
              拒绝邀请
            </Button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#ff4d4f', marginBottom: 16 }}>
              当前登录的邮箱 ({user.email}) 与邀请邮箱不匹配
            </p>
            <Button
              size="large"
              onClick={() => {
                // 可以选择登出并重新登录
                navigate('/login');
              }}
            >
              使用其他账号登录
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InvitePage;