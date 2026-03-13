# DebatePanel

A multi-AI debate platform where 25+ AI models from 13 providers argue different sides of any topic, scored by an AI judge with detailed performance analysis.

## Features

- **Multi-Model Debates** — Pit GPT-5.4, Claude Opus 4.6, Gemini 3.1 Pro, Grok 4, and 20+ other models against each other
- **AI Judge System** — Automatic winner declaration with 0-100 scoring across argument quality, persuasiveness, evidence, logic, and influence
- **Two Debate Styles** — Consensus-seeking (business decisions) and Adversarial (classical debate)
- **Three Analysis Depths** — Practical, Thorough, or Excellence-level rigor
- **Interactive Mode** — Humans can join debates alongside AI models
- **Real-time Streaming** — Watch debates unfold live via Server-Sent Events
- **Smart Model Selection** — Context window analysis, panel diversity scoring, and role-based recommendations
- **Topic Safety** — Three-tier filtering with educational intent detection and academic reframing suggestions
- **Subscription System** — Free, Starter ($19/mo), Pro ($49/mo), Teams ($199/mo) with credit rollover
- **Shareable Debates** — Public links with Open Graph previews

## Tech Stack

- **Framework**: Next.js 15 / React 19 / TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Vercel AI SDK with direct provider integrations + OpenRouter for 400+ models
- **Auth**: NextAuth.js (email/password + OAuth)
- **Payments**: Stripe
- **Email**: Resend
- **Monitoring**: Sentry
- **Styling**: Tailwind CSS

## Quick Start

```bash
# Clone
git clone https://github.com/kbadinger/DebatePanel.git
cd DebatePanel/client

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your API keys (see below)

# Database
npx prisma migrate dev

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file:

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/debate_panel"
NEXTAUTH_SECRET="generate-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers (add whichever you want to use)
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIzaSy...
XAI_API_KEY=xai-...
DEEPSEEK_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=sk-or-v1-...    # For 400+ additional models

# Payments (optional, for subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (optional, for password reset / welcome emails)
RESEND_API_KEY=re_...
```

See [API_KEYS_SETUP.md](API_KEYS_SETUP.md) for detailed provider setup instructions.

## Supported Providers

| Provider | Models | Routing |
|----------|--------|---------|
| OpenAI | GPT-5.4, GPT-5.4 Pro, o4 Mini, GPT-5.2, GPT-5.1, GPT-5, GPT-4o | Direct |
| Anthropic | Claude Opus 4.6, Sonnet 4.6, Sonnet 4.5, Haiku 4.5, Sonnet 4.0, Sonnet 3.7 | Direct |
| Google | Gemini 3.1 Pro, 3 Pro, 3 Flash, 2.5 Pro, 2.5 Flash, 2.0 Flash | Direct |
| xAI | Grok 4, Grok 3 | Direct |
| DeepSeek | V3, R1 | Direct |
| Perplexity | Sonar Pro, Sonar Deep Research | Direct |
| Mistral | Large, Medium, Small | OpenRouter |
| Meta | Llama 4 Scout, Llama 4 Maverick | OpenRouter |
| + more | Cohere, AI21, Kimi, Qwen via OpenRouter | OpenRouter |

## Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run lint                   # Lint

# Database
npx prisma migrate dev         # Run migrations
npx prisma studio              # Database GUI

# Admin
npm run make-admin user@email  # Grant admin access

# Models
npm run discover-models        # Discover new models via OpenRouter
npm run test-providers         # Test all provider connections
```

## Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) — Detailed setup instructions
- [API_KEYS_SETUP.md](API_KEYS_SETUP.md) — Provider API key configuration
- [FEATURES.md](FEATURES.md) — Full feature documentation
- [STRIPE_SETUP.md](STRIPE_SETUP.md) — Payment system setup
- [PRICING_MODEL.md](PRICING_MODEL.md) — Pricing and markup details
- [OPENROUTER_INTEGRATION.md](OPENROUTER_INTEGRATION.md) — Hybrid routing architecture
- [CHANGELOG.md](CHANGELOG.md) — Version history

## License

[MIT](LICENSE)
