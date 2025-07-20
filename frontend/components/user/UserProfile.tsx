// components/user/UserProfile.tsx
// User profile management with statistics and GDPR compliance

import React, { useState, useEffect } from 'react';
import { UserProfile, UserEngagementStats, Neighborhood, UserProfileForm } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, formatPercentage, formatNumber, isValidEmail } from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal, { ConfirmationModal } from '../ui/Modal';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface UserProfileProps {
  neighborhoods?: Neighborhood[];
  onProfileUpdate?: (profile: UserProfile) => void;
  onAccountDelete?: () => void;
  className?: string;
}

const UserProfileComponent: React.FC<UserProfileProps> = ({
  neighborhoods = [],
  onProfileUpdate,
  onAccountDelete,
  className = ''
}) => {
  const { user, token, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statistics, setStatistics] = useState<UserEngagementStats | null>(null);
  const [formData, setFormData] = useState<UserProfileForm>({
    name: '',
    neighborhood_id: ''
  });
  const [originalFormData, setOriginalFormData] = useState<UserProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const { showSuccess, showError } = useToastActions();

  // Load profile data
  const loadProfile = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await apiClient.getUserProfile(token);
      setProfile(data.profile);
      setStatistics(data.statistics);
      
      const formData: UserProfileForm = {
        name: data.profile.name || '',
        neighborhood_id: data.profile.neighborhood_id
      };
      
      setFormData(formData);
      setOriginalFormData(formData);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Save profile changes
  const saveProfile = async () => {
    if (!token) return;

    // Validate form
    if (formData.name && formData.name.trim().length < 2) {
      showError('Name must be at least 2 characters long');
      return;
    }

    setSaving(true);
    try {
        await apiClient.updateUserProfile(token, {
            name: formData.name?.trim() || undefined,
            neighborhood_id: formData.neighborhood_id
       });
      
      // Update local state
      if (profile) {
        const updatedProfile = {
            ...profile,
            name: formData.name?.trim() || undefined,
            neighborhood_id: formData.neighborhood_id,
            neighborhood_name: neighborhoods.find(n => n.id === formData.neighborhood_id)?.name || profile.neighborhood_name
          };
        setProfile(updatedProfile);
        setOriginalFormData({ ...formData });
        setHasChanges(false);
        
        if (onProfileUpdate) {
          onProfileUpdate(updatedProfile);
        }
      }
      
      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Reset form to original values
  const resetForm = () => {
    if (originalFormData) {
      setFormData({ ...originalFormData });
      setHasChanges(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof UserProfileForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Delete account
  const deleteAccount = async () => {
    if (!token || deleteConfirmation !== 'DELETE') return;

    setDeleting(true);
    try {
      await apiClient.deleteUserAccount(token);
      showSuccess('Account deleted successfully');
      
      if (onAccountDelete) {
        onAccountDelete();
      } else {
        logout();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      showError('Failed to delete account');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Check for changes
  useEffect(() => {
    if (!originalFormData) return;
    
    const changed = JSON.stringify(formData) !== JSON.stringify(originalFormData);
    setHasChanges(changed);
  }, [formData, originalFormData]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [token]);

  if (loading) {
    return (
      <div className={className}>
        <LoadingInline message="Loading your profile..." />
      </div>
    );
  }

  if (!profile || !statistics) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-600">Unable to load profile data.</p>
        <Button variant="primary" onClick={loadProfile} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const selectedNeighborhood = neighborhoods.find(n => n.id === formData.neighborhood_id);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          <p className="text-gray-600 mt-1">
            Manage your account information and view your engagement statistics
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={resetForm}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={saveProfile}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card title="Basic Information">
            <div className="space-y-6">
              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="flex items-center">
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed sm:text-sm"
                  />
                  <div className="ml-3 flex items-center">
                    {profile.verified ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your display name (optional)"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">
                  This name will be displayed in your profile and notifications.
                </p>
              </div>

              {/* Neighborhood */}
              <div>
                <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Neighborhood
                </label>
                <select
                  id="neighborhood"
                  value={formData.neighborhood_id}
                  onChange={(e) => handleInputChange('neighborhood_id', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {neighborhoods.map((neighborhood) => (
                    <option key={neighborhood.id} value={neighborhood.id}>
                      {neighborhood.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Your primary neighborhood for receiving local updates.
                </p>
              </div>

              {/* Account Information */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Account Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Account Type:</span>
                    <span className="ml-2 font-medium capitalize">{profile.role}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Member Since:</span>
                    <span className="ml-2 font-medium">{formatDate(profile.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Login:</span>
                    <span className="ml-2 font-medium">
                      {profile.last_login ? formatDate(profile.last_login, { relative: true }) : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Current Neighborhood:</span>
                    <span className="ml-2 font-medium">{profile.neighborhood_name}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card title="Danger Zone" className="border-red-200">
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Delete Account</h3>
                    <p className="mt-1 text-sm text-red-700">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                className="w-full sm:w-auto"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Account
              </Button>
            </div>
          </Card>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          {/* Engagement Statistics */}
          <Card title="Your Statistics">
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(statistics.newsletters_sent)}
                </div>
                <div className="text-sm text-gray-600">Newsletters Received</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatNumber(statistics.newsletters_opened)}
                  </div>
                  <div className="text-xs text-gray-600">Opened</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-600">
                    {formatNumber(statistics.newsletters_clicked)}
                  </div>
                  <div className="text-xs text-gray-600">Clicked</div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Open Rate:</span>
                    <span className="font-medium">{formatPercentage(statistics.open_rate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Click Rate:</span>
                    <span className="font-medium">{formatPercentage(statistics.click_rate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Content Views:</span>
                    <span className="font-medium">{formatNumber(statistics.content_views)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Favorite Categories */}
          {statistics.favorite_categories.length > 0 && (
            <Card title="Top Interests">
              <div className="space-y-2">
                {statistics.favorite_categories.map((category, index) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{category}</span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Links */}
          <Card title="Quick Links">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/preferences'}
                className="w-full justify-start"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Preferences
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/newsletter-archive'}
                className="w-full justify-start"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Newsletter Archive
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/dashboard'}
                className="w-full justify-start"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
                Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">This action is permanent</h3>
                <p className="mt-1 text-sm text-red-700">
                  Deleting your account will permanently remove all your data, including:
                </p>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  <li>Profile information and preferences</li>
                  <li>Newsletter subscription and archive</li>
                  <li>Reading history and statistics</li>
                  <li>All account data (GDPR compliant)</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <code className="bg-gray-100 px-1 rounded">DELETE</code> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
          </div>

          <div className="flex space-x-3 justify-end pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={deleteAccount}
              loading={deleting}
              disabled={deleteConfirmation !== 'DELETE'}
            >
              Delete Account Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save Changes Sticky Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600">
              You have unsaved changes to your profile
            </div>
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={resetForm}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                onClick={saveProfile}
                loading={saving}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileComponent;