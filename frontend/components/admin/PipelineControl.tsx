// components/admin/PipelineControl.tsx
// AI pipeline management and control interface

import React, { useState, useEffect } from 'react';
import { PipelineStatus, PipelineAction, PipelineResponse } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, formatNumber, formatDuration, timeAgo } from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal, { ConfirmationModal } from '../ui/Modal';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface PipelineControlProps {
  className?: string;
}

interface ActionInProgress {
  action: string;
  loading: boolean;
}

const PipelineControl: React.FC<PipelineControlProps> = ({ className = '' }) => {
  const { token } = useAuth();
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<ActionInProgress | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    isOpen: boolean;
    action: PipelineAction | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    action: null,
    title: '',
    message: ''
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { showSuccess, showError, showWarning } = useToastActions();

  // Load pipeline status
  const loadPipelineStatus = async (showLoader: boolean = true) => {
    if (!token) return;

    if (showLoader) setLoading(true);
    
    try {
      const status = await apiClient.getPipelineStatus(token);
      setPipelineStatus(status);
    } catch (error) {
      console.error('Error loading pipeline status:', error);
      showError('Failed to load pipeline status');
    } finally {
      setLoading(false);
    }
  };

  // Execute pipeline action
  const executePipelineAction = async (action: PipelineAction) => {
    if (!token) return;

    setActionInProgress({ action: action.action, loading: true });
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Executing: ${action.action}`]);
    
    try {
      const response = await apiClient.controlPipeline(token, action);
      
      if (response.success) {
        showSuccess(`Action completed: ${action.action}`, response.message);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ ${response.message}`]);
        
        // Update status if provided
        if (response.updated_status) {
          setPipelineStatus(response.updated_status);
        } else {
          // Refresh status after a brief delay
          setTimeout(() => loadPipelineStatus(false), 1000);
        }
      } else {
        throw new Error(response.message || 'Action failed');
      }
    } catch (error) {
      console.error('Error executing pipeline action:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError(`Action failed: ${action.action}`, errorMessage);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✗ ${errorMessage}`]);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle action with confirmation
  const handleActionWithConfirmation = (
    action: PipelineAction, 
    title: string, 
    message: string
  ) => {
    setShowConfirmModal({
      isOpen: true,
      action,
      title,
      message
    });
  };

  // Confirm and execute action
  const confirmAndExecuteAction = () => {
    if (showConfirmModal.action) {
      executePipelineAction(showConfirmModal.action);
    }
    setShowConfirmModal({ isOpen: false, action: null, title: '', message: '' });
  };

  // Get status display properties
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'running':
        return {
          color: 'text-green-600 bg-green-100',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m7-10a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          ),
          label: 'Running'
        };
      case 'stopped':
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ),
          label: 'Stopped'
        };
      case 'error':
        return {
          color: 'text-red-600 bg-red-100',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          label: 'Error'
        };
      case 'idle':
        return {
          color: 'text-blue-600 bg-blue-100',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Idle'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Unknown'
        };
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    showSuccess('Logs cleared');
  };

  // Load data on mount and set up auto-refresh
  useEffect(() => {
    loadPipelineStatus();
    
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadPipelineStatus(false);
        }
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, autoRefresh]);

  if (loading && !pipelineStatus) {
    return (
      <div className={className}>
        <LoadingInline message="Loading pipeline status..." />
      </div>
    );
  }

  if (!pipelineStatus) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-600">Unable to load pipeline status.</p>
        <Button variant="primary" onClick={() => loadPipelineStatus()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(pipelineStatus.current_status);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipeline Control</h1>
          <p className="text-gray-600 mt-1">
            Monitor and control the AI content processing pipeline
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700">
              Auto-refresh
            </label>
          </div>
          
          <Button
            variant="ghost"
            onClick={() => loadPipelineStatus()}
            disabled={!!actionInProgress}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Status */}
      <Card title="Current Pipeline Status">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${statusDisplay.color}`}>
              {statusDisplay.icon}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{statusDisplay.label}</h3>
              <p className="text-gray-600">
                {pipelineStatus.last_run.completed_at 
                  ? `Last completed: ${timeAgo(pipelineStatus.last_run.completed_at)}`
                  : `Last started: ${timeAgo(pipelineStatus.last_run.started_at)}`
                }
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-600">Processing Stats</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatNumber(pipelineStatus.processing_stats.items_per_hour)} items/hour
            </div>
            <div className="text-sm text-gray-500">
                {Math.round(pipelineStatus.processing_stats.success_rate * 100)}% success rate  
            </div>
          </div>
        </div>
      </Card>

      {/* Pipeline Actions */}
      <Card title="Pipeline Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Trigger Pipeline */}
          <Button
            variant="primary"
            onClick={() => 
              handleActionWithConfirmation(
                { action: 'trigger_pipeline' },
                'Trigger Pipeline',
                'This will start the complete RSS → AI → Publication pipeline process. Continue?'
              )
            }
            disabled={!!actionInProgress || pipelineStatus.current_status === 'running'}
            loading={actionInProgress?.action === 'trigger_pipeline'}
            className="flex-col h-20"
          >
            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m7-10a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
            Start Pipeline
          </Button>

          {/* Stop Pipeline */}
          <Button
            variant="danger"
            onClick={() => 
              handleActionWithConfirmation(
                { action: 'stop_pipeline' },
                'Stop Pipeline',
                'This will halt the current pipeline execution. Any running processes will be stopped. Continue?'
              )
            }
            disabled={!!actionInProgress || pipelineStatus.current_status !== 'running'}
            loading={actionInProgress?.action === 'stop_pipeline'}
            className="flex-col h-20"
          >
            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop Pipeline
          </Button>

          {/* Retry Failed */}
          <Button
            variant="secondary"
            onClick={() => 
              handleActionWithConfirmation(
                { action: 'retry_failed' },
                'Retry Failed Items',
                'This will retry processing all items that previously failed. Continue?'
              )
            }
            disabled={!!actionInProgress}
            loading={actionInProgress?.action === 'retry_failed'}
            className="flex-col h-20"
          >
            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Failed
          </Button>

          {/* Bulk Approve */}
          <Button
            variant="secondary"
            onClick={() => 
              handleActionWithConfirmation(
                { action: 'bulk_approve' },
                'Bulk Approve Content',
                'This will automatically approve all content items with high AI confidence scores. Continue?'
              )
            }
            disabled={!!actionInProgress}
            loading={actionInProgress?.action === 'bulk_approve'}
            className="flex-col h-20"
          >
            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Bulk Approve
          </Button>

          {/* Clear Errors */}
          <Button
            variant="ghost"
            onClick={() => 
              handleActionWithConfirmation(
                { action: 'clear_errors' },
                'Clear Error Logs',
                'This will clear all error logs and reset error counts. Continue?'
              )
            }
            disabled={!!actionInProgress}
            loading={actionInProgress?.action === 'clear_errors'}
            className="flex-col h-20"
          >
            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Errors
          </Button>
        </div>
      </Card>

      {/* Pipeline Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Last Run Details */}
        <Card title="Last Pipeline Run">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  pipelineStatus.last_run.status === 'completed' ? 'bg-green-100 text-green-800' :
                  pipelineStatus.last_run.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {pipelineStatus.last_run.status}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <p className="text-sm text-gray-900">
                  {pipelineStatus.last_run.completed_at 
                    ? formatDuration(pipelineStatus.last_run.completed_at - pipelineStatus.last_run.started_at)
                    : 'In progress'
                  }
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Items Collected</label>
                <p className="text-lg font-semibold text-blue-600">
                  {formatNumber(pipelineStatus.last_run.collected_items)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Items Generated</label>
                <p className="text-lg font-semibold text-green-600">
                  {formatNumber(pipelineStatus.last_run.generated_items)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Items Published</label>
              <p className="text-lg font-semibold text-purple-600">
                {formatNumber(pipelineStatus.last_run.published_items)}
              </p>
            </div>

            {pipelineStatus.last_run.error_message && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm font-medium text-red-800">Error Message:</div>
                <div className="text-sm text-red-700 mt-1">{pipelineStatus.last_run.error_message}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Queue Summary */}
        <Card title="Current Queue">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber(pipelineStatus.queue_summary.total_pending)}
              </div>
              <div className="text-sm text-gray-600">Total Pending Items</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(pipelineStatus.queue_summary.by_status).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{formatNumber(count)}</div>
                  <div className="text-xs text-gray-600 capitalize">{status.replace('_', ' ')}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-600">Processing Rate</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatNumber(pipelineStatus.processing_stats.items_per_hour)} items/hour
              </div>
              <div className="text-xs text-gray-500">
                Avg processing time: {formatDuration(pipelineStatus.processing_stats.avg_processing_time)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Logs */}
      <Card title="Activity Logs">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Real-time pipeline activity and command execution logs
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            disabled={logs.length === 0}
          >
            Clear Logs
          </Button>
        </div>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          ) : (
            <div className="text-gray-500">No activity logs yet...</div>
          )}
          
          {actionInProgress && (
            <div className="flex items-center space-x-2 text-yellow-400">
              <div className="animate-spin h-3 w-3 border border-yellow-400 border-t-transparent rounded-full" />
              <span>Executing {actionInProgress.action}...</span>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal.isOpen}
        onClose={() => setShowConfirmModal({ isOpen: false, action: null, title: '', message: '' })}
        onConfirm={confirmAndExecuteAction}
        title={showConfirmModal.title}
        message={showConfirmModal.message}
        confirmText="Execute"
        variant={showConfirmModal.action?.action === 'stop_pipeline' ? 'danger' : 'info'}
        loading={!!actionInProgress}
      />
    </div>
  );
};

export default PipelineControl;