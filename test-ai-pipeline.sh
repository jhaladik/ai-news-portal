#!/bin/bash

# test-ai-pipeline.sh - End-to-end testing for Phase 2 AI pipeline
# Tests all AI workers and the complete content generation workflow

set -e

echo "🧪 AI News Portal - Phase 2 Pipeline Testing"
echo "============================================="

# Get user domain
USER_DOMAIN=jhaladik

if [ -z "$USER_DOMAIN" ]; then
    echo "❌ Could not determine user domain. Please run 'wrangler auth login' first"
    exit 1
fi

echo "🌐 Testing domain: $USER_DOMAIN.workers.dev"
echo ""

# Test results tracking
TESTS_PASSED=0
TESTS_TOTAL=0

# Helper function for test results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo "🔬 Testing: $test_name"
    
    result=$(eval "$test_command" 2>&1 || echo "COMMAND_FAILED")
    
    if [[ $result == *"$expected_pattern"* ]]; then
        echo "   ✅ PASS"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo "   ❌ FAIL"
        echo "   Expected: $expected_pattern"
        echo "   Got: $result"
        return 1
    fi
}

echo "Phase 2.1: Data Collection Tests"
echo "================================"

# Test Prague data collection
run_test "Prague data collection" \
    "curl -s 'https://data-collect-prague.$USER_DOMAIN.workers.dev/'" \
    "success"

# Test transport data collection
run_test "Transport data collection" \
    "curl -s 'https://data-collect-dpp.$USER_DOMAIN.workers.dev/'" \
    "success"

echo ""
echo "Phase 2.2: AI Content Generation Tests"
echo "======================================"

# Test basic AI generation
run_test "AI content generation (basic)" \
    "curl -s -X POST 'https://ai-generate.$USER_DOMAIN.workers.dev/' -H 'Content-Type: application/json' -d '{\"neighborhood\":\"vinohrady\",\"category\":\"local\"}'" \
    "success"

# Test AI generation with data
run_test "AI content generation (with context)" \
    "curl -s -X POST 'https://ai-generate.$USER_DOMAIN.workers.dev/' -H 'Content-Type: application/json' -d '{\"neighborhood\":\"vinohrady\",\"category\":\"weather\",\"data\":{\"temperature\":15,\"description\":\"sunny\"}}'" \
    "success"

# Capture a generated content ID for further testing
echo "🔍 Capturing generated content ID..."
GENERATION_RESPONSE=$(curl -s -X POST "https://ai-generate.$USER_DOMAIN.workers.dev/" \
    -H "Content-Type: application/json" \
    -d '{"neighborhood":"vinohrady","category":"test","type":"test_content"}')

CONTENT_ID=""
if [[ $GENERATION_RESPONSE == *"success"* ]]; then
    CONTENT_ID=$(echo "$GENERATION_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   📝 Generated content ID: $CONTENT_ID"
else
    echo "   ⚠️  Could not generate test content for validation tests"
fi

echo ""
echo "Phase 2.3: Content Validation Tests"
echo "==================================="

# Test content validation
if [ -n "$CONTENT_ID" ]; then
    run_test "AI content validation" \
        "curl -s -X POST 'https://ai-validate.$USER_DOMAIN.workers.dev/' -H 'Content-Type: application/json' -d '{\"content_id\":\"$CONTENT_ID\"}'" \
        "success"
else
    echo "🔬 Testing: AI content validation"
    echo "   ⏭️  SKIP (no content ID available)"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi

# Test batch scoring
run_test "AI content scoring (batch)" \
    "curl -s 'https://ai-score.$USER_DOMAIN.workers.dev/?batch=true&threshold=0.1'" \
    "success"

echo ""
echo "Phase 2.4: Content Automation Tests"
echo "==================================="

# Test auto-approval (dry run)
run_test "Auto-approval system (dry run)" \
    "curl -s -X POST 'https://content-auto-approve.$USER_DOMAIN.workers.dev/' -H 'Content-Type: application/json' -d '{\"threshold\":0.5,\"dry_run\":true}'" \
    "success"

# Test batch operations
run_test "Batch approval system" \
    "curl -s -X POST 'https://content-batch-approve.$USER_DOMAIN.workers.dev/' -H 'Content-Type: application/json' -d '{\"action\":\"bulk_approve_by_confidence\",\"threshold\":0.95,\"max_items\":1}'" \
    "success"

echo ""
echo "Phase 2.5: Scheduling & Automation Tests"
echo "========================================"

# Test manual pipeline execution
run_test "Daily scheduler (manual trigger)" \
    "curl -s -X POST 'https://scheduler-daily.$USER_DOMAIN.workers.dev/'" \
    "success"

echo ""
echo "Phase 2.6: Enhanced Admin Dashboard Tests"
echo "========================================="

# Test different admin views
run_test "Admin dashboard (pending content)" \
    "curl -s 'https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=pending&limit=5'" \
    "success"

run_test "Admin dashboard (statistics)" \
    "curl -s 'https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=stats'" \
    "success"

run_test "Admin dashboard (AI metrics)" \
    "curl -s 'https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=ai_metrics'" \
    "success"

run_test "Admin dashboard (daily summary)" \
    "curl -s 'https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=daily_summary'" \
    "success"

run_test "Admin dashboard (quality report)" \
    "curl -s 'https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=quality_report'" \
    "success"

echo ""
echo "Phase 2.7: End-to-End Workflow Test"
echo "==================================="

echo "🔄 Running complete AI workflow..."

# Step 1: Collect data
echo "   Step 1: Collecting Prague data..."
STEP1=$(curl -s "https://data-collect-prague.$USER_DOMAIN.workers.dev/")
if [[ $STEP1 == *"success"* ]]; then
    echo "   ✅ Data collection successful"
else
    echo "   ❌ Data collection failed"
fi

# Step 2: Generate content
echo "   Step 2: Generating AI content..."
STEP2=$(curl -s -X POST "https://ai-generate.$USER_DOMAIN.workers.dev/" \
    -H "Content-Type: application/json" \
    -d '{"neighborhood":"vinohrady","category":"local","type":"workflow_test"}')

WORKFLOW_CONTENT_ID=""
if [[ $STEP2 == *"success"* ]]; then
    echo "   ✅ Content generation successful"
    WORKFLOW_CONTENT_ID=$(echo "$STEP2" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   📝 Generated content ID: $WORKFLOW_CONTENT_ID"
else
    echo "   ❌ Content generation failed"
fi

# Step 3: Validate content
if [ -n "$WORKFLOW_CONTENT_ID" ]; then
    echo "   Step 3: Validating content..."
    STEP3=$(curl -s -X POST "https://ai-validate.$USER_DOMAIN.workers.dev/" \
        -H "Content-Type: application/json" \
        -d "{\"content_id\":\"$WORKFLOW_CONTENT_ID\"}")
    
    if [[ $STEP3 == *"success"* ]]; then
        echo "   ✅ Content validation successful"
        CONFIDENCE=$(echo "$STEP3" | grep -o '"confidence":[0-9.]*' | cut -d':' -f2)
        echo "   📊 Confidence score: $CONFIDENCE"
    else
        echo "   ❌ Content validation failed"
    fi
fi

# Step 4: Check admin dashboard
echo "   Step 4: Checking admin dashboard..."
STEP4=$(curl -s "https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=pending&limit=1")
if [[ $STEP4 == *"success"* ]]; then
    echo "   ✅ Admin dashboard accessible"
else
    echo "   ❌ Admin dashboard failed"
fi

echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "Tests passed: $TESTS_PASSED / $TESTS_TOTAL"

PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
echo "Pass rate: $PASS_RATE%"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo "🎉 All tests passed! Phase 2 AI pipeline is working correctly."
    exit 0
elif [ $PASS_RATE -ge 80 ]; then
    echo "✅ Most tests passed. Phase 2 is mostly functional."
    echo "⚠️  Some issues detected - check failed tests above."
    exit 0
else
    echo "❌ Many tests failed. Phase 2 has significant issues."
    echo "🔧 Please review the deployment and check worker logs."
    exit 1
fi