// components/admin/AdminDashboard.tsx
// Admin dashboard with system overview, metrics, and quick actions

import React, { useState, useEffect } from 'react';
import { AdminDashboardData, UrgentItem, QuickAction, Activity } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, formatNumber, formatPercentage, timeAgo } from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface AdminDashboardProps {
  className?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ className = '' }) => {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  
  const { showSuccess, showError } = useToastActions();

  // Load dashboard data
  const loadDashboard = async (showLoader: boolean = true) => {
    if (!token) return;

    if (showLoader) setLoading(true);
    
    try {
      const data = await apiClient.getAdminDashboard(token);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
      showError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Refresh dashboard
  const refreshDashboard = async () => {
    setRefreshing(true);
    await loadDashboard(false);
    setRefreshing(false);
    showSuccess('Dashboard refreshed');
  };

  // Execute quick action
  const executeQuickAction = async (action: QuickAction) => {
    if (!token) return;

    setExecutingAction(action.id);
    
    try {
      // This would typically call specific API endpoints based on action type
      // For now, we'll simulate the action execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess(`Action "${action.title}" executed successfully`);
      await loadDashboard(false); // Refresh data
    } catch (error) {
      console.error('Error executing action:', error);
      showError(`Failed to execute action: ${action.title}`);
    } finally {
      setExecutingAction(null);
    }
  };

  // Get status color classes
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
      case 'operational':
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'critical':
      case 'down':
        return 'text-red-600 bg-red-100';
      case 'stopped':
      case 'idle':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDashboard();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDashboard(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  if (loading && !dashboardData) {
    return (
      <div className={className}>
        <LoadingInline message="Loading admin dashboard..." />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-600">Unable to load dashboard data.</p>
        <Button variant="primary" onClick={() => loadDashboard()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const { overview, content_queue, urgent_items, recent_activity, system_health, metrics, quick_actions } = dashboardData;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            System overview and management console
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="ghost"
            onClick={refreshDashboard}
            loading={refreshing}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          
          <Button
            variant="primary"
            onClick={() => window.location.href = '/admin/analytics'}
          >
            View Analytics
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pipeline Status */}
        <Card padding="sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(overview.pipeline_status)}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Pipeline Status</p>
              <p className={`text-lg font-bold capitalize ${overview.pipeline_status === 'running' ? 'text-green-600' : 'text-gray-600'}`}>
                {overview.pipeline_status}
              </p>
            </div>
          </div>
        </Card>

        {/* Processing Efficiency */}
        <Card padding="sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                overview.processing_efficiency > 0.8 ? 'text-green-600 bg-green-100' : 
                overview.processing_efficiency > 0.6 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100'
              }`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Efficiency</p>
              <p className="text-lg font-bold text-gray-900">
                {formatPercentage(overview.processing_efficiency)}
              </p>
            </div>
          </div>
        </Card>

        {/* Urgent Items */}
        <Card padding="sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                overview.urgent_items_count > 0 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'
              }`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Urgent Items</p>
              <p className={`text-lg font-bold ${overview.urgent_items_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatNumber(overview.urgent_items_count)}
              </p>
            </div>
          </div>
        </Card>

        {/* Last Pipeline Run */}
        <Card padding="sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-blue-600 bg-blue-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Last Run</p>
              <p className="text-lg font-bold text-gray-900">
                {overview.last_pipeline_run ? timeAgo(overview.last_pipeline_run) : 'Never'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Content Queue & Urgent Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Queue Overview */}
          <Card title="Content Processing Queue">
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(content_queue.by_status).map(([status, queue]) => (
                  <div key={status} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{queue.count}</div>
                    <div className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</div>
                    {queue.oldest_item_age && (
                      <div className="text-xs text-gray-500">
                        Oldest: {Math.floor(queue.oldest_item_age / 3600)}h ago
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    Total Items: {formatNumber(content_queue.total_items)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.location.href = '/admin/content'}
                  >
                    Manage Content
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Urgent Items */}
          {urgent_items.length > 0 && (
            <Card title="Urgent Items Requiring Attention">
              <div className="space-y-3">
                {urgent_items.slice(0, 5).map((item) => (
                  <div key={item.id} className={`p-4 border-l-4 rounded-md ${getUrgencyColor(item.urgency)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="capitalize">{item.type.replace('_', ' ')}</span>
                          <span>{timeAgo(item.created_at)}</span>
                          <span className="font-medium capitalize">{item.urgency} Priority</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Handle urgent item action
                          showSuccess(`Handling: ${item.title}`);
                        }}
                      >
                        {item.action_required}
                      </Button>
                    </div>
                  </div>
                ))}
                
                {urgent_items.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="ghost" size="sm">
                      View All {urgent_items.length} Urgent Items
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* System Metrics Overview */}
          <Card title="System Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(metrics.users.total)}
                </div>
                <div className="text-sm text-gray-600">Total Users</div>
                <div className="text-xs text-gray-500">
                  +{metrics.users.new_signups_today} today
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(metrics.content.published_today)}
                </div>
                <div className="text-sm text-gray-600">Published Today</div>
                <div className="text-xs text-gray-500">
                  {metrics.content.pending_review} pending
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(metrics.newsletters.sent_today)}
                </div>
                <div className="text-sm text-gray-600">Newsletters Sent</div>
                <div className="text-xs text-gray-500">
                  {formatPercentage(metrics.newsletters.avg_open_rate)} open rate
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(metrics.users.active_today)}
                </div>
                <div className="text-sm text-gray-600">Active Today</div>
                <div className="text-xs text-gray-500">
                  {formatPercentage(metrics.users.active_today / metrics.users.total)} of total
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - System Health & Quick Actions */}
        <div className="space-y-6">
          {/* System Health */}
          <Card title="System Health">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Overall Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(system_health.overall_status)}`}>
                  {system_health.overall_status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">RSS Sources</span>
                  <span className="font-medium">
                    {system_health.rss_sources.healthy}/{system_health.rss_sources.total}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">AI Pipeline</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(system_health.ai_pipeline.status)}`}>
                    {system_health.ai_pipeline.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Email System</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(system_health.email_system.status)}`}>
                    {system_health.email_system.status}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>AI Success Rate: {formatPercentage(system_health.ai_pipeline.success_rate)}</div>
                  <div>Email Delivery: {formatPercentage(system_health.email_system.delivery_rate)}</div>
                  <div>Last Check: {timeAgo(system_health.ai_pipeline.last_run)}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="space-y-3">
              {quick_actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.urgency === 'high' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => executeQuickAction(action)}
                  loading={executingAction === action.id}
                  disabled={!!executingAction}
                  className="w-full justify-start"
                >
                  {action.title}
                </Button>
              ))}
              
              <div className="border-t border-gray-200 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/admin/settings'}
                  className="w-full"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  System Settings
                </Button>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card title="Recent Activity">
            <div className="space-y-3">
              {recent_activity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="text-sm">
                  <div className="text-gray-900">{activity.description}</div>
                  <div className="text-xs text-gray-500">{timeAgo(activity.timestamp)}</div>
                </div>
              ))}
              
              {recent_activity.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/admin/activity'}
                  className="w-full mt-3"
                >
                  View All Activity
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Dashboard auto-refreshes every 30 seconds • Last updated: {formatDate(dashboardData.generated_at, { includeTime: true, relative: true })}
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;