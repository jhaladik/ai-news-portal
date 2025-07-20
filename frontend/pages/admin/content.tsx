// pages/admin/content.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { AuthManager } from '../../lib/auth';
import { APIClient } from '../../lib/api-client';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood_id: string;
  ai_confidence: number;
  status: string;
  source: string;
  original_url?: string;
  created_at: number;
  updated_at?: number;
  reason_flagged?: string;
  validation_notes?: string;
  published_at?: number;
}

export default function AdminContentManagement() {
  const router = useRouter();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('review'); // review, approved, rejected, all
  const [filters, setFilters] = useState({
    category: 'all',
    neighborhood: 'all',
    confidence_min: 0,
    search: ''
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  const authManager = new AuthManager();
  const apiClient = new APIClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getToken();
      if (!token || !authManager.isAdmin()) {
        router.push('/login');
        return;
      }
      
      fetchContent();
    }
  }, [selectedTab, filters]);

  const fetchContent = async () => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      setLoading(true);
      const data = await apiClient.getAdminContent(token, {
        status: selectedTab === 'all' ? undefined : selectedTab,
        ...filters
      });
      setContent(data);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemAction = async (itemId: string, action: string, reason?: string) => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      switch (action) {
        case 'approve':
          await apiClient.approveContent(token, itemId);
          break;
        case 'reject':
          await apiClient.rejectContent(token, itemId, reason || 'Manual rejection');
          break;
        case 'delete':
          await apiClient.deleteContent(token, itemId);
          break;
      }

      // Remove from current view or refresh
      setContent(prev => prev.filter(item => item.id !== itemId));
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.length === 0) return;

    const token = authManager.getToken();
    if (!token) return;

    try {
      for (const itemId of selectedItems) {
        await handleItemAction(itemId, bulkAction);
      }
      setSelectedItems([]);
      setBulkAction('');
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => 
      selected 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedItems(selected ? content.map(item => item.id) : []);
  };

  const saveContentEdit = async (editedItem: ContentItem) => {
    try {
      const token = authManager.getToken();
      if (!token) return;

      await apiClient.updateContent(token, editedItem.id, {
        title: editedItem.title,
        content: editedItem.content,
        category: editedItem.category,
        neighborhood_id: editedItem.neighborhood_id
      });

      // Update in local state
      setContent(prev => prev.map(item => 
        item.id === editedItem.id ? editedItem : item
      ));
      setEditingItem(null);
    } catch (error) {
      console.error('Content update failed:', error);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      review: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⚠️ Review' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Approved' },
      published: { bg: 'bg-blue-100', text: 'text-blue-800', label: '📰 Published' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '❌ Rejected' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: '📝 Draft' }
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredContent = content.filter(item => {
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !item.content.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.neighborhood !== 'all' && item.neighborhood_id !== filters.neighborhood) return false;
    if (item.ai_confidence < filters.confidence_min) return false;
    return true;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📝 Content Management</h1>
                <p className="text-gray-600">Review, edit, and manage AI-generated content</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  ← Dashboard
                </button>
                <button 
                  onClick={() => fetchContent()}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: 'review', label: '⚠️ Needs Review', count: content.filter(i => i.status === 'review').length },
                  { key: 'approved', label: '✅ Approved', count: content.filter(i => i.status === 'approved').length },
                  { key: 'published', label: '📰 Published', count: content.filter(i => i.status === 'published').length },
                  { key: 'rejected', label: '❌ Rejected', count: content.filter(i => i.status === 'rejected').length },
                  { key: 'all', label: '📋 All Content', count: content.length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      selectedTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </nav>
            </div>

            {/* Filters */}
            <div className="p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="emergency">Emergency</option>
                    <option value="transport">Transport</option>
                    <option value="local_gov">Local Government</option>
                    <option value="business">Business</option>
                    <option value="weather">Weather</option>
                    <option value="events">Events</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filters.neighborhood}
                    onChange={(e) => setFilters(prev => ({ ...prev, neighborhood: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="all">All Neighborhoods</option>
                    <option value="vinohrady">Vinohrady</option>
                    <option value="praha2">Praha 2</option>
                    <option value="praha4">Praha 4</option>
                    <option value="karlin">Karlín</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Confidence</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.confidence_min}
                    onChange={(e) => setFilters(prev => ({ ...prev, confidence_min: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">{filters.confidence_min.toFixed(1)}+</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ category: 'all', neighborhood: 'all', confidence_min: 0, search: '' })}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-800">
                  {selectedItems.length} items selected
                </span>
                <div className="flex gap-2">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="">Choose Action</option>
                    <option value="approve">Approve All</option>
                    <option value="reject">Reject All</option>
                    <option value="delete">Delete All</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content List */}
          <div className="bg-white rounded-lg shadow-sm border">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading content...</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="px-6 py-3 border-b bg-gray-50 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredContent.length && filteredContent.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded mr-4"
                  />
                  <div className="flex-1 grid grid-cols-6 gap-4 text-xs font-semibold text-gray-600 uppercase">
                    <div>Title & Source</div>
                    <div>Category</div>
                    <div>Neighborhood</div>
                    <div>AI Score</div>
                    <div>Status</div>
                    <div>Actions</div>
                  </div>
                </div>

                {/* Content Items */}
                <div className="divide-y">
                  {filteredContent.map(item => (
                    <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                          className="rounded mr-4 mt-1"
                        />
                        <div className="flex-1 grid grid-cols-6 gap-4">
                          {/* Title & Source */}
                          <div>
                            <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                              {item.title}
                            </h3>
                            <div className="text-xs text-gray-500">
                              {item.source}
                              {item.original_url && (
                                <a 
                                  href={item.original_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  🔗
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {formatTimeAgo(item.created_at)}
                            </div>
                          </div>

                          {/* Category */}
                          <div>
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">
                              {item.category.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Neighborhood */}
                          <div>
                            <span className="text-sm capitalize">
                              {item.neighborhood_id.replace('_', ' ')}
                            </span>
                          </div>

                          {/* AI Score */}
                          <div>
                            <span className={`font-semibold ${getConfidenceColor(item.ai_confidence)}`}>
                              {(item.ai_confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          {/* Status */}
                          <div>
                            {getStatusBadge(item.status)}
                            {item.reason_flagged && (
                              <div className="text-xs text-red-600 mt-1">
                                {item.reason_flagged}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                            >
                              ✏️
                            </button>
                            {item.status === 'review' && (
                              <>
                                <button
                                  onClick={() => handleItemAction(item.id, 'approve')}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                >
                                  ✅
                                </button>
                                <button
                                  onClick={() => handleItemAction(item.id, 'reject')}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                >
                                  ❌
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleItemAction(item.id, 'delete')}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="mt-3 ml-8">
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredContent.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">📰</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No content found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your filters or check back later.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">✏️ Edit Content</h2>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={editingItem.title}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <select
                        value={editingItem.category}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, category: e.target.value } : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="emergency">Emergency</option>
                        <option value="transport">Transport</option>
                        <option value="local_gov">Local Government</option>
                        <option value="business">Business</option>
                        <option value="weather">Weather</option>
                        <option value="events">Events</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Neighborhood</label>
                      <select
                        value={editingItem.neighborhood_id}
                        onChange={(e) => setEditingItem(prev => prev ? { ...prev, neighborhood_id: e.target.value } : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="vinohrady">Vinohrady</option>
                        <option value="praha2">Praha 2</option>
                        <option value="praha4">Praha 4</option>
                        <option value="karlin">Karlín</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Content</label>
                    <textarea
                      value={editingItem.content}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, content: e.target.value } : null)}
                      rows={10}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setEditingItem(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveContentEdit(editingItem)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}