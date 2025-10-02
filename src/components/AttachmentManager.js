import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ref as dbRef, push, set, remove } from 'firebase/database';
import { storage, database } from '../firebase';
import { 
  Paperclip, 
  File, 
  Image, 
  FileText, 
  Download, 
  Trash2, 
  Upload,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttachmentManager({ noteId, groupId, folderId, attachments = [], onAttachmentsChange, currentUser }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    console.log('Starting file upload process...', { 
      fileCount: files.length, 
      groupId, 
      folderId, 
      noteId 
    });

    setUploading(true);
    
    // Process files one by one to avoid overwhelming Firebase
    for (const file of Array.from(files)) {
      try {
        console.log('Processing file:', file.name, file.size, file.type);
        // Validate file type and size
        const maxSize = 5 * 1024 * 1024; // Reduced to 5MB for faster uploads
        if (file.size > maxSize) {
          toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
          continue;
        }

        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf',
          'text/plain', 'text/markdown'
        ];

        if (!allowedTypes.includes(file.type)) {
          toast.error(`File type ${file.type} is not supported.`);
          continue;
        }

        // Show upload progress
        toast.loading(`Uploading ${file.name}...`, { id: file.name });

        // Create unique filename to avoid conflicts
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const uniqueFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Upload file to Firebase Storage
        const storageRef = ref(storage, `groups/${groupId}/folders/${folderId}/notes/${noteId}/attachments/${uniqueFileName}`);
        console.log('Storage reference created:', storageRef.fullPath);
        
        // Upload with timeout
        const uploadPromise = uploadBytes(storageRef, file);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 30000) // 30 second timeout
        );
        
        console.log('Starting upload...');
        const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
        console.log('Upload completed, getting download URL...');
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('Download URL obtained:', downloadURL);

        // Save attachment metadata to database
        const attachmentRef = dbRef(database, `groups/${groupId}/folders/${folderId}/notes/${noteId}/attachments`);
        const newAttachmentRef = push(attachmentRef);
        
        const attachmentData = {
          id: newAttachmentRef.key,
          name: file.name,
          type: file.type,
          size: file.size,
          url: downloadURL,
          uploadedAt: Date.now(),
          uploadedBy: currentUser?.uid || 'unknown'
        };

        await set(newAttachmentRef, attachmentData);
        
        // Update local state immediately
        const newAttachments = [...attachments, attachmentData];
        onAttachmentsChange && onAttachmentsChange(newAttachments);
        
        toast.success(`Successfully uploaded ${file.name}`, { id: file.name });
        
      } catch (error) {
        console.error('Error uploading file:', error);
        const errorMessage = error.message.includes('timeout') 
          ? `Upload timeout for ${file.name}` 
          : `Failed to upload ${file.name}`;
        toast.error(errorMessage, { id: file.name });
      }
    }

    setUploading(false);
  };

  const handleFileDelete = async (attachmentId, fileName) => {
    try {
      // Delete from Storage
      const storageRef = ref(storage, `groups/${groupId}/folders/${folderId}/notes/${noteId}/attachments/${fileName}`);
      await deleteObject(storageRef);

      // Delete from Database
      const attachmentRef = dbRef(database, `groups/${groupId}/folders/${folderId}/notes/${noteId}/attachments/${attachmentId}`);
      await remove(attachmentRef);

      // Update local state
      const updatedAttachments = attachments.filter(att => att.id !== attachmentId);
      onAttachmentsChange && onAttachmentsChange(updatedAttachments);
      
      toast.success('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const handleDownload = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image size={16} />;
    if (type === 'application/pdf') return <FileText size={16} />;
    return <File size={16} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
          <Paperclip size={16} style={{ display: 'inline', marginRight: '8px' }} />
          Attachments ({attachments.length})
        </h4>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          <Upload size={14} />
          Add Files
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
        style={{ display: 'none' }}
        accept="image/*,application/pdf,.txt,.md,.doc,.docx"
      />

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: dragOver ? '#f0f9ff' : '#f9fafb',
          marginBottom: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div className="spinner" />
            <span>Uploading files...</span>
          </div>
        ) : (
          <div>
            <Upload size={32} style={{ color: '#6b7280', marginBottom: '8px' }} />
            <p style={{ color: '#6b7280', margin: 0 }}>
              Drag and drop files here or click to browse
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
              Supports images, PDFs, and text files (max 5MB each)
            </p>
          </div>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                gap: '12px'
              }}
            >
              <div style={{ color: '#6b7280' }}>
                {getFileIcon(attachment.type)}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: '500', 
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {attachment.name}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280'
                }}>
                  {formatFileSize(attachment.size)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleDownload(attachment.url, attachment.name)}
                  className="btn btn-secondary"
                  style={{ padding: '6px', fontSize: '12px' }}
                  title="Download"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => handleFileDelete(attachment.id, attachment.name)}
                  className="btn btn-danger"
                  style={{ padding: '6px', fontSize: '12px' }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
