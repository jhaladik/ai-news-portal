// components/content/ContentCard.tsx
// Individual content card for displaying news articles

import React, { useState } from 'react';
import { Content } from '../../lib/types';
import { 
  formatDate, 
  getContentPreview, 
  getContentStatusColor, 
  getCategoryColor,
  formatConfidence 
} from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface ContentCardProps {
  content: Content;
  variant?: 'default' | 'compact' | 'featured';
  showActions?: boolean;
  showStatus?: boolean;
  showConfidence?: boolean;
  onEdit?: (content: Content) => void;
  onApprove?: (content: Content) => void;
  onReject?: (content: Content) => void;
  onDelete?: (content: Content) => void;
  onView?: (content: Content) => void;
  className?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  variant = 'default',
  showActions = false,
  showStatus = false,
  showConfidence = false,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  onView,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle action clicks with loading state
  const handleAction = async (action: () => void | Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if content should be expandable
  const isExpandable = content.content.length > 300;
  const displayContent = isExpanded ? content.content : getContentPreview(content.content, 300);

  // Get priority styling for emergency content
  const isEmergency = content.category === 'emergency';
  const cardClasses = isEmergency 
    ? 'border-red-200 bg-red-50' 
    : '';

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-lg ${cardClasses} ${className}`}
      padding={variant === 'compact' ? 'sm' : 'md'}
    >
      {/* Emergency Badge */}
      {isEmergency && (
        <div className="flex items-center mb-3">
          <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Emergency Alert</span>
          </div>
        </div>
      )}

      {/* Header with metadata */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {/* Title */}
          <h3 className={`font-semibold text-gray-900 ${
            variant === 'featured' ? 'text-xl' : 
            variant === 'compact' ? 'text-base' : 'text-lg'
          } leading-tight mb-2`}>
            {content.title}
          </h3>

          {/* Metadata */}
          <div className="flex items-center space-x-3 text-sm text-gray-500 mb-3">
            {/* Neighborhood */}
            <span className="flex items-center space-x-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{content.neighborhood_name}</span>
            </span>

            {/* Date */}
            <span className="flex items-center space-x-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatDate(content.created_at, { relative: true })}</span>
            </span>

            {/* AI Confidence (if enabled) */}
            {showConfidence && (
              <span className="flex items-center space-x-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>AI: {formatConfidence(content.ai_confidence)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end space-y-2 ml-4">
          {/* Category Badge */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(content.category)}`}>
            {content.category}
          </span>

          {/* Status Badge (if enabled) */}
          {showStatus && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getContentStatusColor(content.status)}`}>
              {content.status.replace('_', ' ')}
            </span>
          )}

          {/* Manual Override Indicator */}
          {content.manual_override && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edited
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm max-w-none text-gray-700 mb-4">
        <div dangerouslySetInnerHTML={{ __html: displayContent }} />
        
        {/* Expand/Collapse for long content */}
        {isExpandable && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Read More'}
          </button>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {/* View/Edit */}
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(content)}
                loading={isLoading}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </Button>
            )}

            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction(() => onEdit(content))}
                loading={isLoading}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {/* Approve/Reject for review status */}
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

            {/* Delete */}
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
        </div>
      )}
    </Card>
  );
};

export default ContentCard;