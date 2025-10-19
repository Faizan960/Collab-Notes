import React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote, 
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image
} from 'lucide-react';

export default function FormattingToolbar({ onFormat, disabled = false }) {
  const formatText = (format, value = '') => {
    if (disabled) return;
    onFormat(format, value);
  };

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', format: 'bold', shortcut: 'Ctrl+B' },
    { icon: Italic, label: 'Italic', format: 'italic', shortcut: 'Ctrl+I' },
    { icon: Underline, label: 'Underline', format: 'underline', shortcut: 'Ctrl+U' },
    { type: 'separator' },
    { icon: Heading1, label: 'Heading 1', format: 'h1' },
    { icon: Heading2, label: 'Heading 2', format: 'h2' },
    { icon: Heading3, label: 'Heading 3', format: 'h3' },
    { type: 'separator' },
    { icon: List, label: 'Bullet List', format: 'ul' },
    { icon: ListOrdered, label: 'Numbered List', format: 'ol' },
    { icon: Quote, label: 'Quote', format: 'quote' },
    { icon: Code, label: 'Code Block', format: 'code' },
    { type: 'separator' },
    { icon: AlignLeft, label: 'Align Left', format: 'align-left' },
    { icon: AlignCenter, label: 'Align Center', format: 'align-center' },
    { icon: AlignRight, label: 'Align Right', format: 'align-right' },
    { type: 'separator' },
    { icon: Link, label: 'Insert Link', format: 'link' },
    { icon: Image, label: 'Insert Image', format: 'image' }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      padding: '0',
      background: 'transparent',
      borderRadius: '0',
      border: 'none',
      marginBottom: '0',
      flexWrap: 'wrap'
    }}>
      {toolbarButtons.map((button, index) => {
        if (button.type === 'separator') {
          return (
            <div
              key={index}
              style={{
                width: '1px',
                height: '20px',
                background: '#e2e8f0',
                margin: '0 6px'
              }}
            />
          );
        }

        const Icon = button.icon;
        return (
          <button
            key={button.format}
            onClick={() => formatText(button.format)}
            disabled={disabled}
            title={`${button.label}${button.shortcut ? ` (${button.shortcut})` : ''}`}
            style={{
              padding: '8px 10px',
              border: 'none',
              background: 'transparent',
              borderRadius: '6px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              opacity: disabled ? 0.4 : 0.7,
              color: '#4a5568',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.target.style.background = '#f7fafc';
                e.target.style.opacity = '1';
                e.target.style.color = '#2d3748';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.target.style.background = 'transparent';
                e.target.style.opacity = '0.7';
                e.target.style.color = '#4a5568';
              }
            }}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
