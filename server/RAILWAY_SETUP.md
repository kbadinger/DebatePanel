# Railway Setup Guide for Debate Processor

## Overview

This service handles long-running AI debate processing without timeout limitations. It works alongside the Vercel-hosted frontend.

## Architecture

```
┌─────────────┐     SSE Stream      ┌──────────────┐     Database     ┌────────────┐
│   Vercel    │ ◄────────────────► │   Railway    │ ◄──────────────► │    Neon    │
│  (Frontend) │                     │(AI Processor)│                   │ (PostgreSQL)│
│  < 5 min    │                     │  No limits!  │                   │            │
└─────────────┘                     └──────────────┘                   └────────────┘
```

## Prerequisites

- GitHub account
- Railway account (https://railway.app)
- Neon database connection string
- API keys for AI providers (OpenAI, Anthropic, etc.)

## Deployment Steps

### 1. GitHub Repository Setup

The code should already be pushed to:
```
https://github.com/kbadinger/debate-processor
```

If not:
```bash
cd /Users/kevinbadinger/Projects/DebatePanel/debate-processor
git remote add origin https://github.com/kbadinger/debate-processor.git
git push -u origin main
```

### 2. Railway Project Creation

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access GitHub (if first time)
5. Select the `debate-processor` repository
6. Railway will auto-detect the Dockerfile

### 3. Environment Variables Configuration

In Railway dashboard → Variables tab, add:

#### Required Database
```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

#### Required Frontend URL
```
FRONTEND_URL=https://decisionforge.ai
```

#### Required API Keys (add all that you use)
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIzaSy...
XAI_API_KEY=xai-...
GROQ_API_KEY=gsk_...
TOGETHER_API_KEY=...
PERPLEXITY_API_KEY=pplx-...
```

#### Optional
```
PORT=3001
LOG_LEVEL=info
```

### 4. Deploy

Railway will automatically:
1. Build the Docker image
2. Deploy the service
3. Provide a public URL

Your Railway URL will look like:
```
https://debate-processor-production-xxxx.up.railway.app
```

### 5. Update Vercel Environment

In Vercel dashboard (vercel.com):

1. Go to your project settings
2. Navigate to Environment Variables
3. Add:
```
NEXT_PUBLIC_RAILWAY_URL=https://debate-processor-production-xxxx.up.railway.app
```
4. Redeploy Vercel (automatic or manual trigger)

### 6. Verify Deployment

Test the Railway service:
```bash
curl https://your-railway-url.up.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "debate-processor",
  "timestamp": "2024-..."
}
```

## Local Testing Setup

### Testing All 3 Services Locally

#### 1. Start Neon Database
Your Neon database is always running in the cloud. Just ensure your connection string is correct.

#### 2. Start Railway Service (Port 3001)
```bash
cd /Users/kevinbadinger/Projects/DebatePanel/debate-processor

# Copy environment file
cp env.example .env
# Edit .env and add your DATABASE_URL and API keys

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start the service
npm run dev
# OR
node server.js
```

Service will run on: http://localhost:3001

#### 3. Start Vercel Frontend (Port 3000)
```bash
cd /Users/kevinbadinger/Projects/DebatePanel/debate-panel

# Set local Railway URL
export NEXT_PUBLIC_RAILWAY_URL=http://localhost:3001

# Start the frontend
npm run dev
```

Frontend will run on: http://localhost:3000

### Testing Flow

1. Open browser to http://localhost:3000
2. Start a debate
3. Frontend (3000) → calls → Railway service (3001) → queries → Neon DB
4. Watch the logs in both terminals

### Debugging

#### Check Railway Service:
```bash
curl http://localhost:3001/health
```

#### Test debate endpoint directly:
```bash
curl -X POST http://localhost:3001/api/debate \
  -H "Content-Type: application/json" \
  -d '{"config": {...}, "userId": "test"}'
```

#### Common Issues:

**CORS errors:**
- Ensure `FRONTEND_URL` in Railway matches your Vercel URL
- For local testing, set `FRONTEND_URL=http://localhost:3000`

**Database connection:**
- Verify `DATABASE_URL` includes `?sslmode=require` for Neon
- Check Prisma migrations are up to date

**API timeouts:**
- Verify API keys are correct
- Check rate limits on AI providers

## Monitoring

### Railway Dashboard
- View logs: Railway dashboard → Deployments → View Logs
- Monitor metrics: CPU, Memory, Network usage
- Set up alerts for errors

### Local Logs
Both services output detailed logs:
- Frontend: Browser console + terminal
- Railway service: Terminal output
- Database queries: Visible in Railway service logs

## Rollback

If deployment fails:
1. Railway dashboard → Deployments
2. Click on previous successful deployment
3. Click "Redeploy"

## Cost Optimization

- Railway charges for:
  - Execution time ($/hour)
  - Memory usage
  - Egress bandwidth

- Tips:
  - Set memory limits in Railway settings
  - Monitor long-running debates
  - Consider implementing max debate duration

## Support

- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- Neon Docs: https://neon.tech/docs











