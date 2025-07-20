// components/admin/RSSSourceManager.tsx
// RSS source management with health monitoring and testing

import React, { useState, useEffect } from 'react';
import { RSSSource, HealthSummary, RSSSourceCreate, Neighborhood } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, formatNumber, timeAgo, isValidURL } from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal, { ConfirmationModal } from '../ui/Modal';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface RSSSourceManagerProps {
  neighborhoods?: Neighborhood[];
  className?: string;
}

interface SourceForm {
  name: string;
  url: string;
  category_hint: string;
  neighborhood_id: string;
  priority: number;
}

interface EditingSource {
  source: RSSSource | null;
  form: SourceForm;
  isOpen: boolean;
  saving: boolean;
}

const RSSSourceManager: React.FC<RSSSourceManagerProps> = ({ 
  neighborhoods = [], 
  className = '' 
}) => {
  const { token } = useAuth();
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingSource>({
    source: null,
    form: {
      name: '',
      url: '',
      category_hint: 'local',
      neighborhood_id: '',
      priority: 5
    },
    isOpen: false,
    saving: false
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    source: RSSSource | null;
    deleting: boolean;
  }>({
    isOpen: false,
    source: null,
    deleting: false
  });
  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'priority' | 'last_check'>('name');
  
  const { showSuccess, showError, showWarning } = useToastActions();

  // Load RSS sources
  const loadSources = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await apiClient.getRSSources(token);
      setSources(data.sources);
      setHealthSummary(data.health_summary);
    } catch (error) {
      console.error('Error loading RSS sources:', error);
      showError('Failed to load RSS sources');
    } finally {
      setLoading(false);
    }
  };

  // Add new RSS source
  const addSource = () => {
    setEditing({
      source: null,
      form: {
        name: '',
        url: '',
        category_hint: 'local',
        neighborhood_id: neighborhoods.length > 0 ? neighborhoods[0].id : '',
        priority: 5
      },
      isOpen: true,
      saving: false
    });
  };

  // Edit existing source
  const editSource = (source: RSSSource) => {
    setEditing({
      source,
      form: {
        name: source.name,
        url: source.url,
        category_hint: source.category_hint,
        neighborhood_id: source.neighborhood_id || '',
        priority: source.priority
      },
      isOpen: true,
      saving: false
    });
  };

  // Save source (create or update)
  const saveSource = async () => {
    if (!token) return;

    // Validate form
    const errors: string[] = [];
    if (!editing.form.name.trim()) errors.push('Name is required');
    if (!editing.form.url.trim()) errors.push('URL is required');
    if (!isValidURL(editing.form.url)) errors.push('Please enter a valid URL');
    if (editing.form.priority < 1 || editing.form.priority > 10) errors.push('Priority must be between 1 and 10');

    if (errors.length > 0) {
      showError('Validation failed', errors.join(', '));
      return;
    }

    setEditing(prev => ({ ...prev, saving: true }));

    try {
      if (editing.source) {
        // Update existing source
        await apiClient.updateRSSSource(token, editing.source.id, {
          name: editing.form.name.trim(),
          url: editing.form.url.trim(),
          category_hint: editing.form.category_hint,
          neighborhood_id: editing.form.neighborhood_id || undefined,
          priority: editing.form.priority
        });
        showSuccess('RSS source updated successfully');
      } else {
        // Create new source
        await apiClient.addRSSSource(token, {
          name: editing.form.name.trim(),
          url: editing.form.url.trim(),
          category_hint: editing.form.category_hint,
          neighborhood_id: editing.form.neighborhood_id || undefined,
          priority: editing.form.priority
        });
        showSuccess('RSS source added successfully');
      }

      setEditing(prev => ({ ...prev, isOpen: false }));
      loadSources();
    } catch (error) {
      console.error('Error saving RSS source:', error);
      showError('Failed to save RSS source');
    } finally {
      setEditing(prev => ({ ...prev, saving: false }));
    }
  };

  // Delete source
  const deleteSource = async () => {
    if (!token || !deleteConfirmation.source) return;

    setDeleteConfirmation(prev => ({ ...prev, deleting: true }));

    try {
      await apiClient.deleteRSSSource(token, deleteConfirmation.source.id);
      showSuccess('RSS source deleted successfully');
      setDeleteConfirmation({ isOpen: false, source: null, deleting: false });
      loadSources();
    } catch (error) {
      console.error('Error deleting RSS source:', error);
      showError('Failed to delete RSS source');
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, deleting: false }));
    }
  };

  // Test RSS source
  const testSource = async (source: RSSSource) => {
    setTestingSource(source.id);
    
    try {
      // Simulate testing by trying to fetch the URL
      const response = await fetch(source.url, { mode: 'no-cors' });
      showSuccess(`RSS source "${source.name}" appears to be accessible`);
    } catch (error) {
      showWarning(`Unable to test RSS source "${source.name}" due to CORS restrictions. The source may still be functional.`);
    } finally {
      setTestingSource(null);
    }
  };

  // Get status display properties
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          color: 'text-green-600 bg-green-100',
          icon: '✓',
          label: 'Healthy'
        };
      case 'warning':
        return {
          color: 'text-yellow-600 bg-yellow-100',
          icon: '⚠',
          label: 'Warning'
        };
      case 'failed':
        return {
          color: 'text-red-600 bg-red-100',
          icon: '✗',
          label: 'Failed'
        };
      case 'unchecked':
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: '?',
          label: 'Unchecked'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: '?',
          label: 'Unknown'
        };
    }
  };

  // Sort sources
  const sortedSources = [...sources].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'status':
        return a.health_status.localeCompare(b.health_status);
      case 'priority':
        return b.priority - a.priority; // Higher priority first
      case 'last_check':
        return (b.last_check || 0) - (a.last_check || 0);
      default:
        return 0;
    }
  });

  // Load data on mount
  useEffect(() => {
    loadSources();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadSources();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  if (loading && sources.length === 0) {
    return (
      <div className={className}>
        <LoadingInline message="Loading RSS sources..." />
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RSS Source Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage RSS feeds for content collection
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => loadSources()}
            disabled={loading}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          
          <Button
            variant="primary"
            onClick={addSource}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add RSS Source
          </Button>
        </div>
      </div>

      {/* Health Summary */}
      {healthSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{healthSummary.total_sources}</div>
              <div className="text-sm text-gray-600">Total Sources</div>
            </div>
          </Card>
          
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{healthSummary.healthy_sources}</div>
              <div className="text-sm text-gray-600">Healthy</div>
            </div>
          </Card>
          
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{healthSummary.warning_sources}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
          </Card>
          
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{healthSummary.failed_sources}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card padding="sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="block border border-gray-300 rounded-md px-3 py-1 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="status">Health Status</option>
              <option value="priority">Priority</option>
              <option value="last_check">Last Check</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            {sources.length} source{sources.length === 1 ? '' : 's'} •{' '}
            Success rate: {healthSummary ? `${Math.round(healthSummary.avg_success_rate * 100)}%` : 'N/A'}
          </div>
        </div>
      </Card>

      {/* RSS Sources List */}
      <div className="space-y-4">
        {sortedSources.map((source) => {
          const statusDisplay = getStatusDisplay(source.health_status);
          
          return (
            <Card key={source.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Status Indicator */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusDisplay.color} font-semibold`}>
                    {statusDisplay.icon}
                  </div>

                  {/* Source Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
                      
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}>
                        Priority {source.priority}
                      </span>
                      
                      {!source.active && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Disabled
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-blue-600 hover:text-blue-800 truncate">
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.url}
                      </a>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span className="capitalize">{source.category_hint}</span>
                      {source.neighborhood_id && (
                        <span>
                          {neighborhoods.find(n => n.id === source.neighborhood_id)?.name || 'Unknown Neighborhood'}
                        </span>
                      )}
                      <span>{formatNumber(source.items_fetched)} items fetched</span>
                      {source.last_check && (
                        <span>Last checked: {timeAgo(source.last_check)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testSource(source)}
                    loading={testingSource === source.id}
                    disabled={!!testingSource}
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editSource(source)}
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                  
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteConfirmation({ isOpen: true, source, deleting: false })}
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>
                </div>
              </div>

              {/* Error Display */}
              {source.last_error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm font-medium text-red-800">Last Error:</div>
                  <div className="text-sm text-red-700 mt-1">{source.last_error}</div>
                  <div className="text-xs text-red-600 mt-1">
                    Error count: {source.error_count}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {sources.length === 0 && !loading && (
          <Card className="text-center py-12">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No RSS sources configured</h3>
            <p className="text-gray-600 mb-6">Add RSS sources to start collecting content automatically.</p>
            <Button variant="primary" onClick={addSource}>
              Add Your First RSS Source
            </Button>
          </Card>
        )}
      </div>

      {/* Add/Edit Source Modal */}
      <Modal
        isOpen={editing.isOpen}
        onClose={() => setEditing(prev => ({ ...prev, isOpen: false }))}
        title={editing.source ? 'Edit RSS Source' : 'Add RSS Source'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
            <input
              type="text"
              value={editing.form.name}
              onChange={(e) => setEditing(prev => ({
                ...prev,
                form: { ...prev.form, name: e.target.value }
              }))}
              placeholder="e.g., Prague Official News"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RSS Feed URL</label>
            <input
              type="url"
              value={editing.form.url}
              onChange={(e) => setEditing(prev => ({
                ...prev,
                form: { ...prev.form, url: e.target.value }
              }))}
              placeholder="https://example.com/feed.xml"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Category and Neighborhood */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Hint</label>
              <select
                value={editing.form.category_hint}
                onChange={(e) => setEditing(prev => ({
                  ...prev,
                  form: { ...prev.form, category_hint: e.target.value }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="emergency">Emergency</option>
                <option value="local">Local News</option>
                <option value="business">Business</option>
                <option value="community">Community</option>
                <option value="events">Events</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood (Optional)</label>
              <select
                value={editing.form.neighborhood_id}
                onChange={(e) => setEditing(prev => ({
                  ...prev,
                  form: { ...prev.form, neighborhood_id: e.target.value }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Neighborhoods</option>
                {neighborhoods.map((neighborhood) => (
                  <option key={neighborhood.id} value={neighborhood.id}>
                    {neighborhood.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority (1-10, higher = more important)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={editing.form.priority}
              onChange={(e) => setEditing(prev => ({
                ...prev,
                form: { ...prev.form, priority: parseInt(e.target.value) || 5 }
              }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Higher priority sources are processed first during content collection.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => setEditing(prev => ({ ...prev, isOpen: false }))}
              disabled={editing.saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveSource}
              loading={editing.saving}
            >
              {editing.source ? 'Update Source' : 'Add Source'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, source: null, deleting: false })}
        onConfirm={deleteSource}
        title="Delete RSS Source"
        message={`Are you sure you want to delete "${deleteConfirmation.source?.name}"? This will stop collecting content from this source and cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteConfirmation.deleting}
      />
    </div>
  );
};

export default RSSSourceManager;