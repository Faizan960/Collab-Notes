import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Globe, 
  Phone,
  Save, 
  X, 
  Edit3,
  Camera,
  Check
} from 'lucide-react';
import { ref, update, get } from 'firebase/database';
import { database } from '../firebase';
import toast from 'react-hot-toast';

export default function ProfileModal({ isOpen, onClose, currentUser }) {
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    location: '',
    occupation: '',
    website: '',
    phone: '',
    joinedAt: null
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser || !isOpen) return;
      
      setLoading(true);
      try {
        const userRef = ref(database, `users/${currentUser.uid}/profile`);
        const snapshot = await get(userRef);
        const profileData = snapshot.val();
        
        if (profileData) {
          setProfile(profileData);
        } else {
          // Set default values if no profile exists
          setProfile({
            displayName: currentUser.email?.split('@')[0] || '',
            bio: '',
            location: '',
            occupation: '',
            website: '',
            phone: '',
            joinedAt: Date.now()
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile data');
      }
      setLoading(false);
    };

    loadProfile();
  }, [currentUser, isOpen]);

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      // Update profile in database
      const userProfileRef = ref(database, `users/${currentUser.uid}/profile`);
      const profileData = {
        ...profile,
        updatedAt: Date.now(),
        joinedAt: profile.joinedAt || Date.now()
      };
      
      await update(userProfileRef, profileData);
      
      // Also update the display name in the main user record
      const userRef = ref(database, `users/${currentUser.uid}`);
      await update(userRef, {
        displayName: profile.displayName,
        updatedAt: Date.now()
      });
      
      toast.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  const validateUrl = (url) => {
    if (!url) return true;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const isFormValid = () => {
    return profile.displayName.trim().length > 0 && 
           (profile.website === '' || validateUrl(profile.website));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} style={{ color: '#3b82f6' }} />
            <h2 className="modal-title">Edit Profile</h2>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '40px'
          }}>
            <div className="spinner" />
            <span style={{ marginLeft: '8px' }}>Loading profile...</span>
          </div>
        ) : (
          <>
            {/* Profile Picture Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
              padding: '20px 0'
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '36px',
                  fontWeight: '600',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                }}>
                  {profile.displayName?.charAt(0)?.toUpperCase() || currentUser.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <button
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '2px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  title="Change profile picture (coming soon)"
                  onClick={() => toast.info('Profile picture upload coming soon!')}
                >
                  <Camera size={14} style={{ color: '#6b7280' }} />
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Display Name */}
              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Edit3 size={16} />
                  Display Name *
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="input"
                  placeholder="Enter your display name"
                  required
                  style={{
                    fontSize: '16px',
                    padding: '12px 16px'
                  }}
                />
                <p style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  margin: '4px 0 0 0' 
                }}>
                  This name will be visible to other group members
                </p>
              </div>

              {/* Email (Read-only) */}
              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Mail size={16} />
                  Email Address
                </label>
                <input
                  type="email"
                  value={currentUser.email}
                  className="input"
                  disabled
                  style={{
                    fontSize: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
                <p style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  margin: '4px 0 0 0' 
                }}>
                  Email cannot be changed
                </p>
              </div>

              {/* Bio */}
              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <User size={16} />
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="input"
                  placeholder="Tell others about yourself..."
                  rows={3}
                  maxLength={500}
                  style={{
                    fontSize: '16px',
                    padding: '12px 16px',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                />
                <p style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  margin: '4px 0 0 0',
                  textAlign: 'right'
                }}>
                  {profile.bio.length}/500 characters
                </p>
              </div>

              {/* Location */}
              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <MapPin size={16} />
                  Location
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="input"
                  placeholder="City, Country"
                  style={{
                    fontSize: '16px',
                    padding: '12px 16px'
                  }}
                />
              </div>

              {/* Occupation */}
              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Briefcase size={16} />
                  Occupation
                </label>
                <input
                  type="text"
                  value={profile.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                  className="input"
                  placeholder="Your job title or profession"
                  style={{
                    fontSize: '16px',
                    padding: '12px 16px'
                  }}
                />
              </div>

              {/* Website */}
              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Globe size={16} />
                  Website
                </label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="input"
                  placeholder="https://yourwebsite.com"
                  style={{
                    fontSize: '16px',
                    padding: '12px 16px',
                    borderColor: profile.website && !validateUrl(profile.website) ? '#ef4444' : '#d1d5db'
                  }}
                />
                {profile.website && !validateUrl(profile.website) && (
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#ef4444', 
                    margin: '4px 0 0 0' 
                  }}>
                    Please enter a valid URL
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Phone size={16} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="input"
                  placeholder="+1 (555) 123-4567"
                  style={{
                    fontSize: '16px',
                    padding: '12px 16px'
                  }}
                />
              </div>

              {/* Member Since */}
              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Calendar size={16} />
                  Member Since
                </label>
                <input
                  type="text"
                  value={profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Today'}
                  className="input"
                  disabled
                  style={{
                    fontSize: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ marginTop: '32px' }}>
              <button
                onClick={onClose}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={saving || !isFormValid()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {saving ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
