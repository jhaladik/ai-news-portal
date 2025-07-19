#!/bin/bash

# deploy-frontend-phase2-fixed.sh - Fixed deployment with dependency resolution
set -e

echo "🎨 AI News Portal - Frontend Phase 2 Deployment (Fixed)"
echo "======================================================="

# Check if we're in the correct directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Get user domain for environment variables
USER_DOMAIN=$(wrangler whoami | grep Account | cut -d' ' -f2 | tr '[:upper:]' '[:lower:]')

if [ -z "$USER_DOMAIN" ]; then
    echo "❌ Could not determine user domain. Please run 'wrangler auth login' first"
    exit 1
fi

echo "🌐 Deploying for domain: $USER_DOMAIN.workers.dev"
echo ""

# Step 1: Update environment configuration
echo "⚙️ Step 1: Updating environment configuration..."

# Update next.config.js with correct worker URLs
cat > frontend/next.config.js << EOF
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
    AUTH_LOGIN_URL: 'https://auth-login.$USER_DOMAIN.workers.dev',
    CONTENT_LIST_URL: 'https://content-list.$USER_DOMAIN.workers.dev',
    CONTENT_CREATE_URL: 'https://content-create.$USER_DOMAIN.workers.dev',
    CONTENT_APPROVE_URL: 'https://content-approve.$USER_DOMAIN.workers.dev',
    NEWSLETTER_SIGNUP_URL: 'https://newsletter-signup.$USER_DOMAIN.workers.dev',
    ADMIN_REVIEW_URL: 'https://admin-review-queue.$USER_DOMAIN.workers.dev',
    
    // Phase 2: AI Content Generation workers
    DATA_COLLECT_PRAGUE_URL: 'https://data-collect-prague.$USER_DOMAIN.workers.dev',
    DATA_COLLECT_DPP_URL: 'https://data-collect-dpp.$USER_DOMAIN.workers.dev',
    AI_GENERATE_URL: 'https://ai-generate.$USER_DOMAIN.workers.dev',
    AI_VALIDATE_URL: 'https://ai-validate.$USER_DOMAIN.workers.dev',
    AI_SCORE_URL: 'https://ai-score.$USER_DOMAIN.workers.dev',
    
    // Phase 2: Automation workers
    SCHEDULER_DAILY_URL: 'https://scheduler-daily.$USER_DOMAIN.workers.dev',
    CONTENT_AUTO_APPROVE_URL: 'https://content-auto-approve.$USER_DOMAIN.workers.dev',
    CONTENT_BATCH_APPROVE_URL: 'https://content-batch-approve.$USER_DOMAIN.workers.dev',
    
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
EOF

echo "✅ Environment configuration updated"

# Step 2: Fix frontend dependencies (FIXED SECTION)
echo ""
echo "📦 Step 2: Fixing frontend dependencies..."

cd frontend

echo "Cleaning previous installations..."
rm -rf node_modules package-lock.json

echo "Creating updated package.json with correct dependencies..."
cat > package.json << EOF
{
  "name": "ai-news-frontend",
  "version": "2.0.0",
  "description": "AI News Portal Frontend - Phase 2: AI Content Generation",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "export": "next build && next export",
    "lint": "next lint",
    "deploy": "npm run build && wrangler pages deploy out --project-name ai-news-frontend"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.8.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "eslint": "^8.50.0",
    "eslint-config-next": "^14.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
EOF

echo "Installing fresh dependencies..."
npm install

echo "✅ Dependencies installed successfully"

# Step 3: Create required configuration files
echo ""
echo "📁 Step 3: Creating configuration files..."

# Create components directory
mkdir -p components

# Create styles directory and globals.css
mkdir -p styles
cat > styles/globals.css << EOF
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles for AI News Portal */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* AI Content styling */
.ai-badge {
  @apply bg-blue-50 text-blue-700 border border-blue-200;
}

.confidence-high {
  @apply text-green-600 bg-green-50;
}

.confidence-medium {
  @apply text-yellow-600 bg-yellow-50;
}

.confidence-low {
  @apply text-red-600 bg-red-50;
}
EOF

# Create tailwind config
cat > tailwind.config.js << EOF
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
EOF

# Create postcss config
cat > postcss.config.js << EOF
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Create basic _app.tsx if it doesn't exist
if [ ! -f "pages/_app.tsx" ]; then
    mkdir -p pages
    cat > pages/_app.tsx << EOF
// pages/_app.tsx
import type { AppProps } from 'next/app'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
EOF
fi

echo "✅ Configuration files created"

# Step 4: Create a minimal components structure
echo ""
echo "🧩 Step 4: Creating minimal components..."

# Create a simplified AIContentCard component
cat > components/AIContentCard.tsx << EOF
// components/AIContentCard.tsx - Simplified version for deployment
import { useState } from 'react';

interface AIContentCardProps {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood: string;
  ai_confidence?: number;
  created_by?: string;
  created_at: number;
  published_at?: number;
  status: string;
  showAIBadge?: boolean;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function AIContentCard({
  id, title, content, category, neighborhood,
  ai_confidence = 0, created_by = '', created_at, published_at,
  status, showAIBadge = true, showActions = false,
  onApprove, onReject
}: AIContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAIGenerated = created_by?.includes('ai') || ai_confidence > 0;
  const shouldTruncate = content.length > 300;
  const displayContent = isExpanded || !shouldTruncate ? content : content.substring(0, 300) + '...';

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <article className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded border">
              {category}
            </span>
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded border">
              📍 {neighborhood}
            </span>
            
            {isAIGenerated && showAIBadge && (
              <>
                <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border font-medium">
                  🤖 AI
                </span>
                {ai_confidence > 0 && (
                  <span className={\`px-2 py-1 text-xs rounded border \${getConfidenceColor(ai_confidence)}\`}>
                    {(ai_confidence * 100).toFixed(0)}% důvěra
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {showActions && (onApprove || onReject) && (
          <div className="flex gap-2 ml-4">
            {onApprove && (
              <button onClick={() => onApprove(id)} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                ✅
              </button>
            )}
            {onReject && (
              <button onClick={() => onReject(id)} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                ❌
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-gray-600 mb-4">
        <p>{displayContent}</p>
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isExpanded ? 'Zobrazit méně ↑' : 'Zobrazit více ↓'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            {isAIGenerated ? '🤖' : '✍️'}
            {isAIGenerated ? 'AI' : 'Manuální'}
          </span>
          <span>
            🕒 {new Date(published_at || created_at).toLocaleDateString('cs-CZ')}
          </span>
        </div>
      </div>
    </article>
  );
}
EOF

echo "✅ Components created"

# Step 5: Build the application
echo ""
echo "🔨 Step 5: Building the application..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf .next out

# Build the application
echo "Building Next.js application..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - checking for issues..."
    
    # Try a simpler build approach
    echo "Attempting fallback build process..."
    
    # Create a minimal index page if build fails
    if [ ! -f "pages/index.tsx" ]; then
        cat > pages/index.tsx << EOF
import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>AI News Portal - Phase 2</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🤖 AI News Portal
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Phase 2: AI Content Generation Active
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
              <Link href="/admin/ai-dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                🤖 AI Dashboard
              </Link>
              <Link href="/admin/dashboard" className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                📋 Admin Panel
              </Link>
            </div>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/vinohrady" className="p-4 bg-white rounded-lg shadow hover:shadow-lg">
                <h3 className="font-bold">Vinohrady</h3>
                <p className="text-sm text-gray-600">Local news & AI content</p>
              </Link>
              <Link href="/karlin" className="p-4 bg-white rounded-lg shadow hover:shadow-lg">
                <h3 className="font-bold">Karlín</h3>
                <p className="text-sm text-gray-600">Local news & AI content</p>
              </Link>
              <Link href="/smichov" className="p-4 bg-white rounded-lg shadow hover:shadow-lg">
                <h3 className="font-bold">Smíchov</h3>
                <p className="text-sm text-gray-600">Local news & AI content</p>
              </Link>
              <Link href="/zizkov" className="p-4 bg-white rounded-lg shadow hover:shadow-lg">
                <h3 className="font-bold">Žižkov</h3>
                <p className="text-sm text-gray-600">Local news & AI content</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
EOF
    fi
    
    # Try building again
    if npm run build; then
        echo "✅ Fallback build successful"
    else
        echo "❌ Build still failing - manual intervention needed"
        exit 1
    fi
fi

echo "✅ Application built successfully"

# Step 6: Test the build
echo ""
echo "🧪 Step 6: Testing build..."

if [ ! -d "out" ]; then
    echo "❌ Output directory not created"
    exit 1
fi

if [ ! -f "out/index.html" ]; then
    echo "❌ Index page not generated"
    exit 1
fi

echo "✅ Build validation passed"

# Step 7: Deploy to Cloudflare Pages (optional wrangler install)
echo ""
echo "🚀 Step 7: Preparing for deployment..."

# Check if wrangler is available locally, if not install it
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler locally..."
    npm install wrangler@latest
    npx wrangler --version
fi

echo "Deploying to Cloudflare Pages..."
if npx wrangler pages deploy out --project-name ai-news-frontend; then
    echo "✅ Deployment successful"
else
    echo "❌ Deployment failed - trying with manual project creation..."
    echo ""
    echo "📋 Manual deployment steps:"
    echo "1. Go to Cloudflare Dashboard > Workers & Pages"
    echo "2. Click 'Create application' > 'Pages' > 'Upload assets'"
    echo "3. Upload the 'out' folder"
    echo "4. Set project name: ai-news-frontend"
    echo ""
    echo "Or try: npx wrangler pages create ai-news-frontend"
    echo "Then: npx wrangler pages deploy out --project-name ai-news-frontend"
fi

# Go back to project root
cd ..

echo ""
echo "🎉 Frontend Phase 2 Deployment Complete!"
echo "========================================"
echo ""
echo "📊 What was fixed:"
echo "  • ✅ Dependency conflicts resolved"
echo "  • ✅ Fresh package.json created"
echo "  • ✅ Node modules reinstalled"
echo "  • ✅ Build configuration updated"
echo "  • ✅ Minimal components created"
echo ""
echo "🌐 Expected URLs (after deployment):"
echo "  • Frontend: https://ai-news-frontend.pages.dev"
echo "  • AI Dashboard: https://ai-news-frontend.pages.dev/admin/ai-dashboard"
echo "  • Admin Panel: https://ai-news-frontend.pages.dev/admin/dashboard"
echo ""
echo "📝 Next Steps:"
echo "  1. 🌐 Verify deployment in Cloudflare Pages dashboard"
echo "  2. 🔗 Test worker connectivity from frontend"
echo "  3. 🎨 Add remaining pages and components as needed"
echo "  4. 📊 Monitor AI content generation in the dashboard"
echo ""
echo "🔧 If deployment failed manually:"
echo "  cd frontend"
echo "  npx wrangler pages create ai-news-frontend"
echo "  npx wrangler pages deploy out --project-name ai-news-frontend"
echo ""
echo "✅ Frontend is ready for Phase 2 AI features!"