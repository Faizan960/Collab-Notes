import React, { useState, useEffect, useRef } from 'react';
import { ref, update, onValue, remove } from 'firebase/database';
import { database } from '../firebase';
import { Save, Clock, FileText, Trash2, Move, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AttachmentManager from './AttachmentManager';
import ConfirmationDialog from './ConfirmationDialog';
import FormattingToolbar from './FormattingToolbar';

export default function NoteEditor({ note, groupId, folderId, currentUser, onDeleteNote, onMoveNote }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastEditedBy, setLastEditedBy] = useState(note?.lastEditedBy || '');
  const [isOnline, setIsOnline] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const saveTimeoutRef = useRef(null);
  const titleInputRef = useRef(null);
  const textareaRef = useRef(null);

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

  const handleFormat = (format, value = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let formattedText = '';

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText || 'italic text'}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText || 'underlined text'}</u>`;
        break;
      case 'h1':
        formattedText = `# ${selectedText || 'Heading 1'}`;
        break;
      case 'h2':
        formattedText = `## ${selectedText || 'Heading 2'}`;
        break;
      case 'h3':
        formattedText = `### ${selectedText || 'Heading 3'}`;
        break;
      case 'ul':
        formattedText = `- ${selectedText || 'List item'}`;
        break;
      case 'ol':
        formattedText = `1. ${selectedText || 'List item'}`;
        break;
      case 'quote':
        formattedText = `> ${selectedText || 'Quote text'}`;
        break;
      case 'code':
        formattedText = selectedText ? `\`\`\`\n${selectedText}\n\`\`\`` : '```\ncode here\n```';
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          formattedText = `[${selectedText || 'link text'}](${url})`;
        } else {
          return;
        }
        break;
      default:
        return;
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);

    // Set cursor position after formatting
    setTimeout(() => {
      const newCursorPos = start + formattedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
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
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      right: isFullscreen ? 0 : 'auto',
      bottom: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto',
      background: isFullscreen ? '#f8fafc' : 'transparent'
    }}>
      {/* Evernote-style Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0'
      }}>
        {/* Top toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="real-time-indicator" style={{ marginBottom: 0 }}>
              <div className={`dot ${isOnline ? '' : 'offline'}`} 
                   style={{ backgroundColor: isOnline ? '#10b981' : '#ef4444' }} />
              {isOnline ? 'Synced' : 'Offline'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6b7280' }}>
              <Clock size={12} />
              {formatLastSaved(lastSaved)}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isSaving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
                <div className="spinner" style={{ width: '12px', height: '12px' }} />
                <span>Saving...</span>
              </div>
            )}
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                padding: '6px 8px',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: '#6b7280',
                transition: 'all 0.2s ease'
              }}
              title={isFullscreen ? "Exit focus mode" : "Enter focus mode"}
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {isFullscreen ? 'Exit Focus' : 'Focus'}
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '6px 12px',
                background: isSaving ? '#f3f4f6' : '#10b981',
                color: isSaving ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              <Save size={12} />
              Save
            </button>
          </div>
        </div>

        {/* Title section */}
        <div style={{ padding: '20px 24px 16px' }}>
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="evernote-title"
            style={{
              fontSize: '28px',
              fontWeight: '600',
              border: 'none',
              outline: 'none',
              width: '100%',
              background: 'transparent',
              color: '#1f2937',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              lineHeight: '1.2',
              padding: '8px 0',
              transition: 'all 0.2s ease'
            }}
          />
          
          {/* Note metadata */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '8px',
            fontSize: '13px',
            color: '#6b7280'
          }}>
            <span>Created {new Date(note?.createdAt).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}</span>
            <span>•</span>
            <span>{content.length} characters</span>
            <span>•</span>
            <span>{content.split(/\s+/).filter(word => word.length > 0).length} words</span>
          </div>
        </div>
        
        {/* Formatting Toolbar */}
        <div className="evernote-toolbar">
          <FormattingToolbar 
            onFormat={handleFormat} 
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Evernote-style Editor */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        background: '#ffffff',
        position: 'relative'
      }}>
        {/* Main writing area */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          maxWidth: '900px',
          margin: '0 auto',
          width: '100%',
          padding: '32px 24px'
        }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing..."
            className="evernote-editor note-content"
            style={{ 
              flex: 1,
              minHeight: isFullscreen ? 'calc(100vh - 300px)' : '500px',
              resize: 'none',
              border: 'none',
              padding: '0',
              fontSize: '16px',
              lineHeight: '1.75',
              fontFamily: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
              outline: 'none',
              background: 'transparent',
              color: '#2d3748',
              letterSpacing: '0.01em'
            }}
          />
        </div>

        {/* Side panel for actions */}
        <div style={{
          position: 'absolute',
          right: '24px',
          top: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          opacity: 0.7,
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          <button
            onClick={() => {
              if (onMoveNote) {
                onMoveNote(note);
              }
            }}
            style={{
              padding: '8px',
              background: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              transition: 'all 0.2s ease'
            }}
            title="Move note to another folder"
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(107, 114, 128, 0.15)';
              e.target.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(107, 114, 128, 0.1)';
              e.target.style.color = '#6b7280';
            }}
          >
            <Move size={16} />
          </button>
          
          <button
            onClick={handleDeleteNote}
            style={{
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              transition: 'all 0.2s ease'
            }}
            title="Delete note"
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.15)';
              e.target.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.1)';
              e.target.style.color = '#ef4444';
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Attachments section */}
        <div style={{ 
          padding: '24px',
          borderTop: '1px solid #f1f5f9',
          background: '#fafbfc'
        }}>
          <AttachmentManager
            noteId={note.id}
            groupId={groupId}
            folderId={folderId}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            currentUser={currentUser}
          />
        </div>
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
