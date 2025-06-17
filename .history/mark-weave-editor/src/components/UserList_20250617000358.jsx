/*
 * @FilePath: UserList.jsx
 * @Author: Aron
 * @Date: 2025-03-03 02:09:21
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-06-17 00:03:58
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// UserList.js
import React, { useState, useEffect } from "react";
function deduplicateUsers(users) {
  const seen = new Set();
  return users.filter((user) => {
    const key = `${user.name}-${user.color}`;
    if (seen.has(key)) {
      return false;
    } else {
      seen.add(key);
      return true;
    }
  });
}
const UserList = ({ awareness }) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // 监听 awareness 变化
    const onAwarenessChange = () => {
      const states = Array.from(awareness.getStates().values());
      // 过滤出包含 user 信息的状态
      let userList = states
        .filter((state) => state.user)
        .map((state) => state.user);
      userList = deduplicateUsers(userList);
      // console.log("userList", userList);
      setUsers(userList);
    };

    awareness.on("change", onAwarenessChange);

    // 初始时也更新一次
    onAwarenessChange();

    return () => {
      awareness.off("change", onAwarenessChange);
    };
  }, [awareness]);

  return (
    <div className='user-list'>
      <h3>当前在线用户：</h3>
      <ul>
        {users.map((user, idx) => (
          <li key={idx} style={{ color: user.color }}>
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
