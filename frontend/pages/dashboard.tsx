// pages/dashboard.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import ContentCard from '../components/content/ContentCard';
import ContentFilters from '../components/content/ContentFilters';
import { AuthManager } from '../lib/auth';
import { APIClient } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  role: string;
  neighborhood_id: string;
  preferences?: {
    neighborhoods: string[];
    content_types: Record<string, boolean>;
    newsletter_time: string;
    emergency_alerts: boolean;
  };
}

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood_id: string;
  ai_confidence: number;
  created_at: number;
  priority?: string;
  affects_user_neighborhoods?: boolean;
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [todayStats, setTodayStats] = useState({
    articlesRead: 0,
    newsletterStreak: 0,
    savedArticles: 0
  });

  const authManager = new AuthManager();
  const apiClient = new APIClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getToken();
      if (!token) {
        router.push('/login');
        return;
      }
      
      fetchUserData(token);
      fetchPersonalizedFeed(token);
      fetchUserStats(token);
    }
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      const userData = await apiClient.getUserProfile(token);
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      router.push('/login');
    }
  };

  const fetchPersonalizedFeed = async (token: string) => {
    try {
      const feedData = await apiClient.getPersonalizedFeed(token);
      setArticles(feedData);
    } catch (error) {
      console.error('Failed to fetch personalized feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (token: string) => {
    try {
      const stats = await apiClient.getUserStats(token);
      setTodayStats(stats);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const filteredArticles = articles.filter(article => {
    if (filter === 'all') return true;
    if (filter === 'priority') return article.priority === 'high';
    if (filter === 'neighborhood') return article.affects_user_neighborhoods;
    return article.category === filter;
  });

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your personalized news...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.email?.split('@')[0]}! 👋
                </h1>
                <p className="text-gray-600">
                  Your personalized news for {user?.neighborhood_id}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => router.push('/preferences')}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  ⚙️ Preferences
                </button>
                <button 
                  onClick={() => router.push('/newsletters')}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  📧 Newsletters
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Filter Controls */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">📍 Your News Feed</h2>
                <ContentFilters
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: 'All Updates', count: articles.length },
                    { value: 'priority', label: 'High Priority', count: articles.filter(a => a.priority === 'high').length },
                    { value: 'emergency', label: 'Emergency', count: articles.filter(a => a.category === 'emergency').length },
                    { value: 'transport', label: 'Transport', count: articles.filter(a => a.category === 'transport').length },
                    { value: 'local_gov', label: 'Local Gov', count: articles.filter(a => a.category === 'local_gov').length }
                  ]}
                />
              </div>

              {/* Articles List */}
              <div className="space-y-6">
                {filteredArticles.length > 0 ? (
                  filteredArticles.map(article => (
                    <ContentCard 
                      key={article.id} 
                      article={article}
                      showPersonalizedBadges={true}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-6xl mb-4">📰</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No articles in this category
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Try changing your filter or check back later for new content.
                    </p>
                    <button 
                      onClick={() => setFilter('all')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                      View All Articles
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* User Stats */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-semibold mb-4 flex items-center">
                  📊 Your Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Articles read today:</span>
                    <span className="font-semibold text-blue-600">{todayStats.articlesRead}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Newsletter streak:</span>
                    <span className="font-semibold text-green-600">{todayStats.newsletterStreak} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Saved articles:</span>
                    <span className="font-semibold text-purple-600">{todayStats.savedArticles}</span>
                  </div>
                </div>
              </div>

              {/* Newsletter Preview */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-semibold mb-4 flex items-center">
                  📧 Today's Newsletter
                </h3>
                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <p className="mb-2">
                    Your next personalized newsletter will be sent at{' '}
                    <span className="font-semibold">
                      {user?.preferences?.newsletter_time || '8:00 AM'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Based on your preferences for {user?.preferences?.neighborhoods?.join(', ') || user?.neighborhood_id}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-semibold mb-4">⚡ Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => router.push('/preferences')}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    ⚙️ Update Preferences
                  </button>
                  <button 
                    onClick={() => router.push('/newsletters')}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    📧 Newsletter Archive
                  </button>
                  <button 
                    onClick={() => router.push('/profile')}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    👤 Account Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm">
                    💾 Saved Articles
                  </button>
                </div>
              </div>

              {/* Neighborhood Info */}
              {user?.neighborhood_id && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="font-semibold mb-2 text-blue-900">
                    📍 Your Neighborhood
                  </h3>
                  <p className="text-sm text-blue-700 capitalize">
                    {user.neighborhood_id.replace('_', ' ')}
                  </p>
                  <button 
                    onClick={() => router.push(`/neighborhood/${user.neighborhood_id}`)}
                    className="mt-3 text-xs text-blue-600 hover:text-blue-800"
                  >
                    View neighborhood feed →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}