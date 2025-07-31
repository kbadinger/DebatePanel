# DebatePanel Pricing Model Documentation

## Overview

DebatePanel uses a transparent, usage-based pricing model where users pay for the AI tokens they consume plus a platform fee. This document outlines our pricing structure, calculations, and business model.

## Core Pricing Structure

### 1. Token-Based Billing
- Users are charged based on actual token usage (input + output)
- Each AI model has different per-token costs
- Costs are calculated in real-time and shown before starting debates

### 2. Platform Fee
- **30% markup** on all API costs
- This covers infrastructure, development, and support
- Transparently displayed separate from API costs

### 3. Monthly Subscriptions

#### Starter Plan - $9.99/month
- $10 worth of API credits
- Access to all models
- Real-time cost tracking
- Best for individuals and hobbyists

#### Pro Plan - $29.99/month  
- $35 worth of API credits
- Priority support
- Advanced analytics
- Best for professionals and small teams

#### Teams Plan - $99.99/month
- $120 worth of API credits
- Team management features
- Bulk usage discounts
- Best for organizations

### 4. Rollover Policy
- **25% of unused credits** roll over to the next month
- Rollover credits expire after 1 month
- Encourages consistent usage without waste
- Maximum rollover: 1 month's allowance

## Model Pricing (as of Jan 2025)

### Budget Tier 🟢
- **GPT-3.5 Turbo**: ~$0.002/response
- **Claude 3.5 Haiku**: ~$0.005/response  
- **Gemini 1.5 Flash**: ~$0.0004/response
- **DeepSeek V3**: ~$0.0004/response

### Standard Tier 🔵
- **GPT-4o**: ~$0.016/response
- **Claude 3.5 Sonnet**: ~$0.023/response
- **Gemini 1.5 Pro**: ~$0.008/response
- **Mistral Large**: ~$0.010/response

### Premium Tier 🟣
- **GPT-4 Turbo**: ~$0.052/response
- **Perplexity Sonar Pro**: ~$0.023/response

### Luxury Tier ⚫
- **Claude 3 Opus**: ~$0.117/response

*Note: Prices include 30% platform markup. Actual costs vary based on prompt length.*

## Cost Calculation Formula

```
Per Model Cost = (Input Tokens × Input Rate) + (Output Tokens × Output Rate)
Platform Fee = Per Model Cost × 0.30
Total Cost = Per Model Cost + Platform Fee

Debate Cost = Sum of all model costs × number of rounds
```

### Token Estimation
- 1 token ≈ 4 characters
- Minimum 100 tokens for system prompts
- Average response: 1000 tokens
- Prompts grow by ~50% each round (includes context)

## Business Model Rationale

### Why Token-Based Pricing?
1. **Fair Usage**: Users only pay for what they use
2. **Transparency**: No hidden costs or surprises
3. **Flexibility**: Supports both light and heavy users
4. **Scalability**: Costs scale linearly with usage

### Why 30% Platform Fee?
1. **Infrastructure**: Servers, databases, monitoring
2. **Development**: Continuous improvements and features
3. **Support**: Customer service and documentation
4. **Margin**: Sustainable business operations

### Why Not BYOK (Bring Your Own Keys)?
1. **Security Risk**: Storing API keys is a liability
2. **Support Burden**: Debugging user key issues
3. **User Experience**: Instant start vs setup friction
4. **Compliance**: Easier to maintain standards

## Pricing Controls

### Pre-Flight Checks
- Cost estimation before debate starts
- Warning for debates over $0.50
- Hard limit at 50% of monthly allowance
- Model recommendations based on budget

### Usage Limits
- Max 10 models per debate
- Max 10 rounds per debate
- Max 2000 tokens per response
- Max 50,000 tokens per debate

### Progressive Pricing
- 1-3 models: Standard pricing
- 4-6 models: 1.2x multiplier
- 7+ models: 1.5x multiplier

## Future Considerations

### Potential Adjustments
1. **Volume Discounts**: For high-usage customers
2. **Annual Plans**: 2 months free for yearly commitment
3. **Educational Discount**: 50% off for verified students
4. **API Access**: Higher margin for programmatic use

### Monitoring Metrics
- Average revenue per user (ARPU)
- Token usage patterns
- Model popularity distribution
- Churn rate by plan type
- Cost overrun frequency

## Implementation Notes

### Database Tables
- `UsageRecord`: Tracks every model call with costs
- `Subscription`: Manages user plans and balances
- `ModelPricing`: Stores current model costs

### Key Files
- `/lib/models/pricing.ts`: Pricing calculations
- `/app/usage/page.tsx`: Usage dashboard
- `/app/api/debate/route.ts`: Cost tracking integration

### Environment Variables
```env
# API Keys (we pay for these)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
XAI_API_KEY=
PERPLEXITY_API_KEY=
DEEPSEEK_API_KEY=
MISTRAL_API_KEY=

# Stripe (for payments)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Competitive Analysis

### vs ChatGPT Plus ($20/month)
- Single model only
- No debate functionality
- Fixed cost regardless of usage

### vs API Direct Usage
- Requires technical knowledge
- No orchestration features
- Hidden complexity costs

### vs Claude Pro ($20/month)
- Single model only
- Limited to Anthropic
- No multi-perspective analysis

## Conclusion

Our pricing model balances fairness, transparency, and sustainability. Users get clear value through multi-model orchestration while we maintain a sustainable business through reasonable platform fees.