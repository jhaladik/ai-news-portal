// pages/admin/settings.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { AuthManager } from '../../lib/auth';
import { APIClient } from '../../lib/api-client';

interface RSSSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  categories: string[];
  neighborhoods: string[];
  last_fetched: number;
  fetch_count: number;
  error_count: number;
  items_collected_today: number;
  fetch_interval: number; // hours
  quality_threshold: number;
}

interface SystemSettings {
  ai: {
    openai_model: string;
    confidence_threshold: number;
    max_content_length: number;
    generation_temperature: number;
  };
  newsletter: {
    default_send_time: string;
    batch_size: number;
    sender_email: string;
    reply_to_email: string;
    enabled: boolean;
  };
  pipeline: {
    auto_approve_threshold: number;
    max_daily_content: number;
    retry_attempts: number;
    parallel_processing: boolean;
  };
  notifications: {
    admin_email: string;
    error_notifications: boolean;
    daily_reports: boolean;
    threshold_alerts: boolean;
  };
}

export default function AdminSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('rss'); // rss, newsletter, ai, system
  const [rssSources, setRssSources] = useState<RSSSource[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    categories: [] as string[],
    neighborhoods: [] as string[],
    fetch_interval: 6,
    quality_threshold: 0.6
  });

  const authManager = new AuthManager();
  const apiClient = new APIClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getToken();
      if (!token || !authManager.isAdmin()) {
        router.push('/login');
        return;
      }
      
      fetchSettingsData();
    }
  }, []);

  const fetchSettingsData = async () => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      setLoading(true);
      const [sources, systemSettings] = await Promise.all([
        apiClient.getRSSSources(token),
        apiClient.getSystemSettings(token)
      ]);

      setRssSources(sources);
      setSettings(systemSettings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = async (sourceId: string, enabled: boolean) => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      await apiClient.updateRSSSource(token, sourceId, { enabled });
      
      setRssSources(prev => prev.map(source => 
        source.id === sourceId ? { ...source, enabled } : source
      ));
    } catch (error) {
      console.error('Failed to toggle source:', error);
    }
  };

  const addRSSSource = async () => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      const source = await apiClient.createRSSSource(token, newSource);
      setRssSources(prev => [...prev, source]);
      setNewSource({
        name: '',
        url: '',
        categories: [],
        neighborhoods: [],
        fetch_interval: 6,
        quality_threshold: 0.6
      });
      setIsAddingSource(false);
    } catch (error) {
      console.error('Failed to add RSS source:', error);
    }
  };

  const deleteRSSSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this RSS source?')) return;

    try {
      const token = authManager.getToken();
      if (!token) return;

      await apiClient.deleteRSSSource(token, sourceId);
      setRssSources(prev => prev.filter(source => source.id !== sourceId));
    } catch (error) {
      console.error('Failed to delete RSS source:', error);
    }
  };

  const testRSSSource = async (sourceId: string) => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      const result = await apiClient.testRSSSource(token, sourceId);
      alert(`Test result: ${result.success ? 'Success' : 'Failed'}\n${result.message}`);
    } catch (error) {
      console.error('RSS source test failed:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const token = authManager.getToken();
      if (!token) return;

      await apiClient.updateSystemSettings(token, settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
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
            <p className="mt-4 text-gray-600">Loading settings...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">⚙️ System Settings</h1>
                <p className="text-gray-600">Configure RSS sources, AI settings, and newsletter delivery</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  ← Dashboard
                </button>
                <button 
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '💾 Saving...' : '💾 Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Settings Tabs */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: 'rss', label: '📡 RSS Sources', count: rssSources.length },
                  { key: 'newsletter', label: '📧 Newsletter Settings' },
                  { key: 'ai', label: '🤖 AI Configuration' },
                  { key: 'system', label: '⚙️ System Settings' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label} {tab.count && `(${tab.count})`}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* RSS Sources Tab */}
              {activeTab === 'rss' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">📡 RSS Source Management</h3>
                    <button 
                      onClick={() => setIsAddingSource(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      ➕ Add RSS Source
                    </button>
                  </div>

                  <div className="space-y-4">
                    {rssSources.map(source => {
                      const status = getSourceStatus(source);
                      return (
                        <div key={source.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-xl">{status.badge}</span>
                                <h4 className="font-semibold">{source.name}</h4>
                                <span className={`text-sm ${status.color}`}>{status.status}</span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{source.url}</p>
                              <div className="flex gap-4 text-sm text-gray-500">
                                <span>Fetches: {source.fetch_count}</span>
                                <span>Errors: {source.error_count}</span>
                                <span>Today: {source.items_collected_today} items</span>
                                <span>Last: {formatTimeAgo(source.last_fetched)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={source.enabled}
                                  onChange={(e) => toggleSource(source.id, e.target.checked)}
                                  className="rounded mr-2"
                                />
                                <span className="text-sm">Enabled</span>
                              </label>
                              <button 
                                onClick={() => testRSSSource(source.id)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                              >
                                🧪 Test
                              </button>
                              <button 
                                onClick={() => deleteRSSSource(source.id)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Categories: </span>
                              <span className="text-gray-600">
                                {source.categories.length > 0 ? source.categories.join(', ') : 'All'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Neighborhoods: </span>
                              <span className="text-gray-600">
                                {source.neighborhoods.length > 0 ? source.neighborhoods.join(', ') : 'All'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add RSS Source Modal */}
                  {isAddingSource && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">➕ Add RSS Source</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Source Name</label>
                            <input
                              type="text"
                              value={newSource.name}
                              onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-lg"
                              placeholder="e.g., Prague City News"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">RSS URL</label>
                            <input
                              type="url"
                              value={newSource.url}
                              onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-lg"
                              placeholder="https://example.com/rss.xml"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Fetch Interval (hours)</label>
                            <input
                              type="number"
                              value={newSource.fetch_interval}
                              onChange={(e) => setNewSource(prev => ({ ...prev, fetch_interval: parseInt(e.target.value) }))}
                              className="w-full px-3 py-2 border rounded-lg"
                              min="1"
                              max="24"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Quality Threshold</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={newSource.quality_threshold}
                              onChange={(e) => setNewSource(prev => ({ ...prev, quality_threshold: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                            <div className="text-sm text-gray-500">{newSource.quality_threshold.toFixed(1)}</div>
                          </div>

                          <div className="flex justify-end gap-3 pt-4">
                            <button
                              onClick={() => setIsAddingSource(false)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={addRSSSource}
                              disabled={!newSource.name || !newSource.url}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                            >
                              Add Source
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Newsletter Settings Tab */}
              {activeTab === 'newsletter' && settings && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">📧 Newsletter Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Default Send Time</label>
                      <input
                        type="time"
                        value={settings.newsletter.default_send_time}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          newsletter: { ...prev.newsletter, default_send_time: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Batch Size</label>
                      <input
                        type="number"
                        value={settings.newsletter.batch_size}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          newsletter: { ...prev.newsletter, batch_size: parseInt(e.target.value) }
                        } : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="1"
                        max="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Sender Email</label>
                      <input
                        type="email"
                        value={settings.newsletter.sender_email}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          newsletter: { ...prev.newsletter, sender_email: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Reply-To Email</label>
                      <input
                        type="email"
                        value={settings.newsletter.reply_to_email}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          newsletter: { ...prev.newsletter, reply_to_email: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.newsletter.enabled}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          newsletter: { ...prev.newsletter, enabled: e.target.checked }
                        } : null)}
                        className="rounded mr-2"
                      />
                      <span className="text-sm font-medium">Enable Newsletter Delivery</span>
                    </label>
                  </div>
                </div>
              )}

              {/* AI Configuration Tab */}
              {activeTab === 'ai' && settings && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">🤖 AI Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">OpenAI Model</label>
                      <select
                        value={settings.ai.openai_model}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          ai: { ...prev.ai, openai_model: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Confidence Threshold</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.ai.confidence_threshold}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          ai: { ...prev.ai, confidence_threshold: parseFloat(e.target.value) }
                        } : null)}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-500 mt-1">{settings.ai.confidence_threshold.toFixed(2)}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Max Content Length</label>
                      <input
                        type="number"
                        value={settings.ai.max_content_length}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          ai: { ...prev.ai, max_content_length: parseInt(e.target.value) }
                        } : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="100"
                        max="2000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Generation Temperature</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.ai.generation_temperature}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          ai: { ...prev.ai, generation_temperature: parseFloat(e.target.value) }
                        } : null)}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-500 mt-1">{settings.ai.generation_temperature.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* System Settings Tab */}
              {activeTab === 'system' && settings && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">⚙️ Pipeline Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Auto-Approve Threshold</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={settings.pipeline.auto_approve_threshold}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            pipeline: { ...prev.pipeline, auto_approve_threshold: parseFloat(e.target.value) }
                          } : null)}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500 mt-1">{settings.pipeline.auto_approve_threshold.toFixed(2)}</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Max Daily Content</label>
                        <input
                          type="number"
                          value={settings.pipeline.max_daily_content}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            pipeline: { ...prev.pipeline, max_daily_content: parseInt(e.target.value) }
                          } : null)}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="1"
                          max="500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Retry Attempts</label>
                        <input
                          type="number"
                          value={settings.pipeline.retry_attempts}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            pipeline: { ...prev.pipeline, retry_attempts: parseInt(e.target.value) }
                          } : null)}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="1"
                          max="10"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.pipeline.parallel_processing}
                            onChange={(e) => setSettings(prev => prev ? {
                              ...prev,
                              pipeline: { ...prev.pipeline, parallel_processing: e.target.checked }
                            } : null)}
                            className="rounded mr-2"
                          />
                          <span className="text-sm font-medium">Enable Parallel Processing</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">🔔 Notification Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Admin Email</label>
                        <input
                          type="email"
                          value={settings.notifications.admin_email}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            notifications: { ...prev.notifications, admin_email: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.notifications.error_notifications}
                            onChange={(e) => setSettings(prev => prev ? {
                              ...prev,
                              notifications: { ...prev.notifications, error_notifications: e.target.checked }
                            } : null)}
                            className="rounded mr-2"
                          />
                          <span className="text-sm">Send Error Notifications</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.notifications.daily_reports}
                            onChange={(e) => setSettings(prev => prev ? {
                              ...prev,
                              notifications: { ...prev.notifications, daily_reports: e.target.checked }
                            } : null)}
                            className="rounded mr-2"
                          />
                          <span className="text-sm">Send Daily Reports</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.notifications.threshold_alerts}
                            onChange={(e) => setSettings(prev => prev ? {
                              ...prev,
                              notifications: { ...prev.notifications, threshold_alerts: e.target.checked }
                            } : null)}
                            className="rounded mr-2"
                          />
                          <span className="text-sm">Send Threshold Alerts</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">💻 System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl mb-2">✅</div>
                <div className="font-medium text-green-800">Database</div>
                <div className="text-sm text-green-600">Connected</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-medium text-blue-800">AI Service</div>
                <div className="text-sm text-blue-600">Operational</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-2">📧</div>
                <div className="font-medium text-purple-800">Email Service</div>
                <div className="text-sm text-purple-600">Ready</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl mb-2">📡</div>
                <div className="font-medium text-orange-800">RSS Sources</div>
                <div className="text-sm text-orange-600">{rssSources.filter(s => s.enabled).length} Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}