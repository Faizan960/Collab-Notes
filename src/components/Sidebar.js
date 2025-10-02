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
  Move
} from 'lucide-react';
import { ref, onValue, update } from 'firebase/database';
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
    <div className="sidebar">
      <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
            CollabNotes
          </h2>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn btn-secondary"
              style={{ 
                padding: '8px', 
                position: 'relative',
                background: notifications.length > 0 ? '#fef3c7' : '#e5e7eb'
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
                  fontWeight: 'bold'
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
              color: '#6b7280'
            }} 
          />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input"
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <button
          onClick={onCreateGroup}
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '12px' }}
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
                {/* Only show delete button if current user is group creator/admin */}
                {currentUser && selectedGroup.role === 'admin' && (
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

        {selectedGroup && (
          <>
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
                  Folders
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedFolder && (
                    <span style={{ 
                      fontSize: '10px', 
                      color: '#3b82f6',
                      backgroundColor: '#dbeafe',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {selectedFolder.name}
                    </span>
                  )}
                  <button
                    onClick={onCreateFolder}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    <FolderPlus size={14} />
                  </button>
                </div>
              </div>
              
              {folders.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  No folders yet. Create one to organize your notes!
                </p>
              ) : (
                <div>
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className={`folder-item ${selectedFolder?.id === folder.id ? 'active' : ''}`}
                      style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }}
                      tabIndex={0}
                      onClick={() => onSelectFolder(folder)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelectFolder(folder); }}
                    >
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}
                      >
                        <Folder size={16} />
                        <span style={{ flex: 1 }}>{folder.name}</span>
                      </div>
                      <button
                        className="note-menu-btn"
                        onClick={e => { e.stopPropagation(); setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          opacity: 0.6,
                          transition: 'opacity 0.2s',
                          zIndex: 2
                        }}
                        tabIndex={0}
                        aria-label="Folder menu"
                        onMouseEnter={e => e.target.style.opacity = '1'}
                        onMouseLeave={e => e.target.style.opacity = '0.6'}
                      >
                        <MoreVertical size={14} />
                      </button>
                      
                      {showFolderMenu === folder.id && (
                        <div 
                          ref={menuRef}
                          className="note-menu"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: '0',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            minWidth: '120px'
                          }}
                        >
                          <button
                            className="menu-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(folder);
                              setShowFolderMenu(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
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
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedFolder && (
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
                    Notes
                  </h3>
                  <button
                    onClick={onCreateNote}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                
                {notes.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                    No notes yet. Create one to get started!
                  </p>
                ) : (
                  <div>
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                        style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }}
                        tabIndex={0}
                        onClick={() => onSelectNote(note)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelectNote(note); }}
                      >
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}
                        >
                          <File size={16} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: '500', 
                              fontSize: '14px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {note.title}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {note.content ? note.content.substring(0, 50) + '...' : 'Empty note'}
                            </div>
                          </div>
                        </div>
                        <button
                          className="note-menu-btn"
                          onClick={e => { e.stopPropagation(); setShowNoteMenu(showNoteMenu === note.id ? null : note.id); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            opacity: 0.6,
                            transition: 'opacity 0.2s',
                            zIndex: 2
                          }}
                          tabIndex={0}
                          aria-label="Note menu"
                          onMouseEnter={e => e.target.style.opacity = '1'}
                          onMouseLeave={e => e.target.style.opacity = '0.6'}
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {showNoteMenu === note.id && (
                          <div 
                            ref={menuRef}
                            className="note-menu"
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: '0',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              zIndex: 1000,
                              minWidth: '120px'
                            }}
                          >
                            <button
                              className="menu-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveNote(note);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
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
                              <Move size={14} />
                              Move to Folder
                            </button>
                            <button
                              className="menu-item"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await navigator.clipboard.writeText(note.content || '');
                                  toast.success('Note copied to clipboard!');
                                } catch (err) {
                                  console.error('Clipboard error', err);
                                  toast.error('Failed to copy note');
                                }
                                setShowNoteMenu(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                color: '#10b981',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#d1fae5'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              📋
                              Copy to Clipboard
                            </button>

                            <button
                              className="menu-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNote(note);
                                setShowNoteMenu(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
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
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ 
        marginTop: 'auto', 
        padding: '20px', 
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
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
          {currentUser?.email?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '500',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {currentUser?.email}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="btn btn-secondary"
          style={{ padding: '8px' }}
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Move Note Modal */}
      {showMoveModal && noteToMove && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Move Note</h3>
              <button onClick={() => setShowMoveModal(false)} className="close-btn">
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ marginBottom: '8px', color: '#374151', fontWeight: '500' }}>
                Move "<strong>{noteToMove.title}</strong>" to:
              </p>
              <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
                Select a folder to move this note to
              </p>
              
              {folders.length === 0 ? (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <Folder size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No other folders available</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleMoveNoteToFolder(folder.id)}
                      className="btn btn-secondary"
                      style={{
                        justifyContent: 'flex-start',
                        padding: '12px',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: folder.id === selectedFolder?.id ? '#dbeafe' : '#f3f4f6',
                        color: folder.id === selectedFolder?.id ? '#1d4ed8' : '#374151',
                        border: folder.id === selectedFolder?.id ? '2px solid #3b82f6' : '1px solid #e5e7eb'
                      }}
                      disabled={folder.id === selectedFolder?.id}
                    >
                      <Folder size={16} />
                      <span style={{ flex: 1 }}>{folder.name}</span>
                      {folder.id === selectedFolder?.id && (
                        <span style={{ 
                          fontSize: '12px', 
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Current
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowMoveModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
