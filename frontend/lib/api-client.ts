// lib/api-client.ts
// Centralized API client for communicating with all Cloudflare Workers

import {
    User,
    LoginCredentials,
    LoginResponse,
    Content,
    ContentFilters,
    ContentListResponse,
    UserPreferences,
    UserProfile,
    UserEngagementStats,
    NewsletterArchive,
    AdminDashboardData,
    UserMetrics,
    ContentMetrics,
    NewsletterMetrics,
    NeighborhoodStats,
    DailyTrends,
    PipelineStatus,
    PipelineAction,
    PipelineResponse,
    RSSSource,
    HealthSummary,
    RSSSourceCreate,
    NewsletterTemplate,
    Newsletter,
    NewsletterSend,
    SendStatistics,
    ContentWithHistory,
    EditHistory,
    UserStats,
    Activity,
    Pagination,
    APIError,
    APIResponse
  } from './types';
  
  class APIClient {
    private baseURLs = {
      // Authentication
      auth: process.env.AUTH_LOGIN_URL || 'https://auth-login.jhaladik.workers.dev',
      
      // Content Management
      contentList: process.env.CONTENT_LIST_URL || 'https://content-list.jhaladik.workers.dev',
      contentCreate: process.env.CONTENT_CREATE_URL || 'https://content-create.jhaladik.workers.dev',
      contentApprove: process.env.CONTENT_APPROVE_URL || 'https://content-approve.jhaladik.workers.dev',
      contentOverride: process.env.CONTENT_MANUAL_OVERRIDE_URL || 'https://content-manual-override.jhaladik.workers.dev',
      
      // User Experience
      userPreferences: process.env.USER_PREFERENCES_URL || 'https://user-preferences.jhaladik.workers.dev',
      userDashboard: process.env.USER_DASHBOARD_URL || 'https://user-dashboard.jhaladik.workers.dev',
      userProfile: process.env.USER_PROFILE_URL || 'https://user-profile.jhaladik.workers.dev',
      newsletterArchive: process.env.NEWSLETTER_ARCHIVE_URL || 'https://newsletter-archive.jhaladik.workers.dev',
      
      // Admin Operations
      adminDashboard: process.env.ADMIN_DASHBOARD_URL || 'https://admin-dashboard.jhaladik.workers.dev',
      adminAnalytics: process.env.ADMIN_ANALYTICS_URL || 'https://admin-analytics.jhaladik.workers.dev',
      adminPipeline: process.env.ADMIN_PIPELINE_CONTROL_URL || 'https://admin-pipeline-control.jhaladik.workers.dev',
      
      // Newsletter System
      newsletterSignup: process.env.NEWSLETTER_SIGNUP_URL || 'https://newsletter-signup.jhaladik.workers.dev',
      newsletterSend: process.env.NEWSLETTER_SEND_URL || 'https://newsletter-send.jhaladik.workers.dev',
      newsletterTemplate: process.env.NEWSLETTER_TEMPLATE_URL || 'https://newsletter-template.jhaladik.workers.dev',
      
      // RSS Management
      rssSources: process.env.RSS_SOURCES_MANAGEMENT_URL || 'https://rss-sources-management.jhaladik.workers.dev'
    };
  
    private async makeRequest<T>(
      url: string,
      options: RequestInit = {},
      token?: string
    ): Promise<T> {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers
      };
  
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
  
      try {
        const response = await fetch(url, {
          ...options,
          headers
        });
  
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: 'Request failed',
            status: response.status
          }));
          
          throw {
            error: errorData.error || 'Request failed',
            status: response.status,
            details: errorData.details
          } as APIError;
        }
  
        return await response.json();
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error) {
          throw error;
        }
        
        throw {
          error: 'Network error',
          status: 0,
          details: error instanceof Error ? error.message : 'Unknown error'
        } as APIError;
      }
    }
  
    // ============================================================================
    // AUTHENTICATION METHODS
    // ============================================================================
  
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
      return this.makeRequest<LoginResponse>(this.baseURLs.auth, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    }
  
    // ============================================================================
    // PUBLIC CONTENT METHODS (No Auth Required)
    // ============================================================================
  
    async getPublishedContent(filters: ContentFilters = {}): Promise<ContentListResponse> {
      const params = new URLSearchParams();
      
      if (filters.neighborhood) params.append('neighborhood', filters.neighborhood);
      if (filters.category) params.append('category', filters.category);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      
      const url = `${this.baseURLs.contentList}${params.toString() ? `?${params.toString()}` : ''}`;
      
      return this.makeRequest<ContentListResponse>(url);
    }
  
    async subscribeToNewsletter(data: {
      email: string;
      neighborhood_id: string;
      categories?: string[];
    }): Promise<{ success: boolean; message?: string }> {
      return this.makeRequest<{ success: boolean; message?: string }>(
        this.baseURLs.newsletterSignup,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
    }
  
    // ============================================================================
    // USER DASHBOARD & EXPERIENCE METHODS (Auth Required)
    // ============================================================================
  
    async getUserDashboard(token: string, params: {
      limit?: number;
      offset?: number;
      category?: string;
    } = {}): Promise<{
      content: Content[];
      statistics: UserStats;
      recent_activity: Activity[];
      user_preferences: UserPreferences;
      pagination: Pagination;
    }> {
      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.offset) searchParams.append('offset', params.offset.toString());
      if (params.category) searchParams.append('category', params.category);
  
      const url = `${this.baseURLs.userDashboard}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      return this.makeRequest(url, { method: 'GET' }, token);
    }
  
    async getUserPreferences(token: string): Promise<UserPreferences> {
      return this.makeRequest<UserPreferences>(
        this.baseURLs.userPreferences,
        { method: 'GET' },
        token
      );
    }
  
    async updateUserPreferences(token: string, preferences: {
      categories: string[];
      neighborhoods: string[];
      notification_frequency: 'daily' | 'weekly' | 'monthly';
      email_enabled: boolean;
    }): Promise<{ success: boolean }> {
      return this.makeRequest<{ success: boolean }>(
        this.baseURLs.userPreferences,
        {
          method: 'PUT',
          body: JSON.stringify(preferences)
        },
        token
      );
    }
  
    async getUserProfile(token: string): Promise<{
      profile: UserProfile;
      statistics: UserEngagementStats;
    }> {
      return this.makeRequest(
        this.baseURLs.userProfile,
        { method: 'GET' },
        token
      );
    }
  
    async updateUserProfile(token: string, updates: {
      name?: string;
      neighborhood_id?: string;
    }): Promise<{ success: boolean }> {
      return this.makeRequest<{ success: boolean }>(
        this.baseURLs.userProfile,
        {
          method: 'PUT',
          body: JSON.stringify(updates)
        },
        token
      );
    }
  
    async deleteUserAccount(token: string): Promise<{ success: boolean }> {
      return this.makeRequest<{ success: boolean }>(
        `${this.baseURLs.userProfile}?confirm=true`,
        { method: 'DELETE' },
        token
      );
    }
  
    async getNewsletterArchive(token: string, params: {
      limit?: number;
      offset?: number;
    } = {}): Promise<{
      newsletters: NewsletterArchive[];
      pagination: Pagination;
    }> {
      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.offset) searchParams.append('offset', params.offset.toString());
  
      const url = `${this.baseURLs.newsletterArchive}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      return this.makeRequest(url, { method: 'GET' }, token);
    }
  
    async trackNewsletterOpen(token: string, newsletterId: string): Promise<{ tracked: boolean }> {
      return this.makeRequest<{ tracked: boolean }>(
        `${this.baseURLs.newsletterArchive}/open/${newsletterId}`,
        { method: 'POST' },
        token
      );
    }
  
    async trackNewsletterClick(token: string, newsletterId: string): Promise<{ tracked: boolean }> {
      return this.makeRequest<{ tracked: boolean }>(
        `${this.baseURLs.newsletterArchive}/click/${newsletterId}`,
        { method: 'POST' },
        token
      );
    }
  
    // ============================================================================
    // ADMIN METHODS (Admin Auth Required)
    // ============================================================================
  
    async getAdminDashboard(token: string): Promise<AdminDashboardData> {
      return this.makeRequest<AdminDashboardData>(
        this.baseURLs.adminDashboard,
        { method: 'GET' },
        token
      );
    }
  
    async getAdminAnalytics(token: string, timeframe: '1d' | '7d' | '30d' | '90d' = '7d', neighborhood?: string): Promise<{
      users: UserMetrics;
      content: ContentMetrics;
      newsletters: NewsletterMetrics;
      neighborhoods: NeighborhoodStats[];
      trends: DailyTrends[];
    }> {
      const params = new URLSearchParams({ timeframe });
      if (neighborhood) params.append('neighborhood', neighborhood);
      
      const url = `${this.baseURLs.adminAnalytics}?${params.toString()}`;
      
      return this.makeRequest(url, { method: 'GET' }, token);
    }
  
    async controlPipeline(token: string, action: PipelineAction): Promise<PipelineResponse> {
      return this.makeRequest<PipelineResponse>(
        this.baseURLs.adminPipeline,
        {
          method: 'POST',
          body: JSON.stringify(action)
        },
        token
      );
    }
  
    async getPipelineStatus(token: string): Promise<PipelineStatus> {
      return this.makeRequest<PipelineStatus>(
        this.baseURLs.adminPipeline,
        { method: 'GET' },
        token
      );
    }
  
    async getContentForEdit(token: string, contentId: string): Promise<{
      content: ContentWithHistory;
      edit_history: EditHistory[];
    }> {
      return this.makeRequest(
        `${this.baseURLs.contentOverride}/${contentId}`,
        { method: 'GET' },
        token
      );
    }
  
    async overrideContent(token: string, contentId: string, updates: {
      title?: string;
      content?: string;
      category?: string;
      neighborhood_id?: string;
      status?: string;
      override_reason: string;
    }): Promise<{ success: boolean; changes_made: string[] }> {
      return this.makeRequest(
        `${this.baseURLs.contentOverride}/${contentId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates)
        },
        token
      );
    }
  
    async deleteContent(token: string, contentId: string): Promise<{ success: boolean }> {
      return this.makeRequest<{ success: boolean }>(
        `${this.baseURLs.contentOverride}/${contentId}?confirm=true`,
        { method: 'DELETE' },
        token
      );
    }
  
    async createContent(token: string, content: {
      title: string;
      content: string;
      category: string;
      neighborhood_id: string;
    }): Promise<{ success: boolean; content: Content }> {
      return this.makeRequest(
        this.baseURLs.contentCreate,
        {
          method: 'POST',
          body: JSON.stringify(content)
        },
        token
      );
    }
  
    async approveContent(token: string, contentId: string): Promise<{ success: boolean }> {
      return this.makeRequest<{ success: boolean }>(
        this.baseURLs.contentApprove,
        {
          method: 'POST',
          body: JSON.stringify({ content_id: contentId })
        },
        token
      );
    }
  
    // ============================================================================
    // RSS SOURCE MANAGEMENT METHODS (Admin Auth Required)
    // ============================================================================
  
    async getRSSources(token: string): Promise<{
      sources: RSSSource[];
      health_summary: HealthSummary;
    }> {
      return this.makeRequest(
        this.baseURLs.rssSources,
        { method: 'GET' },
        token
      );
    }
  
    async addRSSSource(token: string, sourceData: RSSSourceCreate): Promise<{
      success: boolean;
      source: RSSSource;
    }> {
      return this.makeRequest(
        this.baseURLs.rssSources,
        {
          method: 'POST',
          body: JSON.stringify(sourceData)
        },
        token
      );
    }
  
    async updateRSSSource(token: string, sourceId: string, updates: Partial<RSSSource>): Promise<{ success: boolean }> {
      return this.makeRequest<{ success: boolean }>(
        `${this.baseURLs.rssSources}/${sourceId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates)
        },
        token
      );
    }
  
    async deleteRSSSource(token: string, sourceId: string): Promise<{ success: boolean }> {
      return this.makeRequest<{ success: boolean }>(
        `${this.baseURLs.rssSources}/${sourceId}?confirm=true`,
        { method: 'DELETE' },
        token
      );
    }
  
    // ============================================================================
    // NEWSLETTER MANAGEMENT METHODS (Admin Auth Required)
    // ============================================================================
  
    async getNewsletterTemplates(): Promise<{ templates: NewsletterTemplate[] }> {
      return this.makeRequest<{ templates: NewsletterTemplate[] }>(
        this.baseURLs.newsletterTemplate,
        { method: 'GET' }
      );
    }
  
    async generateNewsletter(token: string, neighborhoodId: string): Promise<{
      success: boolean;
      newsletter: Newsletter;
    }> {
      const params = new URLSearchParams({
        action: 'generate',
        neighborhood_id: neighborhoodId
      });
      
      return this.makeRequest(
        `${this.baseURLs.newsletterTemplate}?${params.toString()}`,
        { method: 'GET' },
        token
      );
    }
  
    async createNewsletterFromTemplate(token: string, templateData: {
      template_id: string;
      neighborhood_id: string;
      subject?: string;
      content_items?: string[];
    }): Promise<{ success: boolean; newsletter: Newsletter }> {
      return this.makeRequest(
        this.baseURLs.newsletterTemplate,
        {
          method: 'POST',
          body: JSON.stringify(templateData)
        },
        token
      );
    }
  
    async sendNewsletter(token: string, newsletterData: {
      newsletter_id: string;
      neighborhood_id?: string;
      test_email?: string;
      preview_only?: boolean;
    }): Promise<{ success: boolean; statistics?: SendStatistics }> {
      return this.makeRequest(
        this.baseURLs.newsletterSend,
        {
          method: 'POST',
          body: JSON.stringify(newsletterData)
        },
        token
      );
    }
  
    async getNewsletterSendHistory(token: string): Promise<{ recent_sends: NewsletterSend[] }> {
      return this.makeRequest(
        this.baseURLs.newsletterSend,
        { method: 'GET' },
        token
      );
    }
  }
  
  // Export singleton instance
  export const apiClient = new APIClient();
  export default apiClient;