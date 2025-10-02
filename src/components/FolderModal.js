import React, { useState } from 'react';
import { X, Folder } from 'lucide-react';

export default function FolderModal({ onClose, onCreateFolder }) {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setLoading(true);
    try {
      await onCreateFolder(folderName.trim());
      setFolderName('');
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Create New Folder</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="folderName">
              <Folder size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Folder Name
            </label>
            <input
              id="folderName"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="input"
              placeholder="Enter folder name"
              required
              autoFocus
            />
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
              disabled={loading || !folderName.trim()}
              className="btn btn-primary"
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                'Create Folder'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
