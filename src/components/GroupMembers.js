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
            // Get user details and profile
            const userRef = ref(database, `users/${userId}`);
            const userSnapshot = await get(userRef);
            const userData = userSnapshot.val();
            
            return {
              userId,
              ...memberData,
              email: userData?.email || 'Unknown User',
              displayName: userData?.displayName || userData?.profile?.displayName || userData?.email?.split('@')[0] || 'Unknown User'
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
    <div style={{ padding: '0' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#374151'
        }}>
          <Users size={18} />
          Members ({members.length})
        </h3>
        <div style={{
          background: '#f3f4f6',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          {members.filter(m => m.role === 'admin').length} admin{members.filter(m => m.role === 'admin').length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px',
        alignItems: 'center'
      }}>
        {members.map((member) => (
          <div
            key={member.userId}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              background: member.userId === currentUser?.uid 
                ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
                : '#f8fafc',
              border: member.userId === currentUser?.uid 
                ? '1px solid #3b82f6' 
                : '1px solid #e5e7eb',
              borderRadius: '20px',
              gap: '8px',
              transition: 'all 0.2s ease',
              cursor: 'default'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: member.role === 'admin' ? '#f59e0b' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {member.displayName?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ 
                fontWeight: '500', 
                fontSize: '13px',
                color: member.userId === currentUser?.uid ? '#1d4ed8' : '#374151'
              }}>
                {member.displayName || member.email?.split('@')[0] || 'Unknown'}
              </span>
              {member.role === 'admin' && (
                <Crown size={12} style={{ color: '#f59e0b' }} title="Admin" />
              )}
              {member.userId === currentUser?.uid && (
                <span style={{ 
                  fontSize: '10px', 
                  color: '#1d4ed8',
                  backgroundColor: 'rgba(29, 78, 216, 0.1)',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}>
                  You
                </span>
              )}
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
