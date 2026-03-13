#!/bin/bash

echo "🚀 Deploying Debate Processor to Railway..."

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    curl -fsSL https://railway.app/install.sh | sh
fi

# Login to Railway (if not already)
railway whoami || railway login

# Deploy
echo "📦 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Railway dashboard"
echo "2. Update NEXT_PUBLIC_RAILWAY_URL in Vercel"
echo "3. Test the connection"











