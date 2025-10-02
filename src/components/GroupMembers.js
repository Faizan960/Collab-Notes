import React, { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../firebase';
import { Users, Crown, User, Mail } from 'lucide-react';

export default function GroupMembers({ groupId, currentUser }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const membersRef = ref(database, `groups/${groupId}/members`);
    const unsubscribe = onValue(membersRef, async (snapshot) => {
      const membersData = snapshot.val();
      if (membersData) {
        const membersList = await Promise.all(
          Object.entries(membersData).map(async ([userId, memberData]) => {
            // Get user details
            const userRef = ref(database, `users/${userId}`);
            const userSnapshot = await get(userRef);
            const userData = userSnapshot.val();
            
            return {
              userId,
              ...memberData,
              email: userData?.email || 'Unknown User'
            };
          })
        );
        setMembers(membersList);
      } else {
        setMembers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: '8px', color: '#6b7280' }}>Loading members...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Users size={20} />
        Group Members ({members.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {members.map((member) => (
          <div
            key={member.userId}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              gap: '12px'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: member.role === 'admin' ? '#f59e0b' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              {member.email?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '4px'
              }}>
                <span style={{ fontWeight: '500', fontSize: '14px' }}>
                  {member.email}
                </span>
                {member.role === 'admin' && (
                  <Crown size={14} style={{ color: '#f59e0b' }} title="Admin" />
                )}
                {member.userId === currentUser?.uid && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    You
                  </span>
                )}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Mail size={12} />
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: '#6b7280'
        }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No members found</p>
        </div>
      )}
    </div>
  );
}
