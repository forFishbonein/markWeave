/*
 * @FilePath: UserList.jsx
 * @Author: Aron
 * @Date: 2025-03-03 02:09:21
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-06-17 00:13:49
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
    // Listen for awareness changes
    const onAwarenessChange = () => {
      const states = Array.from(awareness.getStates().values());
      // Filter states that contain user information
      let userList = states
        .filter((state) => state.user)
        .map((state) => state.user);
      userList = deduplicateUsers(userList);
      // console.log("userList", userList);
      setUsers(userList);
    };

    awareness.on("change", onAwarenessChange);

    // Update once initially
    onAwarenessChange();

    return () => {
      awareness.off("change", onAwarenessChange);
    };
  }, [awareness]);

  return (
    <div className='online-users'>
      <h4>Online Users:</h4>
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
