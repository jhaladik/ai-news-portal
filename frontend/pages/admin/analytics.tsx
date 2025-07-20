// pages/admin/analytics.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { AuthManager } from '../../lib/auth';
import apiClient from '../../lib/api-client';
import { UserMetrics, ContentMetrics, NewsletterMetrics, NeighborhoodStats, DailyTrends } from '../../lib/types';

interface AnalyticsData {
  overview: {
    total_content: number;
    published_today: number;
    active_subscribers: number;
    newsletter_open_rate: number;
    avg_ai_confidence: number;
    pipeline_success_rate: number;
  };
  content_metrics: {
    by_category: Array<{ category: string; count: number; avg_confidence: number }>;
    by_neighborhood: Array<{ neighborhood: string; count: number; subscribers: number }>;
    by_source: Array<{ source: string; count: number; success_rate: number }>;
  };
  user_engagement: {
    newsletter_stats: {
      sent: number;
      opened: number;
      clicked: number;
      unsubscribed: number;
    };
    top_content: Array<{ id: string; title: string; views: number; engagement: number }>;
    subscriber_growth: Array<{ date: string; count: number }>;
  };
  pipeline_performance: {
    daily_stats: Array<{ date: string; collected: number; generated: number; published: number }>;
    processing_times: {
      avg_collection: number;
      avg_scoring: number;
      avg_generation: number;
      avg_validation: number;
    };
    error_rates: {
      collection_errors: number;
      ai_failures: number;
      validation_failures: number;
    };
  };
}

export default function AdminAnalytics() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');

  const authManager = new AuthManager();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getCurrentToken();
      if (!token || !authManager.isAdmin()) {
        router.push('/login');
        return;
      }
      
      fetchAnalytics();
    }
  }, [timeRange, selectedNeighborhood]);

  const fetchAnalytics = async () => {
    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      setLoading(true);
      
      // Get data from API
      const apiData = await apiClient.getAdminAnalytics(
        token, 
        timeRange, 
        selectedNeighborhood === 'all' ? undefined : selectedNeighborhood
      );

      // Transform API response to match our interface
      const transformedData: AnalyticsData = {
        overview: {
          total_content: apiData.content.published_content || 0,
          published_today: apiData.trends.length > 0 ? apiData.trends[apiData.trends.length - 1].content_published : 0,
          active_subscribers: apiData.users.active_users || 0,
          newsletter_open_rate: apiData.newsletters.avg_open_rate || 0,
          avg_ai_confidence: apiData.content.ai_confidence_avg || 0,
          pipeline_success_rate: 1 - (apiData.content.rejection_rate || 0)
        },
        content_metrics: {
          by_category: apiData.content.by_category?.map(cat => ({
            category: cat.category,
            count: cat.count,
            avg_confidence: cat.avg_confidence
          })) || [],
          by_neighborhood: apiData.neighborhoods?.map(neigh => ({
            neighborhood: neigh.neighborhood_name,
            count: neigh.content_published,
            subscribers: neigh.user_count
          })) || [],
          by_source: [] // This would need to come from RSS sources data
        },
        user_engagement: {
          newsletter_stats: {
            sent: apiData.newsletters.total_sent || 0,
            opened: Math.round((apiData.newsletters.total_sent || 0) * (apiData.newsletters.avg_open_rate || 0)),
            clicked: Math.round((apiData.newsletters.total_sent || 0) * (apiData.newsletters.avg_click_rate || 0)),
            unsubscribed: 0 // Would need to be added to API
          },
          top_content: [], // Would need to be added to API
          subscriber_growth: apiData.trends?.map(trend => ({
            date: trend.date,
            count: trend.users_active
          })) || []
        },
        pipeline_performance: {
          daily_stats: apiData.trends?.map(trend => ({
            date: trend.date,
            collected: trend.content_published, // Approximate
            generated: trend.content_published, // Approximate
            published: trend.content_published
          })) || [],
          processing_times: {
            avg_collection: 30, // Mock data - would need to be added to API
            avg_scoring: 15,
            avg_generation: 45,
            avg_validation: 20
          },
          error_rates: {
            collection_errors: 0, // Would need to be added to API
            ai_failures: 0,
            validation_failures: 0
          }
        }
      };

      setAnalytics(transformedData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return Math.round(num * 100) + '%';
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Failed to load analytics data</p>
            <button 
              onClick={fetchAnalytics}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
            <h1 className="text-3xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Comprehensive insights into your AI news platform performance
            </p>
          </div>

          {/* Controls */}
          <div className="mb-8 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '1d' | '7d' | '30d' | '90d')}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                <option value="all">All Neighborhoods</option>
                <option value="vinohrady">Vinohrady</option>
                <option value="karlin">Karlín</option>
                <option value="smichov">Smíchov</option>
                <option value="nove_mesto">Nové Město</option>
              </select>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Content</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.overview.total_content)}</p>
                </div>
                <div className="text-3xl">📰</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Published Today</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.overview.published_today}</p>
                </div>
                <div className="text-3xl">✅</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Subscribers</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(analytics.overview.active_subscribers)}</p>
                </div>
                <div className="text-3xl">👥</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Newsletter Open Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{formatPercentage(analytics.overview.newsletter_open_rate)}</p>
                </div>
                <div className="text-3xl">📧</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg AI Confidence</p>
                  <p className="text-2xl font-bold text-orange-600">{formatPercentage(analytics.overview.avg_ai_confidence)}</p>
                </div>
                <div className="text-3xl">🤖</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pipeline Success</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatPercentage(analytics.overview.pipeline_success_rate)}</p>
                </div>
                <div className="text-3xl">⚙️</div>
              </div>
            </div>
          </div>

          {/* Content Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* By Category */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Content by Category</h3>
              <div className="space-y-4">
                {analytics.content_metrics.by_category.map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{item.category.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600">Confidence: {formatPercentage(item.avg_confidence)}</p>
                    </div>
                    <div className="text-lg font-bold text-blue-600">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Neighborhood */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏘️ Content by Neighborhood</h3>
              <div className="space-y-4">
                {analytics.content_metrics.by_neighborhood.map((item) => (
                  <div key={item.neighborhood} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.neighborhood}</p>
                      <p className="text-sm text-gray-600">{item.subscribers} subscribers</p>
                    </div>
                    <div className="text-lg font-bold text-green-600">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Newsletter Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📧 Newsletter Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatNumber(analytics.user_engagement.newsletter_stats.sent)}</div>
                <div className="text-sm text-gray-600">Sent</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatNumber(analytics.user_engagement.newsletter_stats.opened)}</div>
                <div className="text-sm text-gray-600">Opened</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{formatNumber(analytics.user_engagement.newsletter_stats.clicked)}</div>
                <div className="text-sm text-gray-600">Clicked</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formatNumber(analytics.user_engagement.newsletter_stats.unsubscribed)}</div>
                <div className="text-sm text-gray-600">Unsubscribed</div>
              </div>
            </div>
          </div>

          {/* Pipeline Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Pipeline Performance</h3>
            
            {/* Processing Times */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Average Processing Times</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold">{analytics.pipeline_performance.processing_times.avg_collection}s</div>
                  <div className="text-sm text-gray-600">Collection</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold">{analytics.pipeline_performance.processing_times.avg_scoring}s</div>
                  <div className="text-sm text-gray-600">Scoring</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold">{analytics.pipeline_performance.processing_times.avg_generation}s</div>
                  <div className="text-sm text-gray-600">Generation</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold">{analytics.pipeline_performance.processing_times.avg_validation}s</div>
                  <div className="text-sm text-gray-600">Validation</div>
                </div>
              </div>
            </div>

            {/* Daily Stats Chart */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📈 Daily Pipeline Activity</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-end space-x-1 h-32">
                  {analytics.pipeline_performance.daily_stats.map((day) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center space-y-1">
                      <div 
                        className="bg-blue-400 w-full rounded-t"
                        style={{ 
                          height: `${Math.max((day.published / 10) * 100, 5)}%`,
                          minHeight: '4px'
                        }}
                        title={`${day.date}: ${day.published} published`}
                      />
                      <div className="text-xs text-gray-600 transform rotate-45 origin-bottom-left">
                        {day.date.split('-').slice(1).join('/')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}