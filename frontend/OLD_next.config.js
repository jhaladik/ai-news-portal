// next.config.js - Complete environment configuration for all workers
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Static export configuration for Cloudflare Pages
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  
  // Complete worker URLs for AI News Portal v2
  env: {
    // Existing Phase 1 Workers
    AUTH_LOGIN_URL: 'https://auth-login.jhaladik.workers.dev',
    CONTENT_LIST_URL: 'https://content-list.jhaladik.workers.dev',
    CONTENT_CREATE_URL: 'https://content-create.jhaladik.workers.dev',
    CONTENT_APPROVE_URL: 'https://content-approve.jhaladik.workers.dev',
    NEWSLETTER_SIGNUP_URL: 'https://newsletter-signup.jhaladik.workers.dev',
    ADMIN_REVIEW_URL: 'https://admin-review-enhanced.jhaladik.workers.dev',
    
    // Phase 2: User Experience Workers
    USER_PREFERENCES_URL: 'https://user-preferences.jhaladik.workers.dev',
    NEWSLETTER_ARCHIVE_URL: 'https://newsletter-archive.jhaladik.workers.dev',
    USER_DASHBOARD_URL: 'https://user-dashboard.jhaladik.workers.dev',
    USER_PROFILE_URL: 'https://user-profile.jhaladik.workers.dev',
    
    // Phase 3: Admin Experience Workers
    ADMIN_PIPELINE_CONTROL_URL: 'https://admin-pipeline-control.jhaladik.workers.dev',
    ADMIN_ANALYTICS_URL: 'https://admin-analytics.jhaladik.workers.dev',
    CONTENT_MANUAL_OVERRIDE_URL: 'https://content-manual-override.jhaladik.workers.dev',
    ADMIN_DASHBOARD_URL: 'https://admin-dashboard.jhaladik.workers.dev',
    
    // Email System Workers
    NEWSLETTER_SEND_URL: 'https://newsletter-send.jhaladik.workers.dev',
    NEWSLETTER_TEMPLATE_URL: 'https://newsletter-template.jhaladik.workers.dev',
    
    // RSS Management
    RSS_SOURCES_MANAGEMENT_URL: 'https://rss-sources-management.jhaladik.workers.dev',
    
    // AI Pipeline Workers (existing)
    AI_GENERATE_URL: 'https://ai-generate-enhanced.jhaladik.workers.dev',
    AI_VALIDATE_URL: 'https://ai-validate-enhanced.jhaladik.workers.dev',
    AI_SCORE_URL: 'https://ai-data-score.jhaladik.workers.dev',
    PIPELINE_ORCHESTRATOR_URL: 'https://pipeline-orchestrator.jhaladik.workers.dev',
    
    // Configuration
    AI_CONFIDENCE_THRESHOLD: '0.85',
    AUTO_APPROVE_THRESHOLD: '0.85',
    CLAUDE_MODEL: 'claude-sonnet-4-20250514',
    
    // App Configuration
    APP_NAME: 'AI News Prague',
    APP_DESCRIPTION: 'Hyperlocal AI-curated news for Prague neighborhoods',
    SUPPORT_EMAIL: 'support@ai-news-prague.com'
  },

  // Required for static export
  images: {
    unoptimized: true
  },

  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}

module.exports = nextConfig;

// APIClient class for frontend integration
export class APIClient {
  constructor() {
    this.baseUrls = {
      // Authentication
      auth: process.env.AUTH_LOGIN_URL,
      
      // Content Management
      content: process.env.CONTENT_LIST_URL,
      contentCreate: process.env.CONTENT_CREATE_URL,
      contentApprove: process.env.CONTENT_APPROVE_URL,
      contentOverride: process.env.CONTENT_MANUAL_OVERRIDE_URL,
      
      // User Experience
      userPreferences: process.env.USER_PREFERENCES_URL,
      userDashboard: process.env.USER_DASHBOARD_URL,
      userProfile: process.env.USER_PROFILE_URL,
      newsletterArchive: process.env.NEWSLETTER_ARCHIVE_URL,
      
      // Admin Operations
      adminDashboard: process.env.ADMIN_DASHBOARD_URL,
      adminAnalytics: process.env.ADMIN_ANALYTICS_URL,
      adminPipelineControl: process.env.ADMIN_PIPELINE_CONTROL_URL,
      
      // Newsletter System
      newsletterSignup: process.env.NEWSLETTER_SIGNUP_URL,
      newsletterSend: process.env.NEWSLETTER_SEND_URL,
      newsletterTemplate: process.env.NEWSLETTER_TEMPLATE_URL,
      
      // RSS Management
      rssSourcesManagement: process.env.RSS_SOURCES_MANAGEMENT_URL,
      
      // AI Pipeline
      aiGenerate: process.env.AI_GENERATE_URL,
      aiValidate: process.env.AI_VALIDATE_URL,
      pipelineOrchestrator: process.env.PIPELINE_ORCHESTRATOR_URL
    };
  }

  // Authentication methods
  async login(email, password) {
    const response = await fetch(this.baseUrls.auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  // User experience methods
  async getUserDashboard(token, params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${this.baseUrls.userDashboard}?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getUserPreferences(token) {
    const response = await fetch(this.baseUrls.userPreferences, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async updateUserPreferences(token, preferences) {
    const response = await fetch(this.baseUrls.userPreferences, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(preferences)
    });
    return response.json();
  }

  async getUserProfile(token) {
    const response = await fetch(this.baseUrls.userProfile, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getNewsletterArchive(token, params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${this.baseUrls.newsletterArchive}?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  // Admin methods
  async getAdminDashboard(token) {
    const response = await fetch(this.baseUrls.adminDashboard, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getAdminAnalytics(token, timeframe = '7d') {
    const response = await fetch(`${this.baseUrls.adminAnalytics}?timeframe=${timeframe}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async controlPipeline(token, action, params = {}) {
    const response = await fetch(this.baseUrls.adminPipelineControl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action, ...params })
    });
    return response.json();
  }

  async getRSSources(token) {
    const response = await fetch(this.baseUrls.rssSourcesManagement, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async addRSSSource(token, sourceData) {
    const response = await fetch(this.baseUrls.rssSourcesManagement, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(sourceData)
    });
    return response.json();
  }

  // Newsletter methods
  async subscribeToNewsletter(email, preferences) {
    const response = await fetch(this.baseUrls.newsletterSignup, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...preferences })
    });
    return response.json();
  }

  async getNewsletterTemplates() {
    const response = await fetch(this.baseUrls.newsletterTemplate);
    return response.json();
  }

  async createNewsletterFromTemplate(token, templateData) {
    const response = await fetch(this.baseUrls.newsletterTemplate, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(templateData)
    });
    return response.json();
  }

  async sendNewsletter(token, newsletterData) {
    const response = await fetch(this.baseUrls.newsletterSend, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newsletterData)
    });
    return response.json();
  }

  // Content management methods
  async getPublishedContent(filters = {}) {
    const params = new URLSearchParams({
      status: 'published',
      limit: '20',
      ...filters
    });
    
    const response = await fetch(`${this.baseUrls.content}?${params}`);
    return response.json();
  }

  async overrideContent(token, contentId, updates) {
    const response = await fetch(`${this.baseUrls.contentOverride}/${contentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    return response.json();
  }
}

// Usage example for frontend components:
/*
import { APIClient } from '@/lib/api-client';

const api = new APIClient();

// In a React component:
const [dashboardData, setDashboardData] = useState(null);
const token = localStorage.getItem('auth_token');

useEffect(() => {
  api.getUserDashboard(token, { limit: 10 })
    .then(setDashboardData)
    .catch(console.error);
}, []);
*/