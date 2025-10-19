import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  FolderPlus, 
  FileText, 
  Plus, 
  LogOut, 
  Search,
  Folder,
  File,
  UserPlus,
  Trash2,
  MoreVertical,
  Bell,
  CheckCircle,
  XCircle,
  Move,
  Settings,
  User
} from 'lucide-react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '../firebase';
import toast from 'react-hot-toast';

export default function Sidebar({
  groups,
  selectedGroup,
  onSelectGroup,
  folders,
  selectedFolder,
  onSelectFolder,
  notes,
  selectedNote,
  onSelectNote,
  onCreateGroup,
  onCreateFolder,
  onCreateNote,
  onInviteFriend,
  onDeleteNote,
  onMoveNote,
  searchQuery,
  onSearchChange,
  onLogout,
  currentUser,
  onDeleteGroup
}) {
  const [showNoteMenu, setShowNoteMenu] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [noteToMove, setNoteToMove] = useState(null);
  const [showFolderMenu, setShowFolderMenu] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  // Load user notifications
  useEffect(() => {
    if (!currentUser) return;

    const notificationsRef = ref(database, `users/${currentUser.uid}/notifications`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const notificationsData = snapshot.val();
      if (notificationsData) {
        const notificationsList = Object.entries(notificationsData)
          .map(([id, notification]) => ({
            id,
            ...notification
          }))
          .filter(notification => !notification.read) // Only show unread notifications
          .sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first
        setNotifications(notificationsList);
      } else {
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowNoteMenu(null);
        setShowNotifications(false);
        setShowFolderMenu(null);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAcceptInvitation = async (notification) => {
    try {
      // Add user to group
      const groupMembersRef = ref(database, `groups/${notification.groupId}/members/${currentUser.uid}`);
      await update(groupMembersRef, {
        role: 'member',
        joinedAt: Date.now(),
        invitedBy: notification.invitedBy
      });

      // Add group to user's groups
      const userGroupRef = ref(database, `users/${currentUser.uid}/groups/${notification.groupId}`);
      await update(userGroupRef, {
        name: notification.groupName,
        role: 'member',
        joinedAt: Date.now()
      });

      // Update invitation status
      const invitationRef = ref(database, `groups/${notification.groupId}/invitations/${notification.invitationId}`);
      await update(invitationRef, {
        status: 'accepted',
        acceptedAt: Date.now(),
        acceptedBy: currentUser.uid
      });

      // Mark notification as read
      const notificationRef = ref(database, `users/${currentUser.uid}/notifications/${notification.id}`);
      await update(notificationRef, {
        read: true,
        readAt: Date.now()
      });

      toast.success(`Successfully joined "${notification.groupName}"!`);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (notification) => {
    try {
      // Update invitation status
      const invitationRef = ref(database, `groups/${notification.groupId}/invitations/${notification.invitationId}`);
      await update(invitationRef, {
        status: 'declined',
        declinedAt: Date.now(),
        declinedBy: currentUser.uid
      });

      // Mark notification as read
      const notificationRef = ref(database, `users/${currentUser.uid}/notifications/${notification.id}`);
      await update(notificationRef, {
        read: true,
        readAt: Date.now()
      });

      toast.success('Invitation declined');
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
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

  const handleMoveNote = (note) => {
    // Check if there are other folders to move to
    const otherFolders = folders.filter(folder => folder.id !== selectedFolder?.id);
    
    if (otherFolders.length === 0) {
      toast.error('No other folders available to move this note to');
      setShowNoteMenu(null);
      return;
    }
    
    setNoteToMove(note);
    setShowMoveModal(true);
    setShowNoteMenu(null);
  };

  const handleMoveNoteToFolder = async (targetFolderId) => {
    if (!noteToMove || !selectedGroup || !onMoveNote) return;

    try {
      await onMoveNote(noteToMove, targetFolderId);
      setShowMoveModal(false);
      setNoteToMove(null);
      toast.success(`Note moved successfully!`);
    } catch (error) {
      console.error('Error moving note:', error);
      toast.error('Failed to move note');
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!selectedGroup || !folder) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the folder "${folder.name}"? This will also delete all notes in this folder.`
    );

    if (!confirmed) return;

    try {
      const folderRef = ref(database, `groups/${selectedGroup.id}/folders/${folder.id}`);
      await remove(folderRef);

      // Clear selected folder if it was the one being deleted
      if (selectedFolder?.id === folder.id) {
        onSelectFolder(null);
      }

      toast.success('Folder deleted successfully!');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  return (
    <div className="sidebar" style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      borderRight: '1px solid #e2e8f0',
      boxShadow: '4px 0 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={18} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              CollabNotes
            </h2>
          </div>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ 
                padding: '8px 10px', 
                position: 'relative',
                background: notifications.length > 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'white'
              }}
              title="Notifications"
            >
              <Bell size={16} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  animation: 'pulse 2s infinite'
                }}>
                  {notifications.length}
                </span>
              )}
            </button>
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div 
                ref={menuRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  left: 'auto',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '260px',
                  maxWidth: 'calc(100vw - 48px)',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  boxSizing: 'border-box',
                  padding: '8px'
                }}
              >
                {/* Render notifications here */}
                {notifications.length === 0 ? (
                  <div style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>No new notifications</div>
                ) : (
                  notifications.map((notification) => {
                    // Build a fallback message from available fields
                    const message = notification.message || notification.text || (
                      notification.type === 'group_invitation'
                        ? `${notification.invitedByName || 'Someone'} invited you to join "${notification.groupName || 'a group'}".`
                        : notification.type || 'New notification'
                    );

                    // Ensure createdAt is a number we can display; fallback to Date.now()
                    const createdAt = typeof notification.createdAt === 'number' ? notification.createdAt : Date.now();

                    return (
                      <div key={notification.id} style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>{message}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{formatTime(createdAt)}</div>

                        {/* Invitation actions: accept/decline for group_invitation */}
                        {notification.type === 'group_invitation' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleAcceptInvitation(notification)}>
                              <CheckCircle size={14} /> Accept
                            </button>
                            <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleDeclineInvitation(notification)}>
                              <XCircle size={14} /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search 
            size={16}
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1
            }} 
          />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ 
              paddingLeft: '40px',
              padding: '10px 12px 10px 40px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '14px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
          />
        </div>
        <button
          onClick={onCreateGroup}
          style={{ 
            width: '100%', 
            marginBottom: '12px',
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Plus size={16} />
          New Group
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Groups
            </h3>
            {selectedGroup && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '10px', 
                  color: '#10b981',
                  backgroundColor: '#d1fae5',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  Active
                </span>
                <button
                  onClick={onInviteFriend}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  title="Invite Friend"
                >
                  <UserPlus size={14} />
                </button>
                {/* Admin controls */}
                {currentUser && selectedGroup.role === 'admin' && (
                  <>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('showGroupSettings'));
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      title="Group Settings"
                    >
                      <Settings size={14} />
                    </button>
                    
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this group? This will remove the group for all members.')) {
                          onDeleteGroup(selectedGroup);
                        }
                      }}
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      title="Delete Group"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {groups.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              No groups yet. Create one to get started!
            </p>
          ) : (
            <div>
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`group-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
                  onClick={() => onSelectGroup(group)}
                >
                  <Users size={16} />
                  <span style={{ flex: 1 }}>{group.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {selectedGroup && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px'
            }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={onCreateFolder}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '6px',
                  color: '#92400e',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(245, 158, 11, 0.15)';
                  e.target.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(245, 158, 11, 0.1)';
                  e.target.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                }}
              >
                <FolderPlus size={14} />
                New Folder
              </button>
              {selectedFolder && (
                <button
                  onClick={onCreateNote}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '6px',
                    color: '#1d4ed8',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                  }}
                >
                  <Plus size={14} />
                  New Note in {selectedFolder.name}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: 'auto', 
        padding: '20px', 
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'relative'
        }}>
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
            }}
            title="Profile menu"
          >
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          >
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#1f2937'
            }}>
              {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentUser?.email}
            </div>
          </div>

          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              padding: '6px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#6b7280',
              transition: 'all 0.2s ease'
            }}
            title="Profile options"
          >
            <Settings size={16} />
          </button>

          {/* Profile Menu */}
          {showProfileMenu && (
            <div 
              ref={menuRef}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '0',
                right: '0',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                marginBottom: '8px',
                overflow: 'hidden'
              }}
            >
              <button
                onClick={() => {
                  // We'll pass this to parent component
                  setShowProfileMenu(false);
                  // For now, show a placeholder
                  window.showProfileModal = true;
                  window.dispatchEvent(new CustomEvent('showProfile'));
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <User size={14} />
                Edit Profile
              </button>
              
              <div style={{ height: '1px', background: '#f1f5f9', margin: '0 8px' }} />
              
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#ef4444',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
