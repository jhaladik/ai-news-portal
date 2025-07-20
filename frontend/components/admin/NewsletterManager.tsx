// components/admin/NewsletterManager.tsx
// Newsletter creation, management, and sending interface

import React, { useState, useEffect } from 'react';
import { NewsletterTemplate, Newsletter, NewsletterSend, SendStatistics, Neighborhood } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../../lib/api-client';
import { formatDate, formatNumber, formatPercentage, timeAgo } from '../../lib/utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal, { ConfirmationModal } from '../ui/Modal';
import { LoadingInline } from '../ui/Loading';
import { useToastActions } from '../ui/Toast';

interface NewsletterManagerProps {
  neighborhoods?: Neighborhood[];
  className?: string;
}

interface NewsletterForm {
  template_id: string;
  neighborhood_id: string;
  subject: string;
  content_items: string[];
}

interface SendForm {
  newsletter_id: string;
  neighborhood_id: string;
  test_email: string;
  preview_only: boolean;
}

const NewsletterManager: React.FC<NewsletterManagerProps> = ({ 
  neighborhoods = [], 
  className = '' 
}) => {
  const { user, token } = useAuth();
  const [templates, setTemplates] = useState<NewsletterTemplate[]>([]);
  const [recentSends, setRecentSends] = useState<NewsletterSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<{
    isOpen: boolean;
    form: NewsletterForm;
    generating: boolean;
    generatedNewsletter: Newsletter | null;
  }>({
    isOpen: false,
    form: {
      template_id: '',
      neighborhood_id: '',
      subject: '',
      content_items: []
    },
    generating: false,
    generatedNewsletter: null
  });
  const [sending, setSending] = useState<{
    isOpen: boolean;
    form: SendForm;
    sending: boolean;
    statistics: SendStatistics | null;
  }>({
    isOpen: false,
    form: {
      newsletter_id: '',
      neighborhood_id: '',
      test_email: '',
      preview_only: false
    },
    sending: false,
    statistics: null
  });
  const [confirmSend, setConfirmSend] = useState<{
    isOpen: boolean;
    newsletter: Newsletter | null;
    sending: boolean;
  }>({
    isOpen: false,
    newsletter: null,
    sending: false
  });
  
  const { showSuccess, showError, showWarning } = useToastActions();

  // Load templates and recent sends
  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [templatesData, sendsData] = await Promise.all([
        apiClient.getNewsletterTemplates(),
        apiClient.getNewsletterSendHistory(token)
      ]);
      
      setTemplates(templatesData.templates);
      setRecentSends(sendsData.recent_sends);
    } catch (error) {
      console.error('Error loading newsletter data:', error);
      showError('Failed to load newsletter data');
    } finally {
      setLoading(false);
    }
  };

  // Generate newsletter from template
  const generateNewsletter = async () => {
    if (!token || !creating.form.neighborhood_id) return;

    setCreating(prev => ({ ...prev, generating: true }));
    
    try {
      const result = await apiClient.generateNewsletter(token, creating.form.neighborhood_id);
      setCreating(prev => ({ 
        ...prev, 
        generatedNewsletter: result.newsletter,
        form: { ...prev.form, subject: result.newsletter.subject }
      }));
      showSuccess('Newsletter generated successfully');
    } catch (error) {
      console.error('Error generating newsletter:', error);
      showError('Failed to generate newsletter');
    } finally {
      setCreating(prev => ({ ...prev, generating: false }));
    }
  };

  // Create newsletter from template
  const createNewsletter = async () => {
    if (!token || !creating.form.template_id) return;

    setCreating(prev => ({ ...prev, generating: true }));
    
    try {
      const result = await apiClient.createNewsletterFromTemplate(token, {
        template_id: creating.form.template_id,
        neighborhood_id: creating.form.neighborhood_id,
        subject: creating.form.subject || undefined,
        content_items: creating.form.content_items
      });
      
      setCreating(prev => ({ 
        ...prev, 
        generatedNewsletter: result.newsletter,
        isOpen: false
      }));
      
      // Open send modal
      setSending({
        isOpen: true,
        form: {
          newsletter_id: result.newsletter.id,
          neighborhood_id: creating.form.neighborhood_id,
          test_email: user?.email || '',
          preview_only: false
        },
        sending: false,
        statistics: null
      });
      
      showSuccess('Newsletter created successfully');
    } catch (error) {
      console.error('Error creating newsletter:', error);
      showError('Failed to create newsletter');
    } finally {
      setCreating(prev => ({ ...prev, generating: false }));
    }
  };

  // Send test email
  const sendTestEmail = async () => {
    if (!token) return;

    setSending(prev => ({ ...prev, sending: true }));
    
    try {
      const result = await apiClient.sendNewsletter(token, {
        newsletter_id: sending.form.newsletter_id,
        test_email: sending.form.test_email,
        preview_only: true
      });
      
      showSuccess(`Test email sent to ${sending.form.test_email}`);
    } catch (error) {
      console.error('Error sending test email:', error);
      showError('Failed to send test email');
    } finally {
      setSending(prev => ({ ...prev, sending: false }));
    }
  };

  // Send newsletter to all subscribers
  const sendNewsletter = async () => {
    if (!token || !confirmSend.newsletter) return;

    setConfirmSend(prev => ({ ...prev, sending: true }));
    
    try {
      const result = await apiClient.sendNewsletter(token, {
        newsletter_id: confirmSend.newsletter.id,
        neighborhood_id: sending.form.neighborhood_id || undefined,
        preview_only: false
      });
      
      if (result.statistics) {
        setSending(prev => ({ ...prev, statistics: result.statistics || null }));
      }
      
      showSuccess(`Newsletter sent successfully to ${result.statistics?.sent_count || 'all'} subscribers`);
      setConfirmSend({ isOpen: false, newsletter: null, sending: false });
      setSending(prev => ({ ...prev, isOpen: false }));
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error sending newsletter:', error);
      showError('Failed to send newsletter');
    } finally {
      setConfirmSend(prev => ({ ...prev, sending: false }));
    }
  };

  // Get template icon
  const getTemplateIcon = (templateType: string) => {
    switch (templateType) {
      case 'daily_digest':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'emergency_alert':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'weekly_summary':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'business_spotlight':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className={className}>
        <LoadingInline message="Loading newsletter management..." />
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Newsletter Management</h1>
          <p className="text-gray-600 mt-1">
            Create, preview, and send newsletters to subscribers
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => loadData()}
            disabled={loading}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          
          <Button
            variant="primary"
            onClick={() => setCreating(prev => ({ ...prev, isOpen: true }))}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Newsletter
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auto-Generate Newsletter */}
        <Card title="Auto-Generate Newsletter" padding="md">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Automatically generate a newsletter using the latest published content for a specific neighborhood.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Neighborhood
              </label>
              <select
                value={creating.form.neighborhood_id}
                onChange={(e) => setCreating(prev => ({
                  ...prev,
                  form: { ...prev.form, neighborhood_id: e.target.value }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select neighborhood...</option>
                {neighborhoods.map((neighborhood) => (
                  <option key={neighborhood.id} value={neighborhood.id}>
                    {neighborhood.name}
                  </option>
                ))}
              </select>
            </div>
            
            <Button
              variant="primary"
              onClick={generateNewsletter}
              loading={creating.generating}
              disabled={!creating.form.neighborhood_id || creating.generating}
              className="w-full"
            >
              Generate Newsletter
            </Button>
          </div>
        </Card>

        {/* Send Statistics */}
        <Card title="Recent Performance" padding="md">
          <div className="space-y-4">
            {recentSends.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-blue-600">
                      {formatNumber(recentSends.reduce((sum, send) => sum + send.sent_count, 0))}
                    </div>
                    <div className="text-xs text-gray-600">Total Sent</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatPercentage(recentSends.reduce((sum, send) => sum + send.open_rate, 0) / recentSends.length)}
                    </div>
                    <div className="text-xs text-gray-600">Avg Open Rate</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-purple-600">
                      {formatPercentage(recentSends.reduce((sum, send) => sum + send.click_rate, 0) / recentSends.length)}
                    </div>
                    <div className="text-xs text-gray-600">Avg Click Rate</div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="text-sm font-medium text-gray-900 mb-2">Recent Sends:</div>
                  {recentSends.slice(0, 3).map((send) => (
                    <div key={send.newsletter_id} className="flex justify-between items-center text-sm py-1">
                      <div className="truncate">
                        <span className="font-medium">{send.subject}</span>
                        <span className="text-gray-500 ml-2">{send.neighborhood_name}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {timeAgo(send.sent_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-600">No newsletters sent yet</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Newsletter Templates */}
      <Card title="Newsletter Templates">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setCreating(prev => ({
                ...prev,
                isOpen: true,
                form: { ...prev.form, template_id: template.id }
              }))}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="text-blue-600">
                  {getTemplateIcon(template.template_type)}
                </div>
                <h3 className="font-medium text-gray-900">{template.name}</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              <div className="text-xs text-gray-500">
                Default subject: "{template.default_subject}"
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Newsletter Sends */}
      {recentSends.length > 0 && (
        <Card title="Recent Newsletter Sends">
          <div className="space-y-4">
            {recentSends.map((send) => (
              <div key={send.newsletter_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{send.subject}</h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span>{send.neighborhood_name}</span>
                    <span>{formatDate(send.sent_at, { relative: true })}</span>
                    <span>{formatNumber(send.sent_count)} recipients</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {formatPercentage(send.open_rate)}
                    </div>
                    <div className="text-xs text-gray-600">Open Rate</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {formatPercentage(send.click_rate)}
                    </div>
                    <div className="text-xs text-gray-600">Click Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Newsletter Modal */}
      <Modal
        isOpen={creating.isOpen}
        onClose={() => setCreating(prev => ({ ...prev, isOpen: false }))}
        title="Create Newsletter"
        size="lg"
      >
        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Newsletter Template
            </label>
            <select
              value={creating.form.template_id}
              onChange={(e) => setCreating(prev => ({
                ...prev,
                form: { ...prev.form, template_id: e.target.value }
              }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Neighborhood */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Neighborhood
            </label>
            <select
              value={creating.form.neighborhood_id}
              onChange={(e) => setCreating(prev => ({
                ...prev,
                form: { ...prev.form, neighborhood_id: e.target.value }
              }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All neighborhoods</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Line (Optional)
            </label>
            <input
              type="text"
              value={creating.form.subject}
              onChange={(e) => setCreating(prev => ({
                ...prev,
                form: { ...prev.form, subject: e.target.value }
              }))}
              placeholder="Leave blank to use template default"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => setCreating(prev => ({ ...prev, isOpen: false }))}
              disabled={creating.generating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={createNewsletter}
              loading={creating.generating}
              disabled={!creating.form.template_id}
            >
              Create & Preview
            </Button>
          </div>
        </div>
      </Modal>

      {/* Send Newsletter Modal */}
      <Modal
        isOpen={sending.isOpen}
        onClose={() => setSending(prev => ({ ...prev, isOpen: false }))}
        title="Send Newsletter"
        size="lg"
      >
        <div className="space-y-6">
          {/* Test Email Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Test Email</h3>
            <p className="text-sm text-blue-700 mb-3">
              Send a test email to yourself before sending to all subscribers.
            </p>
            
            <div className="flex space-x-3">
              <input
                type="email"
                value={sending.form.test_email}
                onChange={(e) => setSending(prev => ({
                  ...prev,
                  form: { ...prev.form, test_email: e.target.value }
                }))}
                placeholder="your-email@example.com"
                className="flex-1 px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <Button
                variant="secondary"
                onClick={sendTestEmail}
                loading={sending.sending}
                disabled={!sending.form.test_email || sending.sending}
              >
                Send Test
              </Button>
            </div>
          </div>

          {/* Send to All Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">Send to All Subscribers</h3>
            <p className="text-sm text-green-700 mb-3">
              This will send the newsletter to all subscribers in the selected neighborhood.
            </p>
            
            <Button
              variant="primary"
              onClick={() => setConfirmSend({ 
                isOpen: true, 
                newsletter: creating.generatedNewsletter, 
                sending: false 
              })}
              disabled={!creating.generatedNewsletter}
              className="w-full"
            >
              Send to All Subscribers
            </Button>
          </div>

          {/* Statistics Display */}
          {sending.statistics && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Send Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Emails Sent:</span>
                  <span className="ml-2 font-medium">{formatNumber(sending.statistics.sent_count)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 font-medium capitalize">{sending.statistics.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => setSending(prev => ({ ...prev, isOpen: false }))}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Send Modal */}
      <ConfirmationModal
        isOpen={confirmSend.isOpen}
        onClose={() => setConfirmSend({ isOpen: false, newsletter: null, sending: false })}
        onConfirm={sendNewsletter}
        title="Send Newsletter to All Subscribers"
        message={`Are you sure you want to send "${confirmSend.newsletter?.subject}" to all subscribers? This action cannot be undone.`}
        confirmText="Send Newsletter"
        variant="warning"
        loading={confirmSend.sending}
      />
    </div>
  );
};

export default NewsletterManager;