import React, { useState } from 'react';
import { X, UserPlus, Mail, Users } from 'lucide-react';
import { ref, push, set, get } from 'firebase/database';
import { database } from '../firebase';
import toast from 'react-hot-toast';

export default function InviteFriendModal({ onClose, groupId, currentUser }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInviteFriend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      // Check if user exists in database
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();
      
      let targetUserId = null;
      let targetUserData = null;

      if (users) {
        // Find user by email
        const targetUser = Object.entries(users).find(([userId, userData]) => 
          userData.email === email.trim()
        );

        if (targetUser) {
          [targetUserId, targetUserData] = targetUser;
        }
      }

      // If user not found in database, create a placeholder entry
      if (!targetUserId) {
        // Generate a temporary user ID (this is a workaround)
        // In a real app, you'd want to verify the email exists in Firebase Auth
        const tempUserId = `temp_${Date.now()}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Create a placeholder user entry
        await set(ref(database, `users/${tempUserId}`), {
          email: email.trim(),
          isPlaceholder: true,
          createdAt: Date.now(),
          invitedBy: currentUser.uid
        });
        
        targetUserId = tempUserId;
        targetUserData = { email: email.trim(), isPlaceholder: true };
        
        toast.success(`Invitation sent to ${email}. They'll be added to the group when they sign up!`);
      } else {
        toast.success(`Successfully invited ${email} to the group!`);
      }

      // Check if user is already in the group
      const groupRef = ref(database, `groups/${groupId}/members/${targetUserId}`);
      const groupSnapshot = await get(groupRef);
      
      if (groupSnapshot.exists()) {
        toast.error('User is already a member of this group');
        setLoading(false);
        return;
      }

      // Add user to group
      await set(groupRef, {
        role: 'member',
        joinedAt: Date.now(),
        invitedBy: currentUser.uid
      });

      // Add group to user's groups
      const userGroupRef = ref(database, `users/${targetUserId}/groups/${groupId}`);
      const groupDataRef = ref(database, `groups/${groupId}`);
      const groupDataSnapshot = await get(groupDataRef);
      const groupData = groupDataSnapshot.val();

      await set(userGroupRef, {
        name: groupData.name,
        role: 'member',
        joinedAt: Date.now()
      });

      // Create invitation notification
      const notificationRef = ref(database, `users/${targetUserId}/notifications`);
      const newNotificationRef = push(notificationRef);
      await set(newNotificationRef, {
        type: 'group_invitation',
        groupId: groupId,
        groupName: groupData.name,
        invitedBy: currentUser.uid,
        invitedByName: currentUser.email,
        createdAt: Date.now(),
        read: false
      });

      toast.success(`Successfully invited ${email} to the group!`);
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Error inviting friend:', error);
      toast.error('Failed to invite friend');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Invite Friend to Group</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleInviteFriend}>
          <div className="form-group">
            <label htmlFor="email">
              <Mail size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Friend's Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="Enter friend's email address"
              required
              autoFocus
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Your friend must have an account with this email address
            </p>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn btn-primary"
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
