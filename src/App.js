import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Toaster } from 'react-hot-toast';

function AppContent() {
  const { currentUser } = useAuth();

  return (
    <>
      {currentUser ? <Dashboard /> : <Auth />}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
