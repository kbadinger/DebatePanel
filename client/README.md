# DebatePanel

Get multiple AI perspectives on your ideas through structured debate.

## Features

- Multi-model debates with GPT-4, Claude, and Gemini
- Real-time streaming responses
- Structured debate formats
- Convergence detection
- Consensus and disagreement analysis

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

## Architecture

- **Frontend**: Next.js 14 with TypeScript
- **UI**: Tailwind CSS with custom components
- **AI Integration**: Vercel AI SDK with multiple providers
- **Streaming**: Server-Sent Events for real-time updates

## Future Enhancements

- Database persistence for debate history
- User authentication
- Export debates as PDF/Markdown
- Custom debate protocols
- Model fine-tuning based on debate outcomes