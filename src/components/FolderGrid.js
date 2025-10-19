import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  MoreVertical, 
  Trash2, 
  Edit3,
  Calendar,
  FileText,
  Users
} from 'lucide-react';
import { ref, remove } from 'firebase/database';
import { database } from '../firebase';
import toast from 'react-hot-toast';

export default function FolderGrid({ 
  folders, 
  selectedFolder, 
  onSelectFolder, 
  onCreateFolder, 
  selectedGroup,
  notes = []
}) {
  const [showFolderMenu, setShowFolderMenu] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowFolderMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    setShowFolderMenu(null);
  };

  const getFolderNoteCount = (folderId) => {
    return notes.filter(note => note.folderId === folderId).length || 0;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (folders.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        background: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '12px',
        border: '2px dashed #d1d5db',
        margin: '20px 0'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Folder size={32} style={{ color: '#9ca3af' }} />
        </div>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#374151',
          marginBottom: '8px',
          margin: 0
        }}>
          No folders yet
        </h3>
        <p style={{ 
          color: '#6b7280', 
          fontSize: '14px',
          textAlign: 'center',
          marginBottom: '24px',
          maxWidth: '300px'
        }}>
          Create your first folder to organize your notes and start collaborating with your team.
        </p>
        <button
          onClick={onCreateFolder}
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
          <FolderPlus size={16} />
          Create First Folder
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
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
            Folders
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
          }}>
            {folders.length} folder{folders.length !== 1 ? 's' : ''} in {selectedGroup?.name}
          </p>
        </div>
        <button
          onClick={onCreateFolder}
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
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
          }}
        >
          <FolderPlus size={16} />
          New Folder
        </button>
      </div>

      {/* Folder Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {folders.map((folder) => {
          const noteCount = getFolderNoteCount(folder.id);
          const isSelected = selectedFolder?.id === folder.id;
          
          return (
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder)}
              style={{
                position: 'relative',
                padding: '20px',
                background: isSelected 
                  ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
                  : 'rgba(255, 255, 255, 0.8)',
                border: isSelected 
                  ? '2px solid #3b82f6' 
                  : '1px solid #e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: isSelected 
                  ? '0 8px 25px rgba(59, 130, 246, 0.15)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }
              }}
            >
              {/* Folder Icon and Menu */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: isSelected 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}>
                  <Folder size={24} color="white" />
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id);
                  }}
                  style={{
                    background: 'rgba(107, 114, 128, 0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    opacity: 0.7,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '1';
                    e.target.style.background = 'rgba(107, 114, 128, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '0.7';
                    e.target.style.background = 'rgba(107, 114, 128, 0.1)';
                  }}
                >
                  <MoreVertical size={16} />
                </button>

                {/* Folder Menu */}
                {showFolderMenu === folder.id && (
                  <div
                    ref={menuRef}
                    style={{
                      position: 'absolute',
                      top: '60px',
                      right: '20px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                      zIndex: 1000,
                      minWidth: '160px',
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement rename functionality
                        toast.info('Rename feature coming soon!');
                        setShowFolderMenu(null);
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
                      <Edit3 size={14} />
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder);
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
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Folder Name */}
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: isSelected ? '#1d4ed8' : '#1f2937',
                margin: 0,
                marginBottom: '8px',
                wordBreak: 'break-word'
              }}>
                {folder.name}
              </h3>

              {/* Folder Stats */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <FileText size={12} />
                  {noteCount} note{noteCount !== 1 ? 's' : ''}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <Calendar size={12} />
                  {formatDate(folder.createdAt)}
                </div>
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  height: '3px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: '0 0 12px 12px'
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
