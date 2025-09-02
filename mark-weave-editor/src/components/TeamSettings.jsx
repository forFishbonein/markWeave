import React from 'react';
import { Layout, Menu, Form, Input, Button, Select, List } from 'antd';
import { SettingOutlined, TeamOutlined } from '@ant-design/icons';
import './TeamSettings.css';

const { Sider, Content } = Layout;

const members = [
  { name: 'Zhang San', role: 'Member' },
  { name: 'Li Si', role: 'Member' },
];

const TeamSettings = () => {
  return (
    <Layout className="teamset-layout">
      <Sider width={200} className="teamset-sider">
        <Menu mode="inline" defaultSelectedKeys={['general']} style={{ height: '100%', borderRight: 0 }}>
          <Menu.Item key="general" icon={<SettingOutlined />}>General</Menu.Item>
          <Menu.Item key="manage" icon={<TeamOutlined />}>Member Management</Menu.Item>
        </Menu>
        <div className="teamset-settings">Settings</div>
      </Sider>
      <Layout>
        <Content className="teamset-content">
          <h2>Team Settings</h2>
          <Form layout="vertical" style={{ maxWidth: 400 }}>
            <Form.Item label="Team Name" name="teamName">
              <Input placeholder="Please enter team name" />
            </Form.Item>
            <Form.Item label="Description" name="description">
              <Input.TextArea placeholder="Please enter description" rows={2} />
            </Form.Item>
            <Form.Item label="Invite Member">
              <Input.Group compact>
                <Input style={{ width: '70%' }} placeholder="Enter email to invite" />
                <Select defaultValue="Member" style={{ width: '30%' }}>
                  <Select.Option value="Member">Member</Select.Option>
                  <Select.Option value="Administrator">Administrator</Select.Option>
                </Select>
              </Input.Group>
              <Button type="primary" style={{ marginTop: 8 }}>Invite</Button>
            </Form.Item>
          </Form>
          <h3 style={{ marginTop: 32 }}>Member List</h3>
          <List
            bordered
            dataSource={members}
            renderItem={item => (
              <List.Item actions={[<Select defaultValue={item.role} style={{ width: 90 }}><Select.Option value="Member">Member</Select.Option><Select.Option value="Administrator">Administrator</Select.Option></Select>]}>
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