import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Shield, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Crown, 
  UserMinus, 
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-react';
import { ref, update, get, remove } from 'firebase/database';
import { database } from '../firebase';
import toast from 'react-hot-toast';

export default function GroupSettings({ isOpen, onClose, group, currentUser, onGroupUpdate }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    allowMemberInvites: true,
    requireApproval: false
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Check if current user is admin
  const isAdmin = group && currentUser && (
    group.createdBy === currentUser.uid || 
    (members.find(m => m.userId === currentUser.uid)?.role === 'admin')
  );

  // Load group data and members
  useEffect(() => {
    const loadGroupData = async () => {
      if (!group || !isOpen) return;
      
      setLoading(true);
      try {
        // Load group details
        const groupRef = ref(database, `groups/${group.id}`);
        const groupSnapshot = await get(groupRef);
        const groupInfo = groupSnapshot.val();
        
        if (groupInfo) {
          setGroupData({
            name: groupInfo.name || '',
            description: groupInfo.description || '',
            isPrivate: groupInfo.isPrivate || false,
            allowMemberInvites: groupInfo.allowMemberInvites !== false,
            requireApproval: groupInfo.requireApproval || false
          });
        }

        // Load members
        const membersRef = ref(database, `groups/${group.id}/members`);
        const membersSnapshot = await get(membersRef);
        const membersData = membersSnapshot.val();
        
        if (membersData) {
          const membersList = await Promise.all(
            Object.entries(membersData).map(async ([userId, memberData]) => {
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
        }
      } catch (error) {
        console.error('Error loading group data:', error);
        toast.error('Failed to load group settings');
      }
      setLoading(false);
    };

    loadGroupData();
  }, [group, isOpen]);

  const handleSaveSettings = async () => {
    if (!group || !isAdmin) return;
    
    setSaving(true);
    try {
      const groupRef = ref(database, `groups/${group.id}`);
      const updates = {
        name: groupData.name.trim(),
        description: groupData.description.trim(),
        isPrivate: groupData.isPrivate,
        allowMemberInvites: groupData.allowMemberInvites,
        requireApproval: groupData.requireApproval,
        updatedAt: Date.now(),
        updatedBy: currentUser.uid
      };
      
      await update(groupRef, updates);
      
      // Update group name in all members' user records
      const memberUpdates = {};
      members.forEach(member => {
        memberUpdates[`users/${member.userId}/groups/${group.id}/name`] = groupData.name.trim();
      });
      
      if (Object.keys(memberUpdates).length > 0) {
        await update(ref(database), memberUpdates);
      }
      
      toast.success('Group settings updated successfully!');
      onGroupUpdate && onGroupUpdate({ ...group, ...updates });
    } catch (error) {
      console.error('Error updating group settings:', error);
      toast.error('Failed to update group settings');
    }
    setSaving(false);
  };

  const handlePromoteToAdmin = async (member) => {
    if (!group || !isAdmin || member.role === 'admin') return;
    
    try {
      const memberRef = ref(database, `groups/${group.id}/members/${member.userId}`);
      await update(memberRef, {
        role: 'admin',
        promotedAt: Date.now(),
        promotedBy: currentUser.uid
      });
      
      // Update local state
      setMembers(prev => prev.map(m => 
        m.userId === member.userId ? { ...m, role: 'admin' } : m
      ));
      
      toast.success(`${member.displayName} promoted to admin`);
    } catch (error) {
      console.error('Error promoting member:', error);
      toast.error('Failed to promote member');
    }
  };

  const handleDemoteFromAdmin = async (member) => {
    if (!group || !isAdmin || member.role !== 'admin' || member.userId === group.createdBy) return;
    
    try {
      const memberRef = ref(database, `groups/${group.id}/members/${member.userId}`);
      await update(memberRef, {
        role: 'member',
        demotedAt: Date.now(),
        demotedBy: currentUser.uid
      });
      
      // Update local state
      setMembers(prev => prev.map(m => 
        m.userId === member.userId ? { ...m, role: 'member' } : m
      ));
      
      toast.success(`${member.displayName} demoted to member`);
    } catch (error) {
      console.error('Error demoting member:', error);
      toast.error('Failed to demote member');
    }
  };

  const handleRemoveMember = async (member) => {
    if (!group || !isAdmin || member.userId === group.createdBy || member.userId === currentUser.uid) return;
    
    try {
      // Remove from group members
      const memberRef = ref(database, `groups/${group.id}/members/${member.userId}`);
      await remove(memberRef);
      
      // Remove group from user's groups
      const userGroupRef = ref(database, `users/${member.userId}/groups/${group.id}`);
      await remove(userGroupRef);
      
      // Update local state
      setMembers(prev => prev.filter(m => m.userId !== member.userId));
      
      toast.success(`${member.displayName} removed from group`);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/invite/${group.id}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      toast.success('Invite link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy invite link');
    });
  };

  const generateNewInviteCode = async () => {
    if (!group || !isAdmin) return;
    
    try {
      const newInviteCode = Math.random().toString(36).substring(2, 15);
      const groupRef = ref(database, `groups/${group.id}`);
      await update(groupRef, {
        inviteCode: newInviteCode,
        inviteCodeUpdatedAt: Date.now(),
        inviteCodeUpdatedBy: currentUser.uid
      });
      
      toast.success('New invite code generated!');
    } catch (error) {
      console.error('Error generating invite code:', error);
      toast.error('Failed to generate new invite code');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '700px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} style={{ color: '#3b82f6' }} />
            <h2 className="modal-title">Group Settings</h2>
            {!isAdmin && (
              <span style={{
                fontSize: '12px',
                background: '#fef3c7',
                color: '#92400e',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                View Only
              </span>
            )}
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '40px'
          }}>
            <div className="spinner" />
            <span style={{ marginLeft: '8px' }}>Loading settings...</span>
          </div>
        ) : (
          <>
            {/* Basic Settings */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '16px',
                color: '#374151'
              }}>
                Basic Information
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Group Name */}
                <div className="form-group">
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '8px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    <Edit3 size={16} />
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupData.name}
                    onChange={(e) => setGroupData(prev => ({ ...prev, name: e.target.value }))}
                    className="input"
                    placeholder="Enter group name"
                    disabled={!isAdmin}
                    style={{
                      fontSize: '16px',
                      padding: '12px 16px',
                      backgroundColor: !isAdmin ? '#f9fafb' : 'white'
                    }}
                  />
                </div>

                {/* Group Description */}
                <div className="form-group">
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '8px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    <Edit3 size={16} />
                    Description
                  </label>
                  <textarea
                    value={groupData.description}
                    onChange={(e) => setGroupData(prev => ({ ...prev, description: e.target.value }))}
                    className="input"
                    placeholder="Describe what this group is about..."
                    rows={3}
                    disabled={!isAdmin}
                    style={{
                      fontSize: '16px',
                      padding: '12px 16px',
                      resize: 'vertical',
                      backgroundColor: !isAdmin ? '#f9fafb' : 'white'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '16px',
                color: '#374151'
              }}>
                Privacy & Permissions
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Private Group */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {groupData.isPrivate ? <Lock size={20} /> : <Unlock size={20} />}
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>Private Group</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Only members can see group content
                      </div>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={groupData.isPrivate}
                      onChange={(e) => isAdmin && setGroupData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                      disabled={!isAdmin}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Enable</span>
                  </label>
                </div>

                {/* Member Invites */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Users size={20} />
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>Member Invitations</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Allow members to invite others
                      </div>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={groupData.allowMemberInvites}
                      onChange={(e) => isAdmin && setGroupData(prev => ({ ...prev, allowMemberInvites: e.target.checked }))}
                      disabled={!isAdmin}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Allow</span>
                  </label>
                </div>

                {/* Require Approval */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Shield size={20} />
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>Require Approval</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Admin approval needed for new members
                      </div>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={groupData.requireApproval}
                      onChange={(e) => isAdmin && setGroupData(prev => ({ ...prev, requireApproval: e.target.checked }))}
                      disabled={!isAdmin}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Enable</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Invite Management */}
            {isAdmin && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: '#374151'
                }}>
                  Invite Management
                </h3>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={copyInviteLink}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Copy size={16} />
                    Copy Invite Link
                  </button>
                  
                  <button
                    onClick={generateNewInviteCode}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <RefreshCw size={16} />
                    Generate New Code
                  </button>
                </div>
              </div>
            )}

            {/* Member Management */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '16px',
                color: '#374151'
              }}>
                Members ({members.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map((member) => (
                  <div
                    key={member.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: member.role === 'admin' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {member.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      
                      <div>
                        <div style={{ 
                          fontWeight: '500', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {member.displayName}
                          {member.role === 'admin' && <Crown size={14} style={{ color: '#f59e0b' }} />}
                          {member.userId === group.createdBy && (
                            <span style={{
                              fontSize: '10px',
                              background: '#dbeafe',
                              color: '#1d4ed8',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              Owner
                            </span>
                          )}
                          {member.userId === currentUser.uid && (
                            <span style={{
                              fontSize: '10px',
                              background: '#f3f4f6',
                              color: '#6b7280',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              You
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {member.email}
                        </div>
                      </div>
                    </div>

                    {/* Member Actions */}
                    {isAdmin && member.userId !== currentUser.uid && member.userId !== group.createdBy && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {member.role === 'member' ? (
                          <button
                            onClick={() => handlePromoteToAdmin(member)}
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            title="Promote to Admin"
                          >
                            <Crown size={12} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDemoteFromAdmin(member)}
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            title="Demote to Member"
                          >
                            <Users size={12} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => setMemberToRemove(member)}
                          className="btn btn-danger"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                          title="Remove Member"
                        >
                          <UserMinus size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            {isAdmin && (
              <div className="modal-footer">
                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="btn btn-primary"
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {saving ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px' }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Remove Member Confirmation */}
        {memberToRemove && (
          <div className="modal-overlay" style={{ zIndex: 10001 }}>
            <div className="modal" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Remove Member</h3>
                <button onClick={() => setMemberToRemove(null)} className="close-btn">
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <AlertTriangle size={24} style={{ color: '#ef4444' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: '500' }}>
                      Remove {memberToRemove.displayName}?
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                      They will lose access to all group content and will need to be re-invited.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button
                  onClick={() => setMemberToRemove(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMember(memberToRemove)}
                  className="btn btn-danger"
                >
                  Remove Member
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
