// lib/types.ts
// Core TypeScript type definitions for AI News Portal Frontend v2

// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

export interface User {
    id: string;
    email: string;
    name?: string;
    neighborhood_id: string;
    role: 'subscriber' | 'admin';
    verified: boolean;
    last_login?: number;
    created_at: number;
    updated_at?: number;
  }
  
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface LoginResponse {
    success: boolean;
    token: string;
    user: User;
    message?: string;
  }
  
  export interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (credentials: LoginCredentials) => Promise<LoginResponse>;
    logout: () => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
  }
  
  // ============================================================================
  // CONTENT TYPES
  // ============================================================================
  
  export interface Content {
    id: string;
    title: string;
    content: string;
    category: 'emergency' | 'local' | 'business' | 'community' | 'events';
    neighborhood_id?: string;
    neighborhood_name: string;
    neighborhood_slug: string;
    ai_confidence: number;
    status: 'draft' | 'ai_generated' | 'review' | 'published' | 'rejected' | 'failed';
    created_by?: string;
    published_at?: number;
    created_at: number;
    updated_at?: number;
    raw_content_id?: string;
    validation_notes?: string;
    admin_notes?: string;
    manual_override: boolean;
    retry_count: number;
  }
  
  export interface ContentWithHistory extends Content {
    edit_history: EditHistory[];
  }
  
  export interface EditHistory {
    id: string;
    content_id: string;
    action: string;
    changes: string; // JSON string
    override_reason?: string;
    edited_by: string;
    edited_at: number;
  }
  
  export interface ContentFilters {
    neighborhood?: string;
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
  
  export interface ContentListResponse {
    content: Content[];
    pagination: Pagination;
    total: number;
  }
  
  // ============================================================================
  // NEIGHBORHOOD TYPES
  // ============================================================================
  
  export interface Neighborhood {
    id: string;
    name: string;
    slug: string;
    bounds?: string; // GeoJSON
    subscriber_count: number;
    status: 'active' | 'inactive';
    created_at: number;
  }
  
  // ============================================================================
  // USER PREFERENCES & EXPERIENCE TYPES
  // ============================================================================
  
  export interface UserPreferences {
    user_id: string;
    categories: string[];
    neighborhoods: string[];
    notification_frequency: 'daily' | 'weekly' | 'monthly';
    email_enabled: boolean;
    updated_at?: number;
  }
  
  export interface UserStats {
    total_content_read: number;
    newsletters_received: number;
    newsletters_opened: number;
    last_activity: number;
    favorite_categories: string[];
    engagement_score: number;
  }
  
  export interface UserProfile {
    id: string;
    email: string;
    name?: string;
    neighborhood_id: string;
    neighborhood_name: string;
    role: 'subscriber' | 'admin';
    verified: boolean;
    created_at: number;
    last_login?: number;
  }
  
  export interface UserEngagementStats {
    newsletters_sent: number;
    newsletters_opened: number;
    newsletters_clicked: number;
    open_rate: number;
    click_rate: number;
    content_views: number;
    favorite_categories: string[];
  }
  
  export interface Activity {
    id: string;
    type: 'content_published' | 'newsletter_sent' | 'user_signup' | 'admin_action';
    description: string;
    timestamp: number;
    metadata?: Record<string, any>;
  }
  
  // ============================================================================
  // NEWSLETTER TYPES
  // ============================================================================
  
  export interface Newsletter {
    id: string;
    neighborhood_id?: string;
    template_id: string;
    subject: string;
    content_html: string;
    content_text: string;
    status: 'draft' | 'sent';
    sent_at?: number;
    sent_count: number;
    created_at: number;
  }
  
  export interface NewsletterArchive {
    id: string;
    subject: string;
    sent_at: number;
    opened_at?: number;
    clicked_at?: number;
    neighborhood_name: string;
    content_preview: string;
  }
  
  export interface NewsletterTemplate {
    id: string;
    name: string;
    description: string;
    template_type: 'daily_digest' | 'emergency_alert' | 'weekly_summary' | 'business_spotlight';
    html_template: string;
    text_template: string;
    default_subject: string;
  }
  
  export interface NewsletterSend {
    newsletter_id: string;
    subject: string;
    neighborhood_name: string;
    sent_at: number;
    sent_count: number;
    open_count: number;
    click_count: number;
    open_rate: number;
    click_rate: number;
  }
  
  export interface SendStatistics {
    sent_count: number;
    estimated_delivery_time: number;
    status: 'queued' | 'sending' | 'completed' | 'failed';
  }
  
  // ============================================================================
  // ADMIN DASHBOARD TYPES
  // ============================================================================
  
  export interface AdminDashboardData {
    generated_at: number;
    overview: {
      pipeline_status: 'running' | 'stopped' | 'error' | 'idle';
      last_pipeline_run?: number;
      processing_efficiency: number;
      urgent_items_count: number;
    };
    content_queue: {
      by_status: Record<string, ContentQueueItem>;
      total_items: number;
    };
    urgent_items: UrgentItem[];
    recent_activity: Activity[];
    system_health: SystemHealth;
    metrics: SystemMetrics;
    quick_actions: QuickAction[];
  }
  
  export interface ContentQueueItem {
    status: string;
    count: number;
    oldest_item_age?: number;
    newest_item_age?: number;
  }
  
  export interface UrgentItem {
    id: string;
    type: 'content_review' | 'system_error' | 'high_priority';
    title: string;
    description: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    created_at: number;
    action_required: string;
  }
  
  export interface SystemHealth {
    overall_status: 'healthy' | 'warning' | 'critical';
    rss_sources: {
      total: number;
      healthy: number;
      failed: number;
    };
    ai_pipeline: {
      status: 'operational' | 'degraded' | 'down';
      last_run: number;
      success_rate: number;
    };
    email_system: {
      status: 'operational' | 'degraded' | 'down';
      delivery_rate: number;
    };
  }
  
  export interface SystemMetrics {
    users: {
      total: number;
      active_today: number;
      new_signups_today: number;
    };
    content: {
      published_today: number;
      pending_review: number;
      total_published: number;
    };
    newsletters: {
      sent_today: number;
      avg_open_rate: number;
      avg_click_rate: number;
    };
  }
  
  export interface QuickAction {
    id: string;
    title: string;
    description: string;
    action: string;
    params?: Record<string, any>;
    urgency: 'low' | 'medium' | 'high';
  }
  
  // ============================================================================
  // ANALYTICS TYPES
  // ============================================================================
  
  export interface UserMetrics {
    total_users: number;
    active_users: number;
    new_signups: number;
    churn_rate: number;
    by_neighborhood: NeighborhoodStats[];
  }
  
  export interface ContentMetrics {
    published_content: number;
    pending_review: number;
    ai_confidence_avg: number;
    manual_overrides: number;
    rejection_rate: number;
    by_category: CategoryStats[];
  }
  
  export interface NewsletterMetrics {
    total_sent: number;
    avg_open_rate: number;
    avg_click_rate: number;
    delivery_rate: number;
    by_neighborhood: NeighborhoodNewsletterStats[];
  }
  
  export interface NeighborhoodStats {
    neighborhood_id: string;
    neighborhood_name: string;
    user_count: number;
    content_published: number;
    newsletter_engagement: number;
  }
  
  export interface CategoryStats {
    category: string;
    count: number;
    avg_confidence: number;
    approval_rate: number;
  }
  
  export interface NeighborhoodNewsletterStats {
    neighborhood_id: string;
    neighborhood_name: string;
    sent_count: number;
    open_rate: number;
    click_rate: number;
  }
  
  export interface DailyTrends {
    date: string;
    users_active: number;
    content_published: number;
    newsletters_sent: number;
    open_rate: number;
  }
  
  // ============================================================================
  // RSS SOURCES TYPES
  // ============================================================================
  
  export interface RSSSource {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    category_hint: string;
    neighborhood_id?: string;
    last_fetched?: number;
    fetch_count: number;
    error_count: number;
    priority: number;
    active: boolean;
    created_by: string;
    updated_at?: number;
    created_at: number;
    
    // Health status (joined from rss_source_health)
    health_status: 'healthy' | 'warning' | 'failed' | 'unchecked';
    last_check?: number;
    last_success?: number;
    last_error?: string;
    items_fetched: number;
  }
  
  export interface HealthSummary {
    total_sources: number;
    healthy_sources: number;
    warning_sources: number;
    failed_sources: number;
    avg_success_rate: number;
  }
  
  export interface RSSSourceCreate {
    name: string;
    url: string;
    category_hint: string;
    neighborhood_id?: string;
    priority?: number;
  }
  
  // ============================================================================
  // PIPELINE CONTROL TYPES
  // ============================================================================
  
  export interface PipelineStatus {
    current_status: 'running' | 'stopped' | 'error' | 'idle';
    last_run: {
      started_at: number;
      completed_at?: number;
      status: string;
      collected_items: number;
      generated_items: number;
      published_items: number;
      error_message?: string;
    };
    queue_summary: {
      total_pending: number;
      by_status: Record<string, number>;
    };
    processing_stats: {
      avg_processing_time: number;
      success_rate: number;
      items_per_hour: number;
    };
  }
  
  export interface PipelineAction {
    action: 'trigger_pipeline' | 'stop_pipeline' | 'retry_failed' | 'bulk_approve' | 'clear_errors';
    params?: Record<string, any>;
  }
  
  export interface PipelineResponse {
    success: boolean;
    message: string;
    updated_status?: PipelineStatus;
  }
  
  // ============================================================================
  // UI & UTILITY TYPES
  // ============================================================================
  
  export interface Pagination {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_prev: boolean;
  }
  
  export interface APIError {
    error: string;
    details?: string;
    status: number;
  }
  
  export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: Pagination;
  }
  
  export interface LoadingState {
    isLoading: boolean;
    error?: string | null;
  }
  
  export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }
  
  // ============================================================================
  // FORM TYPES
  // ============================================================================
  
  export interface NewsletterSignupForm {
    email: string;
    neighborhood_id: string;
    categories?: string[];
  }
  
  export interface UserPreferencesForm {
    categories: string[];
    neighborhoods: string[];
    notification_frequency: 'daily' | 'weekly' | 'monthly';
    email_enabled: boolean;
  }
  
  export interface UserProfileForm {
    name?: string;
    neighborhood_id: string;
  }
  
  export interface ContentEditForm {
    title: string;
    content: string;
    category: string;
    neighborhood_id: string;
    status: string;
    override_reason: string;
  }
  
  // ============================================================================
  // COMPONENT PROPS TYPES
  // ============================================================================
  
  export interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
  }
  
  export interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
  }
  
  export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }
  
  // ============================================================================
  // CONSTANTS
  // ============================================================================
  
  export const CATEGORIES = [
    'emergency',
    'local', 
    'business',
    'community',
    'events'
  ] as const;
  
  export const USER_ROLES = ['subscriber', 'admin'] as const;
  
  export const CONTENT_STATUSES = [
    'draft',
    'ai_generated', 
    'review',
    'published',
    'rejected',
    'failed'
  ] as const;
  
  export const NOTIFICATION_FREQUENCIES = [
    'daily',
    'weekly', 
    'monthly'
  ] as const;