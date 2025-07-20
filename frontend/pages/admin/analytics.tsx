// pages/admin/analytics.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { AuthManager } from '../../lib/auth';
import { APIClient } from '../../lib/api-client';

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
  const [timeRange, setTimeRange] = useState('7d'); // 1d, 7d, 30d, 90d
  const [selectedMetric, setSelectedMetric] = useState('overview');

  const authManager = new AuthManager();
  const apiClient = new APIClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getToken();
      if (!token || !authManager.isAdmin()) {
        router.push('/login');
        return;
      }
      
      fetchAnalytics();
    }
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      setLoading(true);
      const data = await apiClient.getAnalytics(token, { timeRange });
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
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
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
                <p className="text-gray-600">Performance metrics and insights</p>
              </div>
              <div className="flex gap-3">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="1d">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
                <button 
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  ← Dashboard
                </button>
                <button 
                  onClick={fetchAnalytics}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="text-3xl mr-3">📰</div>
                <div>
                  <p className="text-sm text-gray-600">Total Content</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.overview.total_content)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="text-3xl mr-3">🚀</div>
                <div>
                  <p className="text-sm text-gray-600">Published Today</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.overview.published_today}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="text-3xl mr-3">👥</div>
                <div>
                  <p className="text-sm text-gray-600">Active Subscribers</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(analytics.overview.active_subscribers)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="text-3xl mr-3">📧</div>
                <div>
                  <p className="text-sm text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{formatPercentage(analytics.overview.newsletter_open_rate)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="text-3xl mr-3">🤖</div>
                <div>
                  <p className="text-sm text-gray-600">AI Confidence</p>
                  <p className="text-2xl font-bold text-orange-600">{formatPercentage(analytics.overview.avg_ai_confidence)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="text-3xl mr-3">⚡</div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatPercentage(analytics.overview.pipeline_success_rate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Tabs */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: 'content', label: '📊 Content Metrics' },
                  { key: 'engagement', label: '👥 User Engagement' },
                  { key: 'pipeline', label: '⚙️ Pipeline Performance' },
                  { key: 'sources', label: '📡 Source Analysis' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedMetric(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      selectedMetric === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Content Metrics */}
              {selectedMetric === 'content' && (
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">📁 Content by Category</h3>
                    <div className="space-y-3">
                      {analytics.content_metrics.by_category.map(item => (
                        <div key={item.category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium capitalize">{item.category.replace('_', ' ')}</span>
                            <div className="text-sm text-gray-600">
                              Avg confidence: {formatPercentage(item.avg_confidence)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{item.count}</div>
                            <div className="text-sm text-gray-600">articles</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">🏘️ Content by Neighborhood</h3>
                    <div className="space-y-3">
                      {analytics.content_metrics.by_neighborhood.map(item => (
                        <div key={item.neighborhood} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium capitalize">{item.neighborhood.replace('_', ' ')}</span>
                            <div className="text-sm text-gray-600">
                              {item.subscribers} subscribers
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{item.count}</div>
                            <div className="text-sm text-gray-600">articles</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* User Engagement */}
              {selectedMetric === 'engagement' && (
                <div className="space-y-8">
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">📧 Newsletter Performance</h3>
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {formatNumber(analytics.user_engagement.newsletter_stats.sent)}
                            </div>
                            <div className="text-sm text-gray-600">Sent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {formatNumber(analytics.user_engagement.newsletter_stats.opened)}
                            </div>
                            <div className="text-sm text-gray-600">Opened</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {formatNumber(analytics.user_engagement.newsletter_stats.clicked)}
                            </div>
                            <div className="text-sm text-gray-600">Clicked</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {formatNumber(analytics.user_engagement.newsletter_stats.unsubscribed)}
                            </div>
                            <div className="text-sm text-gray-600">Unsubscribed</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">🔥 Top Performing Content</h3>
                      <div className="space-y-3">
                        {analytics.user_engagement.top_content.map((item, index) => (
                          <div key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-500 mr-3">
                              #{index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium line-clamp-1">{item.title}</div>
                              <div className="text-sm text-gray-600">
                                {item.views} views • {formatPercentage(item.engagement)} engagement
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">📈 Subscriber Growth</h3>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="flex items-end space-x-2 h-32">
                        {analytics.user_engagement.subscriber_growth.map((item, index) => (
                          <div key={item.date} className="flex-1 flex flex-col items-center">
                            <div 
                              className="bg-blue-500 w-full rounded-t"
                              style={{ 
                                height: `${(item.count / Math.max(...analytics.user_engagement.subscriber_growth.map(s => s.count))) * 100}%`,
                                minHeight: '4px'
                              }}
                            />
                            <div className="text-xs text-gray-600 mt-2">{item.date}</div>
                            <div className="text-xs font-semibold">{item.count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pipeline Performance */}
              {selectedMetric === 'pipeline' && (
                <div className="space-y-8">
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">⏱️ Processing Times</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span>RSS Collection</span>
                          <span className="font-bold">{analytics.pipeline_performance.processing_times.avg_collection}s</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span>AI Scoring</span>
                          <span className="font-bold">{analytics.pipeline_performance.processing_times.avg_scoring}s</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span>Content Generation</span>
                          <span className="font-bold">{analytics.pipeline_performance.processing_times.avg_generation}s</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span>Validation</span>
                          <span className="font-bold">{analytics.pipeline_performance.processing_times.avg_validation}s</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">⚠️ Error Rates</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                          <span>Collection Errors</span>
                          <span className="font-bold text-red-600">{analytics.pipeline_performance.error_rates.collection_errors}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                          <span>AI Failures</span>
                          <span className="font-bold text-orange-600">{analytics.pipeline_performance.error_rates.ai_failures}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                          <span>Validation Failures</span>
                          <span className="font-bold text-yellow-600">{analytics.pipeline_performance.error_rates.validation_failures}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">📊 Daily Pipeline Stats</h3>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="flex items-end space-x-1 h-40">
                        {analytics.pipeline_performance.daily_stats.map((day, index) => (
                          <div key={day.date} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex flex-col items-center space-y-1">
                              <div 
                                className="bg-blue-400 w-full rounded-t"
                                style={{ height: `${(day.collected / 100) * 50}%`, minHeight: '2px' }}
                                title={`Collected: ${day.collected}`}
                              />
                              <div 
                                className="bg-purple-400 w-full"
                                style={{ height: `${(day.generated / 50) * 30}%`, minHeight: '2px' }}
                                title={`Generated: ${day.generated}`}
                              />
                              <div 
                                className="bg-green-400 w-full rounded-b"
                                style={{ height: `${(day.published / 20) * 20}%`, minHeight: '2px' }}
                                title={`Published: ${day.published}`}
                              />
                            </div>
                            <div className="text-xs text-gray-600 mt-2">{day.date}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center space-x-6 mt-4 text-sm">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
                          <span>Collected</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-400 rounded mr-2"></div>
                          <span>Generated</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
                          <span>Published</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Source Analysis */}
              {selectedMetric === 'sources' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">📡 RSS Source Performance</h3>
                  <div className="space-y-3">
                    {analytics.content_metrics.by_source.map(source => (
                      <div key={source.source} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{source.source}</div>
                          <div className="text-sm text-gray-600">
                            {source.count} articles collected
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${
                            source.success_rate > 0.8 ? 'text-green-600' :
                            source.success_rate > 0.6 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(source.success_rate)}
                          </div>
                          <div className="text-sm text-gray-600">success rate</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">📤 Export Analytics</h3>
                <p className="text-gray-600 text-sm">Download detailed reports for further analysis</p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                  📊 Export CSV
                </button>
                <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                  📄 Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}