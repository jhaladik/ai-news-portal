// components/user/UserPreferences.tsx
// User preferences management for categories, neighborhoods, and notifications

import React, { useState, useEffect } from 'react';
import { UserPreferences, Neighborhood, UserPreferencesForm } from '../../lib/types';
import { CATEGORIES, NOTIFICATION_FREQUENCIES } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatCategory, capitalizeWords } from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface UserPreferencesProps {
  neighborhoods?: Neighborhood[];
  onSave?: (preferences: UserPreferences) => void;
  className?: string;
}

const UserPreferencesComponent: React.FC<UserPreferencesProps> = ({
  neighborhoods = [],
  onSave,
  className = ''
}) => {
  const { user, token } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferencesForm>({
    categories: [],
    neighborhoods: [],
    notification_frequency: 'daily',
    email_enabled: true
  });
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferencesForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { showSuccess, showError } = useToastActions();

  // Load current preferences
  const loadPreferences = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const userPrefs = await apiClient.getUserPreferences(token);
      const formPrefs: UserPreferencesForm = {
        categories: userPrefs.categories || [],
        neighborhoods: userPrefs.neighborhoods || [],
        notification_frequency: userPrefs.notification_frequency || 'daily',
        email_enabled: userPrefs.email_enabled ?? true
      };
      
      setPreferences(formPrefs);
      setOriginalPreferences(formPrefs);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading preferences:', error);
      showError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  // Save preferences
  const savePreferences = async () => {
    if (!token) return;

    setSaving(true);
    try {
      await apiClient.updateUserPreferences(token, preferences);
      setOriginalPreferences({ ...preferences });
      setHasChanges(false);
      showSuccess('Preferences updated successfully');
      
      if (onSave) {
        const fullPrefs: UserPreferences = {
          user_id: user?.id || '',
          ...preferences,
          updated_at: Math.floor(Date.now() / 1000)
        };
        onSave(fullPrefs);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Reset to original preferences
  const resetPreferences = () => {
    if (originalPreferences) {
      setPreferences({ ...originalPreferences });
      setHasChanges(false);
    }
  };

  // Handle category toggle
  const toggleCategory = (category: string) => {
    setPreferences(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      
      return { ...prev, categories: newCategories };
    });
  };

  // Handle neighborhood toggle
  const toggleNeighborhood = (neighborhoodSlug: string) => {
    setPreferences(prev => {
      const newNeighborhoods = prev.neighborhoods.includes(neighborhoodSlug)
        ? prev.neighborhoods.filter(n => n !== neighborhoodSlug)
        : [...prev.neighborhoods, neighborhoodSlug];
      
      return { ...prev, neighborhoods: newNeighborhoods };
    });
  };

  // Handle frequency change
  const handleFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly') => {
    setPreferences(prev => ({ ...prev, notification_frequency: frequency }));
  };

  // Handle email toggle
  const toggleEmail = () => {
    setPreferences(prev => ({ ...prev, email_enabled: !prev.email_enabled }));
  };

  // Check for changes
  useEffect(() => {
    if (!originalPreferences) return;
    
    const changed = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
    setHasChanges(changed);
  }, [preferences, originalPreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [token]);

  if (loading) {
    return (
      <div className={className}>
        <LoadingInline message="Loading your preferences..." />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Preferences</h2>
          <p className="text-gray-600 mt-1">
            Customize your news feed and notification settings
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={resetPreferences}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={savePreferences}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Content Categories */}
      <Card title="Content Categories" subtitle="Choose the types of content you want to see">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select the categories that interest you most. You can always update these later.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((category) => {
              const isSelected = preferences.categories.includes(category);
              
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{formatCategory(category)}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {getCategoryDescription(category)}
                      </div>
                    </div>
                    
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {preferences.categories.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Please select at least one category to receive personalized content.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Neighborhoods */}
      {neighborhoods.length > 0 && (
        <Card title="Neighborhoods" subtitle="Select neighborhoods you want to follow">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose specific Prague neighborhoods to get hyperlocal news and updates.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {neighborhoods.map((neighborhood) => {
                const isSelected = preferences.neighborhoods.includes(neighborhood.slug);
                
                return (
                  <button
                    key={neighborhood.id}
                    onClick={() => toggleNeighborhood(neighborhood.slug)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-green-500 bg-green-50 text-green-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{neighborhood.name}</div>
                        <div className="text-sm text-gray-500">
                          {neighborhood.subscriber_count} subscribers
                        </div>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {preferences.neighborhoods.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      No neighborhoods selected. You'll see content from all Prague neighborhoods.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Notification Settings */}
      <Card title="Email Notifications" subtitle="Control how often you receive newsletters">
        <div className="space-y-6">
          {/* Email Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-base font-medium text-gray-900">
                Email Notifications
              </label>
              <p className="text-sm text-gray-600">
                Receive newsletters and updates via email
              </p>
            </div>
            
            <button
              onClick={toggleEmail}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Frequency Selection */}
          {preferences.email_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notification Frequency
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {NOTIFICATION_FREQUENCIES.map((frequency) => {
                  const isSelected = preferences.notification_frequency === frequency;
                  
                  return (
                    <button
                      key={frequency}
                      onClick={() => handleFrequencyChange(frequency)}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium capitalize">{frequency}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {getFrequencyDescription(frequency)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!preferences.email_enabled && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <p className="text-sm text-gray-600">
                Email notifications are disabled. You can still access content through your dashboard.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Save Button (Bottom) */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              You have unsaved changes
            </div>
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={resetPreferences}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                onClick={savePreferences}
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

// Helper functions
const getCategoryDescription = (category: string): string => {
  const descriptions = {
    emergency: 'Critical alerts and safety information',
    local: 'General neighborhood news and updates',
    business: 'Local business news and economic updates',
    community: 'Community events and social activities',
    events: 'Concerts, festivals, and cultural events'
  };
  return descriptions[category as keyof typeof descriptions] || '';
};

const getFrequencyDescription = (frequency: string): string => {
  const descriptions = {
    daily: 'Get updates every day',
    weekly: 'Weekly digest on Sundays',
    monthly: 'Monthly summary report'
  };
  return descriptions[frequency as keyof typeof descriptions] || '';
};

export default UserPreferencesComponent;