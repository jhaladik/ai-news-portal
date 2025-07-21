// pages/admin/settings.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { authManager } from '../../lib/auth';
import apiClient from '../../lib/api-client';
import { RSSSource } from '../../lib/types';

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
    category_hint: 'local',
    neighborhood_id: '',
    priority: 1
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getCurrentToken();
      if (!token || !authManager.isAdmin()) {
        router.push('/login');
        return;
      }
      
      fetchSettingsData();
    }
  }, []);

  const fetchSettingsData = async () => {
    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      setLoading(true);
      
      // Fetch RSS sources using correct method name
      const rssData = await apiClient.getRSSources(token);
      setRssSources(rssData.sources || []);

      // Mock system settings since getSystemSettings doesn't exist
      const mockSettings: SystemSettings = {
        ai: {
          openai_model: 'gpt-4-turbo',
          confidence_threshold: 0.7,
          max_content_length: 2000,
          generation_temperature: 0.7
        },
        newsletter: {
          default_send_time: '08:00',
          batch_size: 100,
          sender_email: 'news@praha.local',
          reply_to_email: 'admin@praha.local',
          enabled: true
        },
        pipeline: {
          auto_approve_threshold: 0.8,
          max_daily_content: 50,
          retry_attempts: 3,
          parallel_processing: true
        },
        notifications: {
          admin_email: 'admin@praha.local',
          error_notifications: true,
          daily_reports: true,
          threshold_alerts: true
        }
      };

      setSettings(mockSettings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = async (sourceId: string, enabled: boolean) => {
    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      await apiClient.updateRSSSource(token, sourceId, { enabled });
      
      setRssSources(prev => prev.map(source => 
        source.id === sourceId ? { ...source, enabled } : source
      ));
    } catch (error) {
      console.error('Failed to toggle RSS source:', error);
    }
  };

  const addNewSource = async () => {
    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      setSaving(true);
      
      const result = await apiClient.addRSSSource(token, newSource);
      
      setRssSources(prev => [...prev, result.source]);
      setNewSource({
        name: '',
        url: '',
        category_hint: 'local',
        neighborhood_id: '',
        priority: 1
      });
      setIsAddingSource(false);
    } catch (error) {
      console.error('Failed to add RSS source:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this RSS source?')) return;

    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      await apiClient.deleteRSSSource(token, sourceId);
      setRssSources(prev => prev.filter(source => source.id !== sourceId));
    } catch (error) {
      console.error('Failed to delete RSS source:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      // Settings save would go here when API endpoint exists
      console.log('Settings saved:', settings);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getSourceHealthColor = (source: RSSSource): string => {
    const errorRate = source.error_count / Math.max(source.fetch_count, 1);
    const hoursAgo = source.last_fetched ? (Date.now() - source.last_fetched) / (1000 * 60 * 60) : 999;
    
    if (!source.enabled) return 'text-gray-500';
    if (hoursAgo > 24 || errorRate > 0.5) return 'text-red-500';
    if (errorRate > 0.2) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">⚙️ System Settings</h1>
            <p className="mt-2 text-gray-600">
              Configure RSS sources, AI parameters, and system preferences
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'rss', label: 'RSS Sources', icon: '📡' },
                  { key: 'ai', label: 'AI Settings', icon: '🤖' },
                  { key: 'newsletter', label: 'Newsletter', icon: '📧' },
                  { key: 'system', label: 'System', icon: '⚙️' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* RSS Sources Tab */}
          {activeTab === 'rss' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">RSS Sources</h3>
                  <button
                    onClick={() => setIsAddingSource(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    ➕ Add Source
                  </button>
                </div>

                {/* Add New Source Form */}
                {isAddingSource && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-4">Add New RSS Source</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={newSource.name}
                          onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="e.g., Prague City News"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RSS URL</label>
                        <input
                          type="url"
                          value={newSource.url}
                          onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="https://example.com/rss"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={newSource.category_hint}
                          onChange={(e) => setNewSource(prev => ({ ...prev, category_hint: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="local">Local</option>
                          <option value="business">Business</option>
                          <option value="community">Community</option>
                          <option value="events">Events</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                        <select
                          value={newSource.neighborhood_id}
                          onChange={(e) => setNewSource(prev => ({ ...prev, neighborhood_id: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">All neighborhoods</option>
                          <option value="vinohrady">Vinohrady</option>
                          <option value="karlin">Karlín</option>
                          <option value="smichov">Smíchov</option>
                          <option value="nove_mesto">Nové Město</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={addNewSource}
                        disabled={!newSource.name || !newSource.url || saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {saving ? 'Adding...' : 'Add Source'}
                      </button>
                      <button
                        onClick={() => setIsAddingSource(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Sources List */}
                <div className="space-y-4">
                  {rssSources.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">📡</div>
                      <p className="text-gray-600">No RSS sources configured</p>
                      <p className="text-sm text-gray-500 mt-1">Add your first RSS source to start collecting content.</p>
                    </div>
                  ) : (
                    rssSources.map((source) => (
                      <div key={source.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className={`text-lg ${getSourceHealthColor(source)}`}>
                              {source.enabled ? '🟢' : '⚪'}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{source.name}</h4>
                              <p className="text-sm text-gray-600 truncate max-w-md">{source.url}</p>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                <span>Category: {source.category_hint}</span>
                                <span>Fetches: {source.fetch_count}</span>
                                <span>Errors: {source.error_count}</span>
                                {source.last_fetched && (
                                  <span>Last: {formatTimeAgo(source.last_fetched)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleSource(source.id, !source.enabled)}
                            className={`px-3 py-1 rounded text-sm ${
                              source.enabled 
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {source.enabled ? 'Disable' : 'Enable'}
                          </button>
                          
                          <button
                            onClick={() => deleteSource(source.id)}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Settings Tab */}
          {activeTab === 'ai' && settings && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">AI Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI Model</label>
                  <select
                    value={settings.ai.openai_model}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      ai: { ...prev.ai, openai_model: e.target.value }
                    } : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confidence Threshold ({Math.round(settings.ai.confidence_threshold * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.ai.confidence_threshold}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      ai: { ...prev.ai, confidence_threshold: parseFloat(e.target.value) }
                    } : null)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum confidence score for auto-approval</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Content Length</label>
                  <input
                    type="number"
                    value={settings.ai.max_content_length}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      ai: { ...prev.ai, max_content_length: parseInt(e.target.value) }
                    } : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum characters for generated content</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Generation Temperature ({settings.ai.generation_temperature})
                  </label>
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
                  <p className="text-xs text-gray-500 mt-1">Higher values = more creative, lower = more focused</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save AI Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Newsletter Settings Tab */}
          {activeTab === 'newsletter' && settings && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Newsletter Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Send Time</label>
                  <input
                    type="time"
                    value={settings.newsletter.default_send_time}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      newsletter: { ...prev.newsletter, default_send_time: e.target.value }
                    } : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size</label>
                  <input
                    type="number"
                    value={settings.newsletter.batch_size}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      newsletter: { ...prev.newsletter, batch_size: parseInt(e.target.value) }
                    } : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Emails sent per batch</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email</label>
                  <input
                    type="email"
                    value={settings.newsletter.sender_email}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      newsletter: { ...prev.newsletter, sender_email: e.target.value }
                    } : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To Email</label>
                  <input
                    type="email"
                    value={settings.newsletter.reply_to_email}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      newsletter: { ...prev.newsletter, reply_to_email: e.target.value }
                    } : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.newsletter.enabled}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        newsletter: { ...prev.newsletter, enabled: e.target.checked }
                      } : null)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Newsletter sending enabled</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Newsletter Settings'}
                </button>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && settings && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">System Configuration</h3>
              
              <div className="space-y-6">
                {/* Pipeline Settings */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Pipeline Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auto-Approve Threshold ({Math.round(settings.pipeline.auto_approve_threshold * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.pipeline.auto_approve_threshold}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          pipeline: { ...prev.pipeline, auto_approve_threshold: parseFloat(e.target.value) }
                        } : null)}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Daily Content</label>
                      <input
                        type="number"
                        value={settings.pipeline.max_daily_content}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          pipeline: { ...prev.pipeline, max_daily_content: parseInt(e.target.value) }
                        } : null)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Retry Attempts</label>
                      <input
                        type="number"
                        value={settings.pipeline.retry_attempts}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          pipeline: { ...prev.pipeline, retry_attempts: parseInt(e.target.value) }
                        } : null)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Parallel processing</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">Notifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                      <input
                        type="email"
                        value={settings.notifications.admin_email}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          notifications: { ...prev.notifications, admin_email: e.target.value }
                        } : null)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Error notifications</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.daily_reports}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            notifications: { ...prev.notifications, daily_reports: e.target.checked }
                          } : null)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Daily reports</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.threshold_alerts}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            notifications: { ...prev.notifications, threshold_alerts: e.target.checked }
                          } : null)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Threshold alerts</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save System Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}