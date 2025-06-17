import React, { useState } from 'react';
import { List, Select, Input, Button, message } from 'antd';

const MemberList = () => {
  const [members, setMembers] = useState([
    { name: '张三', role: '成员' },
    { name: '李四', role: '成员' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('成员');

  // 邀请成员逻辑
  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      message.error('请输入成员邮箱');
      return;
    }
    setMembers([...members, { name: inviteEmail, role: inviteRole }]);
    setInviteEmail('');
    setInviteRole('成员');
    message.success('邀请成功');
  };

  return (
    <div style={{ width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 32, minHeight: 600, margin: '0', boxSizing: 'border-box' }}>
      <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>成员列表</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Input
          placeholder="输入成员邮箱邀请"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          style={{ width: 240 }}
        />
        <Select value={inviteRole} onChange={setInviteRole} style={{ width: 120 }}>
          <Select.Option value="成员">成员</Select.Option>
          <Select.Option value="管理员">管理员</Select.Option>
        </Select>
        <Button type="primary" onClick={handleInvite}>邀请</Button>
      </div>
      <List
        bordered
        dataSource={members}
        renderItem={item => (
          <List.Item actions={[<Select defaultValue={item.role} style={{ width: 90 }}><Select.Option value="成员">成员</Select.Option><Select.Option value="管理员">管理员</Select.Option></Select>]}>
            {item.name}
          </List.Item>
        )}
      />
    </div>
  );
};

export default MemberList;
