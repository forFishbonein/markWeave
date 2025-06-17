import React from 'react';
import { Tabs, Form, Input, Button, Checkbox } from 'antd';
import './LoginRegister.css';

const LoginRegister = () => {
  return (
    <div className="login-register-container">
      <Tabs defaultActiveKey="login" centered className="login-register-tabs">
        <Tabs.TabPane tab="登录" key="login">
          <Form layout="vertical" className="login-form">
            <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }]}> <Input /> </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}> <Input.Password /> </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>登录</Button>
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <div className="login-form-forgot">忘记密码？</div>
          </Form>
        </Tabs.TabPane>
        <Tabs.TabPane tab="注册" key="register">
          <Form layout="vertical" className="register-form">
            <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }]}> <Input /> </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}> <Input.Password /> </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>注册</Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default LoginRegister;