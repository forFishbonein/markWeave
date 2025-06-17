import React from 'react';
import { Layout, Menu, Table, Button, Input } from 'antd';
import { TeamOutlined, SettingOutlined, UserOutlined, QuestionCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './DocumentList.css';

const { Sider, Content } = Layout;

const dataSource = [
  { key: '1', name: 'Document title 1', updated: 'Apr 16' },
  { key: '2', name: 'Document title 2', updated: 'Apr 16' },
  { key: '3', name: 'Document title 3', updated: 'Apr 16' },
];

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '最后更新时间', dataIndex: 'updated', key: 'updated' },
];

const DocumentList = () => {
  const navigate = useNavigate();
  return (
    <Layout className="doclist-layout">
      <Sider width={200} className="doclist-sider">
        <div className="doclist-team">
          <Button icon={<TeamOutlined />}>Team name</Button>
        </div>
        <Menu mode="inline" defaultSelectedKeys={['documents']} style={{ height: '100%', borderRight: 0 }}>
          <Menu.Item key="members" icon={<UserOutlined />}>成员</Menu.Item>
          <Menu.Item key="settings" icon={<SettingOutlined />}>设置</Menu.Item>
          <Menu.Item key="help" icon={<QuestionCircleOutlined />}>帮助</Menu.Item>
        </Menu>
        <div className="doclist-settings">设置</div>
      </Sider>
      <Layout>
        <Content className="doclist-content">
          <div className="doclist-header">
            <span className="doclist-title">文档列表</span>
            <Button type="default">筛选</Button>
          </div>
          <div className="doclist-toolbar">
            <Input.Search placeholder="搜索文档..." style={{ width: 200 }} />
            <Button type="primary" icon={<PlusOutlined />}>新建</Button>
          </div>
          <Table
            dataSource={dataSource}
            columns={columns}
            rowClassName="doclist-row"
            onRow={record => ({ onClick: () => navigate(`/editor/${record.key}`) })}
            pagination={false}
            style={{ marginTop: 16 }}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DocumentList;