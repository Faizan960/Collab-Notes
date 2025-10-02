import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { Search, User, Mail } from 'lucide-react';

export default function UserLookup({ onUserSelect, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (usersData) {
        const usersList = Object.entries(usersData)
          .filter(([userId, userData]) => 
            userId !== currentUser.uid && // Exclude current user
            !userData.isPlaceholder && // Exclude placeholder users
            userData.email // Only include users with email
          )
          .map(([userId, userData]) => ({
            id: userId,
            ...userData
          }));
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers([]);
      return;
    }

    const filtered = users.filter(user =>
      user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleUserSelect = (user) => {
    onUserSelect(user);
    setSearchQuery('');
    setFilteredUsers([]);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Search 
          size={16} 
          style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: '#6b7280'
          }} 
        />
        <input
          type="text"
          placeholder="Search for users by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {filteredUsers.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto',
          marginTop: '4px'
        }}>
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => handleUserSelect(user)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottom: '1px solid #f3f4f6'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>
                  {user.email || 'No email'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {user.isPlaceholder ? 'Pending signup' : 'Active user'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchQuery && filteredUsers.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          padding: '12px',
          marginTop: '4px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          No users found with that email
        </div>
      )}
    </div>
  );
}
