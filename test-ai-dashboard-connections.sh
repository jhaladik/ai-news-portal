#!/bin/bash

# test-ai-dashboard-connections.sh - Test AI Dashboard backend connections
set -e

echo "🧪 AI Dashboard Connection Test"
echo "==============================="

# Get user domain
USER_DOMAIN=jhaladik

if [ -z "$USER_DOMAIN" ]; then
    echo "❌ Could not determine user domain. Please run 'wrangler auth login' first"
    exit 1
fi

echo "🌐 Testing domain: $USER_DOMAIN.workers.dev"
echo ""

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" "$url" 2>/dev/null || echo "000")
    fi
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [[ "$http_code" == "200" ]]; then
        echo "✅ OK ($http_code)"
        if [[ ${#body} -gt 100 ]]; then
            echo "   Response: ${body:0:100}..."
        else
            echo "   Response: $body"
        fi
    elif [[ "$http_code" == "000" ]]; then
        echo "❌ FAILED (Connection error)"
    else
        echo "⚠️ WARNING ($http_code)"
        if [[ ${#body} -gt 100 ]]; then
            echo "   Error: ${body:0:100}..."
        else
            echo "   Error: $body"
        fi
    fi
    echo ""
}

# Test all AI Dashboard endpoints
echo "📊 Testing Core Infrastructure..."
test_endpoint "Database (Content List)" "https://content-list.$USER_DOMAIN.workers.dev/?neighborhood=vinohrady"
test_endpoint "Admin Review Queue" "https://admin-review-queue.$USER_DOMAIN.workers.dev/"

echo ""
echo "🤖 Testing AI Data Collection..."
test_endpoint "Prague Data Collection" "https://data-collect-prague.$USER_DOMAIN.workers.dev/"
test_endpoint "Transport Data Collection" "https://data-collect-dpp.$USER_DOMAIN.workers.dev/"

echo ""
echo "🧠 Testing AI Generation..."
test_endpoint "AI Content Generation" "https://ai-generate.$USER_DOMAIN.workers.dev/" "POST"
test_endpoint "AI Validation" "https://ai-validate.$USER_DOMAIN.workers.dev/" "POST"
test_endpoint "AI Scoring" "https://ai-score.$USER_DOMAIN.workers.dev/" "POST"

echo ""
echo "⚙️ Testing Automation..."
test_endpoint "Daily Scheduler" "https://scheduler-daily.$USER_DOMAIN.workers.dev/" "POST"
test_endpoint "Auto Approval" "https://content-auto-approve.$USER_DOMAIN.workers.dev/" "POST"

echo ""
echo "📈 Testing AI Metrics..."
test_endpoint "AI Metrics" "https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=ai_metrics"

echo ""
echo "🔍 Configuration Check..."

# Check wrangler.toml configuration
if [ -f "wrangler.toml" ]; then
    echo "✅ wrangler.toml exists"
    
    if grep -q 'binding = "AI_NEWS_KV"' wrangler.toml; then
        echo "✅ KV binding correct (AI_NEWS_KV)"
    else
        echo "❌ KV binding incorrect or missing"
    fi
    
    if grep -q 'OPENWEATHER_API_KEY' wrangler.toml; then
        echo "✅ OPENWEATHER_API_KEY configured"
    else
        echo "❌ OPENWEATHER_API_KEY missing"
    fi
else
    echo "❌ wrangler.toml not found"
fi

# Check frontend configuration
if [ -f "frontend/next.config.js" ]; then
    echo "✅ Frontend next.config.js exists"
    
    if grep -q "DATA_COLLECT_PRAGUE_URL" frontend/next.config.js; then
        echo "✅ AI environment variables configured in frontend"
    else
        echo "❌ AI environment variables missing in frontend"
    fi
else
    echo "❌ Frontend next.config.js not found"
fi

if [ -f "frontend/.env.local" ]; then
    echo "✅ Frontend .env.local exists"
else
    echo "⚠️ Frontend .env.local missing (optional)"
fi

echo ""
echo "🎯 Test Summary"
echo "==============="

# Count successful tests
success_count=0
total_count=8

# Re-test critical endpoints for summary
declare -A critical_tests=(
    ["Prague Data"]="https://data-collect-prague.$USER_DOMAIN.workers.dev/"
    ["Transport Data"]="https://data-collect-dpp.$USER_DOMAIN.workers.dev/"
    ["AI Metrics"]="https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=ai_metrics"
    ["Content List"]="https://content-list.$USER_DOMAIN.workers.dev/?neighborhood=vinohrady"
)

for test_name in "${!critical_tests[@]}"; do
    url="${critical_tests[$test_name]}"
    http_code=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null || echo "000")
    
    if [[ "$http_code" == "200" ]]; then
        echo "✅ $test_name: Working"
        ((success_count++))
    else
        echo "❌ $test_name: Failed ($http_code)"
    fi
done

echo ""
echo "📊 Results: $success_count/4 critical endpoints working"

if [ $success_count -eq 4 ]; then
    echo "🎉 All critical AI Dashboard connections are working!"
    echo ""
    echo "✅ Ready to use AI Dashboard:"
    echo "   • Deploy frontend: cd frontend && npm run build && wrangler pages deploy out"
    echo "   • Access dashboard: [your-domain]/admin/ai-dashboard"
elif [ $success_count -ge 2 ]; then
    echo "⚠️ Some connections working, but issues remain."
    echo ""
    echo "🔧 Recommended fixes:"
    echo "   1. Run the connection fix script: ./ai-dashboard-connection-fix.sh"
    echo "   2. Check worker logs: wrangler tail data-collect-prague"
    echo "   3. Verify KV binding: wrangler kv namespace list"
else
    echo "❌ Major connection issues detected."
    echo ""
    echo "🚨 Critical fixes needed:"
    echo "   1. Run emergency fix: ./ai-dashboard-connection-fix.sh"
    echo "   2. Check wrangler.toml configuration"
    echo "   3. Redeploy all workers: npm run deploy:ai"
    echo "   4. Verify infrastructure: wrangler d1 list && wrangler kv namespace list"
fi

echo ""
echo "🔧 For detailed debugging:"
echo "   • Check specific worker logs: wrangler tail [worker-name]"
echo "   • Test database: wrangler d1 execute ai-news-db --remote --command 'SELECT COUNT(*) FROM content'"
echo "   • Test KV: wrangler kv key list --namespace-id [your-kv-id]"