# Debate Processor Service

This is the Railway-hosted service that handles long-running AI debate processing for DecisionForge.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Vercel    │────▶│   Railway    │────▶│    Neon    │
│  (Frontend) │     │ (AI Process) │     │ (Database) │
└─────────────┘     └──────────────┘     └────────────┘
```

## Deployment to Railway

### 1. Initial Setup

1. Create a new Railway project
2. Add a new service from GitHub (point to this directory)
3. Set up environment variables (see env.example)

### 2. Environment Variables

Required variables in Railway:

```bash
# Frontend
FRONTEND_URL=https://decisionforge.ai

# Database
DATABASE_URL=<your-neon-connection-string>

# AI Providers
OPENAI_API_KEY=<key>
ANTHROPIC_API_KEY=<key>
GOOGLE_API_KEY=<key>
# ... etc
```

### 3. Deploy

Railway will automatically:
- Detect the Dockerfile
- Build the image
- Deploy the service
- Provide a URL like: https://debate-processor.railway.app

### 4. Update Frontend

In Vercel, add environment variable:
```
NEXT_PUBLIC_RAILWAY_URL=https://debate-processor.railway.app
```

## Local Development

```bash
# Install dependencies
npm install

# Copy .env.example to .env and fill in values
cp env.example .env

# Run Prisma migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

## API Endpoints

- `POST /api/debate` - Start a new debate (SSE stream)
- `POST /api/debate/human-input` - Submit human input to a debate
- `GET /health` - Health check

## Key Features

- **No timeout limits** - Can run debates for hours
- **Server-Sent Events** - Real-time streaming to frontend
- **Prisma ORM** - Database management
- **Multi-provider support** - OpenAI, Anthropic, Google, etc.

## Monitoring

Railway provides:
- Logs: `railway logs`
- Metrics: CPU, Memory, Network
- Alerts: Set up in Railway dashboard

## Troubleshooting

### Connection Issues
- Check CORS settings match frontend URL
- Verify DATABASE_URL is correct
- Ensure all API keys are set

### Performance
- Railway auto-scales based on usage
- Monitor memory usage for large debates
- Consider increasing dyno size if needed











