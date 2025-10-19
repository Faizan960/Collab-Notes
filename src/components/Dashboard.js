import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../firebase';
import { ref, onValue, push, set, remove, update, get } from 'firebase/database';
import { 
  Users, 
  FolderPlus, 
  FileText, 
  Plus, 
  LogOut, 
  Settings,
  Search,
  MoreVertical,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import GroupMembers from './GroupMembers';
import NoteEditor from './NoteEditor';
import GroupModal from './GroupModal';
import FolderModal from './FolderModal';
import InviteFriendModal from './InviteFriendModal';
import InvitationSystem from './InvitationSystem';
import ConfirmationDialog from './ConfirmationDialog';
import KeyboardShortcuts from './KeyboardShortcuts';
import FolderGrid from './FolderGrid';
import ProfileModal from './ProfileModal';
import GroupSettings from './GroupSettings';

export default function Dashboard() {
  // Delete group logic
  const handleDeleteGroup = async (group) => {
    if (!group) return;
    try {
      // Remove group from global groups
      const groupRef = ref(database, `groups/${group.id}`);
      await remove(groupRef);
      // Remove group from all users' group lists
      // (Assume all members are in group.members)
      if (group.members) {
        await Promise.all(Object.keys(group.members).map(async (memberId) => {
          const userGroupRef = ref(database, `users/${memberId}/groups/${group.id}`);
          await remove(userGroupRef);
        }));
      }
      // Also remove from current user's group list if not in members (edge case)
      if (currentUser && (!group.members || !group.members[currentUser.uid])) {
        const userGroupRef = ref(database, `users/${currentUser.uid}/groups/${group.id}`);
        await remove(userGroupRef);
      }
      // If current selected group is deleted, clear selection
      if (selectedGroup?.id === group.id) {
        setSelectedGroup(null);
        setFolders([]);
        setSelectedFolder(null);
        setNotes([]);
        setAllNotes([]);
        setSelectedNote(null);
      }
      toast.success('Group deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete group');
      console.error(error);
    }
  };
  const { currentUser, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [notes, setNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationSystem, setShowInvitationSystem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  // Listen for profile modal events
  useEffect(() => {
    const handleShowProfile = () => {
      setShowProfileModal(true);
    };

    const handleShowGroupSettings = () => {
      setShowGroupSettings(true);
    };

    window.addEventListener('showProfile', handleShowProfile);
    window.addEventListener('showGroupSettings', handleShowGroupSettings);
    return () => {
      window.removeEventListener('showProfile', handleShowProfile);
      window.removeEventListener('showGroupSettings', handleShowGroupSettings);
    };
  }, []);

  // Load user's groups
  useEffect(() => {
    if (!currentUser) return;

    const groupsRef = ref(database, `users/${currentUser.uid}/groups`);
    const unsubscribe = onValue(groupsRef, (snapshot) => {
      const groupsData = snapshot.val();
      if (groupsData) {
        const groupsList = Object.entries(groupsData).map(([id, group]) => ({
          id,
          ...group
        }));
        setGroups(groupsList);
        
        // Select first group if none selected
        if (!selectedGroup && groupsList.length > 0) {
          setSelectedGroup(groupsList[0]);
        }
      } else {
        setGroups([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser, selectedGroup]);

  // Load folders for selected group
  useEffect(() => {
    if (!selectedGroup) {
      setFolders([]);
      return;
    }

    const foldersRef = ref(database, `groups/${selectedGroup.id}/folders`);
    const unsubscribe = onValue(
      foldersRef,
      (snapshot) => {
        const foldersData = snapshot.val();
        if (foldersData) {
          const foldersList = Object.entries(foldersData).map(([id, folder]) => ({
            id,
            ...folder
          }));
          setFolders(foldersList);
          // Do not auto-select a folder or note here
        } else {
          setFolders([]);
        }
      },
      (error) => {
        toast.error('Failed to load folders: ' + (error?.message || error));
      }
    );

    return () => unsubscribe();
  }, [selectedGroup]);

  // Load all notes for all folders in selected group
  useEffect(() => {
    if (!selectedGroup) {
      setAllNotes([]);
      return;
    }

    const groupRef = ref(database, `groups/${selectedGroup.id}/folders`);
    const unsubscribe = onValue(
      groupRef,
      (snapshot) => {
        const foldersData = snapshot.val();
        if (foldersData) {
          const allNotesArray = [];
          Object.entries(foldersData).forEach(([folderId, folderData]) => {
            if (folderData.notes) {
              Object.entries(folderData.notes).forEach(([noteId, noteData]) => {
                allNotesArray.push({
                  id: noteId,
                  folderId: folderId,
                  ...noteData
                });
              });
            }
          });
          setAllNotes(allNotesArray);
        } else {
          setAllNotes([]);
        }
      },
      (error) => {
        console.error('Failed to load all notes:', error);
      }
    );

    return () => unsubscribe();
  }, [selectedGroup]);

  // Load notes for selected folder
  useEffect(() => {
    if (!selectedGroup || !selectedFolder) {
      setNotes([]);
      setSelectedNote(null);
      return;
    }

    const notesRef = ref(database, `groups/${selectedGroup.id}/folders/${selectedFolder.id}/notes`);
    const unsubscribe = onValue(
      notesRef,
      (snapshot) => {
        const notesData = snapshot.val();
        if (notesData) {
          const notesList = Object.entries(notesData).map(([id, note]) => ({
            id,
            ...note
          }));
          setNotes(notesList);
          // Do not auto-select a note here
        } else {
          setNotes([]);
          setSelectedNote(null);
        }
      },
      (error) => {
        toast.error('Failed to load notes: ' + (error?.message || error));
      }
    );

    return () => unsubscribe();
  }, [selectedGroup, selectedFolder]);

  const handleCreateGroup = async (groupName) => {
    try {
      const groupRef = ref(database, 'groups');
      const newGroupRef = push(groupRef);
      const groupId = newGroupRef.key;

      // Create group
      await set(newGroupRef, {
        name: groupName,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        members: {
          [currentUser.uid]: {
            role: 'admin',
            joinedAt: Date.now()
          }
        }
      });

      // Add group to user's groups
      const userGroupRef = ref(database, `users/${currentUser.uid}/groups/${groupId}`);
      await set(userGroupRef, {
        name: groupName,
        role: 'admin',
        joinedAt: Date.now()
      });

      // Create default folder
      const defaultFolderRef = ref(database, `groups/${groupId}/folders`);
      const newDefaultFolderRef = push(defaultFolderRef);
      await set(newDefaultFolderRef, {
        name: 'General',
        createdAt: Date.now(),
        createdBy: currentUser.uid
      });

      toast.success('Group created successfully!');
      setShowGroupModal(false);
    } catch (error) {
      toast.error('Failed to create group');
      console.error(error);
    }
  };

  const handleCreateFolder = async (folderName) => {
    if (!selectedGroup) return;

    try {
      const folderRef = ref(database, `groups/${selectedGroup.id}/folders`);
      const newFolderRef = push(folderRef);
      const folderId = newFolderRef.key;

      await set(newFolderRef, {
        name: folderName,
        createdAt: Date.now(),
        createdBy: currentUser.uid
      });

      toast.success('Folder created successfully!');
      setShowFolderModal(false);
    } catch (error) {
      toast.error('Failed to create folder');
      console.error(error);
    }
  };

  const handleCreateNote = async () => {
    if (!selectedGroup || !selectedFolder) return;

    try {
      const noteRef = ref(database, `groups/${selectedGroup.id}/folders/${selectedFolder.id}/notes`);
      const newNoteRef = push(noteRef);
      const noteId = newNoteRef.key;

      await set(newNoteRef, {
        title: 'Untitled Note',
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: currentUser.uid,
        lastEditedBy: currentUser.uid
      });

      toast.success('Note created successfully!');
    } catch (error) {
      toast.error('Failed to create note');
      console.error(error);
    }
  };

  const handleDeleteNote = (note) => {
    setNoteToDelete(note);
    setShowDeleteDialog(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete || !selectedGroup || !selectedFolder) return;

    try {
      const noteRef = ref(database, `groups/${selectedGroup.id}/folders/${selectedFolder.id}/notes/${noteToDelete.id}`);
      await remove(noteRef);

      // Clear selected note if it was the one being deleted
      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null);
      }

      toast.success('Note deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete note');
      console.error(error);
    } finally {
      setShowDeleteDialog(false);
      setNoteToDelete(null);
    }
  };

  const handleMoveNote = async (note, targetFolderId) => {
    if (!selectedGroup || !selectedFolder || !note || !targetFolderId) return;

    if (targetFolderId === selectedFolder.id) {
      toast.error('Cannot move note to the same folder.');
      return;
    }

    try {
      // Get the note data from source
      const sourceNoteRef = ref(database, `groups/${selectedGroup.id}/folders/${selectedFolder.id}/notes/${note.id}`);
      const noteSnapshot = await get(sourceNoteRef);
      const noteData = noteSnapshot.val();

      if (!noteData) {
        throw new Error('Note not found');
      }

      // Write note to target folder using same id
      const targetNoteRef = ref(database, `groups/${selectedGroup.id}/folders/${targetFolderId}/notes/${note.id}`);
      await set(targetNoteRef, {
        ...noteData,
        movedAt: Date.now(),
        movedFrom: selectedFolder.id
      });

      // Remove from source
      await remove(sourceNoteRef);

      // If user is viewing the moved note, update selection
      if (selectedNote?.id === note.id) {
        const newFolder = folders.find(f => f.id === targetFolderId) || null;
        setSelectedFolder(newFolder);
        setSelectedNote({ ...noteData, id: note.id });
      }

      toast.success('Note moved successfully!');
    } catch (error) {
      console.error('Error moving note:', error);
      toast.error('Failed to move note');
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully!');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const filteredNotes = notes.filter(note =>
    (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleGroupUpdate = (updatedGroup) => {
    // Update the selected group with new data
    setSelectedGroup(updatedGroup);
    
    // Update the groups list
    setGroups(prev => prev.map(group => 
      group.id === updatedGroup.id ? { ...group, ...updatedGroup } : group
    ));
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        groups={groups}
        selectedGroup={selectedGroup}
        onSelectGroup={setSelectedGroup}
        folders={folders}
        selectedFolder={selectedFolder}
        onSelectFolder={setSelectedFolder}
        notes={filteredNotes}
        selectedNote={selectedNote}
        onSelectNote={setSelectedNote}
        onCreateGroup={() => setShowGroupModal(true)}
        onCreateFolder={() => setShowFolderModal(true)}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onMoveNote={handleMoveNote}
        onInviteFriend={() => setShowInvitationSystem(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
        currentUser={currentUser}
        onDeleteGroup={handleDeleteGroup}
      />

      <div className="main-content" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh'
      }}>
        {/* Enhanced header with group info */}
        {selectedGroup && (
          <div style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            marginBottom: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.8)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Users size={20} />
                {selectedGroup.name}
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {selectedFolder && (
                  <>
                    <span style={{ 
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: '500'
                    }}>
                      📁 {selectedFolder.name}
                    </span>
                    <span>•</span>
                  </>
                )}
                <span>Role: {selectedGroup.role}</span>
              </div>
            </div>
            <GroupMembers groupId={selectedGroup.id} currentUser={currentUser} />
          </div>
        )}

        {/* Breadcrumb Navigation */}
        {selectedGroup && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 20px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            <span 
              onClick={() => {
                setSelectedFolder(null);
                setSelectedNote(null);
              }}
              style={{ 
                cursor: 'pointer',
                color: !selectedFolder ? '#3b82f6' : '#6b7280',
                fontWeight: !selectedFolder ? '500' : '400',
                textDecoration: 'none'
              }}
            >
              {selectedGroup.name}
            </span>
            {selectedFolder && (
              <>
                <span>/</span>
                <span 
                  onClick={() => setSelectedNote(null)}
                  style={{ 
                    cursor: 'pointer',
                    color: !selectedNote ? '#3b82f6' : '#6b7280',
                    fontWeight: !selectedNote ? '500' : '400'
                  }}
                >
                  {selectedFolder.name}
                </span>
              </>
            )}
            {selectedNote && (
              <>
                <span>/</span>
                <span style={{ color: '#3b82f6', fontWeight: '500' }}>
                  {selectedNote.title}
                </span>
              </>
            )}
          </div>
        )}

        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            groupId={selectedGroup?.id}
            folderId={selectedFolder?.id}
            currentUser={currentUser}
            onDeleteNote={handleDeleteNote}
            onMoveNote={handleMoveNote}
          />
        ) : selectedFolder ? (
          <div style={{ padding: '0 20px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '12px',
              padding: '20px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    📁 {selectedFolder.name}
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''} in this folder
                  </p>
                </div>
                <button
                  onClick={handleCreateNote}
                  style={{
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Plus size={16} />
                  New Note
                </button>
              </div>

              {/* Notes Grid */}
              {filteredNotes.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 20px',
                  background: 'rgba(248, 250, 252, 0.5)',
                  borderRadius: '12px',
                  border: '2px dashed #d1d5db'
                }}>
                  <FileText size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '8px',
                    margin: 0
                  }}>
                    No notes yet
                  </h3>
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '14px',
                    textAlign: 'center',
                    marginBottom: '24px'
                  }}>
                    Create your first note to start collaborating
                  </p>
                  <button
                    onClick={handleCreateNote}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Plus size={16} />
                    Create First Note
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px'
                }}>
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      style={{
                        padding: '16px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: 0,
                        marginBottom: '8px'
                      }}>
                        {note.title}
                      </h4>
                      <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: 0,
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {note.content || 'Empty note'}
                      </p>
                      <div style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        color: '#9ca3af'
                      }}>
                        Updated {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : selectedGroup ? (
          <div style={{ padding: '0 20px' }}>
            <FolderGrid
              folders={folders}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onCreateFolder={() => setShowFolderModal(true)}
              selectedGroup={selectedGroup}
              notes={allNotes}
            />
          </div>
        ) : (
          <div className="empty-state" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            flexDirection: 'column',
            background: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '12px',
            margin: '20px',
            padding: '40px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
            }}>
              <FileText size={48} color="white" />
            </div>
            <h2 style={{ 
              marginBottom: '8px', 
              color: '#1f2937',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              No note selected
            </h2>
            <p style={{ 
              marginBottom: '32px', 
              color: '#6b7280',
              fontSize: '16px',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              {selectedGroup && selectedFolder 
                ? 'Select a note from the sidebar or create a new one to start collaborating'
                : 'Select a group and folder to begin taking notes'
              }
            </p>
            
            {selectedGroup && selectedFolder && (
              <button
                onClick={handleCreateNote}
                className="btn btn-primary"
                style={{ 
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={18} />
                Create Your First Note
              </button>
            )}
          </div>
        )}
      </div>

      {showGroupModal && (
        <GroupModal
          onClose={() => setShowGroupModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {showFolderModal && (
        <FolderModal
          onClose={() => setShowFolderModal(false)}
          onCreateFolder={handleCreateFolder}
        />
      )}

      {showInvitationSystem && selectedGroup && (
        <div className="modal-overlay" onClick={() => setShowInvitationSystem(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Invite Friends</h3>
              <button onClick={() => setShowInvitationSystem(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <InvitationSystem 
              groupId={selectedGroup.id} 
              currentUser={currentUser} 
            />
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setNoteToDelete(null);
          }}
          onConfirm={confirmDeleteNote}
          title="Delete Note"
          message={`Are you sure you want to delete "${noteToDelete?.title}"? This action cannot be undone and will remove the note for all group members.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
      />

      {/* Group Settings Modal */}
      <GroupSettings
        isOpen={showGroupSettings}
        onClose={() => setShowGroupSettings(false)}
        group={selectedGroup}
        currentUser={currentUser}
        onGroupUpdate={handleGroupUpdate}
      />

      {/* Keyboard Shortcuts Helper */}
      <KeyboardShortcuts />
    </div>
  );
}
