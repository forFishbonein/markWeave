import React from 'react';
import { List, Select } from 'antd';

const Members = ({ members }) => (
  <div style={{ maxWidth: 400 }}>
    <h3>成员列表</h3>
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

export default Members;
