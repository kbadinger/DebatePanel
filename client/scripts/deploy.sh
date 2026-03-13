#!/bin/bash

# Vercel Deploy Script
# Manually trigger a Vercel deployment

echo "🚀 Triggering Vercel deployment..."

response=$(curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_Cg4uBe79Ad0WMENHEQuPNFXJ36De/eSnGWYEPAQ")

# Extract job ID using grep and sed (works on both Mac and Linux)
job_id=$(echo "$response" | grep -o '"id":"[^"]*"' | sed 's/"id":"//' | sed 's/"//')

if [ -n "$job_id" ]; then
    echo "✅ Deployment triggered successfully!"
    echo "📦 Job ID: $job_id"
    echo ""
    echo "🔗 Check deployment status at:"
    echo "   https://vercel.com/kbadingers-projects/debate-panel"
    echo ""
    echo "⏱️  Deployment usually takes 1-2 minutes"
else
    echo "❌ Failed to trigger deployment"
    echo "Response: $response"
    exit 1
fi
