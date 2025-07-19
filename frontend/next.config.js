// next.config.js - Static export configuration for Cloudflare Pages
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Static export configuration
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  
  // Environment variables (your actual worker URLs)
  env: {
    AUTH_LOGIN_URL: 'https://auth-login.jhaladik.workers.dev',
    CONTENT_LIST_URL: 'https://content-list.jhaladik.workers.dev',
    CONTENT_CREATE_URL: 'https://content-create.jhaladik.workers.dev',
    CONTENT_APPROVE_URL: 'https://content-approve.jhaladik.workers.dev',
    NEWSLETTER_SIGNUP_URL: 'https://newsletter-signup.jhaladik.workers.dev',
    ADMIN_REVIEW_URL: 'https://admin-review-queue.jhaladik.workers.dev',
  },

  // Required for static export
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig;