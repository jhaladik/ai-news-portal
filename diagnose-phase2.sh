#!/bin/bash

# diagnose-phase2.sh - Comprehensive diagnosis of Phase 2 issues
set -e

echo "🔍 AI News Portal - Phase 2 Diagnostic"
echo "======================================"

USER_DOMAIN=$(wrangler whoami | grep Account | cut -d' ' -f2 | tr '[:upper:]' '[:lower:]')
echo "🌐 Domain: $USER_DOMAIN.workers.dev"
echo ""

echo "📋 Step 1: Checking infrastructure..."

# Check D1 database
echo "🗄️ Checking D1 database..."
DB_LIST=$(wrangler d1 list 2>/dev/null || echo "error")
if [[ $DB_LIST == *"ai-news-db"* ]]; then
    echo "✅ D1 database 'ai-news-db' exists"
    
    # Get database ID
    DB_ID=$(echo "$DB_LIST" | grep "ai-news-db" | awk '{print $1}')
    echo "   Database ID: $DB_ID"
    
    # Test database connection
    DB_TEST=$(wrangler d1 execute ai-news-db --remote --command "SELECT 1 as test" 2>/dev/null || echo "error")
    if [[ $DB_TEST == *"test"* ]]; then
        echo "✅ Database connection working"
    else
        echo "❌ Database connection failed"
        echo "   Response: $DB_TEST"
    fi
else
    echo "❌ D1 database 'ai-news-db' not found"
    echo "   Available databases: $DB_LIST"
fi

# Check KV namespace
echo ""
echo "🗂️ Checking KV namespace..."
KV_LIST=$(wrangler kv namespace list 2>/dev/null || echo "error")
if [[ $KV_LIST == *"AI_NEWS_KV"* ]]; then
    echo "✅ KV namespace 'AI_NEWS_KV' exists"
    
    # Get KV ID
    KV_ID=$(echo "$KV_LIST" | grep "AI_NEWS_KV" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   KV ID: $KV_ID"
else
    echo "❌ KV namespace 'AI_NEWS_KV' not found"
    echo "   Available namespaces: $KV_LIST"
fi

# Check R2 bucket
echo ""
echo "📦 Checking R2 bucket..."
R2_LIST=$(wrangler r2 bucket list 2>/dev/null || echo "error")
if [[ $R2_LIST == *"ai-news-files"* ]]; then
    echo "✅ R2 bucket 'ai-news-files' exists"
else
    echo "❌ R2 bucket 'ai-news-files' not found"
    echo "   Available buckets: $R2_LIST"
fi

echo ""
echo "📝 Step 2: Checking wrangler.toml configuration..."

if [ -f "wrangler.toml" ]; then
    echo "✅ wrangler.toml exists"
    
    # Check database binding
    if grep -q 'binding = "DB"' wrangler.toml; then
        echo "✅ DB binding found"
        TOML_DB_ID=$(grep 'database_id' wrangler.toml | cut -d'"' -f2)
        echo "   Configured DB ID: $TOML_DB_ID"
        
        if [ "$TOML_DB_ID" = "$DB_ID" ]; then
            echo "✅ DB ID matches"
        else
            echo "❌ DB ID mismatch in wrangler.toml"
        fi
    else
        echo "❌ DB binding not found in wrangler.toml"
    fi
    
    # Check KV binding
    if grep -q 'binding = "AI_NEWS_KV"' wrangler.toml; then
        echo "✅ KV binding 'AI_NEWS_KV' found"
        TOML_KV_ID=$(grep -A1 'binding = "AI_NEWS_KV"' wrangler.toml | grep 'id' | cut -d'"' -f2)
        echo "   Configured KV ID: $TOML_KV_ID"
        
        if [ "$TOML_KV_ID" = "$KV_ID" ]; then
            echo "✅ KV ID matches"
        else
            echo "❌ KV ID mismatch in wrangler.toml"
        fi
    else
        echo "❌ KV binding 'AI_NEWS_KV' not found in wrangler.toml"
        if grep -q 'binding = "KV"' wrangler.toml; then
            echo "   Found old binding 'KV' - needs update"
        fi
    fi
    
    # Check environment variables
    if grep -q '\[vars\]' wrangler.toml; then
        echo "✅ [vars] section found"
        
        if grep -q 'OPENWEATHER_API_KEY' wrangler.toml; then
            echo "✅ OPENWEATHER_API_KEY configured"
        else
            echo "❌ OPENWEATHER_API_KEY missing"
        fi
        
        if grep -q 'JWT_SECRET' wrangler.toml; then
            echo "✅ JWT_SECRET configured"
        else
            echo "❌ JWT_SECRET missing"
        fi
    else
        echo "❌ [vars] section not found"
    fi
    
else
    echo "❌ wrangler.toml not found!"
fi

echo ""
echo "🤖 Step 3: Checking deployed workers..."

# Test a simple worker first
echo "Testing basic worker (content-list)..."
BASIC_TEST=$(curl -s "https://content-list.$USER_DOMAIN.workers.dev/?neighborhood=vinohrady" 2>/dev/null || echo "failed")
if [[ $BASIC_TEST == *"["* ]] || [[ $BASIC_TEST == *"error"* ]]; then
    echo "✅ Basic worker responding"
else
    echo "❌ Basic worker not responding"
    echo "   Response: $BASIC_TEST"
fi

# Test KV access specifically
echo ""
echo "Testing KV access with simple worker..."
KV_TEST_WORKER='
export default {
  async fetch(request, env) {
    try {
      if (!env.AI_NEWS_KV) {
        return Response.json({ error: "KV binding not found", available: Object.keys(env) });
      }
      await env.AI_NEWS_KV.put("test-key", "test-value");
      const value = await env.AI_NEWS_KV.get("test-key");
      return Response.json({ success: true, test_value: value, kv_available: true });
    } catch (error) {
      return Response.json({ error: error.message, available_env: Object.keys(env) });
    }
  }
};'

# Create temporary test file
echo "$KV_TEST_WORKER" > /tmp/kv-test.js

# Deploy temporary test worker
echo "Deploying KV test worker..."
if wrangler deploy /tmp/kv-test.js --name kv-test --compatibility-date 2024-01-01; then
    echo "✅ KV test worker deployed"
    
    # Test KV functionality
    sleep 2
    KV_RESULT=$(curl -s "https://kv-test.$USER_DOMAIN.workers.dev/" 2>/dev/null || echo "failed")
    echo "KV test result: $KV_RESULT"
    
    # Clean up
    wrangler delete kv-test --force 2>/dev/null || true
    rm -f /tmp/kv-test.js
else
    echo "❌ Failed to deploy KV test worker"
fi

echo ""
echo "📊 Diagnostic Summary"
echo "===================="
echo ""
echo "🔧 Recommended fixes:"

# Generate fix commands based on findings
if ! grep -q 'binding = "AI_NEWS_KV"' wrangler.toml 2>/dev/null; then
    echo "1. Fix KV binding in wrangler.toml:"
    echo "   sed -i 's/binding = \"KV\"/binding = \"AI_NEWS_KV\"/' wrangler.toml"
fi

if ! grep -q 'OPENWEATHER_API_KEY' wrangler.toml 2>/dev/null; then
    echo "2. Add OPENWEATHER_API_KEY to [vars] section"
fi

echo "3. Redeploy all AI workers:"
echo "   npm run deploy:ai"

echo "4. Test again:"
echo "   ./test-ai-pipeline.sh"