# DebatePanel Setup Guide

## Quick Start

1. **Clone the repository**
```bash
git clone [your-repo-url]
cd debate-panel
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

4. **Configure your `.env.local` file**
```env
# Database (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/debate_panel"

# Authentication (Required)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# AI Provider API Keys (Add the ones you want to use)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GEMINI_API_KEY="..."
MISTRAL_API_KEY="..."
XAI_API_KEY="..."
PERPLEXITY_API_KEY="..."
DEEPSEEK_API_KEY="..."

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

5. **Set up the database**
```bash
# Run migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

6. **Run the development server**
```bash
npm run dev
```

7. **Open the app**
Navigate to http://localhost:3000

## Database Setup

### PostgreSQL Installation

#### macOS
```bash
brew install postgresql
brew services start postgresql
createdb debate_panel
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb debate_panel
```

#### Windows
Download and install from https://www.postgresql.org/download/windows/

### Running Migrations
```bash
# Create a new migration after schema changes
npx prisma migrate dev --name your_migration_name

# Apply existing migrations
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

## Admin Setup

To create an admin user with unlimited access:

1. First, sign up normally through the app
2. Then run:
```bash
npm run make-admin user@example.com
```

Admin users have:
- Unlimited debate access
- No credit limits
- Access to admin panel at `/admin`
- User management capabilities

## Model Configuration

### Updating Models

1. **Check latest available models**
```bash
# Check all providers
node scripts/fetch-all-models.js

# Check OpenAI only
node scripts/fetch-models.js
```

2. **Update model configuration**
Edit `lib/models/config.ts` to add/update models

3. **Update pricing**
Edit `lib/models/pricing.ts` to set model costs

### Adding a New Provider

1. Add provider type to `types/debate.ts`:
```typescript
export type ModelProvider = 'openai' | 'anthropic' | ... | 'newprovider';
```

2. Add API key mapping in `lib/models/provider-config.ts`:
```typescript
export const PROVIDER_API_KEYS: Record<ModelProvider, string> = {
  // ...
  newprovider: 'NEWPROVIDER_API_KEY',
};
```

3. Add provider implementation in `lib/models/providers.ts`

4. Update orchestrator in `lib/models/orchestrator.ts`

## Deployment

### Vercel Deployment

1. Push your code to GitHub

2. Import project in Vercel

3. Set environment variables in Vercel dashboard

4. Deploy!

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

**Database connection error**
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify database exists

**API key errors**
- Verify API keys are valid
- Check for typos in .env.local
- Ensure no extra spaces or quotes

**Migration errors**
```bash
# Reset and start fresh
npx prisma migrate reset
npx prisma migrate dev
```

**Model not found**
- Run model discovery script
- Check model ID matches exactly
- Verify provider is configured

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check

# Database commands
npx prisma studio     # Open database GUI
npx prisma generate   # Generate Prisma client
npx prisma format     # Format schema file

# Admin commands
npm run make-admin user@email.com

# Model discovery
node scripts/fetch-all-models.js
node scripts/fetch-models.js
```

## Support

For issues or questions:
1. Check the FEATURES.md for feature documentation
2. Review troubleshooting section above
3. Check logs in `logs/debates/` directory
4. Open an issue on GitHub