import React, { useState } from 'react';
import { X, Users } from 'lucide-react';

export default function GroupModal({ onClose, onCreateGroup }) {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setLoading(true);
    try {
      await onCreateGroup(groupName.trim());
      setGroupName('');
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Create New Group</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="groupName">
              <Users size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Group Name
            </label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input"
              placeholder="Enter group name"
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
              disabled={loading || !groupName.trim()}
              className="btn btn-primary"
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
