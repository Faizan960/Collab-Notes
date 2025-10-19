import React, { useState } from 'react';
import { Keyboard, X, Zap } from 'lucide-react';

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { category: 'General', items: [
      { keys: 'Ctrl + S', description: 'Save note' },
      { keys: 'Ctrl + Delete', description: 'Delete note' },
      { keys: 'Ctrl + /', description: 'Toggle shortcuts panel' },
      { keys: 'F11', description: 'Toggle fullscreen mode' }
    ]},
    { category: 'Formatting', items: [
      { keys: 'Ctrl + B', description: 'Bold text' },
      { keys: 'Ctrl + I', description: 'Italic text' },
      { keys: 'Ctrl + U', description: 'Underline text' },
      { keys: 'Ctrl + K', description: 'Insert link' }
    ]},
    { category: 'Navigation', items: [
      { keys: 'Ctrl + N', description: 'New note' },
      { keys: 'Ctrl + F', description: 'Search notes' },
      { keys: 'Escape', description: 'Close modals' }
    ]}
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          zIndex: 1000
        }}
        title="Keyboard Shortcuts (Ctrl + /)"
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        }}
      >
        <Keyboard size={20} />
      </button>

      {isOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'slideIn 0.2s ease-out'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={24} style={{ color: '#667eea' }} />
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  margin: 0
                }}>
                  Keyboard Shortcuts
                </h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#6b7280'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '24px' }}>
              {shortcuts.map((category, index) => (
                <div key={index}>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '4px',
                      height: '16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '2px'
                    }} />
                    {category.category}
                  </h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {category.items.map((shortcut, itemIndex) => (
                      <div 
                        key={itemIndex}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <span style={{ 
                          fontSize: '14px', 
                          color: '#374151' 
                        }}>
                          {shortcut.description}
                        </span>
                        <kbd style={{
                          background: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: '#6b7280',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                        }}>
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '8px',
              border: '1px solid #bae6fd'
            }}>
              <p style={{ 
                fontSize: '14px', 
                color: '#0369a1',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Zap size={16} />
                <strong>Pro Tip:</strong> Press <kbd style={{
                  background: '#ffffff',
                  border: '1px solid #0369a1',
                  borderRadius: '3px',
                  padding: '1px 4px',
                  fontSize: '11px'
                }}>Ctrl + /</kbd> anytime to toggle this panel!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
