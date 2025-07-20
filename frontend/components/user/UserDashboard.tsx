// components/user/UserDashboard.tsx
// Personalized user dashboard with content feed and statistics

import React, { useState, useEffect } from 'react';
import { Content, UserStats, Activity, UserPreferences, Pagination } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, formatNumber, timeAgo } from '../../lib/utils';
import ContentList from '../content/ContentList';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface UserDashboardProps {
  className?: string;
}

interface DashboardData {
  content: Content[];
  statistics: UserStats;
  recent_activity: Activity[];
  user_preferences: UserPreferences;
  pagination: Pagination;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ className = '' }) => {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const { showError } = useToastActions();

  // Load dashboard data
  const loadDashboard = async (page: number = 1, category?: string, showLoader: boolean = true) => {
    if (!token) return;

    if (showLoader) setLoading(true);
    
    try {
      const data = await apiClient.getUserDashboard(token, {
        limit: 10,
        offset: (page - 1) * 10,
        category: category || undefined
      });
      
      setDashboardData(data);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Refresh dashboard
  const refreshDashboard = async () => {
    setRefreshing(true);
    await loadDashboard(currentPage, selectedCategory, false);
    setRefreshing(false);
  };

  // Handle category filter
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    loadDashboard(1, category);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    loadDashboard(page, selectedCategory);
  };

  // Load data on mount
  useEffect(() => {
    loadDashboard();
  }, [token]);

  if (loading && !dashboardData) {
    return (
      <div className={className}>
        <LoadingInline message="Loading your personalized dashboard..." />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-600">Unable to load dashboard data.</p>
        <Button variant="primary" onClick={() => loadDashboard()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const { content, statistics, recent_activity, user_preferences, pagination } = dashboardData;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.name || 'there'}! 👋
            </h1>
            <p className="text-blue-100 mt-2">
              Here's what's happening in your neighborhood
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={refreshDashboard}
            loading={refreshing}
            className="text-white border-white hover:bg-white hover:text-blue-600"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(statistics.total_content_read)}
            </div>
            <div className="text-sm text-gray-600">Articles Read</div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(statistics.newsletters_received)}
            </div>
            <div className="text-sm text-gray-600">Newsletters Received</div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(statistics.newsletters_opened)}
            </div>
            <div className="text-sm text-gray-600">Newsletters Opened</div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(statistics.engagement_score * 100)}%
            </div>
            <div className="text-sm text-gray-600">Engagement Score</div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/preferences'}
            className="flex items-center justify-center"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Preferences
          </Button>

          <Button
            variant="secondary"
            onClick={() => window.location.href = '/newsletter-archive'}
            className="flex items-center justify-center"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Newsletter Archive
          </Button>

          <Button
            variant="secondary"
            onClick={() => window.location.href = '/profile'}
            className="flex items-center justify-center"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Edit Profile
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Feed */}
        <div className="lg:col-span-3">
          <Card title="Your Personalized News Feed" padding="md">
            {/* Category Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange('')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === ''
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Categories
                </button>
                {user_preferences.categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Content List */}
            <ContentList
              content={content}
              loading={loading}
              pagination={pagination}
              variant="default"
              searchable={false}
              sortable={true}
              onPageChange={handlePageChange}
              emptyMessage="No content matches your preferences"
              emptyAction={{
                label: 'Update Preferences',
                onClick: () => window.location.href = '/preferences'
              }}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Your Preferences */}
          <Card title="Your Preferences" padding="sm">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Neighborhoods
                </label>
                <div className="flex flex-wrap gap-1">
                  {user_preferences.neighborhoods.map((neighborhood) => (
                    <span
                      key={neighborhood}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {neighborhood}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Categories
                </label>
                <div className="flex flex-wrap gap-1">
                  {user_preferences.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 capitalize"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                  {user_preferences.notification_frequency}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/preferences'}
                className="w-full mt-3"
              >
                Update Preferences
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card title="Recent Activity" padding="sm">
            <div className="space-y-3">
              {recent_activity.length > 0 ? (
                recent_activity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="text-sm">
                    <div className="text-gray-900">{activity.description}</div>
                    <div className="text-xs text-gray-500">{timeAgo(activity.timestamp)}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
              
              {recent_activity.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/activity'}
                  className="w-full mt-2"
                >
                  View All Activity
                </Button>
              )}
            </div>
          </Card>

          {/* Favorite Categories */}
          {statistics.favorite_categories.length > 0 && (
            <Card title="Your Top Interests" padding="sm">
              <div className="space-y-2">
                {statistics.favorite_categories.map((category, index) => (
                  <div key={category} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{category}</span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Newsletter Settings */}
          <Card title="Newsletter Settings" padding="sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Email Notifications</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  user_preferences.email_enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user_preferences.email_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Frequency</span>
                <span className="text-sm font-medium capitalize">
                  {user_preferences.notification_frequency}
                </span>
              </div>

              <div className="text-xs text-gray-500">
                Last activity: {formatDate(statistics.last_activity, { relative: true })}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/newsletter-archive'}
                className="w-full"
              >
                View Archive
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;