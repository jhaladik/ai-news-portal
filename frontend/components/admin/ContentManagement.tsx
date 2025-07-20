// components/admin/ContentManagement.tsx
// Admin content management with editing, approval, and oversight capabilities

import React, { useState, useEffect } from 'react';
import { Content, ContentFilters as ContentFiltersType, ContentWithHistory, EditHistory, Neighborhood } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, getContentStatusColor, getCategoryColor, formatConfidence } from '../../lib/utils';
import ContentList from '../content/ContentList';
import ContentFiltersComponent from '../content/ContentFilters';
import ContentPreview from '../content/ContentPreview';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal, { ConfirmationModal } from '../ui/Modal';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface ContentManagementProps {
  neighborhoods?: Neighborhood[];
  className?: string;
}

interface ContentEditForm {
  title: string;
  content: string;
  category: string;
  neighborhood_id: string;
  status: string;
  override_reason: string;
}

const ContentManagement: React.FC<ContentManagementProps> = ({ 
  neighborhoods = [], 
  className = '' 
}) => {
  const { token } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ContentFiltersType>({});
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [editingContent, setEditingContent] = useState<{
    content: ContentWithHistory | null;
    form: ContentEditForm;
    isOpen: boolean;
    saving: boolean;
  }>({
    content: null,
    form: {
      title: '',
      content: '',
      category: 'local',
      neighborhood_id: '',
      status: 'draft',
      override_reason: ''
    },
    isOpen: false,
    saving: false
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    content: Content | null;
    deleting: boolean;
  }>({
    isOpen: false,
    content: null,
    deleting: false
  });
  const [bulkActions, setBulkActions] = useState<{
    selectedIds: Set<string>;
    isProcessing: boolean;
  }>({
    selectedIds: new Set(),
    isProcessing: false
  });
  
  const { showSuccess, showError } = useToastActions();

  // Load content with filters
  const loadContent = async (newFilters: ContentFiltersType = filters) => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await apiClient.getPublishedContent({
        ...newFilters,
        status: undefined, // Admin can see all statuses
        limit: 50
      });
      setContent(data.content);
    } catch (error) {
      console.error('Error loading content:', error);
      showError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  // Handle content editing
  const handleEditContent = async (contentItem: Content) => {
    if (!token) return;

    try {
      const data = await apiClient.getContentForEdit(token, contentItem.id);
      setEditingContent({
        content: data.content,
        form: {
          title: data.content.title,
          content: data.content.content,
          category: data.content.category,
          neighborhood_id: data.content.neighborhood_id || '',
          status: data.content.status,
          override_reason: ''
        },
        isOpen: true,
        saving: false
      });
    } catch (error) {
      console.error('Error loading content for edit:', error);
      showError('Failed to load content for editing');
    }
  };

  // Save content changes
  const saveContentChanges = async () => {
    if (!token || !editingContent.content) return;

    setEditingContent(prev => ({ ...prev, saving: true }));
    
    try {
      await apiClient.overrideContent(token, editingContent.content.id, {
        title: editingContent.form.title,
        content: editingContent.form.content,
        category: editingContent.form.category,
        neighborhood_id: editingContent.form.neighborhood_id,
        status: editingContent.form.status,
        override_reason: editingContent.form.override_reason
      });
      
      showSuccess('Content updated successfully');
      setEditingContent(prev => ({ ...prev, isOpen: false }));
      loadContent(); // Refresh content list
    } catch (error) {
      console.error('Error saving content:', error);
      showError('Failed to save content changes');
    } finally {
      setEditingContent(prev => ({ ...prev, saving: false }));
    }
  };

  // Handle content approval
  const handleApproveContent = async (contentItem: Content) => {
    if (!token) return;

    try {
      await apiClient.approveContent(token, contentItem.id);
      showSuccess('Content approved successfully');
      loadContent();
    } catch (error) {
      console.error('Error approving content:', error);
      showError('Failed to approve content');
    }
  };

  // Handle content deletion
  const handleDeleteContent = async () => {
    if (!token || !deleteConfirmation.content) return;

    setDeleteConfirmation(prev => ({ ...prev, deleting: true }));
    
    try {
      await apiClient.deleteContent(token, deleteConfirmation.content.id);
      showSuccess('Content deleted successfully');
      setDeleteConfirmation({ isOpen: false, content: null, deleting: false });
      loadContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      showError('Failed to delete content');
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, deleting: false }));
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (!token || bulkActions.selectedIds.size === 0) return;

    setBulkActions(prev => ({ ...prev, isProcessing: true }));
    
    try {
      const promises = Array.from(bulkActions.selectedIds).map(id => {
        switch (action) {
          case 'approve':
            return apiClient.approveContent(token, id);
          case 'delete':
            return apiClient.deleteContent(token, id);
          default:
            return Promise.resolve();
        }
      });
      
      await Promise.all(promises);
      
      showSuccess(`Bulk ${action} completed for ${bulkActions.selectedIds.size} items`);
      setBulkActions({ selectedIds: new Set(), isProcessing: false });
      loadContent();
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      showError(`Failed to perform bulk ${action}`);
    } finally {
      setBulkActions(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Toggle bulk selection
  const toggleBulkSelection = (contentId: string) => {
    setBulkActions(prev => {
      const newSelected = new Set(prev.selectedIds);
      if (newSelected.has(contentId)) {
        newSelected.delete(contentId);
      } else {
        newSelected.add(contentId);
      }
      return { ...prev, selectedIds: newSelected };
    });
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: ContentFiltersType) => {
    setFilters(newFilters);
    loadContent(newFilters);
  };

  // Load data on mount
  useEffect(() => {
    loadContent();
  }, [token]);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600 mt-1">
            Review, edit, and manage all content in the system
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/admin/content/create'}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Content
          </Button>
          
          <Button
            variant="primary"
            onClick={() => loadContent()}
            disabled={loading}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {bulkActions.selectedIds.size > 0 && (
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {bulkActions.selectedIds.size} item{bulkActions.selectedIds.size === 1 ? '' : 's'} selected
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleBulkAction('approve')}
                loading={bulkActions.isProcessing}
                disabled={bulkActions.isProcessing}
              >
                Approve Selected
              </Button>
              
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                loading={bulkActions.isProcessing}
                disabled={bulkActions.isProcessing}
              >
                Delete Selected
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBulkActions(prev => ({ ...prev, selectedIds: new Set() }))}
                disabled={bulkActions.isProcessing}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
        <ContentFiltersComponent
        filters={filters}
        neighborhoods={neighborhoods}
        onFiltersChange={handleFiltersChange}
        showStatus={true}
        showAdvanced={true}
        />
        </div>

        {/* Content List */}
        <div className="lg:col-span-3">
          {loading ? (
            <LoadingInline message="Loading content..." />
          ) : (
            <div className="space-y-4">
              {/* Enhanced Content Cards */}
              {content.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    {/* Bulk Selection Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={bulkActions.selectedIds.has(item.id)}
                        onChange={() => toggleBulkSelection(item.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {item.title}
                          </h3>
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {item.neighborhood_name}
                            </span>
                            
                            <span className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDate(item.created_at, { relative: true })}
                            </span>
                            
                            <span>AI: {formatConfidence(item.ai_confidence)}</span>
                          </div>

                          <div className="mt-3 text-gray-700 line-clamp-2">
                            {item.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                          </div>
                        </div>

                        {/* Status and Category Badges */}
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                            {item.category}
                          </span>
                          
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getContentStatusColor(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>

                          {item.manual_override && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Edited
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedContent(item)}
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditContent(item)}
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </Button>
                        </div>

                        <div className="flex space-x-2">
                          {item.status === 'review' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproveContent(item)}
                            >
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Approve
                            </Button>
                          )}
                          
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteConfirmation({ isOpen: true, content: item, deleting: false })}
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {content.length === 0 && !loading && (
                <Card className="text-center py-12">
                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
                  <p className="text-gray-600">Try adjusting your filters or creating new content.</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Preview Modal */}
      {selectedContent && (
        <ContentPreview
          content={selectedContent}
          variant="modal"
          showActions={true}
          showMetadata={true}
          showHistory={false}
          onClose={() => setSelectedContent(null)}
          onEdit={handleEditContent}
          onApprove={handleApproveContent}
          onDelete={(content) => setDeleteConfirmation({ isOpen: true, content, deleting: false })}
        />
      )}

      {/* Content Edit Modal */}
      <Modal
        isOpen={editingContent.isOpen}
        onClose={() => setEditingContent(prev => ({ ...prev, isOpen: false }))}
        title="Edit Content"
        size="xl"
      >
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editingContent.form.title}
              onChange={(e) => setEditingContent(prev => ({
                ...prev,
                form: { ...prev.form, title: e.target.value }
              }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={editingContent.form.content}
              onChange={(e) => setEditingContent(prev => ({
                ...prev,
                form: { ...prev.form, content: e.target.value }
              }))}
              rows={10}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Category and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={editingContent.form.category}
                onChange={(e) => setEditingContent(prev => ({
                  ...prev,
                  form: { ...prev.form, category: e.target.value }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="emergency">Emergency</option>
                <option value="local">Local</option>
                <option value="business">Business</option>
                <option value="community">Community</option>
                <option value="events">Events</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editingContent.form.status}
                onChange={(e) => setEditingContent(prev => ({
                  ...prev,
                  form: { ...prev.form, status: e.target.value }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Override Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Override Reason</label>
            <textarea
              value={editingContent.form.override_reason}
              onChange={(e) => setEditingContent(prev => ({
                ...prev,
                form: { ...prev.form, override_reason: e.target.value }
              }))}
              rows={3}
              placeholder="Explain why you're making these changes..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => setEditingContent(prev => ({ ...prev, isOpen: false }))}
              disabled={editingContent.saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveContentChanges}
              loading={editingContent.saving}
              disabled={!editingContent.form.override_reason.trim()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, content: null, deleting: false })}
        onConfirm={handleDeleteContent}
        title="Delete Content"
        message={`Are you sure you want to delete "${deleteConfirmation.content?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteConfirmation.deleting}
      />
    </div>
  );
};

export default ContentManagement;