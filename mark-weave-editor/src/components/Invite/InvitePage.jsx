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

  // Load invitation details
  const loadInviteDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:1234/api'}/teams/invite/${token}`);
      const data = await response.json();

      if (data.success) {
        setInvite(data.invite);
      } else {
        setError(data.msg || 'Invalid invitation');
      }
    } catch (error) {
      console.error('Failed to load invitation details:', error);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadInviteDetails();
    }
  }, [token]);

  // Accept invitation
  const handleAcceptInvite = async () => {
    if (!isAuthenticated) {
      message.info('Please log in first to accept invitation');
      navigate('/login', { state: { from: `/invite/${token}` } });
      return;
    }

    if (user.email !== invite.email) {
      message.error('Current logged-in email does not match invitation email');
      return;
    }

    try {
      setAccepting(true);
      const response = await apiService.request(`/teams/invite/${token}/accept`, {
        method: 'POST'
      });

      if (response.success) {
        message.success('Successfully joined team!');
        navigate(`/team/${response.team.id}/documents`);
      } else {
        message.error(response.msg || 'Accept invitationfailed');
      }
    } catch (error) {
      console.error('Accept invitationfailed:', error);
      message.error('Accept invitationfailed: ' + error.message);
    } finally {
      setAccepting(false);
    }
  };

  // Reject invitation
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
        message.success('Invitation rejected');
        navigate('/');
      } else {
        message.error(data.msg || 'Failed to reject invitation');
      }
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      message.error('Failed to reject invitation');
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
          title="Invalid invitation"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              Back to Home
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
          <h1 style={{ margin: 0, color: '#333' }}>Team Invitation</h1>
        </div>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <TeamOutlined style={{ marginRight: 8, color: '#666' }} />
            <strong>Team Name:</strong> {invite.teamName}
          </div>

          {invite.teamDescription && (
            <div style={{ marginBottom: 12 }}>
              <strong>Team Description:</strong> {invite.teamDescription}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <UserOutlined style={{ marginRight: 8, color: '#666' }} />
            <strong>Inviter:</strong> {invite.inviterName}
          </div>

          <div style={{ marginBottom: 12 }}>
            <MailOutlined style={{ marginRight: 8, color: '#666' }} />
            <strong>Invitation Email:</strong> {invite.email}
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>Role:</strong> {invite.role === 'admin' ? 'Administrator' : 'Member'}
          </div>

          <div style={{ color: '#666', fontSize: 14 }}>
            <strong>Expiration Time:</strong> {new Date(invite.expiresAt).toLocaleString()}
          </div>
        </div>

        {!isAuthenticated ? (
          <div>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Please log in first to accept invitation
            </p>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login', { state: { from: `/invite/${token}` } })}
              style={{ marginRight: 12 }}
            >
              Login
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/register', { state: { from: `/invite/${token}` } })}
            >
              Register
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
              Accept invitation
            </Button>
            <Button
              size="large"
              onClick={handleRejectInvite}
            >
              Reject invitation
            </Button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#ff4d4f', marginBottom: 16 }}>
              Current logged-in email ({user.email}) does not match invitation email
            </p>
            <Button
              size="large"
              onClick={() => {
                // Can choose to logout and login again
                navigate('/login');
              }}
            >
              Login with another account
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InvitePage;