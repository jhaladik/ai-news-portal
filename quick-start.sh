#!/bin/bash

# quick-start.sh - Automated Phase 1 deployment for AI News Portal
# Run this script to deploy all Phase 1 micro-workers

set -e  # Exit on any error

echo "🚀 AI News Portal - Phase 1 Quick Start"
echo "========================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Step 1: Create infrastructure
echo ""
echo "🏗️  Step 1: Creating Cloudflare infrastructure..."

echo "Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create ai-news-db 2>&1)
DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$DB_ID" ]; then
    echo "❌ Failed to create D1 database"
    echo "$DB_OUTPUT"
    exit 1
fi

echo "✅ D1 Database created with ID: $DB_ID"

echo "Creating KV namespace..."
KV_OUTPUT=$(wrangler kv namespace create "AI_NEWS_KV" 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$KV_ID" ]; then
    echo "❌ Failed to create KV namespace"
    echo "$KV_OUTPUT"
    exit 1
fi

echo "✅ KV Namespace created with ID: $KV_ID"

echo "Creating R2 bucket..."
wrangler r2 bucket create ai-news-files

echo "✅ R2 Bucket created: ai-news-files"

# Step 2: Update wrangler.toml
echo ""
echo "⚙️  Step 2: Updating wrangler.toml with infrastructure IDs..."

# Create backup
cp wrangler.toml wrangler.toml.backup

# Update database_id
sed -i.tmp "s/database_id = \"your-remote-db-id-here\"/database_id = \"$DB_ID\"/" wrangler.toml

# Update KV namespace id
sed -i.tmp "s/id = \"your-kv-namespace-id-here\"/id = \"$KV_ID\"/" wrangler.toml

# Clean up temp files
rm -f wrangler.toml.tmp

echo "✅ wrangler.toml updated with infrastructure IDs"

# Step 3: Deploy database migration
echo ""
echo "🗄️  Step 3: Setting up database..."

echo "Deploying migration script..."
wrangler deploy scripts/migrate.js --name db-migrate

echo "Running database migrations..."
MIGRATION_RESULT=$(curl -s "https://db-migrate.$(whoami).workers.dev/" || echo "failed")

if [[ $MIGRATION_RESULT == *"success"* ]]; then
    echo "✅ Database migration completed successfully"
else
    echo "❌ Database migration failed"
    echo "$MIGRATION_RESULT"
    exit 1
fi

# Step 4: Deploy micro-workers
echo ""
echo "🤖 Step 4: Deploying micro-workers..."

WORKERS=(
    "workers/auth/auth-login.js:auth-login"
    "workers/content/content-create.js:content-create"
    "workers/content/content-list.js:content-list"
    "workers/content/content-approve.js:content-approve"
    "workers/admin/admin-review-queue.js:admin-review-queue"
    "workers/newsletter/newsletter-signup.js:newsletter-signup"
)

for worker in "${WORKERS[@]}"; do
    IFS=':' read -r file name <<< "$worker"
    echo "Deploying $name..."
    
    if wrangler deploy "$file" --name "$name"; then
        echo "✅ $name deployed successfully"
    else
        echo "❌ Failed to deploy $name"
        exit 1
    fi
done

# Step 5: Test deployments
echo ""
echo "🧪 Step 5: Testing deployments..."

USER_DOMAIN=$(wrangler whoami | grep "Account" | cut -d' ' -f2 | tr '[:upper:]' '[:lower:]')

echo "Testing content creation..."
CREATE_RESULT=$(curl -s -X POST "https://content-create.$USER_DOMAIN.workers.dev/" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Test článek - Phase 1",
        "content": "Toto je testovací obsah vytvořený automaticky během nasazení Phase 1.",
        "category": "local",
        "neighborhood_id": "vinohrady"
    }' || echo '{"error": "failed"}')

if [[ $CREATE_RESULT == *"success"* ]]; then
    echo "✅ Content creation test passed"
    
    # Extract content ID for approval test
    CONTENT_ID=$(echo "$CREATE_RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    if [ ! -z "$CONTENT_ID" ]; then
        echo "Testing content approval..."
        APPROVE_RESULT=$(curl -s -X POST "https://content-approve.$USER_DOMAIN.workers.dev/" \
            -H "Content-Type: application/json" \
            -d "{
                \"id\": \"$CONTENT_ID\",
                \"action\": \"approve\",
                \"approved_by\": \"quick-start-script\"
            }" || echo '{"error": "failed"}')
        
        if [[ $APPROVE_RESULT == *"success"* ]]; then
            echo "✅ Content approval test passed"
        else
            echo "⚠️  Content approval test failed (non-critical)"
        fi
    fi
else
    echo "⚠️  Content creation test failed (non-critical)"
fi

echo "Testing content listing..."
LIST_RESULT=$(curl -s "https://content-list.$USER_DOMAIN.workers.dev/?neighborhood=vinohrady&status=published" || echo '{"error": "failed"}')

if [[ $LIST_RESULT == *"articles"* ]]; then
    echo "✅ Content listing test passed"
else
    echo "⚠️  Content listing test failed (non-critical)"
fi

# Step 6: Show summary
echo ""
echo "🎉 Phase 1 Deployment Complete!"
echo "================================"
echo ""
echo "📊 Infrastructure:"
echo "  • D1 Database ID: $DB_ID"
echo "  • KV Namespace ID: $KV_ID"
echo "  • R2 Bucket: ai-news-files"
echo ""
echo "🤖 Deployed Workers:"
for worker in "${WORKERS[@]}"; do
    IFS=':' read -r file name <<< "$worker"
    echo "  • $name: https://$name.$USER_DOMAIN.workers.dev/"
done
echo ""
echo "🔗 Useful URLs:"
echo "  • Database migration: https://db-migrate.$USER_DOMAIN.workers.dev/"
echo "  • Admin review queue: https://admin-review-queue.$USER_DOMAIN.workers.dev/"
echo "  • Content API: https://content-list.$USER_DOMAIN.workers.dev/?neighborhood=vinohrady&status=published"
echo ""
echo "📝 Next Steps:"
echo "  1. Set up custom domains in Cloudflare dashboard"
echo "  2. Deploy frontend to Cloudflare Pages"
echo "  3. Create sample content via admin dashboard"
echo "  4. Test newsletter signup functionality"
echo ""
echo "🔧 Troubleshooting:"
echo "  • Check worker logs: wrangler tail <worker-name>"
echo "  • Test database: wrangler d1 execute ai-news-db --remote --command \"SELECT * FROM neighborhoods\""
echo "  • View deployment guide: cat DEPLOYMENT_GUIDE.md"
echo ""
echo "✅ Phase 1 is ready! You can now move to frontend deployment."

# Create environment file for frontend
echo ""
echo "📄 Creating frontend environment file..."

cat > frontend/.env.local << EOF
# Generated by quick-start.sh
API_URL=https://$USER_DOMAIN.workers.dev
AUTH_LOGIN_URL=https://auth-login.$USER_DOMAIN.workers.dev
CONTENT_LIST_URL=https://content-list.$USER_DOMAIN.workers.dev
CONTENT_CREATE_URL=https://content-create.$USER_DOMAIN.workers.dev
CONTENT_APPROVE_URL=https://content-approve.$USER_DOMAIN.workers.dev
NEWSLETTER_SIGNUP_URL=https://newsletter-signup.$USER_DOMAIN.workers.dev
ADMIN_REVIEW_URL=https://admin-review-queue.$USER_DOMAIN.workers.dev
EOF

echo "✅ Frontend environment file created: frontend/.env.local"
echo ""
echo "To deploy frontend:"
echo "  cd frontend"
echo "  npm install"
echo "  npm run dev  # for local testing"
echo "  npm run build && npm run export && wrangler pages deploy out --project-name ai-news-frontend"