import React from 'react';
import { Layout, Menu, Form, Input, Button, Select, List } from 'antd';
import { SettingOutlined, TeamOutlined } from '@ant-design/icons';
import './TeamSettings.css';

const { Sider, Content } = Layout;

const members = [
  { name: '张三', role: '成员' },
  { name: '李四', role: '成员' },
];

const TeamSettings = () => {
  return (
    <Layout className="teamset-layout">
      <Sider width={200} className="teamset-sider">
        <Menu mode="inline" defaultSelectedKeys={['general']} style={{ height: '100%', borderRight: 0 }}>
          <Menu.Item key="general" icon={<SettingOutlined />}>常规</Menu.Item>
          <Menu.Item key="manage" icon={<TeamOutlined />}>成员管理</Menu.Item>
        </Menu>
        <div className="teamset-settings">设置</div>
      </Sider>
      <Layout>
        <Content className="teamset-content">
          <h2>团队设置</h2>
          <Form layout="vertical" style={{ maxWidth: 400 }}>
            <Form.Item label="团队名称" name="teamName">
              <Input placeholder="请输入团队名称" />
            </Form.Item>
            <Form.Item label="描述" name="description">
              <Input.TextArea placeholder="请输入描述" rows={2} />
            </Form.Item>
            <Form.Item label="邀请成员">
              <Input.Group compact>
                <Input style={{ width: '70%' }} placeholder="输入邮箱邀请" />
                <Select defaultValue="成员" style={{ width: '30%' }}>
                  <Select.Option value="成员">成员</Select.Option>
                  <Select.Option value="管理员">管理员</Select.Option>
                </Select>
              </Input.Group>
              <Button type="primary" style={{ marginTop: 8 }}>邀请</Button>
            </Form.Item>
          </Form>
          <h3 style={{ marginTop: 32 }}>成员列表</h3>
          <List
            bordered
            dataSource={members}
            renderItem={item => (
              <List.Item actions={[<Select defaultValue={item.role} style={{ width: 90 }}><Select.Option value="成员">成员</Select.Option><Select.Option value="管理员">管理员</Select.Option></Select>]}>
                {item.name}
              </List.Item>
            )}
            style={{ maxWidth: 400 }}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default TeamSettings;