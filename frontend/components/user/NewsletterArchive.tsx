// components/user/NewsletterArchive.tsx
// Newsletter archive with engagement tracking and search functionality

import React, { useState, useEffect } from 'react';
import { NewsletterArchive, Pagination } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, timeAgo, debounce } from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { LoadingInline, LoadingSkeleton } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface NewsletterArchiveProps {
  className?: string;
}

const NewsletterArchiveComponent: React.FC<NewsletterArchiveProps> = ({ className = '' }) => {
  const { user, token } = useAuth();
  const [newsletters, setNewsletters] = useState<NewsletterArchive[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNewsletter, setSelectedNewsletter] = useState<NewsletterArchive | null>(null);
  const [trackingActions, setTrackingActions] = useState<Set<string>>(new Set());
  
  const { showSuccess, showError } = useToastActions();

  // Load newsletters
  const loadNewsletters = async (page: number = 1, search?: string, append: boolean = false) => {
    if (!token) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await apiClient.getNewsletterArchive(token, {
        limit: 20,
        offset: (page - 1) * 20
      });

      let filteredNewsletters = data.newsletters;
      
      // Client-side search filtering
      if (search && search.trim()) {
        const query = search.toLowerCase();
        filteredNewsletters = data.newsletters.filter(newsletter =>
          newsletter.subject.toLowerCase().includes(query) ||
          newsletter.content_preview.toLowerCase().includes(query) ||
          newsletter.neighborhood_name.toLowerCase().includes(query)
        );
      }

      if (append) {
        setNewsletters(prev => [...prev, ...filteredNewsletters]);
      } else {
        setNewsletters(filteredNewsletters);
      }
      
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading newsletters:', error);
      showError('Failed to load newsletter archive');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Debounced search
  const debouncedSearch = debounce((query: string) => {
    loadNewsletters(1, query);
  }, 300);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Track newsletter open
  const trackOpen = async (newsletter: NewsletterArchive) => {
    if (!token || newsletter.opened_at || trackingActions.has(newsletter.id)) return;

    setTrackingActions(prev => new Set(prev).add(newsletter.id));
    
    try {
      await apiClient.trackNewsletterOpen(token, newsletter.id);
      
      // Update local state
      setNewsletters(prev => prev.map(n => 
        n.id === newsletter.id 
          ? { ...n, opened_at: Math.floor(Date.now() / 1000) }
          : n
      ));
      
      if (selectedNewsletter?.id === newsletter.id) {
        setSelectedNewsletter({ ...newsletter, opened_at: Math.floor(Date.now() / 1000) });
      }
    } catch (error) {
      console.error('Error tracking open:', error);
    } finally {
      setTrackingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(newsletter.id);
        return newSet;
      });
    }
  };

  // Track newsletter click
  const trackClick = async (newsletter: NewsletterArchive) => {
    if (!token || trackingActions.has(`${newsletter.id}-click`)) return;

    setTrackingActions(prev => new Set(prev).add(`${newsletter.id}-click`));
    
    try {
      await apiClient.trackNewsletterClick(token, newsletter.id);
      
      // Update local state
      setNewsletters(prev => prev.map(n => 
        n.id === newsletter.id 
          ? { ...n, clicked_at: Math.floor(Date.now() / 1000) }
          : n
      ));
      
      if (selectedNewsletter?.id === newsletter.id) {
        setSelectedNewsletter({ ...newsletter, clicked_at: Math.floor(Date.now() / 1000) });
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    } finally {
      setTrackingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${newsletter.id}-click`);
        return newSet;
      });
    }
  };

  // Handle newsletter selection
  const selectNewsletter = (newsletter: NewsletterArchive) => {
    setSelectedNewsletter(newsletter);
    trackOpen(newsletter);
  };

  // Load more newsletters
  const loadMore = () => {
    if (!pagination?.has_next || loadingMore) return;
    loadNewsletters(pagination.current_page + 1, searchQuery, true);
  };

  // Load data on mount
  useEffect(() => {
    loadNewsletters();
  }, [token]);

  if (loading && newsletters.length === 0) {
    return (
      <div className={className}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Newsletter Archive</h2>
          <p className="text-gray-600 mt-1">
            View all newsletters you've received and track your reading history
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search newsletters..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{newsletters.length}</div>
            <div className="text-sm text-gray-600">Total Newsletters</div>
          </div>
        </Card>
        
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {newsletters.filter(n => n.opened_at).length}
            </div>
            <div className="text-sm text-gray-600">Opened</div>
          </div>
        </Card>
        
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {newsletters.filter(n => n.clicked_at).length}
            </div>
            <div className="text-sm text-gray-600">Clicked</div>
          </div>
        </Card>
        
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {newsletters.length > 0 
                ? Math.round((newsletters.filter(n => n.opened_at).length / newsletters.length) * 100)
                : 0}%
            </div>
            <div className="text-sm text-gray-600">Open Rate</div>
          </div>
        </Card>
      </div>

      {/* Newsletter List */}
      {newsletters.length > 0 ? (
        <div className="space-y-4">
          {newsletters.map((newsletter) => (
            <Card 
              key={newsletter.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                !newsletter.opened_at ? 'border-blue-200 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => selectNewsletter(newsletter)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center space-x-2 mb-2">
                    {!newsletter.opened_at && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        New
                      </span>
                    )}
                    
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {newsletter.neighborhood_name}
                    </span>
                    
                    <span className="text-sm text-gray-500">
                      {formatDate(newsletter.sent_at, { relative: true })}
                    </span>
                  </div>

                  {/* Subject */}
                  <h3 className={`text-lg leading-tight mb-2 ${
                    !newsletter.opened_at ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
                  }`}>
                    {newsletter.subject}
                  </h3>

                  {/* Preview */}
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {newsletter.content_preview}
                  </p>

                  {/* Engagement Indicators */}
                  <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                    {newsletter.opened_at && (
                      <span className="flex items-center space-x-1">
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Opened {timeAgo(newsletter.opened_at)}</span>
                      </span>
                    )}
                    
                    {newsletter.clicked_at && (
                      <span className="flex items-center space-x-1">
                        <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <span>Clicked {timeAgo(newsletter.clicked_at)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackClick(newsletter);
                      // Here you would typically open the newsletter in a new tab
                      // For now, we'll just track the click
                      showSuccess('Newsletter interaction tracked');
                    }}
                    disabled={trackingActions.has(`${newsletter.id}-click`)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Button>
                  
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Card>
          ))}

          {/* Load More */}
          {pagination?.has_next && (
            <div className="text-center pt-6">
              <Button
                variant="secondary"
                onClick={loadMore}
                loading={loadingMore}
              >
                Load More Newsletters
              </Button>
            </div>
          )}

          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="py-4">
              <LoadingInline message="Loading more newsletters..." />
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <Card className="text-center py-12">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No newsletters found' : 'No newsletters yet'}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms or clearing the search.'
              : 'You haven\'t received any newsletters yet. Make sure your email notifications are enabled in your preferences.'
            }
          </p>
          
          {searchQuery ? (
            <Button
              variant="secondary"
              onClick={() => handleSearch('')}
            >
              Clear Search
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => window.location.href = '/preferences'}
            >
              Update Preferences
            </Button>
          )}
        </Card>
      )}

      {/* Newsletter Detail Modal */}
      {selectedNewsletter && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setSelectedNewsletter(null)}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedNewsletter.subject}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedNewsletter.neighborhood_name} • {formatDate(selectedNewsletter.sent_at)}
                  </p>
                </div>
                
                <button
                  onClick={() => setSelectedNewsletter(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  {selectedNewsletter.content_preview}
                  
                  {/* Placeholder for full content */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 text-center">
                      Full newsletter content would be displayed here.
                      <br />
                      This would typically be fetched from the newsletter content API.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {selectedNewsletter.opened_at && (
                    <span className="flex items-center space-x-1">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Opened</span>
                    </span>
                  )}
                  
                  {selectedNewsletter.clicked_at && (
                    <span className="flex items-center space-x-1">
                      <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      <span>Clicked</span>
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      trackClick(selectedNewsletter);
                      showSuccess('Newsletter click tracked');
                    }}
                    disabled={trackingActions.has(`${selectedNewsletter.id}-click`)}
                  >
                    View Full Newsletter
                  </Button>
                  
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedNewsletter(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterArchiveComponent;