import React from 'react';
import { Button, Card, List } from 'antd';

const mockTeams = [
  { id: 'team1', name: '团队A', desc: '这是团队A的描述' },
  { id: 'team2', name: '团队B', desc: '这是团队B的描述' },
];

const Home = () => {
  // 预留：实际应从接口获取团队列表
  // 预留：创建/加入团队弹窗逻辑
  return (
    <div style={{ maxWidth: 800, margin: '60px auto', padding: 24 }}>
      <h2>我的团队</h2>
      <div style={{ marginBottom: 24 }}>
        <Button type="primary" style={{ marginRight: 12 }}>创建团队</Button>
        <Button>加入团队</Button>
      </div>
      <List
        grid={{ gutter: 16, column: 2 }}
        dataSource={mockTeams}
        renderItem={team => (
          <List.Item>
            <Card title={team.name} extra={<Button type="link">进入</Button>}>
              {team.desc}
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default Home;
