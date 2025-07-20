#!/bin/bash
# scripts/deploy-phase2b.sh - Phase 2b deployment script

echo "🚀 Deploying Phase 2b: Intelligent RSS Pipeline"
echo "================================================"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install: npm install -g wrangler"
    exit 1
fi

# Phase 2b Database Migration
echo "📊 Running Phase 2b database migration..."
wrangler deploy scripts/migrate-phase2b.js --name db-migrate-phase2b
curl -X POST https://db-migrate-phase2b.jhaladik.workers.dev/

# Deploy RSS Workers
echo "📡 Deploying RSS Collection Workers..."
wrangler deploy workers/rss/rss-collect.js --name rss-collect

# Deploy AI Processing Workers  
echo "🧠 Deploying AI Processing Workers..."
wrangler deploy workers/ai/ai-data-score.js --name ai-data-score
wrangler deploy workers/ai/ai-validate-enhanced.js --name ai-validate-enhanced
wrangler deploy workers/ai/ai-generate-enhanced.js --name ai-generate-enhanced

# Deploy Content Workers
echo "📰 Deploying Content Management Workers..."
wrangler deploy workers/content/content-publish.js --name content-publish

# Deploy Pipeline Workers
echo "🔄 Deploying Pipeline Orchestration Workers..."
wrangler deploy workers/pipeline/pipeline-orchestrator.js --name pipeline-orchestrator

# Deploy Enhanced Workers
echo "⚡ Deploying Enhanced Workers..."
wrangler deploy workers/scheduler/scheduler-daily-enhanced.js --name scheduler-daily-enhanced
wrangler deploy workers/admin/admin-review-enhanced.js --name admin-review-enhanced

# Set up Cron Triggers
echo "⏰ Setting up Cron Triggers..."
wrangler triggers set scheduler-daily-enhanced --cron "0 8,14,20 * * *" # 3 times daily

# Verify Deployments
echo "✅ Verifying deployments..."
DOMAIN="jhaladik.workers.dev"

echo "Testing RSS Collection..."
curl -s -f https://rss-collect.$DOMAIN/ > /dev/null && echo "✅ RSS Collect" || echo "❌ RSS Collect"

echo "Testing AI Scoring..."
curl -s -f https://ai-data-score.$DOMAIN/ > /dev/null && echo "✅ AI Score" || echo "❌ AI Score"

echo "Testing Pipeline Orchestrator..."
curl -s -f https://pipeline-orchestrator.$DOMAIN/ > /dev/null && echo "✅ Pipeline" || echo "❌ Pipeline"

echo "Testing Enhanced Admin..."
curl -s -f https://admin-review-enhanced.$DOMAIN/ > /dev/null && echo "✅ Admin Review" || echo "❌ Admin Review"

echo ""
echo "🎉 Phase 2b Deployment Complete!"
echo ""
echo "📋 Phase 2b Workers Deployed:"
echo "  📡 https://rss-collect.$DOMAIN"
echo "  🧠 https://ai-data-score.$DOMAIN"
echo "  🔍 https://ai-validate-enhanced.$DOMAIN"
echo "  ✍️ https://ai-generate-enhanced.$DOMAIN"
echo "  📰 https://content-publish.$DOMAIN"
echo "  🔄 https://pipeline-orchestrator.$DOMAIN"
echo "  ⏰ https://scheduler-daily-enhanced.$DOMAIN"
echo "  👨‍💼 https://admin-review-enhanced.$DOMAIN"
echo ""
echo "⚡ Next Steps:"
echo "  1. Run tests: npm run test:phase2b"
echo "  2. Test pipeline: npm run test:pipeline"
echo "  3. Monitor logs: npm run logs:pipeline"
echo "  4. Set up monitoring dashboard"
echo ""
echo "📈 Expected Results:"
echo "  - RSS collection from 4+ sources"
echo "  - AI scoring >80% accuracy"
echo "  - 70%+ auto-publication rate"
echo "  - 50% reduction in manual review"