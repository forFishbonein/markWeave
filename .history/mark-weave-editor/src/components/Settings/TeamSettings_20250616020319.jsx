import React from 'react';
import { Form, Input, Button } from 'antd';

const TeamSettings = () => (
  <div style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 32 }}>
    <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>团队设置</h3>
    <Form layout="vertical" style={{ maxWidth: 400 }}>
      <Form.Item label="团队名称" name="teamName">
        <Input placeholder="请输入团队名称" />
      </Form.Item>
      <Form.Item label="描述" name="description">
        <Input.TextArea placeholder="请输入描述" rows={2} />
      </Form.Item>
      <Form.Item>
        <Button type="primary">保存设置</Button>
      </Form.Item>
    </Form>
  </div>
);

export default TeamSettings;
