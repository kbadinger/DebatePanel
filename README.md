# DebatePanel

**Pit the world's best AI models against each other. Get answers no single mind could produce alone.**

🔴 **[Live Demo → app.decisionforge.io](https://app.decisionforge.io)**

---

## Why I Built This

I wanted the smartest minds in the world to challenge each other and produce answers that no single mind could reach alone. When every model refuses to yes-man the others, ideas get pushed further than any AI — or human — could take them solo.

---

## Screenshots

![Judge Scorecard](screenshots/2026-03-13_13-36-17.png)
![Debate in Progress](screenshots/2026-03-13_13-00-37.png)
![Panel Setup](screenshots/2026-03-13_12-50-07.png)

---

## What It Does

- **Multi-Model Debates** — GPT-5.4, Claude Opus 4.6, Gemini 3.1 Pro, Grok 4, and 20+ other models argue different sides of any topic
- **AI Judge System** — Automatic winner declaration with 0–100 scoring across argument quality, persuasiveness, evidence, logic, and influence
- **Two Debate Styles** — Consensus-seeking (business decisions) or Adversarial (classical debate)
- **Three Analysis Depths** — Practical, Thorough, or Excellence-level rigor
- **Interactive Mode** — Humans can join debates alongside AI models
- **Real-time Streaming** — Watch debates unfold live via Server-Sent Events
- **Smart Model Selection** — Context window analysis, panel diversity scoring, role-based recommendations
- **Shareable Debates** — Public links with Open Graph previews
- **Subscription System** — Free trial, Starter ($19/mo), Pro ($49/mo), Teams ($199/mo) with credit rollover

---

## Tech Stack

- **Framework**: Next.js 15 / React 19 / TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Vercel AI SDK with direct provider integrations + OpenRouter for 400+ models
- **Auth**: NextAuth.js (email/password + OAuth)
- **Payments**: Stripe
- **Email**: Resend
- **Styling**: Tailwind CSS

---

## Quick Start

```bash
git clone https://github.com/kbadinger/DebatePanel.git
cd DebatePanel/client

npm install
cp .env.example .env.local
# Edit .env.local with your API keys (see below)

npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

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

# Payments (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (optional)
RESEND_API_KEY=re_...
```

See [`client/API_KEYS_SETUP.md`](client/API_KEYS_SETUP.md) for detailed provider setup.

---

## Supported Providers

| Provider | Models | Routing |
|----------|--------|---------|
| OpenAI | GPT-5.4, GPT-5.4 Pro, o4 Mini, GPT-5.2, GPT-5.1, GPT-5, GPT-4o | Direct |
| Anthropic | Claude Opus 4.6, Sonnet 4.6, Sonnet 4.5, Haiku 4.5 | Direct |
| Google | Gemini 3.1 Pro, 3 Pro, 3 Flash, 2.5 Pro, 2.5 Flash | Direct |
| xAI | Grok 4, Grok 3 | Direct |
| DeepSeek | V3, R1 | Direct |
| Perplexity | Sonar Pro, Sonar Deep Research | Direct |
| Meta / Mistral / more | Llama 4, Mistral Large, Cohere, Qwen, etc. | OpenRouter |

---

## Documentation

- [`client/SETUP_GUIDE.md`](client/SETUP_GUIDE.md) — Detailed setup
- [`client/API_KEYS_SETUP.md`](client/API_KEYS_SETUP.md) — Provider API key configuration
- [`client/FEATURES.md`](client/FEATURES.md) — Full feature documentation
- [`client/STRIPE_SETUP.md`](client/STRIPE_SETUP.md) — Payment system setup
- [`client/DEPLOYMENT_GUIDE.md`](client/DEPLOYMENT_GUIDE.md) — Deploy to Vercel + Railway

---

## License

[MIT](client/LICENSE)
