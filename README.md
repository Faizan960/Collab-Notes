# CollabNotes - Real-Time Collaborative Note-Taking Platform

A modern web-based collaborative note-taking platform that allows multiple users to create, share, and organize notes in real-time using Firebase.

## Features

- 🔐 **User Authentication**: Secure signup and login using Firebase Authentication
- 👥 **Group Collaboration**: Create or join groups with shared workspaces
- ⚡ **Real-Time Sync**: Notes update in real-time for all group members
- 📁 **Folder Organization**: Organize notes into multiple folders within groups
- 🔒 **Role-Based Access**: Only group members can view or modify notes
- 🎨 **Modern UI**: Intuitive interface with sidebar navigation and activity indicators
- 🔍 **Search**: Search through notes within groups
- 💾 **Auto-Save**: Automatic saving with manual save option
- 👥 **Friend Invitations**: Invite friends to join your groups
- 📎 **File Attachments**: Add PDFs, images, and documents to notes
- 👤 **Group Members**: View and manage group members

## Technology Stack

- **Frontend**: React.js 18
- **Backend & Database**: Firebase Realtime Database
- **File Storage**: Firebase Storage
- **Authentication**: Firebase Authentication
- **UI Components**: Lucide React icons
- **Notifications**: React Hot Toast

## Setup Instructions

### 1. Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Firebase account

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password provider
4. Enable Realtime Database:
   - Go to Realtime Database
   - Create database in test mode
5. Enable Storage:
   - Go to Storage
   - Get started with default rules
6. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" and add a web app
   - Copy the Firebase configuration object

### 3. Project Setup

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Open `src/firebase.js`
   - Replace the placeholder configuration with your actual Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view it in the browser

## Usage

### Getting Started

1. **Sign Up**: Create a new account with your email and password
2. **Create a Group**: Click "New Group" to create your first collaborative workspace
3. **Organize with Folders**: Create folders within groups to organize your notes
4. **Start Taking Notes**: Create and edit notes that sync in real-time with other group members

### Features Overview

- **Groups**: Create or join groups for different projects or teams
- **Folders**: Organize notes within groups using folders
- **Real-Time Editing**: See changes from other users instantly
- **Search**: Find notes quickly using the search bar
- **Auto-Save**: Your work is automatically saved as you type
- **Offline Support**: Continue working offline and sync when reconnected
- **File Attachments**: Upload and share PDFs, images, and documents
- **Friend Invitations**: Invite friends to collaborate on your groups

## Database Structure

The Firebase Realtime Database follows this structure:

```
groups/
  {groupId}/
    name: "Group Name"
    createdBy: "userId"
    createdAt: timestamp
    members/
      {userId}/
        role: "admin" | "member"
        joinedAt: timestamp
    folders/
      {folderId}/
        name: "Folder Name"
        createdAt: timestamp
        createdBy: "userId"
        notes/
          {noteId}/
            title: "Note Title"
            content: "Note Content"
            createdAt: timestamp
            updatedAt: timestamp
            createdBy: "userId"
            lastEditedBy: "userId"

users/
  {userId}/
    groups/
      {groupId}/
        name: "Group Name"
        role: "admin" | "member"
        joinedAt: timestamp
```

## Security Rules

Make sure to set up proper Firebase Realtime Database rules for security:

```json
{
  "rules": {
    "groups": {
      "$groupId": {
        ".read": "data.child('members').hasChild(auth.uid)",
        ".write": "data.child('members').hasChild(auth.uid)"
      }
    },
    "users": {
      "$userId": {
        ".read": "auth.uid === $userId",
        ".write": "auth.uid === $userId"
      }
    }
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support or questions, please open an issue in the repository or contact the development team.
