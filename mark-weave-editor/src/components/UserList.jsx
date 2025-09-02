/*
 * @FilePath: UserList.jsx
 * @Author: Aron
 * @Date: 2025-03-03 02:09:21
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-12 02:22:15
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// UserList.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
function deduplicateUsers(users) {
  const seen = new Map();
  const result = [];

  users.forEach((user) => {
    // Use multiple fields for more reliable deduplication
    const key = user.userId || user.email || user.name;

    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(user);
    } else {
      // If duplicates exist, keep the one with more complete info
      const existingIndex = result.findIndex(u =>
        (u.userId && u.userId === user.userId) ||
        (u.email && u.email === user.email) ||
        (u.name === user.name)
      );

      if (existingIndex >= 0) {
        // Keep user object with more complete info
        const existing = result[existingIndex];
        if (user.userId && !existing.userId) {
          result[existingIndex] = user;
        }
      }
    }
  });

  return result;
}
const UserList = ({ awareness }) => {
  const [users, setUsers] = useState([]);
  const { user: currentUser } = useAuth(); // Get current logged-in user

  useEffect(() => {
    if (!awareness) {
      console.log("⚠️ Awareness not initialized");
      return;
    }

    console.log("🔄 UserList useEffect executed, initializing listeners");

    // Core function to get online users
    const updateUserList = () => {
      try {
        const states = Array.from(awareness.getStates().values());
        // console.log("📊 Original awareness state count:", states.length);

        // Get valid user information
        let userList = states
          .filter((state) => {
            return state && state.user && state.user.name && state.user.name.trim() !== '';
          })
          .map((state) => state.user);

        // console.log("📋 Filtered users:", userList.map(u => ({ name: u.name, userId: u.userId })));

        // Deduplicate
        userList = deduplicateUsers(userList);

        // console.log("✅ Final user list:", userList.map(u => u.name));
        setUsers(userList);
      } catch (error) {
        console.error("❌ Error updating user list:", error);
      }
    };

    // Listen to awareness changes
    awareness.on("change", updateUserList);

    // Update immediately once
    updateUserList();

    return () => {
      awareness.off("change", updateUserList);
      console.log("🧹 UserList cleaning listeners");
    };
  }, [awareness]); // Only depend on awareness

  return (
    <div className='online-users'>
      <h4>ONLINE USERS:</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
        {users.map((user, idx) => {
          // Determine if it's current user
          const isCurrentUser = user.userId === currentUser?.userId ||
            user.name === currentUser?.username ||
            user.email === currentUser?.email;

          // Current account uses blue, other users use green
          const userColor = isCurrentUser ? '#2563eb' : '#10b981';

          return (
            <div
              key={`${user.userId || user.name}-${idx}`}
              style={{
                background: userColor,
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: isCurrentUser ? '2px solid #1d4ed8' : 'none',
              }}
              title={user.email || user.name}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.8)'
                }}
              />
              {user.name}
            </div>
          );
        })}
      </div>
      {users.length === 0 && (
        <p style={{ color: '#999', fontSize: '12px', margin: '8px 0' }}>
          No online users
        </p>
      )}
    </div>
  );
};

export default UserList;
