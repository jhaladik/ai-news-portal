// components/admin/AdminAnalytics.tsx
// Comprehensive analytics dashboard with charts and metrics

import React, { useState, useEffect } from 'react';
import { 
  UserMetrics, 
  ContentMetrics, 
  NewsletterMetrics, 
  NeighborhoodStats, 
  DailyTrends,
  CategoryStats,
  NeighborhoodNewsletterStats 
} from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, formatNumber, formatPercentage } from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface AdminAnalyticsProps {
  className?: string;
}

interface AnalyticsData {
  users: UserMetrics;
  content: ContentMetrics;
  newsletters: NewsletterMetrics;
  neighborhoods: NeighborhoodStats[];
  trends: DailyTrends[];
}

type TimeframeOption = '1d' | '7d' | '30d' | '90d';

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ className = '' }) => {
  const { token } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('7d');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  
  const { showSuccess, showError } = useToastActions();

  // Load analytics data
  const loadAnalytics = async (timeframe: TimeframeOption = selectedTimeframe, neighborhood?: string, showLoader: boolean = true) => {
    if (!token) return;

    if (showLoader) setLoading(true);
    
    try {
      const data = await apiClient.getAdminAnalytics(token, timeframe, neighborhood);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      showError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Handle timeframe change
  const handleTimeframeChange = (timeframe: TimeframeOption) => {
    setSelectedTimeframe(timeframe);
    loadAnalytics(timeframe, selectedNeighborhood);
  };

  // Handle neighborhood filter
  const handleNeighborhoodChange = (neighborhoodId: string) => {
    setSelectedNeighborhood(neighborhoodId);
    loadAnalytics(selectedTimeframe, neighborhoodId);
  };

  // Refresh analytics
  const refreshAnalytics = async () => {
    setRefreshing(true);
    await loadAnalytics(selectedTimeframe, selectedNeighborhood, false);
    setRefreshing(false);
    showSuccess('Analytics refreshed');
  };

  // Export data (placeholder)
  const exportData = () => {
    if (!analyticsData) return;
    
    const dataToExport = {
      timeframe: selectedTimeframe,
      neighborhood: selectedNeighborhood,
      generated_at: new Date().toISOString(),
      ...analyticsData
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${selectedTimeframe}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Analytics data exported');
  };

  // Get timeframe label
  const getTimeframeLabel = (timeframe: TimeframeOption): string => {
    const labels = {
      '1d': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days'
    };
    return labels[timeframe];
  };

  // Calculate growth rate
  const calculateGrowthRate = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Load data on mount
  useEffect(() => {
    loadAnalytics();
  }, [token]);

  if (loading && !analyticsData) {
    return (
      <div className={className}>
        <LoadingInline message="Loading analytics..." />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-600">Unable to load analytics data.</p>
        <Button variant="primary" onClick={() => loadAnalytics()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const { users, content, newsletters, neighborhoods, trends } = analyticsData;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive system analytics and performance metrics
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            variant="ghost"
            onClick={refreshAnalytics}
            loading={refreshing}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          
          <Button
            variant="secondary"
            onClick={exportData}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Data
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Timeframe Filter */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <div className="flex space-x-1">
              {(['1d', '7d', '30d', '90d'] as TimeframeOption[]).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => handleTimeframeChange(timeframe)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedTimeframe === timeframe
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getTimeframeLabel(timeframe)}
                </button>
              ))}
            </div>
          </div>

          {/* Neighborhood Filter */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Neighborhood:</label>
            <select
              value={selectedNeighborhood}
              onChange={(e) => handleNeighborhoodChange(e.target.value)}
              className="block border border-gray-300 rounded-md px-3 py-1 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Neighborhoods</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.neighborhood_id} value={neighborhood.neighborhood_id}>
                  {neighborhood.neighborhood_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card padding="sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(users.total_users)}</p>
              <p className="text-sm text-green-600">+{formatNumber(users.new_signups)} new</p>
            </div>
          </div>
        </Card>

        {/* Active Users */}
        <Card padding="sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(users.active_users)}</p>
              <p className="text-sm text-gray-600">
                {formatPercentage(users.active_users / users.total_users)} of total
              </p>
            </div>
          </div>
        </Card>

        {/* Published Content */}
        <Card padding="sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Published Content</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(content.published_content)}</p>
              <p className="text-sm text-gray-600">
                {formatPercentage(1 - content.rejection_rate)} approval rate
              </p>
            </div>
          </div>
        </Card>

        {/* Newsletter Performance */}
        <Card padding="sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Newsletter Open Rate</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(newsletters.avg_open_rate)}</p>
              <p className="text-sm text-gray-600">
                {formatNumber(newsletters.total_sent)} sent
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Trends Chart */}
        <Card title="Daily Trends" className="lg:col-span-2">
          <div className="space-y-4">
            {/* Simple line chart representation */}
            <div className="h-64 bg-gray-50 rounded-lg flex items-end justify-center p-4 space-x-1">
              {trends.slice(-7).map((day, index) => {
                const maxValue = Math.max(...trends.map(t => t.users_active));
                const height = (day.users_active / maxValue) * 200;
                
                return (
                  <div key={day.date} className="flex flex-col items-center">
                    <div 
                      className="bg-blue-500 rounded-t w-8 transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${height}px` }}
                      title={`${day.users_active} active users on ${formatDate(new Date(day.date).getTime() / 1000)}`}
                    />
                    <div className="text-xs text-gray-600 mt-2">
                      {formatDate(new Date(day.date).getTime() / 1000, { short: true }).split(',')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-t border-gray-200 pt-4">
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {formatNumber(trends.reduce((sum, day) => sum + day.users_active, 0) / trends.length)}
                </div>
                <div className="text-sm text-gray-600">Avg Daily Users</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {formatNumber(trends.reduce((sum, day) => sum + day.content_published, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Published</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-600">
                  {formatNumber(trends.reduce((sum, day) => sum + day.newsletters_sent, 0))}
                </div>
                <div className="text-sm text-gray-600">Newsletters Sent</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-orange-600">
                  {formatPercentage(trends.reduce((sum, day) => sum + day.open_rate, 0) / trends.length)}
                </div>
                <div className="text-sm text-gray-600">Avg Open Rate</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Content by Category */}
        <Card title="Content by Category">
          <div className="space-y-4">
            {content.by_category.map((category) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getCategoryColor(category.category)}`} />
                  <span className="text-sm font-medium capitalize">{category.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatNumber(category.count)}</div>
                  <div className="text-xs text-gray-500">
                    {formatPercentage(category.approval_rate)} approved
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Neighborhood Performance */}
        <Card title="Neighborhood Performance">
          <div className="space-y-4">
            {neighborhoods.slice(0, 6).map((neighborhood) => (
              <div key={neighborhood.neighborhood_id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{neighborhood.neighborhood_name}</div>
                  <div className="text-xs text-gray-500">
                    {formatNumber(neighborhood.user_count)} users
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {formatNumber(neighborhood.content_published)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPercentage(neighborhood.newsletter_engagement)} engagement
                  </div>
                </div>
              </div>
            ))}
            
            {neighborhoods.length > 6 && (
              <div className="text-center pt-2 border-t border-gray-200">
                <Button variant="ghost" size="sm">
                  View All {neighborhoods.length} Neighborhoods
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Statistics */}
        <Card title="User Statistics">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="font-semibold">{formatNumber(users.total_users)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Users</span>
              <span className="font-semibold">{formatNumber(users.active_users)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">New Signups</span>
              <span className="font-semibold text-green-600">+{formatNumber(users.new_signups)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Churn Rate</span>
              <span className={`font-semibold ${users.churn_rate > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPercentage(users.churn_rate)}
              </span>
            </div>
          </div>
        </Card>

        {/* Content Statistics */}
        <Card title="Content Statistics">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Published</span>
              <span className="font-semibold">{formatNumber(content.published_content)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Review</span>
              <span className="font-semibold text-yellow-600">{formatNumber(content.pending_review)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">AI Confidence</span>
              <span className="font-semibold">{formatPercentage(content.ai_confidence_avg)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Manual Overrides</span>
              <span className="font-semibold">{formatNumber(content.manual_overrides)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rejection Rate</span>
              <span className={`font-semibold ${content.rejection_rate > 0.2 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPercentage(content.rejection_rate)}
              </span>
            </div>
          </div>
        </Card>

        {/* Newsletter Statistics */}
        <Card title="Newsletter Statistics">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Sent</span>
              <span className="font-semibold">{formatNumber(newsletters.total_sent)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Open Rate</span>
              <span className="font-semibold text-green-600">{formatPercentage(newsletters.avg_open_rate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Click Rate</span>
              <span className="font-semibold text-blue-600">{formatPercentage(newsletters.avg_click_rate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Delivery Rate</span>
              <span className={`font-semibold ${newsletters.delivery_rate > 0.95 ? 'text-green-600' : 'text-yellow-600'}`}>
                {formatPercentage(newsletters.delivery_rate)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Helper function to get category colors
const getCategoryColor = (category: string): string => {
  const colors = {
    emergency: 'bg-red-500',
    local: 'bg-blue-500',
    business: 'bg-green-500',
    community: 'bg-purple-500',
    events: 'bg-orange-500'
  };
  return colors[category as keyof typeof colors] || 'bg-gray-500';
};

export default AdminAnalytics;