#!/bin/bash

echo "🚂 Railway Quick Deploy Script"
echo "=============================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI not found. Please install it first:"
    echo "   brew install gh"
    echo "   OR"
    echo "   Create repo manually at: https://github.com/new"
    exit 1
fi

# Create GitHub repo
echo "📦 Creating GitHub repository..."
gh repo create kbadinger/debate-processor --public --source=. --remote=origin --push || {
    echo "⚠️  Repo might already exist. Trying to push..."
    git push -u origin main
}

echo "✅ Code pushed to GitHub"
echo ""

# Install Railway CLI if needed
if ! command -v railway &> /dev/null; then
    echo "📥 Installing Railway CLI..."
    curl -fsSL https://railway.app/install.sh | sh
fi

echo "🔐 Please login to Railway..."
railway login

echo "🚀 Initializing Railway project..."
railway init

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to Railway dashboard"
echo "2. Add environment variables:"
echo "   - DATABASE_URL (from Neon)"
echo "   - FRONTEND_URL=https://decisionforge.ai"
echo "   - All API keys"
echo "3. Copy the Railway URL"
echo "4. Add to Vercel: NEXT_PUBLIC_RAILWAY_URL=<railway-url>"
echo ""
echo "🚀 Deploy with: railway up"











