import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import toast from 'react-hot-toast';

export default function StorageTest() {
  const [testing, setTesting] = useState(false);

  const testStorage = async () => {
    setTesting(true);
    try {
      // Create a simple test file
      const testContent = 'This is a test file for Firebase Storage';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      const testFileName = `test_${Date.now()}.txt`;

      // Try to upload to a test location
      const testRef = ref(storage, `test/${testFileName}`);
      
      toast.loading('Testing Firebase Storage connection...', { id: 'storage-test' });
      
      const snapshot = await uploadBytes(testRef, testFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      toast.success('Firebase Storage is working!', { id: 'storage-test' });
      console.log('Test file uploaded successfully:', downloadURL);
      
    } catch (error) {
      console.error('Storage test failed:', error);
      toast.error(`Storage test failed: ${error.message}`, { id: 'storage-test' });
    }
    setTesting(false);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h3>Firebase Storage Test</h3>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        Click the button below to test if Firebase Storage is working properly.
      </p>
      <button
        onClick={testStorage}
        disabled={testing}
        className="btn btn-primary"
      >
        {testing ? 'Testing...' : 'Test Storage Connection'}
      </button>
    </div>
  );
}
