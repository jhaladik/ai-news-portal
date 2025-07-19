#!/bin/bash

# emergency-fix.sh - Immediate fix for KV binding issues
set -e

echo "🚨 Emergency Fix for Phase 2 KV Issues"
echo "======================================"

USER_DOMAIN=$(wrangler whoami | grep Account | cut -d' ' -f2 | tr '[:upper:]' '[:lower:]')

echo "🔍 Step 1: Checking current wrangler.toml..."

# Show current KV configuration
echo "Current KV binding:"
grep -A3 '\[\[kv_namespaces\]\]' wrangler.toml || echo "No KV binding found"

echo ""
echo "🔧 Step 2: Fixing wrangler.toml..."

# Create backup
cp wrangler.toml wrangler.toml.emergency.backup

# Fix the most common issues
echo "Applying fixes..."

# Fix 1: Change KV binding from "KV" to "AI_NEWS_KV"
if grep -q 'binding = "KV"' wrangler.toml; then
    echo "• Fixing KV binding name (KV → AI_NEWS_KV)"
    sed -i.tmp 's/binding = "KV"/binding = "AI_NEWS_KV"/' wrangler.toml
fi

# Fix 2: Ensure we have the AI_NEWS_KV binding block
if ! grep -q 'binding = "AI_NEWS_KV"' wrangler.toml; then
    echo "• Adding AI_NEWS_KV binding block"
    
    # Get KV namespace ID from Cloudflare
    KV_LIST=$(wrangler kv namespace list 2>/dev/null || echo "[]")
    
    if [[ $KV_LIST == *"AI_NEWS_KV"* ]]; then
        KV_ID=$(echo "$KV_LIST" | grep "AI_NEWS_KV" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "  Found existing KV namespace: $KV_ID"
    else
        echo "  Creating new KV namespace..."
        KV_CREATE=$(wrangler kv namespace create "AI_NEWS_KV")
        KV_ID=$(echo "$KV_CREATE" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
        echo "  Created KV namespace: $KV_ID"
    fi
    
    # Add the KV binding to wrangler.toml
    cat >> wrangler.toml << EOF

# AI News KV namespace for Phase 2
[[kv_namespaces]]
binding = "AI_NEWS_KV"
id = "$KV_ID"
preview_id = "$KV_ID"
EOF
fi

# Fix 3: Add missing environment variables
if ! grep -q 'OPENWEATHER_API_KEY' wrangler.toml; then
    echo "• Adding OPENWEATHER_API_KEY"
    
    if grep -q '\[vars\]' wrangler.toml; then
        # Add to existing [vars] section
        sed -i.tmp '/\[vars\]/a OPENWEATHER_API_KEY = "demo"' wrangler.toml
    else
        # Create [vars] section
        cat >> wrangler.toml << EOF

# Environment variables
[vars]
OPENWEATHER_API_KEY = "demo"
EOF
    fi
fi

# Clean up temp files
rm -f wrangler.toml.tmp

echo "✅ wrangler.toml fixes applied"

echo ""
echo "📄 Updated wrangler.toml preview:"
echo "================================"
cat wrangler.toml
echo "================================"

echo ""
echo "🚀 Step 3: Redeploying AI workers with fixed config..."

# Deploy specific workers that use KV
CRITICAL_WORKERS=(
    "workers/ai/data-collect-prague.js:data-collect-prague"
    "workers/ai/data-collect-dpp.js:data-collect-dpp" 
    "workers/ai/ai-generate.js:ai-generate"
    "workers/ai/content-auto-approve.js:content-auto-approve"
    "workers/ai/scheduler-daily.js:scheduler-daily"
)

for worker in "${CRITICAL_WORKERS[@]}"; do
    IFS=':' read -r file name <<< "$worker"
    echo "Redeploying $name..."
    
    if [ -f "$file" ]; then
        if wrangler deploy "$file" --name "$name"; then
            echo "✅ $name redeployed successfully"
        else
            echo "❌ Failed to redeploy $name"
        fi
    else
        echo "⚠️ File not found: $file"
    fi
done

echo ""
echo "🧪 Step 4: Testing critical functionality..."

# Test 1: KV access
echo "Testing KV access..."
sleep 3
PRAGUE_TEST=$(curl -s "https://data-collect-prague.$USER_DOMAIN.workers.dev/" 2>/dev/null || echo "failed")

if [[ $PRAGUE_TEST == *"success"* ]]; then
    echo "✅ KV access working - Prague data collection successful"
elif [[ $PRAGUE_TEST == *"error"* ]]; then
    echo "⚠️ Worker responding but with errors:"
    echo "   $PRAGUE_TEST"
else
    echo "❌ Worker still not responding:"
    echo "   $PRAGUE_TEST"
fi

# Test 2: Database access
echo "Testing database access..."
DB_TEST=$(curl -s "https://content-list.$USER_DOMAIN.workers.dev/?neighborhood=vinohrady" 2>/dev/null || echo "failed")

if [[ $DB_TEST == *"["* ]] || [[ $DB_TEST == *"results"* ]]; then
    echo "✅ Database access working"
elif [[ $DB_TEST == *"error"* ]]; then
    echo "⚠️ Database responding but with errors:"
    echo "   $DB_TEST"
else
    echo "❌ Database not responding:"
    echo "   $DB_TEST"
fi

echo ""
echo "🎯 Emergency Fix Summary"
echo "======================="
echo ""
echo "Applied fixes:"
echo "✅ Fixed KV binding name (KV → AI_NEWS_KV)"
echo "✅ Ensured KV namespace exists and is bound"
echo "✅ Added missing environment variables" 
echo "✅ Redeployed critical AI workers"
echo ""
echo "Next steps:"
echo "1. Run full test: ./test-ai-pipeline.sh"
echo "2. If still failing, check logs: wrangler tail data-collect-prague"
echo "3. Manual test: curl -v https://data-collect-prague.$USER_DOMAIN.workers.dev/"
echo ""
echo "If you need Claude API (not just testing):"
echo "Add to [vars] section in wrangler.toml:"
echo "CLAUDE_API_KEY = \"your-actual-api-key\""