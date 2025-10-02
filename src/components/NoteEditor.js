import React, { useState, useEffect, useRef } from 'react';
import { ref, update, onValue, remove } from 'firebase/database';
import { database } from '../firebase';
import { Save, Clock, FileText, Trash2, Move } from 'lucide-react';
import toast from 'react-hot-toast';
import AttachmentManager from './AttachmentManager';
import ConfirmationDialog from './ConfirmationDialog';

export default function NoteEditor({ note, groupId, folderId, currentUser, onDeleteNote, onMoveNote }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastEditedBy, setLastEditedBy] = useState(note?.lastEditedBy || '');
  const [isOnline, setIsOnline] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const saveTimeoutRef = useRef(null);
  const titleInputRef = useRef(null);

  // Update local state when note prop changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setLastSaved(note.updatedAt);
      setLastEditedBy(note.lastEditedBy || '');
      
      // Auto-focus title input for new notes
      if (note.title === 'Untitled Note' && titleInputRef.current) {
        setTimeout(() => {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }, 100);
      }
    }
  }, [note]);

  // Auto-save functionality
  useEffect(() => {
    if (!note || !groupId || !folderId) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, note, groupId, folderId]);

  // Listen for real-time updates from other users
  useEffect(() => {
    if (!note || !groupId || !folderId || !currentUser) return;

    console.log('Setting up real-time listener for note:', note.id);
    const noteRef = ref(database, `groups/${groupId}/folders/${folderId}/notes/${note.id}`);
    
    const unsubscribe = onValue(noteRef, (snapshot) => {
      const updatedNote = snapshot.val();
      console.log('Real-time update received:', updatedNote);
      
      if (updatedNote) {
        // Check if this update is from another user
        if (updatedNote.lastEditedBy && updatedNote.lastEditedBy !== currentUser.uid) {
          console.log('Note updated by another user:', updatedNote.lastEditedBy);
          setTitle(updatedNote.title || '');
          setContent(updatedNote.content || '');
          setLastSaved(updatedNote.updatedAt);
          setLastEditedBy(updatedNote.lastEditedBy || '');
          toast.success('Note updated by another user');
        } else if (updatedNote.lastEditedBy === currentUser.uid) {
          // This is our own update, just update the timestamp
          setLastSaved(updatedNote.updatedAt);
        }
      }
    }, (error) => {
      console.error('Real-time listener error:', error);
      toast.error('Failed to sync with other users');
    });

    return () => {
      console.log('Cleaning up real-time listener');
      unsubscribe();
    };
  }, [note, groupId, folderId, currentUser]);

  // Load attachments
  useEffect(() => {
    if (!note || !groupId || !folderId) return;

    const attachmentsRef = ref(database, `groups/${groupId}/folders/${folderId}/notes/${note.id}/attachments`);
    const unsubscribe = onValue(attachmentsRef, (snapshot) => {
      const attachmentsData = snapshot.val();
      if (attachmentsData) {
        const attachmentsList = Object.entries(attachmentsData).map(([id, attachment]) => ({
          id,
          ...attachment
        }));
        setAttachments(attachmentsList);
      } else {
        setAttachments([]);
      }
    });

    return () => unsubscribe();
  }, [note, groupId, folderId]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + Delete to delete note
      if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
        e.preventDefault();
        handleDeleteNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [title, content, note, groupId, folderId, currentUser]);

  const handleSave = async () => {
    if (!note || !groupId || !folderId || !currentUser) return;

    console.log('Saving note:', { noteId: note.id, groupId, folderId, title, contentLength: content.length });
    setIsSaving(true);
    
    try {
      const noteRef = ref(database, `groups/${groupId}/folders/${folderId}/notes/${note.id}`);
      const updateData = {
        title: title.trim() || 'Untitled Note',
        content: content,
        updatedAt: Date.now(),
        lastEditedBy: currentUser.uid
      };
      
      console.log('Updating note with data:', updateData);
      await update(noteRef, updateData);
      
      setLastSaved(Date.now());
      toast.success('Note saved');
      console.log('Note saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(`Failed to save note: ${error.message}`);
    }
    setIsSaving(false);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleDeleteNote = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteNote = async () => {
    if (!note || !groupId || !folderId) return;

    try {
      const noteRef = ref(database, `groups/${groupId}/folders/${folderId}/notes/${note.id}`);
      await remove(noteRef);

      // Call the parent's delete handler to update the UI
      if (onDeleteNote) {
        onDeleteNote(note);
      }

      toast.success('Note deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete note');
      console.error(error);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const formatLastSaved = (timestamp) => {
    if (!timestamp) return 'Never saved';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!note) {
    return (
      <div className="empty-state" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%'
      }}>
        <div style={{ textAlign: 'center' }}>
          <FileText size={64} />
          <h2 style={{ marginBottom: '8px', color: '#374151' }}>No note selected</h2>
          <p>Select a note from the sidebar to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title..."
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              border: 'none',
              outline: 'none',
              width: '100%',
              background: 'transparent',
              color: '#1f2937'
            }}
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="real-time-indicator">
              <div className={`dot ${isOnline ? '' : 'offline'}`} 
                   style={{ backgroundColor: isOnline ? '#10b981' : '#ef4444' }} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={14} />
              {formatLastSaved(lastSaved)}
            </div>
            
            <div style={{ 
              fontSize: '12px', 
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>Ctrl+S to save</span>
              <span>•</span>
              <span>Ctrl+Del to delete</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isSaving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div className="spinner" />
                <span>Saving...</span>
              </div>
            )}
            
            <button
              onClick={() => {
                if (onMoveNote) {
                  onMoveNote(note);
                }
              }}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Move note to another folder"
            >
              <Move size={14} />
              Move
            </button>
            
            <button
              onClick={handleDeleteNote}
              className="btn btn-danger"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Delete note"
            >
              <Trash2 size={14} />
              Delete
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your note..."
          className="note-editor"
          style={{ 
            flex: 1,
            minHeight: '300px',
            resize: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            lineHeight: '1.6',
            fontFamily: 'inherit',
            marginBottom: '20px'
          }}
        />
        
        {/* Attachments */}
        <AttachmentManager
          noteId={note.id}
          groupId={groupId}
          folderId={folderId}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          currentUser={currentUser}
        />
      </div>

      {showDeleteDialog && (
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDeleteNote}
          title="Delete Note"
          message={`Are you sure you want to delete "${note?.title}"? This action cannot be undone and will remove the note for all group members.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </div>
  );
}
