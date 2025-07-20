#!/bin/bash

# check-database.sh - Quick database status checker
set -e

echo "🔍 AI News Portal - Database Status Check"
echo "========================================="

USER_DOMAIN=jhaladik

if [ -z "$USER_DOMAIN" ]; then
    echo "❌ Could not determine user domain. Please run 'wrangler auth login' first"
    exit 1
fi

echo "🌐 Domain: $USER_DOMAIN.workers.dev"
echo ""

# Check database connection
echo "📡 Testing database connection..."
DB_TEST=$(wrangler d1 execute ai-news-db --remote --command "SELECT 1 as test;" 2>/dev/null || echo "failed")

if [[ $DB_TEST == *"test"* ]]; then
    echo "✅ Database connection working"
else
    echo "❌ Database connection failed"
    echo "Response: $DB_TEST"
    echo ""
    echo "🔧 Try running: ./init-database.sh"
    exit 1
fi

# Check table structure
echo ""
echo "🗂️ Checking table structure..."

TABLES=$(wrangler d1 execute ai-news-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>/dev/null || echo "failed")

echo "Available tables:"
if [[ $TABLES == *"neighborhoods"* ]]; then
    echo "  ✅ neighborhoods"
else
    echo "  ❌ neighborhoods (missing)"
fi

if [[ $TABLES == *"content"* ]]; then
    echo "  ✅ content"
else
    echo "  ❌ content (missing)"
fi

if [[ $TABLES == *"users"* ]]; then
    echo "  ✅ users"
else
    echo "  ❌ users (missing)"
fi

if [[ $TABLES == *"businesses"* ]]; then
    echo "  ✅ businesses"
else
    echo "  ❌ businesses (missing)"
fi

# Check data counts
echo ""
echo "📊 Data summary..."

NEIGHBORHOOD_COUNT=$(wrangler d1 execute ai-news-db --remote --command "SELECT COUNT(*) as count FROM neighborhoods;" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo '0')
CONTENT_COUNT=$(wrangler d1 execute ai-news-db --remote --command "SELECT COUNT(*) as count FROM content;" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo '0')
USER_COUNT=$(wrangler d1 execute ai-news-db --remote --command "SELECT COUNT(*) as count FROM users;" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo '0')

echo "Current data:"
echo "  📍 Neighborhoods: $NEIGHBORHOOD_COUNT"
echo "  📰 Content: $CONTENT_COUNT"  
echo "  👥 Users: $USER_COUNT"

# Check published content
PUBLISHED_COUNT=$(wrangler d1 execute ai-news-db --remote --command "SELECT COUNT(*) as count FROM content WHERE status='published';" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo '0')
echo "  ✅ Published content: $PUBLISHED_COUNT"

# Check content by status
echo ""
echo "📋 Content by status:"
STATUS_BREAKDOWN=$(wrangler d1 execute ai-news-db --remote --command "SELECT status, COUNT(*) as count FROM content GROUP BY status;" 2>/dev/null || echo "none")

if [[ $STATUS_BREAKDOWN != "none" ]]; then
    echo "$STATUS_BREAKDOWN"
else
    echo "  No content found"
fi

# Test API endpoints
echo ""
echo "🧪 Testing API endpoints..."

echo "Testing content-list API..."
CONTENT_API_TEST=$(curl -s "https://content-list.$USER_DOMAIN.workers.dev/?neighborhood=vinohrady&status=published" || echo "failed")

if [[ $CONTENT_API_TEST == *"["* ]] || [[ $CONTENT_API_TEST == *"title"* ]]; then
    echo "  ✅ Content API working"
    
    # Count returned articles
    ARTICLE_COUNT=$(echo "$CONTENT_API_TEST" | grep -o '"title"' | wc -l | tr -d ' ')
    echo "     Returned $ARTICLE_COUNT articles for Vinohrady"
else
    echo "  ❌ Content API failed"
    echo "     Response: $CONTENT_API_TEST"
fi

echo "Testing admin API..."
ADMIN_API_TEST=$(curl -s "https://admin-review-queue.$USER_DOMAIN.workers.dev/?view=stats" || echo "failed")

if [[ $ADMIN_API_TEST == *"success"* ]] || [[ $ADMIN_API_TEST == *"status"* ]]; then
    echo "  ✅ Admin API working"
else
    echo "  ⚠️ Admin API needs attention"
    echo "     Response: $ADMIN_API_TEST"
fi

# Summary and recommendations
echo ""
echo "📝 Summary and Recommendations"
echo "============================="

if [ "$NEIGHBORHOOD_COUNT" -ge 4 ] && [ "$CONTENT_COUNT" -ge 3 ] && [ "$USER_COUNT" -ge 1 ]; then
    echo "✅ Database is properly initialized and ready to use!"
    echo ""
    echo "🎯 Ready for:"
    echo "  • Frontend deployment"
    echo "  • AI content generation"
    echo "  • Admin panel usage"
    echo ""
    echo "🔗 Next steps:"
    echo "  1. Deploy frontend: ./deploy-frontend-phase2-fixed.sh"
    echo "  2. Test AI pipeline: ./test-ai-pipeline.sh"
    echo "  3. Access admin at: https://your-frontend.pages.dev/admin/dashboard"
else
    echo "⚠️ Database needs initialization!"
    echo ""
    echo "Issues found:"
    [ "$NEIGHBORHOOD_COUNT" -lt 4 ] && echo "  • Missing neighborhoods (need 4, have $NEIGHBORHOOD_COUNT)"
    [ "$CONTENT_COUNT" -lt 3 ] && echo "  • Missing sample content (need 3+, have $CONTENT_COUNT)"
    [ "$USER_COUNT" -lt 1 ] && echo "  • Missing admin user (need 1+, have $USER_COUNT)"
    echo ""
    echo "🔧 Fix with: ./init-database.sh"
fi

echo ""
echo "🔧 Useful commands:"
echo "  • Reinitialize: ./init-database.sh"
echo "  • View content: wrangler d1 execute ai-news-db --remote --command \"SELECT title, status, neighborhood_id FROM content;\""
echo "  • Reset database: npm run db:reset"
echo "  • Check workers: npm run status"