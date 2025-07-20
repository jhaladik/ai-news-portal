#!/bin/bash

# check-database.sh - Check current database state before migration
set -e

echo "🔍 AI News Portal - Database State Check"
echo "========================================"

echo "📊 Checking existing tables..."
wrangler d1 execute ai-news-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo ""
echo "📋 Checking content table structure..."
wrangler d1 execute ai-news-db --remote --command "PRAGMA table_info(content);"

echo ""
echo "👥 Checking users table structure..."
wrangler d1 execute ai-news-db --remote --command "PRAGMA table_info(users);"

echo ""
echo "📡 Checking rss_sources table structure..."
wrangler d1 execute ai-news-db --remote --command "PRAGMA table_info(rss_sources);"

echo ""
echo "📈 Current data counts..."
wrangler d1 execute ai-news-db --remote --command "
SELECT 
  'neighborhoods' as table_name, COUNT(*) as count FROM neighborhoods
UNION ALL
SELECT 
  'content' as table_name, COUNT(*) as count FROM content  
UNION ALL
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 
  'rss_sources' as table_name, COUNT(*) as count FROM rss_sources;
"

echo ""
echo "🎯 Checking for v2 tables that need to be created..."

# Check if v2 tables exist
echo "Checking user_preferences table..."
USER_PREFS_EXISTS=$(wrangler d1 execute ai-news-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences';" 2>/dev/null || echo "")

if [ -z "$USER_PREFS_EXISTS" ]; then
    echo "❌ user_preferences table - MISSING (needs creation)"
else
    echo "✅ user_preferences table - EXISTS"
fi

echo "Checking newsletters table..."
NEWSLETTERS_EXISTS=$(wrangler d1 execute ai-news-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='newsletters';" 2>/dev/null || echo "")

if [ -z "$NEWSLETTERS_EXISTS" ]; then
    echo "❌ newsletters table - MISSING (needs creation)"
else
    echo "✅ newsletters table - EXISTS"
fi

echo "Checking newsletter_sends table..."
NEWSLETTER_SENDS_EXISTS=$(wrangler d1 execute ai-news-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='newsletter_sends';" 2>/dev/null || echo "")

if [ -z "$NEWSLETTER_SENDS_EXISTS" ]; then
    echo "❌ newsletter_sends table - MISSING (needs creation)"
else
    echo "✅ newsletter_sends table - EXISTS"
fi

echo ""
echo "✅ Database check complete!"
echo ""
echo "🚀 Next steps:"
echo "1. If any v2 tables are missing, run: wrangler d1 execute ai-news-db --remote --file=safe-migration-v2.sql"
echo "2. The safe migration will only create missing tables and add missing columns"
echo "3. It will skip anything that already exists"