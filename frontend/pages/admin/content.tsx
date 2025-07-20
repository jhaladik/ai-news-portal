// pages/admin/content.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { AuthManager } from '../../lib/auth';
import apiClient from '../../lib/api-client';
import { Content, ContentFilters } from '../../lib/types';

export default function AdminContentManagement() {
  const router = useRouter();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('review'); // review, approved, rejected, all
  const [filters, setFilters] = useState<ContentFilters>({
    category: undefined,
    neighborhood: undefined,
    limit: 50,
    offset: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [editingItem, setEditingItem] = useState<Content | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const authManager = new AuthManager();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = authManager.getCurrentToken();
      if (!token || !authManager.isAdmin()) {
        router.push('/login');
        return;
      }
      
      fetchContent();
    }
  }, [selectedTab, filters]);

  const fetchContent = async () => {
    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      setLoading(true);
      
      // Build filters for API call
      const apiFilters: ContentFilters = {
        ...filters,
        // Map tab to status filter
        ...(selectedTab !== 'all' && { status: selectedTab })
      };

      const data = await apiClient.getPublishedContent(apiFilters);
      setContent(data.content);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemAction = async (itemId: string, action: string, reason?: string) => {
    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      setProcessingAction(itemId);

      if (action === 'approve') {
        await apiClient.approveContent(token, itemId);
        // Remove from current list or refresh
        setContent(prev => prev.filter(item => item.id !== itemId));
      } else if (action === 'reject') {
        // For rejection, you might need a reject endpoint
        // await apiClient.rejectContent(token, itemId, reason);
        console.log(`Rejecting ${itemId} with reason: ${reason}`);
        // Remove from current list or refresh
        setContent(prev => prev.filter(item => item.id !== itemId));
      } else if (action === 'delete') {
        await apiClient.deleteContent(token, itemId);
        setContent(prev => prev.filter(item => item.id !== itemId));
      }

    } catch (error) {
      console.error(`Failed to ${action} content:`, error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.length === 0) return;

    try {
      const token = authManager.getCurrentToken();
      if (!token) return;

      setProcessingAction('bulk');

      // Process each selected item
      const promises = selectedItems.map(itemId => {
        if (bulkAction === 'approve') {
          return apiClient.approveContent(token, itemId);
        } else if (bulkAction === 'delete') {
          return apiClient.deleteContent(token, itemId);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);

      // Remove processed items from the list
      setContent(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      setBulkAction('');

    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === content.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(content.map(item => item.id));
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'published': return 'text-green-600 bg-green-100';
      case 'review': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'emergency': return 'text-red-600 bg-red-100';
      case 'local': return 'text-blue-600 bg-blue-100';
      case 'business': return 'text-green-600 bg-green-100';
      case 'community': return 'text-purple-600 bg-purple-100';
      case 'events': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Filter content by search query
  const filteredContent = content.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading content...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">📝 Content Management</h1>
            <p className="mt-2 text-gray-600">
              Review, approve, and manage AI-generated content
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 space-y-4">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'review', label: 'Pending Review', count: content.filter(c => c.status === 'review').length },
                  { key: 'published', label: 'Published', count: content.filter(c => c.status === 'published').length },
                  { key: 'rejected', label: 'Rejected', count: content.filter(c => c.status === 'rejected').length },
                  { key: 'all', label: 'All Content', count: content.length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      selectedTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 w-64"
                />
                
                <select
                  value={filters.category || 'all'}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    category: e.target.value === 'all' ? undefined : e.target.value 
                  }))}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">All Categories</option>
                  <option value="emergency">Emergency</option>
                  <option value="local">Local</option>
                  <option value="business">Business</option>
                  <option value="community">Community</option>
                  <option value="events">Events</option>
                </select>

                <select
                  value={filters.neighborhood || 'all'}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    neighborhood: e.target.value === 'all' ? undefined : e.target.value 
                  }))}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">All Neighborhoods</option>
                  <option value="vinohrady">Vinohrady</option>
                  <option value="karlin">Karlín</option>
                  <option value="smichov">Smíchov</option>
                  <option value="nove_mesto">Nové Město</option>
                </select>
              </div>

              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-600">
                    {selectedItems.length} selected
                  </span>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Bulk Actions</option>
                    <option value="approve">Approve Selected</option>
                    <option value="delete">Delete Selected</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction || processingAction === 'bulk'}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processingAction === 'bulk' ? 'Processing...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Header with Select All */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredContent.length && filteredContent.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-4"
                />
                <span className="text-sm font-medium text-gray-900">
                  {filteredContent.length} items
                </span>
              </div>
            </div>

            {/* Content Items */}
            <div className="divide-y divide-gray-200">
              {filteredContent.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No content found matching your criteria.</p>
                </div>
              ) : (
                filteredContent.map((item) => (
                  <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                              {item.title}
                            </h3>
                            
                            <p className="mt-1 text-sm text-gray-600 line-clamp-3">
                              {item.content}
                            </p>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                              
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </span>
                              
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                                {item.neighborhood_name}
                              </span>
                              
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-purple-600 bg-purple-100">
                                {Math.round(item.ai_confidence * 100)}% confidence
                              </span>
                            </div>
                            
                            <div className="mt-2 text-xs text-gray-500">
                              Created {formatTimeAgo(item.created_at)}
                              {item.published_at && (
                                <span> • Published {formatTimeAgo(item.published_at)}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex space-x-2 ml-4">
                            {item.status === 'review' && (
                              <>
                                <button
                                  onClick={() => handleItemAction(item.id, 'approve')}
                                  disabled={processingAction === item.id}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                >
                                  {processingAction === item.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleItemAction(item.id, 'reject', 'Admin review')}
                                  disabled={processingAction === item.id}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                                >
                                  {processingAction === item.id ? '...' : 'Reject'}
                                </button>
                              </>
                            )}
                            
                            <button
                              onClick={() => setEditingItem(item)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            
                            <button
                              onClick={() => handleItemAction(item.id, 'delete')}
                              disabled={processingAction === item.id}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {filteredContent.length} of {content.length} results
            </p>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, offset: Math.max(0, (prev.offset || 0) - (prev.limit || 50)) }))}
                disabled={!filters.offset}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || 50) }))}
                disabled={filteredContent.length < (filters.limit || 50)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal - Simple placeholder */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Content: {editingItem.title}
              </h3>
              <p className="text-sm text-gray-600">
                Content editing interface would go here. This would include fields for title, content, category, status, etc.
              </p>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}