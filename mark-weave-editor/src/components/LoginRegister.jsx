import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Button, Checkbox, message, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginRegister.css';

const LoginRegister = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const navigate = useNavigate();
  const { login, register, loading, isAuthenticated, error } = useAuth();

  // 如果已经登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (values) => {
    try {
      await login({
        email: values.email,
        password: values.password,
      });
      message.success('登录成功！');
      navigate('/home');
    } catch (error) {
      message.error(error.message || '登录失败');
    }
  };

  const handleRegister = async (values) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    try {
      await register({
        email: values.email,
        username: values.username,
        password: values.password,
      });
      message.success('注册成功！');
      navigate('/home');
    } catch (error) {
      message.error(error.message || '注册失败');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="login-register-container">
      <div className="login-register-box">
        <div className="brand-title">
          <h1>MarkWeave</h1>
          <p>协作编辑，共创未来</p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          className="login-register-tabs"
        >
          <Tabs.TabPane tab="登录" key="login">
            <Form
              form={loginForm}
              layout="vertical"
              className="login-form"
              onFinish={handleLogin}
              autoComplete="off"
            >
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input size="large" placeholder="请输入邮箱" />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' }
                ]}
              >
                <Input.Password size="large" placeholder="请输入密码" />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked">
                <Checkbox>记住我</Checkbox>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="注册" key="register">
            <Form
              form={registerForm}
              layout="vertical"
              className="register-form"
              onFinish={handleRegister}
              autoComplete="off"
            >
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 2, message: '用户名至少2位' },
                  { max: 30, message: '用户名最多30位' }
                ]}
              >
                <Input size="large" placeholder="请输入用户名" />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input size="large" placeholder="请输入邮箱" />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' }
                ]}
              >
                <Input.Password size="large" placeholder="请输入密码" />
              </Form.Item>

              <Form.Item
                label="确认密码"
                name="confirmPassword"
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password size="large" placeholder="请再次输入密码" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default LoginRegister;