// pages/admin/index.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { AuthManager } from '../../lib/auth';
import { APIClient } from '../../lib/api-client';

interface PipelineStatus {
  collected: number;
  scored: number;
  generated: number;
  validated: number;
  published: number;
  failed: number;
  last_run: number;
  avg_processing_time: number;
  subscribers: number;
  newsletters_sent: number;
  avg_rating: number;
}

interface ContentItem {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood_id: string;
  ai_confidence: number;
  status: string;
  source: string;
  created_at: number;
  reason_flagged?: string;
}

interface RSSSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  last_fetched: number;
  fetch_count: number;
  error_count: number;
  items_collected_today: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ContentItem[]>([]);
  const [rssSourcesHealth, setRssSourcesHealth] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningPipeline, setRunningPipeline] = useState(false);

  const authManager = new AuthManager();
  const apiClient = new APIClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getToken();
      if (!token || !authManager.isAdmin()) {
        router.push('/login');
        return;
      }
      
      fetchDashboardData();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      const [status, queue, sources] = await Promise.all([
        apiClient.getPipelineStatus(token),
        apiClient.getReviewQueue(token),
        apiClient.getRSSSourcesHealth(token)
      ]);

      setPipelineStatus(status);
      setReviewQueue(queue);
      setRssSourcesHealth(sources);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runPipeline = async (mode: string = 'full') => {
    setRunningPipeline(true);
    try {
      const token = authManager.getToken();
      if (!token) return;

      await apiClient.runPipeline(token, mode);
      
      // Refresh status after a short delay
      setTimeout(() => {
        fetchDashboardData();
        setRunningPipeline(false);
      }, 2000);
    } catch (error) {
      console.error('Pipeline run failed:', error);
      setRunningPipeline(false);
    }
  };

  const approveContent = async (contentId: string) => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      await apiClient.approveContent(token, contentId);
      
      // Remove from queue
      setReviewQueue(prev => prev.filter(item => item.id !== contentId));
    } catch (error) {
      console.error('Content approval failed:', error);
    }
  };

  const rejectContent = async (contentId: string, reason: string) => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      await apiClient.rejectContent(token, contentId, reason);
      
      // Remove from queue
      setReviewQueue(prev => prev.filter(item => item.id !== contentId));
    } catch (error) {
      console.error('Content rejection failed:', error);
    }
  };

  const getSourceStatus = (source: RSSSource) => {
    const hoursAgo = (Date.now() - source.last_fetched) / (1000 * 60 * 60);
    const errorRate = source.error_count / Math.max(source.fetch_count, 1);
    
    if (!source.enabled) return { color: 'text-gray-500', status: 'Disabled', badge: '⚪' };
    if (hoursAgo > 24) return { color: 'text-red-500', status: 'Inactive', badge: '🔴' };
    if (errorRate > 0.1) return { color: 'text-yellow-500', status: 'Issues', badge: '🟡' };
    return { color: 'text-green-500', status: 'Healthy', badge: '🟢' };
  };

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">🎛️ Content Pipeline Dashboard</h1>
                <p className="text-gray-600">Monitor and manage your AI news pipeline</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => router.push('/admin/analytics')}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                >
                  📊 Analytics
                </button>
                <button 
                  onClick={() => router.push('/admin/settings')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Pipeline Status Overview */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">📊 Pipeline Status</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => runPipeline('collect')}
                      disabled={runningPipeline}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
                    >
                      🔄 Collect RSS
                    </button>
                    <button 
                      onClick={() => runPipeline('full')}
                      disabled={runningPipeline}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50"
                    >
                      {runningPipeline ? '⏳ Running...' : '⚡ Run Full Pipeline'}
                    </button>
                  </div>
                </div>

                {pipelineStatus && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {pipelineStatus.collected}
                        </div>
                        <div className="text-sm text-gray-600">RSS Collected</div>
                      </div>
                      
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {pipelineStatus.scored}
                        </div>
                        <div className="text-sm text-gray-600">AI Scored</div>
                      </div>
                      
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {pipelineStatus.generated}
                        </div>
                        <div className="text-sm text-gray-600">Generated</div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {pipelineStatus.validated}
                        </div>
                        <div className="text-sm text-gray-600">Validated</div>
                      </div>
                      
                      <div className="text-center p-4 bg-emerald-50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">
                          {pipelineStatus.published}
                        </div>
                        <div className="text-sm text-gray-600">Published</div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-3">📈 Key Metrics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Subscribers:</span>
                          <span className="font-semibold">{pipelineStatus.subscribers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Newsletters Sent Today:</span>
                          <span className="font-semibold">{pipelineStatus.newsletters_sent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Content Rating:</span>
                          <span className="font-semibold">{pipelineStatus.avg_rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                        Last pipeline run: {formatTimeAgo(pipelineStatus.last_run)} • 
                        Avg processing time: {pipelineStatus.avg_processing_time}s
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Content Review Queue */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">⚠️ Content Requiring Attention</h2>
                  <button 
                    onClick={() => router.push('/admin/content')}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    View All →
                  </button>
                </div>
                
                {reviewQueue.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-gray-600">No content pending review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewQueue.slice(0, 3).map(item => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Score: {item.ai_confidence?.toFixed(2)} • 
                              Source: {item.source} • 
                              Category: {item.category}
                            </p>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => approveContent(item.id)}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => rejectContent(item.id, 'Manual rejection')}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {item.content.substring(0, 200)}...
                        </p>
                        
                        {item.reason_flagged && (
                          <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                            Flagged: {item.reason_flagged}
                          </p>
                        )}
                      </div>
                    ))}
                    
                    {reviewQueue.length > 3 && (
                      <div className="text-center pt-4">
                        <button 
                          onClick={() => router.push('/admin/content')}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View {reviewQueue.length - 3} more items →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* RSS Sources Health */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">📡 RSS Sources</h2>
                  <button 
                    onClick={() => router.push('/admin/settings')}
                    className="text-blue-600 text-xs hover:text-blue-800"
                  >
                    Manage →
                  </button>
                </div>

                <div className="space-y-3">
                  {rssSourcesHealth.slice(0, 5).map(source => {
                    const status = getSourceStatus(source);
                    return (
                      <div key={source.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{status.badge}</span>
                          <span className="font-medium truncate">{source.name}</span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {source.items_collected_today} today
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {rssSourcesHealth.length > 5 && (
                  <div className="mt-3 pt-3 border-t text-center">
                    <button 
                      onClick={() => router.push('/admin/settings')}
                      className="text-blue-600 text-xs hover:text-blue-800"
                    >
                      View all {rssSourcesHealth.length} sources
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-lg font-bold mb-4">⚡ Quick Actions</h2>
                <div className="space-y-2">
                  <button 
                    onClick={() => router.push('/admin/content')}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    📝 Review Content Queue
                  </button>
                  <button 
                    onClick={() => router.push('/admin/analytics')}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    📊 View Analytics
                  </button>
                  <button 
                    onClick={() => router.push('/admin/settings')}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    📡 Manage RSS Sources
                  </button>
                  <button 
                    onClick={() => runPipeline('full')}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    ⚡ Run Full Pipeline
                  </button>
                  <button 
                    onClick={() => router.push('/admin/users')}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    👥 Manage Users
                  </button>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h2 className="text-lg font-bold text-green-900 mb-2">✅ System Status</h2>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Database: Connected</div>
                  <div>Workers: {rssSourcesHealth.filter(s => s.enabled).length} Active</div>
                  <div>AI Processing: Operational</div>
                  <div>Newsletter Delivery: Ready</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}