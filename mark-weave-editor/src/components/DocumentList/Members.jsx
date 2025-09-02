import React from 'react';
import { List, Select } from 'antd';

const Members = ({ members }) => (
  <div style={{ maxWidth: 400 }}>
    <h3>Member List</h3>
    <List
      bordered
      dataSource={members}
      renderItem={item => (
        <List.Item actions={[<Select defaultValue={item.role} style={{ width: 90 }}><Select.Option value="Member">Member</Select.Option><Select.Option value="Administrator">Administrator</Select.Option></Select>]}>
          {item.name}
        </List.Item>
      )}
    />
  </div>
);

export default Members;
