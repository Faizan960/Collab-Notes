import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  type = 'danger' 
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: '#ef4444',
          iconBg: '#fef2f2',
          confirmBg: '#ef4444',
          confirmHover: '#dc2626'
        };
      case 'warning':
        return {
          iconColor: '#f59e0b',
          iconBg: '#fffbeb',
          confirmBg: '#f59e0b',
          confirmHover: '#d97706'
        };
      default:
        return {
          iconColor: '#3b82f6',
          iconBg: '#eff6ff',
          confirmBg: '#3b82f6',
          confirmHover: '#2563eb'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: styles.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} color={styles.iconColor} />
            </div>
            <h3 className="modal-title">{title}</h3>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div style={{ marginBottom: '24px', lineHeight: '1.6' }}>
          {message}
        </div>
        
        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="btn"
            style={{
              backgroundColor: styles.confirmBg,
              color: 'white'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = styles.confirmHover}
            onMouseLeave={(e) => e.target.style.backgroundColor = styles.confirmBg}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
