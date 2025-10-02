import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Firebase configuration
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBnM6fQyo8uXzXAx1vHALBKILD74rbSCBE",
  authDomain: "collab-notes-4c839.firebaseapp.com",
  databaseURL: "https://collab-notes-4c839-default-rtdb.firebaseio.com",
  projectId: "collab-notes-4c839",
  storageBucket: "collab-notes-4c839.firebasestorage.app",
  messagingSenderId: "311171896691",
  appId: "1:311171896691:web:234ccadec43441808c6106"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firebase Realtime Database and get a reference to the service
export const database = getDatabase(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
