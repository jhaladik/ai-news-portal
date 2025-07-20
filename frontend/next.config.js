/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    
    // Static export for Cloudflare Pages
    output: 'export',
    trailingSlash: true,
    distDir: 'out',
    
    // Environment variables for worker URLs
    env: {
      // Core APIs
      CONTENT_LIST_URL: process.env.CONTENT_LIST_URL || 'https://content-list.jhaladik.workers.dev',
      AUTH_LOGIN_URL: process.env.AUTH_LOGIN_URL || 'https://auth-login.jhaladik.workers.dev',
      AUTH_REGISTER_URL: process.env.AUTH_REGISTER_URL || 'https://auth-register.jhaladik.workers.dev',
      NEWSLETTER_SIGNUP_URL: process.env.NEWSLETTER_SIGNUP_URL || 'https://newsletter-signup.jhaladik.workers.dev',
      
      // Admin APIs
      ADMIN_REVIEW_URL: process.env.ADMIN_REVIEW_URL || 'https://admin-review-enhanced.jhaladik.workers.dev',
      PIPELINE_ORCHESTRATOR_URL: process.env.PIPELINE_ORCHESTRATOR_URL || 'https://pipeline-orchestrator.jhaladik.workers.dev',
      RSS_SOURCES_MANAGEMENT_URL: process.env.RSS_SOURCES_MANAGEMENT_URL || 'https://rss-sources-management.jhaladik.workers.dev',
      
      // User APIs (to be created)
      USER_PREFERENCES_URL: process.env.USER_PREFERENCES_URL || 'https://user-preferences.jhaladik.workers.dev',
      USER_NEWSLETTER_ARCHIVE_URL: process.env.USER_NEWSLETTER_ARCHIVE_URL || 'https://newsletter-archive.jhaladik.workers.dev',
      USER_PROFILE_URL: process.env.USER_PROFILE_URL || 'https://user-profile.jhaladik.workers.dev',
      USER_STATS_URL: process.env.USER_STATS_URL || 'https://user-stats.jhaladik.workers.dev',
      
      // Analytics APIs (to be created)
      ANALYTICS_URL: process.env.ANALYTICS_URL || 'https://analytics.jhaladik.workers.dev',
      ADMIN_CONTENT_URL: process.env.ADMIN_CONTENT_URL || 'https://admin-content.jhaladik.workers.dev'
    },
  
    // Image optimization disabled for static export
    images: {
      unoptimized: true
    },
  
    // Webpack configuration for better builds
    webpack: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
      return config;
    }
  };
  
  module.exports = nextConfig;