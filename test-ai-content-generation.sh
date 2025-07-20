#!/bin/bash

# test-ai-content-generation.sh - Complete AI pipeline test with real content generation
set -e

echo "🧪 AI Content Generation Pipeline Test"
echo "======================================"

# Get user domain
USER_DOMAIN=jhaladik

if [ -z "$USER_DOMAIN" ]; then
    echo "❌ Could not determine user domain. Please run 'wrangler auth login' first"
    exit 1
fi

echo "🌐 Domain: $USER_DOMAIN.workers.dev"
echo "🕒 Test started: $(date)"
echo ""

# Step 1: Collect fresh data from all sources
echo "📊 Step 1: Collecting fresh data..."
echo "===================================="

echo "🏛️ Collecting Prague city data..."
PRAGUE_RESPONSE=$(curl -s "https://data-collect-prague.$USER_DOMAIN.workers.dev/")
echo "Prague data response: $PRAGUE_RESPONSE"

if [[ $PRAGUE_RESPONSE == *"success"* ]]; then
    echo "✅ Prague data collected successfully"
    PRAGUE_TEMP=$(echo "$PRAGUE_RESPONSE" | grep -o '"temperature":[0-9]*' | cut -d':' -f2)
    PRAGUE_WEATHER=$(echo "$PRAGUE_RESPONSE" | grep -o '"weather":"[^"]*"' | cut -d'"' -f4)
    echo "   🌡️ Temperature: ${PRAGUE_TEMP}°C"
    echo "   🌤️ Weather: $PRAGUE_WEATHER"
else
    echo "❌ Prague data collection failed"
    exit 1
fi

echo ""
echo "🚇 Collecting transport data..."
TRANSPORT_RESPONSE=$(curl -s "https://data-collect-dpp.$USER_DOMAIN.workers.dev/")
echo "Transport data response: $TRANSPORT_RESPONSE"

if [[ $TRANSPORT_RESPONSE == *"success"* ]]; then
    echo "✅ Transport data collected successfully"
    DISRUPTIONS=$(echo "$TRANSPORT_RESPONSE" | grep -o '"disruptions":[0-9]*' | cut -d':' -f2)
    echo "   🚦 Active disruptions: $DISRUPTIONS"
else
    echo "❌ Transport data collection failed"
    exit 1
fi

# Step 2: Wait for KV storage propagation
echo ""
echo "⏳ Step 2: Waiting for KV storage propagation..."
sleep 3
echo "✅ Ready for AI generation"

# Step 3: Generate AI content for different scenarios
echo ""
echo "🤖 Step 3: Generating AI content with collected data..."
echo "===================================================="

# Test scenarios
declare -A scenarios=(
    ["weather"]="vinohrady,weather"
    ["transport"]="karlin,transport" 
    ["local"]="smichov,local"
    ["news"]="vinohrady,news"
)

GENERATED_ARTICLES=()

for scenario in "${!scenarios[@]}"; do
    IFS=',' read -r neighborhood category <<< "${scenarios[$scenario]}"
    
    echo ""
    echo "📝 Generating $scenario content for $neighborhood..."
    
    AI_RESPONSE=$(curl -s -X POST "https://ai-generate.$USER_DOMAIN.workers.dev/" \
        -H "Content-Type: application/json" \
        -d "{
            \"neighborhood\": \"$neighborhood\",
            \"category\": \"$category\",
            \"type\": \"pipeline_test\"
        }")
    
    echo "AI Response: $AI_RESPONSE"
    
    if [[ $AI_RESPONSE == *"success"* ]]; then
        ARTICLE_ID=$(echo "$AI_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        ARTICLE_TITLE=$(echo "$AI_RESPONSE" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
        CONFIDENCE=$(echo "$AI_RESPONSE" | grep -o '"confidence":[0-9.]*' | cut -d':' -f2)
        MODE=$(echo "$AI_RESPONSE" | grep -o '"mode":"[^"]*"' | cut -d'"' -f4)
        CONTEXT_USED=$(echo "$AI_RESPONSE" | grep -o '"context_used":[a-z]*' | cut -d':' -f2)
        
        echo "   ✅ $scenario article generated successfully"
        echo "   📄 ID: $ARTICLE_ID"
        echo "   📝 Title: $ARTICLE_TITLE"
        echo "   🎯 Confidence: $CONFIDENCE"
        echo "   🔧 Mode: $MODE"
        echo "   📊 Context used: $CONTEXT_USED"
        
        GENERATED_ARTICLES+=("$ARTICLE_ID:$scenario:$ARTICLE_TITLE:$CONFIDENCE:$MODE:$CONTEXT_USED")
    else
        echo "   ❌ $scenario article generation failed"
        echo "   Error: $AI_RESPONSE"
    fi
done

# Step 4: Retrieve and display generated articles
echo ""
echo "📖 Step 4: Displaying generated articles..."
echo "=========================================="

for article_info in "${GENERATED_ARTICLES[@]}"; do
    IFS=':' read -r article_id scenario title confidence mode context_used <<< "$article_info"
    
    echo ""
    echo "📰 $scenario Article ($title)"
    echo "----------------------------------------"
    echo "🆔 ID: $article_id"
    echo "🎯 Confidence: $confidence"
    echo "🔧 Generation Mode: $mode"
    echo "📊 Used Context Data: $context_used"
    echo ""
    
    # Get full article content from database
    CONTENT_RESPONSE=$(curl -s "https://content-list.$USER_DOMAIN.workers.dev/?id=$article_id")
    
    if [[ $CONTENT_RESPONSE == *"success"* ]]; then
        # Extract content (this is a simplified extraction - real implementation might need better parsing)
        CONTENT=$(echo "$CONTENT_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4 | sed 's/\\n/\n/g')
        echo "📄 Content:"
        echo "$CONTENT"
        echo ""
        
        # Check if content contains real data references
        if [[ $CONTENT == *"$PRAGUE_TEMP"* ]] && [[ $context_used == "true" ]]; then
            echo "✅ REAL DATA DETECTED: Article contains actual temperature ($PRAGUE_TEMP°C)"
        elif [[ $CONTENT == *"tramvaj"* ]] || [[ $CONTENT == *"metro"* ]] && [[ $context_used == "true" ]]; then
            echo "✅ REAL DATA DETECTED: Article contains transport information"
        elif [[ $mode == "claude-api" ]]; then
            echo "🤖 CLAUDE API: Article generated by real AI (may not reference specific data)"
        elif [[ $mode == "mock-fallback" ]]; then
            echo "⚠️ MOCK MODE: Article generated by fallback templates"
        else
            echo "ℹ️ Standard article generated"
        fi
    else
        echo "❌ Could not retrieve article content"
    fi
    
    echo "----------------------------------------"
done

# Step 5: Test AI scoring and validation
echo ""
echo "🎯 Step 5: Testing AI scoring and validation..."
echo "============================================="

if [ ${#GENERATED_ARTICLES[@]} -gt 0 ]; then
    # Pick the first generated article for testing
    FIRST_ARTICLE=$(echo "${GENERATED_ARTICLES[0]}" | cut -d':' -f1)
    
    echo "📊 Testing AI scoring on article: $FIRST_ARTICLE"
    SCORING_RESPONSE=$(curl -s -X POST "https://ai-score.$USER_DOMAIN.workers.dev/" \
        -H "Content-Type: application/json" \
        -d "{\"content_id\": \"$FIRST_ARTICLE\"}")
    
    echo "Scoring response: $SCORING_RESPONSE"
    
    if [[ $SCORING_RESPONSE == *"success"* ]]; then
        QUALITY_SCORE=$(echo "$SCORING_RESPONSE" | grep -o '"quality_score":[0-9.]*' | cut -d':' -f2)
        echo "✅ Article scored successfully: $QUALITY_SCORE"
    else
        echo "⚠️ Article scoring had issues"
    fi
    
    echo ""
    echo "✅ Testing AI validation on article: $FIRST_ARTICLE"
    VALIDATION_RESPONSE=$(curl -s -X POST "https://ai-validate.$USER_DOMAIN.workers.dev/" \
        -H "Content-Type: application/json" \
        -d "{\"content_id\": \"$FIRST_ARTICLE\"}")
    
    echo "Validation response: $VALIDATION_RESPONSE"
    
    if [[ $VALIDATION_RESPONSE == *"success"* ]]; then
        echo "✅ Article validation completed"
    else
        echo "⚠️ Article validation had issues"
    fi
fi

# Step 6: Test daily pipeline
echo ""
echo "🔄 Step 6: Testing complete daily pipeline..."
echo "==========================================="

PIPELINE_RESPONSE=$(curl -s -X POST "https://scheduler-daily.$USER_DOMAIN.workers.dev/")
echo "Pipeline response: $PIPELINE_RESPONSE"

if [[ $PIPELINE_RESPONSE == *"success"* ]]; then
    echo "✅ Daily pipeline executed successfully"
else
    echo "⚠️ Daily pipeline had issues"
fi

# Step 7: Check admin dashboard metrics
echo ""
echo "📊 Step 7: Checking admin dashboard metrics..."
echo "============================================="

METRICS_RESPONSE=$(curl -s "https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=ai_metrics")

if [[ $METRICS_RESPONSE == *"ai_worker_performance"* ]]; then
    echo "✅ AI metrics dashboard accessible"
    
    # Extract some basic metrics
    TOTAL_GENERATED=$(echo "$METRICS_RESPONSE" | grep -o '"total_generated":[0-9]*' | head -1 | cut -d':' -f2)
    AVG_CONFIDENCE=$(echo "$METRICS_RESPONSE" | grep -o '"avg_confidence":[0-9.]*' | head -1 | cut -d':' -f2)
    
    echo "📈 Total AI articles generated: $TOTAL_GENERATED"
    echo "📊 Average confidence: $AVG_CONFIDENCE"
else
    echo "⚠️ AI metrics dashboard had issues"
fi

# Final Summary
echo ""
echo "🎯 Pipeline Test Summary"
echo "======================="
echo "🕒 Test completed: $(date)"
echo ""
echo "📊 Results:"
echo "   • Prague data collection: ✅"
echo "   • Transport data collection: ✅"
echo "   • Articles generated: ${#GENERATED_ARTICLES[@]}"
echo ""

CLAUDE_ARTICLES=0
MOCK_ARTICLES=0
CONTEXT_ARTICLES=0

for article_info in "${GENERATED_ARTICLES[@]}"; do
    IFS=':' read -r article_id scenario title confidence mode context_used <<< "$article_info"
    
    if [[ $mode == "claude-api" ]]; then
        CLAUDE_ARTICLES=$((CLAUDE_ARTICLES + 1))
    else
        MOCK_ARTICLES=$((MOCK_ARTICLES + 1))
    fi
    
    if [[ $context_used == "true" ]]; then
        CONTEXT_ARTICLES=$((CONTEXT_ARTICLES + 1))
    fi
done

echo "🤖 AI Generation Breakdown:"
echo "   • Claude API articles: $CLAUDE_ARTICLES"
echo "   • Mock fallback articles: $MOCK_ARTICLES"
echo "   • Articles using context data: $CONTEXT_ARTICLES"
echo ""

if [ $CLAUDE_ARTICLES -gt 0 ] && [ $CONTEXT_ARTICLES -gt 0 ]; then
    echo "🎉 EXCELLENT: Real AI generation with context data working!"
elif [ $CLAUDE_ARTICLES -gt 0 ]; then
    echo "✅ GOOD: Real AI generation working (context integration needs work)"
elif [ $MOCK_ARTICLES -gt 0 ]; then
    echo "⚠️ PARTIAL: Mock generation working (need Claude API key for full functionality)"
else
    echo "❌ ISSUES: AI generation not working properly"
fi

echo ""
echo "🚀 Next Steps:"
echo "   1. Check generated articles above for quality and context usage"
echo "   2. If Claude API articles are being generated, pipeline is production-ready"
echo "   3. Deploy frontend and test AI Dashboard integration"
echo "   4. Set up daily cron trigger for automated content generation"
echo ""
echo "✅ AI Pipeline Test Complete!"