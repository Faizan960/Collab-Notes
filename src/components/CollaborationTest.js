import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '../firebase';
import toast from 'react-hot-toast';

export default function CollaborationTest({ currentUser }) {
  const [testMessage, setTestMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Listen for test messages
    const messagesRef = ref(database, 'testMessages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data).map(([id, message]) => ({
          id,
          ...message
        }));
        setMessages(messagesList.sort((a, b) => b.timestamp - a.timestamp));
      }
      setIsListening(true);
    }, (error) => {
      console.error('Real-time listener error:', error);
      toast.error('Failed to connect to real-time database');
    });

    return () => unsubscribe();
  }, [currentUser]);

  const sendTestMessage = async () => {
    if (!testMessage.trim() || !currentUser) return;

    try {
      const messagesRef = ref(database, 'testMessages');
      const newMessageRef = push(messagesRef);
      
      await set(newMessageRef, {
        text: testMessage.trim(),
        author: currentUser.email,
        authorId: currentUser.uid,
        timestamp: Date.now()
      });

      setTestMessage('');
      toast.success('Test message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send test message');
    }
  };

  const clearMessages = async () => {
    try {
      const messagesRef = ref(database, 'testMessages');
      await set(messagesRef, null);
      toast.success('Messages cleared!');
    } catch (error) {
      console.error('Error clearing messages:', error);
      toast.error('Failed to clear messages');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h3>Real-Time Collaboration Test</h3>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        This test helps verify that real-time synchronization is working. 
        Open this page in multiple browser tabs or devices to test collaboration.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Type a test message..."
            className="input"
            onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
          />
          <button
            onClick={sendTestMessage}
            disabled={!testMessage.trim()}
            className="btn btn-primary"
          >
            Send
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={clearMessages}
            className="btn btn-secondary"
            style={{ fontSize: '12px' }}
          >
            Clear All
          </button>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '12px',
            color: isListening ? '#10b981' : '#ef4444'
          }}>
            <div 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isListening ? '#10b981' : '#ef4444'
              }}
            />
            {isListening ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '16px',
        backgroundColor: '#f9fafb',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#374151' }}>
          Messages ({messages.length})
        </h4>
        
        {messages.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>
            No messages yet. Send a test message!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px'
                }}
              >
                <div style={{ 
                  fontWeight: '500', 
                  color: message.authorId === currentUser?.uid ? '#3b82f6' : '#374151',
                  marginBottom: '4px'
                }}>
                  {message.author} {message.authorId === currentUser?.uid && '(You)'}
                </div>
                <div style={{ color: '#6b7280', marginBottom: '4px' }}>
                  {message.text}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
