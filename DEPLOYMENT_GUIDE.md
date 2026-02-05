# 🚀 Complete Deployment Guide

## Overview
- **Frontend (Vercel)**: Next.js app at debate-panel.vercel.app
- **Backend (Railway)**: Node.js/Express service for AI processing
- **Database (Neon)**: PostgreSQL database

---

## 📦 Part 1: Deploy Frontend to Vercel

### Step 1: Prepare the Frontend
```bash
cd debate-panel
git add -A
git commit -m "Your commit message"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Automatic Deployment (If Already Connected)
```bash
npm run deploy
# or
./scripts/deploy.sh
```

#### Option B: Manual Deployment via Vercel CLI
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod
```

#### Option C: Via GitHub Integration
1. Push to GitHub (done in Step 1)
2. Vercel auto-deploys from main branch
3. Check: https://vercel.com/kbadingers-projects/debate-panel

### Step 3: Set Environment Variables in Vercel
Go to: https://vercel.com/kbadingers-projects/debate-panel/settings/environment-variables

Required variables:
```
# Database
DATABASE_URL=your_neon_database_url

# NextAuth
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=https://debate-panel.vercel.app

# Railway Backend (IMPORTANT!)
NEXT_PUBLIC_RAILWAY_URL=https://your-railway-app.railway.app

# AI API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
PERPLEXITY_API_KEY=pplx-...
XAI_API_KEY=xai-...
GROQ_API_KEY=gsk_...
TOGETHER_API_KEY=...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Stripe (if using billing)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Step 4: Verify Deployment
1. Visit: https://debate-panel.vercel.app
2. Check build logs: https://vercel.com/kbadingers-projects/debate-panel

---

## 🚂 Part 2: Deploy Backend to Railway

### Step 1: Prepare the Backend
```bash
cd debate-processor
git add -A
git commit -m "Your commit message"
git push origin main
```

### Step 2: Create Railway Project (First Time Only)

1. **Via Railway CLI:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project or create new
railway link
```

2. **Via Railway Dashboard:**
- Go to: https://railway.app/new
- Select "Deploy from GitHub repo"
- Choose: kbadinger/debate-processor
- Railway auto-deploys on push

### Step 3: Configure Railway Environment

In Railway Dashboard (https://railway.app/project/your-project):

1. Click on your service
2. Go to "Variables" tab
3. Add these environment variables:

```bash
# Database (same as Vercel)
DATABASE_URL=your_neon_database_url

# CORS Settings
FRONTEND_URL=https://debate-panel.vercel.app

# Port (Railway sets this automatically)
PORT=3001

# AI API Keys (same as Vercel)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
PERPLEXITY_API_KEY=pplx-...
XAI_API_KEY=xai-...
GROQ_API_KEY=gsk_...
TOGETHER_API_KEY=...

# Node Environment
NODE_ENV=production
```

### Step 4: Deploy to Railway

#### Option A: Automatic (GitHub Integration)
```bash
cd debate-processor
git push origin main
# Railway auto-deploys
```

#### Option B: Manual via CLI
```bash
cd debate-processor
railway up
```

### Step 5: Get Your Railway URL
1. In Railway Dashboard, click on your service
2. Go to "Settings" tab
3. Under "Domains", click "Generate Domain"
4. Copy the URL (e.g., `debate-processor-production.up.railway.app`)

### Step 6: Update Vercel with Railway URL
1. Go back to Vercel environment variables
2. Update: `NEXT_PUBLIC_RAILWAY_URL=https://your-railway-app.railway.app`
3. Redeploy Vercel to use new URL

---

## 🔄 Complete Deployment Workflow

### Quick Deploy Both Services:
```bash
# 1. Deploy Backend First
cd debate-processor
git add -A
git commit -m "Update backend"
git push origin main
# Wait for Railway to deploy (~2 min)

# 2. Deploy Frontend
cd ../debate-panel
git add -A
git commit -m "Update frontend"
git push origin main
# Vercel deploys automatically

# 3. Or use the deploy script
npm run deploy
```

### One-Command Deploy Script:
Create `deploy-all.sh`:
```bash
#!/bin/bash
echo "🚀 Deploying DebatePanel..."

# Deploy Backend
echo "📦 Deploying Backend to Railway..."
cd debate-processor
git add -A
git commit -m "Deploy: $(date +%Y-%m-%d_%H:%M:%S)"
git push origin main

# Wait for Railway
echo "⏳ Waiting for Railway deployment..."
sleep 30

# Deploy Frontend
echo "🎨 Deploying Frontend to Vercel..."
cd ../debate-panel
git add -A
git commit -m "Deploy: $(date +%Y-%m-%d_%H:%M:%S)"
git push origin main

echo "✅ Deployment complete!"
echo "Frontend: https://debate-panel.vercel.app"
echo "Backend: Check Railway dashboard for URL"
```

---

## 🔍 Monitoring & Logs

### Vercel Logs:
```bash
vercel logs
# or
# https://vercel.com/kbadingers-projects/debate-panel/logs
```

### Railway Logs:
```bash
railway logs
# or
# https://railway.app/project/[project-id]/service/[service-id]/logs
```

---

## 🚨 Troubleshooting

### Common Issues:

1. **"Cannot connect to Railway service"**
   - Check NEXT_PUBLIC_RAILWAY_URL in Vercel
   - Ensure Railway service is running
   - Check CORS settings in Railway

2. **"Database connection failed"**
   - Verify DATABASE_URL in both services
   - Check Neon database is active
   - Ensure IP allowlist includes Railway/Vercel

3. **"Build failed on Vercel"**
   - Check build logs
   - Run `npm run build` locally first
   - Clear cache: `vercel --force`

4. **"Railway deploy failed"**
   - Check Dockerfile exists
   - Verify package.json scripts
   - Check Railway build logs

### Reset Everything:
```bash
# Clear Vercel cache
vercel --force

# Restart Railway service
railway restart

# Force redeploy
railway up --force
```

---

## 📝 Post-Deployment Checklist

- [ ] Frontend loads at https://debate-panel.vercel.app
- [ ] Can start a new debate
- [ ] Debate processes through Railway service
- [ ] Results display properly
- [ ] Authentication works
- [ ] Database connections are stable
- [ ] No CORS errors in console
- [ ] API endpoints responding

---

## 🔐 Security Reminders

1. Never commit `.env` files
2. Rotate API keys regularly
3. Use different keys for dev/prod
4. Enable 2FA on all services
5. Monitor usage and costs

---

## 📞 Support Links

- **Vercel Support**: https://vercel.com/support
- **Railway Docs**: https://docs.railway.app
- **Neon Docs**: https://neon.tech/docs
- **Project Repo**: https://github.com/kbadinger/debate-panel

---

Last Updated: September 2024








