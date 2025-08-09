# DebatePanel Features Documentation

## Core Features

### 🏆 Game Winner System (NEW)
- **Winner Declaration**: Judge AI automatically declares a debate winner based on argument quality
- **Scoring System**: 0-100 point scoring across multiple dimensions:
  - Argument Quality
  - Persuasiveness
  - Evidence Quality
  - Logical Consistency
  - Influence on Others
- **Victory Display**: Beautiful UI with trophy announcements and leaderboard
- **Performance Badges**: Outstanding/Excellent/Good/Participant rankings
- **Victory Criteria**: Clear, transparent judging based on reasoning and evidence

### 🤖 Multi-Model Debates
- Support for 25+ AI models across 13 providers
- Real-time streaming responses
- Structured debate formats
- Convergence detection
- Interactive mode with human participation

### 💰 Monetization System
- Subscription tiers (Free, Starter, Pro, Teams)
- Credit-based usage tracking
- Platform fee markup on API costs
- Admin users with unlimited access
- Stripe integration for payments

### 🎯 Debate Formats
- **Free-form**: Open discussion format
- **Structured**: Turn-based arguments
- **Devils Advocate**: Opposing viewpoints
- **Interactive**: Human participants can join

### 📊 Analytics & History
- Debate history tracking
- Usage analytics per user
- Model performance tracking
- Cost tracking and billing

## Supported AI Models (August 2025)

### OpenAI
- GPT-5 (Regular, Mini, Nano)
- o3 Series (Pro, Mini, Deep Research)
- o1 Series (Pro, Mini)
- GPT-4o (Regular, Mini)

### Anthropic
- Claude 4.1 (Opus, Sonnet, Haiku)
- Claude 3.5 Sonnet

### Google
- Gemini 2.0 Flash (Experimental)
- Gemini 1.5 Pro
- Gemini 1.5 Flash

### Others
- Mistral (Saba, Large, Magistral)
- X.AI (Grok Beta, Grok 2)
- Perplexity (Sonar Pro, Sonar)
- DeepSeek (V3, R1)
- Meta (Llama 3.3, 3.1)
- Cohere, AI21, Kimi, Qwen, Flux

## Technical Features

### Database
- PostgreSQL with Prisma ORM
- Full debate persistence
- User management
- Subscription tracking
- Usage records
- Score tracking

### Authentication
- NextAuth.js integration
- Email/password authentication
- OAuth support
- Session management

### Real-time Updates
- Server-Sent Events for streaming
- Live debate updates
- Human participation support
- Participant tracking

### Admin Panel
- User management
- Credit management
- Usage analytics
- Subscription oversight

## Victory Determination

The judge evaluates debates based on:

1. **Logical Consistency**: How well arguments hold together
2. **Evidence Quality**: Strength of supporting facts
3. **Persuasiveness**: Clarity and impact of arguments
4. **Counterargument Handling**: Addressing opposing views
5. **Solution Quality**: Contributing to the best outcome

## API Integrations

- OpenAI API
- Anthropic Claude API
- Google Gemini API
- Mistral API
- X.AI API
- Perplexity API
- DeepSeek API
- Stripe Payment API
- Multiple other AI providers

## Environment Variables

Required API keys:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `MISTRAL_API_KEY`
- `XAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `DEEPSEEK_API_KEY`
- Plus others for each provider

## Development Features

- Hot reload with Next.js
- TypeScript for type safety
- Tailwind CSS for styling
- Comprehensive logging system
- Model discovery scripts
- Admin tools