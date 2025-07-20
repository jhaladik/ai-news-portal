// components/content/ContentPreview.tsx
// Full content preview component with modal and expanded view options

import React, { useState } from 'react';
import { Content, EditHistory } from '../../lib/types';
import { 
  formatDate, 
  getContentStatusColor, 
  getCategoryColor,
  formatConfidence,
  copyToClipboard 
} from '../../lib/utils';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useToastActions } from '../ui/Toast';

interface ContentPreviewProps {
  content: Content;
  editHistory?: EditHistory[];
  isOpen?: boolean;
  variant?: 'modal' | 'inline' | 'page';
  showActions?: boolean;
  showMetadata?: boolean;
  showHistory?: boolean;
  onClose?: () => void;
  onEdit?: (content: Content) => void;
  onApprove?: (content: Content) => void;
  onReject?: (content: Content) => void;
  onDelete?: (content: Content) => void;
  className?: string;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({
  content,
  editHistory = [],
  isOpen = true,
  variant = 'modal',
  showActions = false,
  showMetadata = true,
  showHistory = false,
  onClose,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'metadata' | 'history'>('content');
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToastActions();

  // Handle action clicks with loading state
  const handleAction = async (action: () => void | Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copy content
  const handleCopyContent = async () => {
    const success = await copyToClipboard(content.content);
    if (success) {
      showSuccess('Copied to clipboard');
    } else {
      showError('Failed to copy content');
    }
  };

  // Handle copy link (if URL available)
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/content/${content.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      showSuccess('Link copied to clipboard');
    } else {
      showError('Failed to copy link');
    }
  };

  // Content component
  const ContentComponent = () => (
    <div className="space-y-6">
      {/* Header with title and metadata */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {content.title}
          </h1>
          
          {/* Status and Category Badges */}
          <div className="flex flex-col items-end space-y-2 ml-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(content.category)}`}>
              {content.category}
            </span>
            
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getContentStatusColor(content.status)}`}>
              {content.status.replace('_', ' ')}
            </span>

            {content.manual_override && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Manually Edited
              </span>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{content.neighborhood_name}</span>
          </div>

          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Created {formatDate(content.created_at, { relative: true })}</span>
          </div>

          {content.published_at && (
            <div className="flex items-center space-x-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Published {formatDate(content.published_at, { relative: true })}</span>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Confidence: {formatConfidence(content.ai_confidence)}</span>
          </div>
        </div>
      </div>

      {/* Emergency Alert */}
      {content.category === 'emergency' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-800 font-medium">Emergency Alert</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <div dangerouslySetInnerHTML={{ __html: content.content }} />
      </div>

      {/* Admin Notes */}
      {content.admin_notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Admin Notes</h4>
          <p className="text-sm text-yellow-700">{content.admin_notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyContent}
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Content
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy Link
          </Button>
        </div>

        {showActions && (
          <div className="flex space-x-2">
            {content.status === 'review' && onApprove && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAction(() => onApprove!(content))}
                loading={isLoading}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve
              </Button>
            )}

            {content.status === 'review' && onReject && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleAction(() => onReject!(content))}
                loading={isLoading}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </Button>
            )}

            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction(() => onEdit!(content))}
                loading={isLoading}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            )}

            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleAction(() => onDelete!(content))}
                loading={isLoading}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Metadata component
  const MetadataComponent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ID</label>
            <p className="mt-1 text-sm text-gray-900 font-mono">{content.id}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <p className="mt-1 text-sm text-gray-900">{content.category}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <p className="mt-1 text-sm text-gray-900">{content.status}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">AI Confidence</label>
            <p className="mt-1 text-sm text-gray-900">{formatConfidence(content.ai_confidence)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Neighborhood</label>
            <p className="mt-1 text-sm text-gray-900">{content.neighborhood_name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Created</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(content.created_at, { includeTime: true })}</p>
          </div>
          
          {content.published_at && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Published</label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(content.published_at, { includeTime: true })}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Retry Count</label>
            <p className="mt-1 text-sm text-gray-900">{content.retry_count}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // History component
  const HistoryComponent = () => (
    <div className="space-y-4">
      {editHistory.length > 0 ? (
        editHistory.map((edit) => (
          <Card key={edit.id} padding="sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{edit.action}</span>
                <span className="text-xs text-gray-500">{formatDate(edit.edited_at, { includeTime: true })}</span>
              </div>
              
              {edit.override_reason && (
                <p className="text-sm text-gray-600">{edit.override_reason}</p>
              )}
              
              <div className="text-xs text-gray-500">
                Edited by: {edit.edited_by}
              </div>
            </div>
          </Card>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No edit history available</p>
        </div>
      )}
    </div>
  );

  // Render based on variant
  if (variant === 'modal') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        title="Content Preview"
        size="xl"
      >
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('content')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'content'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Content
            </button>
            
            {showMetadata && (
              <button
                onClick={() => setActiveTab('metadata')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'metadata'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Metadata
              </button>
            )}
            
            {showHistory && (
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                History ({editHistory.length})
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'content' && <ContentComponent />}
        {activeTab === 'metadata' && <MetadataComponent />}
        {activeTab === 'history' && <HistoryComponent />}
      </Modal>
    );
  }

  if (variant === 'inline') {
    return (
      <Card className={className}>
        <ContentComponent />
      </Card>
    );
  }

  // Page variant
  return (
    <div className={className}>
      <ContentComponent />
    </div>
  );
};

export default ContentPreview;