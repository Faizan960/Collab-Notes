import React, { useState, useEffect } from 'react';
import { ref, push, set, onValue, get } from 'firebase/database';
import { database } from '../firebase';
import { Mail, UserPlus, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import UserLookup from './UserLookup';

export default function InvitationSystem({ groupId, currentUser }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState([]);

  // Load pending invitations
  useEffect(() => {
    if (!groupId) return;

    const invitationsRef = ref(database, `groups/${groupId}/invitations`);
    const unsubscribe = onValue(invitationsRef, (snapshot) => {
      const invitationsData = snapshot.val();
      if (invitationsData) {
        const invitationsList = Object.entries(invitationsData).map(([id, invitation]) => ({
          id,
          ...invitation
        }));
        setInvitations(invitationsList);
      } else {
        setInvitations([]);
      }
    });

    return () => unsubscribe();
  }, [groupId]);

  const sendInvitation = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      // Check if invitation already exists
      const existingInvitation = invitations.find(inv => inv.email === email.trim());
      if (existingInvitation) {
        toast.error('Invitation already sent to this email');
        setLoading(false);
        return;
      }

      // Get group name for the invitation
      const groupRef = ref(database, `groups/${groupId}`);
      const groupSnapshot = await get(groupRef);
      const groupData = groupSnapshot.val();
      const groupName = groupData?.name || 'CollabNotes Group';

      // Create invitation
      const invitationsRef = ref(database, `groups/${groupId}/invitations`);
      const newInvitationRef = push(invitationsRef);
      const invitationId = newInvitationRef.key;
      
      const invitationData = {
        email: email.trim(),
        invitedBy: currentUser.uid,
        invitedByName: currentUser.email,
        groupId: groupId,
        groupName: groupName,
        invitationId: invitationId,
        createdAt: Date.now(),
        status: 'pending' // pending, accepted, declined
      };

      await set(newInvitationRef, invitationData);

      toast.success(`Invitation sent to ${email}! They will see it in their notifications.`);

      // Also create a notification for the invited user if they exist
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val();
      
      if (users) {
        const targetUser = Object.entries(users).find(([userId, userData]) => 
          userData.email === email.trim()
        );
        
        if (targetUser) {
          const [targetUserId] = targetUser;
          const notificationRef = ref(database, `users/${targetUserId}/notifications`);
          const newNotificationRef = push(notificationRef);
          
          await set(newNotificationRef, {
            type: 'group_invitation',
            groupId: groupId,
            invitationId: invitationId,
            invitedBy: currentUser.uid,
            invitedByName: currentUser.email,
            groupName: groupName,
            createdAt: Date.now(),
            read: false
          });
        }
      }

      setEmail('');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
    setLoading(false);
  };

  const handleUserSelect = (user) => {
    setEmail(user.email);
  };

  const cancelInvitation = async (invitationId) => {
    try {
      const invitationRef = ref(database, `groups/${groupId}/invitations/${invitationId}`);
      await set(invitationRef, null);
      toast.success('Invitation cancelled');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const resendInvitationNotification = async (invitation) => {
    try {
      // Check if user exists and create notification
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val();
      
      if (users) {
        const targetUser = Object.entries(users).find(([userId, userData]) => 
          userData.email === invitation.email
        );
        
        if (targetUser) {
          const [targetUserId] = targetUser;
          const notificationRef = ref(database, `users/${targetUserId}/notifications`);
          const newNotificationRef = push(notificationRef);
          
          await set(newNotificationRef, {
            type: 'group_invitation',
            groupId: invitation.groupId,
            invitationId: invitation.id,
            invitedBy: invitation.invitedBy,
            invitedByName: invitation.invitedByName,
            groupName: invitation.groupName,
            createdAt: Date.now(),
            read: false
          });

          toast.success(`Notification resent to ${invitation.email}!`);
        } else {
          toast.info('User not found in the system. They will see the invitation when they sign up.');
        }
      }
    } catch (error) {
      console.error('Error resending invitation notification:', error);
      toast.error('Failed to resend invitation notification');
    }
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

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
        <UserPlus size={20} />
        Invite Friends to Group
      </h3>

      <form onSubmit={sendInvitation} style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <label htmlFor="inviteEmail">
            <Mail size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Friend's Email
          </label>
          <div style={{ marginBottom: '8px' }}>
            <UserLookup onUserSelect={handleUserSelect} currentUser={currentUser} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="inviteEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="Or enter email address manually"
              required
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn btn-primary"
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                'Send Invite'
              )}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Search for existing users or enter any email address. Invitations will appear in their notifications.
          </p>
        </div>
      </form>

      {invitations.length > 0 && (
        <div>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: '#374151'
          }}>
            Pending Invitations ({invitations.length})
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
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
                <div style={{ color: '#6b7280' }}>
                  {invitation.status === 'accepted' ? (
                    <CheckCircle size={16} style={{ color: '#10b981' }} />
                  ) : (
                    <Clock size={16} />
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '500', 
                    fontSize: '14px',
                    marginBottom: '2px'
                  }}>
                    {invitation.email}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280'
                  }}>
                    Sent {formatTime(invitation.createdAt)} • 
                    Status: {invitation.status}
                  </div>
                </div>

                {invitation.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => resendInvitationNotification(invitation)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Resend notification"
                    >
                      <Mail size={12} />
                      Resend
                    </button>
                    <button
                      onClick={() => cancelInvitation(invitation.id)}
                      className="btn btn-danger"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {invitations.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: '#6b7280'
        }}>
          <UserPlus size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <p>No pending invitations</p>
        </div>
      )}
    </div>
  );
}
