// components/content/ContentList.tsx
// List component for displaying multiple content items with pagination

import React, { useState, useEffect } from 'react';
import { Content, ContentFilters, Pagination } from '../../lib/types';
import { sortContentByPriority, filterContentBySearch } from '../../lib/utils';
import ContentCard from './ContentCard';
import { LoadingSkeleton, LoadingInline } from '../ui/Loading';
import Button from '../ui/Button';

interface ContentListProps {
  content: Content[];
  loading?: boolean;
  error?: string | null;
  pagination?: Pagination;
  variant?: 'default' | 'compact' | 'grid';
  showActions?: boolean;
  showStatus?: boolean;
  showConfidence?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  onEdit?: (content: Content) => void;
  onApprove?: (content: Content) => void;
  onReject?: (content: Content) => void;
  onDelete?: (content: Content) => void;
  onView?: (content: Content) => void;
  onLoadMore?: () => void;
  onPageChange?: (page: number) => void;
  className?: string;
}

type SortOption = 'newest' | 'oldest' | 'priority' | 'confidence' | 'title';

const ContentList: React.FC<ContentListProps> = ({
  content = [],
  loading = false,
  error = null,
  pagination,
  variant = 'default',
  showActions = false,
  showStatus = false,
  showConfidence = false,
  searchable = false,
  sortable = false,
  emptyMessage = 'No content found',
  emptyAction,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  onView,
  onLoadMore,
  onPageChange,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [displayContent, setDisplayContent] = useState<Content[]>([]);

  // Process content (search, sort, filter)
  useEffect(() => {
    let processed = [...content];

    // Apply search filter
    if (searchQuery.trim()) {
      processed = filterContentBySearch(processed, searchQuery);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        processed.sort((a, b) => b.created_at - a.created_at);
        break;
      case 'oldest':
        processed.sort((a, b) => a.created_at - b.created_at);
        break;
      case 'priority':
        processed = sortContentByPriority(processed);
        break;
      case 'confidence':
        processed.sort((a, b) => b.ai_confidence - a.ai_confidence);
        break;
      case 'title':
        processed.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        processed = sortContentByPriority(processed);
    }

    setDisplayContent(processed);
  }, [content, searchQuery, sortBy]);

  // Grid layout classes
  const gridClasses = {
    default: 'space-y-6',
    compact: 'space-y-4',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
  };

  // Loading state
  if (loading && content.length === 0) {
    return (
      <div className={className}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-4">
          <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">Error Loading Content</h3>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search and Sort Controls */}
      {(searchable || sortable) && (
        <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          )}

          {/* Sort */}
          {sortable && (
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="block border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="priority">Priority</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
                {showConfidence && <option value="confidence">AI Confidence</option>}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      {searchQuery && (
        <div className="mb-4 text-sm text-gray-600">
          {displayContent.length === 0 
            ? 'No results found' 
            : `${displayContent.length} result${displayContent.length === 1 ? '' : 's'} found`
          }
          {displayContent.length > 0 && (
            <button
              onClick={() => setSearchQuery('')}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Content List */}
      {displayContent.length > 0 ? (
        <>
          <div className={gridClasses[variant]}>
            {displayContent.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                variant={variant === 'grid' ? 'compact' : variant === 'compact' ? 'compact' : 'default'}
                showActions={showActions}
                showStatus={showStatus}
                showConfidence={showConfidence}
                onEdit={onEdit}
                onApprove={onApprove}
                onReject={onReject}
                onDelete={onDelete}
                onView={onView}
              />
            ))}
          </div>

          {/* Loading More Indicator */}
          {loading && content.length > 0 && (
            <div className="mt-8">
              <LoadingInline message="Loading more content..." />
            </div>
          )}

          {/* Pagination */}
          {pagination && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.current_page - 1) * pagination.per_page + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total_items)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total_items}</span>{' '}
                results
              </div>

              <div className="flex space-x-2">
                {/* Previous Page */}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.has_prev || loading}
                  onClick={() => onPageChange && onPageChange(pagination.current_page - 1)}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="hidden sm:flex space-x-1">
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    const page = i + Math.max(1, pagination.current_page - 2);
                    if (page > pagination.total_pages) return null;
                    
                    return (
                      <Button
                        key={page}
                        variant={page === pagination.current_page ? 'primary' : 'ghost'}
                        size="sm"
                        disabled={loading}
                        onClick={() => onPageChange && onPageChange(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                {/* Next Page */}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.has_next || loading}
                  onClick={() => onPageChange && onPageChange(pagination.current_page + 1)}
                >
                  Next
                  <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          {/* Load More Button (alternative to pagination) */}
          {onLoadMore && pagination?.has_next && (
            <div className="mt-8 text-center">
              <Button
                variant="secondary"
                onClick={onLoadMore}
                loading={loading}
              >
                Load More Content
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No matching content found' : emptyMessage}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms or clearing the search to see all content.'
              : 'Check back later for new content, or try adjusting your filters.'
            }
          </p>
          
          {emptyAction && !searchQuery && (
            <Button variant="primary" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )}

          {searchQuery && (
            <Button variant="secondary" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentList;