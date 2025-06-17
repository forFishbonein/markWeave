import React from 'react';
import { List, Select } from 'antd';

const mockMembers = [
  { name: '张三', role: '成员' },
  { name: '李四', role: '成员' },
];

const MemberList = () => (
  <div style={{ width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 32, minHeight: 600, margin: '0', boxSizing: 'border-box' }}>
    <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>成员列表</h3>
    <List
      bordered
      dataSource={mockMembers}
      renderItem={item => (
        <List.Item actions={[<Select defaultValue={item.role} style={{ width: 90 }}><Select.Option value="成员">成员</Select.Option><Select.Option value="管理员">管理员</Select.Option></Select>]}>
          {item.name}
        </List.Item>
      )}
    />
  </div>
);

export default MemberList;
