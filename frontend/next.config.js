// next.config.js - Phase 2b: Intelligent RSS Pipeline configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Static export configuration for Cloudflare Pages
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  
  // Phase 2b: Complete worker URLs including RSS Pipeline
  env: {
    // Phase 1: Core workers (existing)
    AUTH_LOGIN_URL: 'https://auth-login.jhaladik.workers.dev',
    CONTENT_LIST_URL: 'https://content-list.jhaladik.workers.dev',
    CONTENT_CREATE_URL: 'https://content-create.jhaladik.workers.dev',
    CONTENT_APPROVE_URL: 'https://content-approve.jhaladik.workers.dev',
    NEWSLETTER_SIGNUP_URL: 'https://newsletter-signup.jhaladik.workers.dev',
    ADMIN_REVIEW_URL: 'https://admin-review-enhanced.jhaladik.workers.dev', // Updated to enhanced
    
    // Phase 2: AI Content Generation workers (existing)
    DATA_COLLECT_PRAGUE_URL: 'https://data-collect-prague.jhaladik.workers.dev',
    DATA_COLLECT_DPP_URL: 'https://data-collect-dpp.jhaladik.workers.dev',
    AI_GENERATE_URL: 'https://ai-generate-enhanced.jhaladik.workers.dev', // Updated to enhanced
    AI_VALIDATE_URL: 'https://ai-validate-enhanced.jhaladik.workers.dev', // Updated to enhanced
    AI_SCORE_URL: 'https://ai-score.jhaladik.workers.dev',
    
    // Phase 2: Automation workers (existing)
    SCHEDULER_DAILY_URL: 'https://scheduler-daily-enhanced.jhaladik.workers.dev', // Updated to enhanced
    CONTENT_AUTO_APPROVE_URL: 'https://content-auto-approve.jhaladik.workers.dev',
    CONTENT_BATCH_APPROVE_URL: 'https://content-batch-approve.jhaladik.workers.dev',
    
    // Phase 2b: NEW RSS Pipeline workers
    RSS_COLLECT_URL: 'https://rss-collect.jhaladik.workers.dev',
    AI_DATA_SCORE_URL: 'https://ai-data-score.jhaladik.workers.dev',
    CONTENT_PUBLISH_URL: 'https://content-publish.jhaladik.workers.dev',
    PIPELINE_ORCHESTRATOR_URL: 'https://pipeline-orchestrator.jhaladik.workers.dev',
    
    // Phase 2b: Configuration
    AI_CONFIDENCE_THRESHOLD: '0.85',
    AUTO_APPROVE_THRESHOLD: '0.85',
    CLAUDE_MODEL: 'claude-sonnet-4-20250514',
    RSS_QUALIFICATION_THRESHOLD: '0.6'
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