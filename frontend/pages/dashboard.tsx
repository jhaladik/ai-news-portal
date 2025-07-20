// pages/dashboard.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import ContentCard from '../components/content/ContentCard';
import ContentFilters from '../components/content/ContentFilters';
import { AuthManager } from '../lib/auth';
import apiClient from '../lib/api-client';
import { Content, UserProfile, UserEngagementStats, UserPreferences, UserStats, Activity, Neighborhood } from '../lib/types';

interface DashboardData {
  content: Content[];
  statistics: UserStats;
  recent_activity: Activity[];
  user_preferences: UserPreferences;
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserEngagementStats | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    neighborhood: 'all',
    limit: 20,
    offset: 0
  });

  const authManager = new AuthManager();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getCurrentToken();
      if (!token) {
        router.push('/login');
        return;
      }
      
      fetchInitialData();
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPersonalizedFeed();
    }
  }, [filters, user]);

  const fetchInitialData = async () => {
    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      setLoading(true);

      // Fetch user profile and dashboard data
      const [userProfileData, dashboardDataResponse] = await Promise.all([
        apiClient.getUserProfile(token),
        apiClient.getUserDashboard(token, { limit: filters.limit, offset: filters.offset })
      ]);

      setUser(userProfileData.profile);
      setUserStats(userProfileData.statistics);
      setDashboardData(dashboardDataResponse);

    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalizedFeed = async () => {
    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      setContentLoading(true);

      // Build filter parameters
      const params = {
        limit: filters.limit,
        offset: filters.offset,
        category: filters.category !== 'all' ? filters.category : undefined,
        neighborhood: filters.neighborhood !== 'all' ? filters.neighborhood : undefined
      };

      const feedData = await apiClient.getUserDashboard(token, params);
      setDashboardData(feedData);

    } catch (error) {
      console.error('Failed to fetch personalized feed:', error);
    } finally {
      setContentLoading(false);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const neighborhoods: Neighborhood[] = [
    { id: 'vinohrady', name: 'Vinohrady', slug: 'vinohrady', subscriber_count: 245, status: 'active', created_at: Date.now() },
    { id: 'karlin', name: 'Karlín', slug: 'karlin', subscriber_count: 189, status: 'active', created_at: Date.now() },
    { id: 'smichov', name: 'Smíchov', slug: 'smichov', subscriber_count: 156, status: 'active', created_at: Date.now() },
    { id: 'nove_mesto', name: 'Nové Město', slug: 'nove_mesto', subscriber_count: 312, status: 'active', created_at: Date.now() }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your personalized dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || !dashboardData) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Failed to load dashboard data</p>
            <button 
              onClick={fetchInitialData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.name || user.email.split('@')[0]}! 👋
            </h1>
            <p className="mt-2 text-gray-600">
              Your personalized Prague news dashboard for {user.neighborhood_name}
            </p>
          </div>

          {/* Quick Stats */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">Content Views</p>
                        <p className="text-2xl font-bold text-blue-600">{formatNumber(userStats.content_views || 0)}</p>
                    </div>
                    <div className="text-3xl">📖</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">Newsletters Clicked</p>
                        <p className="text-2xl font-bold text-green-600">{formatNumber(userStats.newsletters_clicked || 0)}</p>
                    </div>
                    <div className="text-3xl">📧</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">Open Rate</p>
                        <p className="text-2xl font-bold text-purple-600">{Math.round((userStats.open_rate || 0) * 100)}%</p>
                    </div>
                    <div className="text-3xl">📊</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">Click Rate</p>
                        <p className="text-2xl font-bold text-orange-600">{Math.round((userStats.click_rate || 0) * 100)}%</p>
                    </div>
                    <div className="text-3xl">⭐</div>
                    </div>
                </div>
                </div>
            )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Content Filters Sidebar */}
            <div className="lg:col-span-1">
              <ContentFilters
                filters={{
                  neighborhood: filters.neighborhood,
                  category: filters.category
                }}
                neighborhoods={neighborhoods}
                onFiltersChange={(newFilters) => handleFilterChange({
                  ...filters,
                  neighborhood: newFilters.neighborhood || 'all',
                  category: newFilters.category || 'all'
                })}
                showStatus={false}
                showAdvanced={true}
                variant="sidebar"
              />

              {/* Quick Actions */}
              <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    📝 Edit Profile
                  </button>
                  <button
                    onClick={() => router.push('/preferences')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    ⚙️ Preferences
                  </button>
                  <button
                    onClick={() => router.push('/newsletters')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    📧 Newsletter Archive
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              {dashboardData.recent_activity && dashboardData.recent_activity.length > 0 && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    {dashboardData.recent_activity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="text-sm">
                        <p className="text-gray-900">{activity.description}</p>
                        <p className="text-gray-500 text-xs">{formatTimeAgo(activity.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {/* Content Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Personalized News Feed
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={fetchPersonalizedFeed}
                    disabled={contentLoading}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {contentLoading ? '🔄' : '🔄'} Refresh
                  </button>
                  <select
                    value={filters.limit}
                    onChange={(e) => handleFilterChange({ ...filters, limit: parseInt(e.target.value), offset: 0 })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10 articles</option>
                    <option value={20}>20 articles</option>
                    <option value={50}>50 articles</option>
                  </select>
                </div>
              </div>

              {/* Content Loading */}
              {contentLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading personalized content...</p>
                </div>
              )}

              {/* Content Grid */}
              {!contentLoading && (
                <>
                  {dashboardData.content.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📰</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No content found
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Try adjusting your filters or check back later for new content.
                      </p>
                      <button
                        onClick={() => handleFilterChange({ ...filters, category: 'all', neighborhood: 'all' })}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {dashboardData.content.map((article) => (
                        <ContentCard
                        key={article.id}
                        content={article}
                        variant="default"
                        showActions={false}
                        className="hover:shadow-md transition-shadow"
                        />                     
                     ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {dashboardData.content.length >= filters.limit && (
                    <div className="mt-8 flex justify-center space-x-4">
                      <button
                        onClick={() => handleFilterChange({ 
                          ...filters, 
                          offset: Math.max(0, filters.offset - filters.limit) 
                        })}
                        disabled={filters.offset === 0}
                        className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-sm text-gray-600">
                        Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, filters.offset + dashboardData.content.length)}
                      </span>
                      <button
                        onClick={() => handleFilterChange({ 
                          ...filters, 
                          offset: filters.offset + filters.limit 
                        })}
                        disabled={dashboardData.content.length < filters.limit}
                        className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Favorite Categories */}
          {userStats && userStats.favorite_categories.length > 0 && (
            <div className="mt-12 bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Favorite Categories</h3>
              <div className="flex flex-wrap gap-2">
                {userStats.favorite_categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleFilterChange({ ...filters, category, offset: 0 })}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.category === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {category.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Newsletter Preferences */}
          {dashboardData.user_preferences && (
            <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Newsletter Preferences</h3>
                <button
                  onClick={() => router.push('/preferences')}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  Edit Preferences →
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Frequency:</span>
                  <span className="ml-2 capitalize">{dashboardData.user_preferences.notification_frequency}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className={`ml-2 ${dashboardData.user_preferences.email_enabled ? 'text-green-600' : 'text-red-600'}`}>
                    {dashboardData.user_preferences.email_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Categories:</span>
                  <span className="ml-2">{dashboardData.user_preferences.categories.length} selected</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}