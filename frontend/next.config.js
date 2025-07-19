// next.config.js - Phase 2: AI Content Generation configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Static export configuration for Cloudflare Pages
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  
  // Phase 2: Complete worker URLs including AI features
  env: {
    // Phase 1: Core workers
    AUTH_LOGIN_URL: 'https://auth-login.jhaladik.workers.dev',
    CONTENT_LIST_URL: 'https://content-list.jhaladik.workers.dev',
    CONTENT_CREATE_URL: 'https://content-create.jhaladik.workers.dev',
    CONTENT_APPROVE_URL: 'https://content-approve.jhaladik.workers.dev',
    NEWSLETTER_SIGNUP_URL: 'https://newsletter-signup.jhaladik.workers.dev',
    ADMIN_REVIEW_URL: 'https://admin-review-queue.jhaladik.workers.dev',
    
    // Phase 2: AI Content Generation workers
    DATA_COLLECT_PRAGUE_URL: 'https://data-collect-prague.jhaladik.workers.dev',
    DATA_COLLECT_DPP_URL: 'https://data-collect-dpp.jhaladik.workers.dev',
    AI_GENERATE_URL: 'https://ai-generate.jhaladik.workers.dev',
    AI_VALIDATE_URL: 'https://ai-validate.jhaladik.workers.dev',
    AI_SCORE_URL: 'https://ai-score.jhaladik.workers.dev',
    
    // Phase 2: Automation workers
    SCHEDULER_DAILY_URL: 'https://scheduler-daily.jhaladik.workers.dev',
    CONTENT_AUTO_APPROVE_URL: 'https://content-auto-approve.jhaladik.workers.dev',
    CONTENT_BATCH_APPROVE_URL: 'https://content-batch-approve.jhaladik.workers.dev',
    
    // Configuration
    AI_CONFIDENCE_THRESHOLD: '0.85',
    AUTO_APPROVE_THRESHOLD: '0.85',
    CLAUDE_MODEL: 'claude-sonnet-4-20250514'
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
