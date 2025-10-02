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
  const [selectedNote, setSelectedNote] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationSystem, setShowInvitationSystem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

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

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Show group participants above folders */}
        {selectedGroup && (
          <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
            <GroupMembers groupId={selectedGroup.id} currentUser={currentUser} />
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
        ) : (
          <div className="empty-state" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            flexDirection: 'column'
          }}>
            <FileText size={64} />
            <h2 style={{ marginBottom: '8px', color: '#374151' }}>No note selected</h2>
            <p style={{ marginBottom: '24px' }}>Select a note from the sidebar or create a new one</p>
            
            {selectedGroup && selectedFolder && (
              <button
                onClick={handleCreateNote}
                className="btn btn-primary"
                style={{ padding: '12px 24px' }}
              >
                <Plus size={16} />
                Create New Note
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
    </div>
  );
}
