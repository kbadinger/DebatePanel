# DebatePanel 2.0

Get multiple AI perspectives on your ideas through structured debate with winner determination and scoring.

## 🏆 Key Features

- **Game Winner System** - AI judge declares debate winners with detailed scoring
- **25+ AI Models** - GPT-5, Claude 4, Gemini 2.5, Grok 4, and more
- **Real-time Streaming** - Watch debates unfold in real-time
- **Interactive Mode** - Humans can participate in debates
- **Multiple Formats** - Structured, free-form, and devils advocate
- **Comprehensive Analytics** - Track performance, costs, and history

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.local.example` to `.env.local` and add your API keys:
   ```bash
   cp .env.local.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Setup

1. Create a `.env.local` file in the project root:
```bash
cp .env.example .env.local  # if example exists, or create manually
```

2. Add your API keys to `.env.local`:
```
# Required for core functionality
DATABASE_URL="postgresql://user:password@localhost:5432/debate_panel"
NEXTAUTH_SECRET="your-secret-here"

# Add API keys for the models you want to use
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
KIMI_API_KEY=""
# ... etc
```

## Admin Users

Admin users have unlimited access to all features without credit limits.

To make a user an admin:
```bash
npm run make-admin user@example.com
```

This requires the user to already exist in the database (they must have signed up first).

### Admin Panel Features

Admin users have access to a comprehensive admin panel at `/admin` with:

- **Dashboard**: Overview of platform statistics, user counts, revenue, and recent activity
- **User Management**: 
  - View all users with search and filtering
  - View detailed user profiles and usage history
  - Add credits to user accounts
  - Grant/revoke admin privileges
- **Usage Analytics**: (Coming soon) Detailed usage patterns and model performance
- **Subscription Management**: (Coming soon) Manage user subscriptions and billing

Admin users are identified by a purple shield badge in the header and have unlimited debate access.

## Latest Updates (v2.0 - August 2025)

### 🎮 New Game Features
- **Winner Declaration** - Judge determines the best debater
- **Performance Scoring** - 0-100 point system
- **Victory Display** - Trophy announcements and leaderboards
- **Clear Criteria** - Transparent judging standards

### 🤖 Latest AI Models
- **OpenAI**: GPT-5 (Regular/Mini/Nano), o3/o1 reasoning models
- **Anthropic**: Claude 4 (Opus/Sonnet), Claude 3.5/3 series
- **Google**: Gemini 2.5 Pro/Flash, 2.0 Flash, 1.5 Pro/Flash
- **X.AI**: Grok 4 (Heavy), Grok 2 with real-time search
- **Plus**: Mistral, DeepSeek, and 15+ more providers

## Documentation

- 📚 **[FEATURES.md](FEATURES.md)** - Complete feature documentation
- 🚀 **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions
- 📝 **[CHANGELOG.md](CHANGELOG.md)** - Version history and updates

## Quick Commands

```bash
# Development
npm run dev                          # Start development server
npm run build                        # Build for production

# Model Management
node scripts/fetch-all-models.js    # Check latest models from all providers
node scripts/fetch-models.js        # Check OpenAI models

# Database
npx prisma migrate dev              # Run migrations
npx prisma studio                   # Open database GUI

# Admin
npm run make-admin user@email.com  # Grant admin access
```

## Architecture

- **Frontend**: Next.js 15 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS with custom components
- **AI Integration**: Vercel AI SDK with 13+ providers
- **Streaming**: Server-Sent Events for real-time updates
- **Auth**: NextAuth.js with multiple providers
- **Payments**: Stripe integration for subscriptions