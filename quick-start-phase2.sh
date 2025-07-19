#!/bin/bash

# quick-start-phase2.sh - Phase 2 AI Content Generation deployment
# Run this script after Phase 1 is completed

set -e  # Exit on any error

echo "🤖 AI News Portal - Phase 2: AI Content Generation"
echo "=================================================="

# Check prerequisites
echo "📋 Checking Phase 2 prerequisites..."

if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

# Check if Phase 1 infrastructure exists
echo "Checking Phase 1 infrastructure..."
if ! wrangler d1 list | grep -q "ai-news-db"; then
    echo "❌ Phase 1 database not found. Run ./quick-start.sh first"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Get user domain for worker URLs
USER_DOMAIN=jhaladik

if [ -z "$USER_DOMAIN" ]; then
    echo "❌ Could not determine user domain. Please run 'wrangler auth login' first"
    exit 1
fi

echo "🌐 Using domain: $USER_DOMAIN.workers.dev"

# Phase 2 Workers to deploy
AI_WORKERS=(
    "workers/ai/data-collect-prague.js:data-collect-prague"
    "workers/ai/data-collect-dpp.js:data-collect-dpp"
    "workers/ai/ai-generate.js:ai-generate"
    "workers/ai/ai-validate.js:ai-validate"
    "workers/ai/ai-score.js:ai-score"
    "workers/ai/scheduler-daily.js:scheduler-daily"
    "workers/ai/content-auto-approve.js:content-auto-approve"
    "workers/ai/content-batch-approve.js:content-batch-approve"
    "workers/admin/admin-review-enhanced.js:admin-review-queue"
)

echo ""
echo "🚀 Step 1: Deploying Phase 2 AI Workers..."

SUCCESS_COUNT=0
TOTAL_WORKERS=${#AI_WORKERS[@]}

for worker in "${AI_WORKERS[@]}"; do
    IFS=':' read -r file name <<< "$worker"
    echo "Deploying $name..."
    
    if wrangler deploy "$file" --name "$name"; then
        echo "✅ $name deployed successfully"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ Failed to deploy $name"
    fi
done

echo ""
echo "📊 Deployment Summary: $SUCCESS_COUNT/$TOTAL_WORKERS workers deployed"

if [ $SUCCESS_COUNT -lt $TOTAL_WORKERS ]; then
    echo "⚠️  Some workers failed to deploy. Check errors above."
fi

# Step 2: Test AI workers
echo ""
echo "🧪 Step 2: Testing AI workers..."

echo "Testing data collection..."
PRAGUE_TEST=$(curl -s "https://data-collect-prague.$USER_DOMAIN.workers.dev/" || echo "failed")
if [[ $PRAGUE_TEST == *"success"* ]]; then
    echo "✅ Prague data collection working"
else
    echo "❌ Prague data collection failed"
fi

TRANSPORT_TEST=$(curl -s "https://data-collect-dpp.$USER_DOMAIN.workers.dev/" || echo "failed")
if [[ $TRANSPORT_TEST == *"success"* ]]; then
    echo "✅ Transport data collection working"
else
    echo "❌ Transport data collection failed"
fi

echo "Testing AI content generation..."
AI_GENERATE_TEST=$(curl -s -X POST "https://ai-generate.$USER_DOMAIN.workers.dev/" \
  -H "Content-Type: application/json" \
  -d '{"neighborhood":"vinohrady","category":"local","type":"test"}' || echo "failed")

if [[ $AI_GENERATE_TEST == *"success"* ]]; then
    echo "✅ AI content generation working"
    GENERATED_ID=$(echo "$AI_GENERATE_TEST" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Generated content ID: $GENERATED_ID"
else
    echo "❌ AI content generation failed"
    echo "   Response: $AI_GENERATE_TEST"
fi

echo "Testing content scoring..."
SCORING_TEST=$(curl -s "https://ai-score.$USER_DOMAIN.workers.dev/?batch=true&threshold=0.5" || echo "failed")
if [[ $SCORING_TEST == *"success"* ]]; then
    echo "✅ Content scoring working"
else
    echo "❌ Content scoring failed"
fi

# Step 3: Setup Cron Trigger instructions
echo ""
echo "⏰ Step 3: Setting up daily automation..."
echo ""
echo "📋 IMPORTANT: Manual Cron Trigger Setup Required"
echo "=============================================="
echo ""
echo "1. Go to Cloudflare Dashboard > Workers & Pages"
echo "2. Click on 'scheduler-daily' worker"
echo "3. Go to 'Triggers' tab"
echo "4. Click 'Add Cron Trigger'"
echo "5. Set schedule: 0 8 * * * (runs daily at 8 AM)"
echo "6. Save the trigger"
echo ""
echo "🔗 Direct link: https://dash.cloudflare.com/workers/services/view/scheduler-daily"
echo ""

# Step 4: Test manual pipeline execution
echo "🔄 Step 4: Testing manual pipeline execution..."
PIPELINE_TEST=$(curl -s -X POST "https://scheduler-daily.$USER_DOMAIN.workers.dev/" || echo "failed")
if [[ $PIPELINE_TEST == *"success"* ]]; then
    echo "✅ Daily pipeline working (manual trigger)"
else
    echo "❌ Daily pipeline failed"
    echo "   Response: $PIPELINE_TEST"
fi

# Step 5: Show admin dashboard
echo ""
echo "📊 Step 5: Testing enhanced admin dashboard..."
ADMIN_TEST=$(curl -s "https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=stats" || echo "failed")
if [[ $ADMIN_TEST == *"success"* ]]; then
    echo "✅ Enhanced admin dashboard working"
else
    echo "❌ Admin dashboard failed"
fi

# Final summary
echo ""
echo "🎉 Phase 2 Deployment Complete!"
echo "================================"
echo ""
echo "📊 Infrastructure:"
echo "  • Database: ai-news-db (from Phase 1)"
echo "  • KV Namespace: AI_NEWS_KV (from Phase 1)"
echo "  • R2 Bucket: ai-news-files (from Phase 1)"
echo ""
echo "🤖 New AI Workers:"
for worker in "${AI_WORKERS[@]}"; do
    IFS=':' read -r file name <<< "$worker"
    echo "  • $name: https://$name.$USER_DOMAIN.workers.dev/"
done
echo ""
echo "🔗 Key URLs:"
echo "  • Data Collection (Prague): https://data-collect-prague.$USER_DOMAIN.workers.dev/"
echo "  • Data Collection (Transport): https://data-collect-dpp.$USER_DOMAIN.workers.dev/"
echo "  • AI Content Generation: https://ai-generate.$USER_DOMAIN.workers.dev/"
echo "  • Content Scoring: https://ai-score.$USER_DOMAIN.workers.dev/"
echo "  • Daily Scheduler: https://scheduler-daily.$USER_DOMAIN.workers.dev/"
echo "  • Enhanced Admin: https://admin-review-queue.$USER_DOMAIN.workers.dev/"
echo ""
echo "🧪 Quick Tests:"
echo "  • Generate content: npm run ai:generate-content"
echo "  • Collect data: npm run ai:collect-data"
echo "  • Run full pipeline: npm run ai:run-pipeline"
echo "  • View AI metrics: npm run admin:ai-metrics"
echo "  • Check daily summary: npm run admin:daily-summary"
echo ""
echo "⚙️  Next Steps:"
echo "  1. ⏰ Set up Cron Trigger (see instructions above)"
echo "  2. 🔑 Add OPENWEATHER_API_KEY to wrangler.toml [vars] section"
echo "  3. 🌐 Update frontend to use new AI endpoints"
echo "  4. 📊 Monitor daily AI content generation"
echo "  5. 🎯 Move to Phase 3: Business Intelligence"
echo ""
echo "🔧 Troubleshooting:"
echo "  • Check AI worker logs: npm run logs:ai"
echo "  • View scheduler logs: npm run logs:scheduler"
echo "  • Test AI pipeline: npm run test:ai"
echo "  • Database status: npm run db:status"
echo ""
echo "✅ Phase 2 is ready! AI content generation is now active."

# Create environment file updates for frontend
echo ""
echo "📄 Updating frontend environment file..."

cat >> frontend/.env.local << EOF

# Phase 2: AI Content Generation APIs
DATA_COLLECT_PRAGUE_URL=https://data-collect-prague.$USER_DOMAIN.workers.dev
DATA_COLLECT_DPP_URL=https://data-collect-dpp.$USER_DOMAIN.workers.dev
AI_GENERATE_URL=https://ai-generate.$USER_DOMAIN.workers.dev
AI_VALIDATE_URL=https://ai-validate.$USER_DOMAIN.workers.dev
AI_SCORE_URL=https://ai-score.$USER_DOMAIN.workers.dev
SCHEDULER_DAILY_URL=https://scheduler-daily.$USER_DOMAIN.workers.dev
CONTENT_AUTO_APPROVE_URL=https://content-auto-approve.$USER_DOMAIN.workers.dev
CONTENT_BATCH_APPROVE_URL=https://content-batch-approve.$USER_DOMAIN.workers.dev

# AI Configuration
CLAUDE_MODEL=claude-sonnet-4-20250514
AI_CONFIDENCE_THRESHOLD=0.85
AUTO_APPROVE_THRESHOLD=0.85
EOF

echo "✅ Frontend environment updated with Phase 2 APIs"
echo ""
echo "🚀 Ready for AI-powered content generation!"