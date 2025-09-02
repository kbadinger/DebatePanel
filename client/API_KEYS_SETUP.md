# API Keys Setup Guide

This guide covers all AI model providers supported by DebatePanel and how to configure their API keys.

## How It Works

The system **dynamically** shows only models from providers with configured API keys. Simply add an API key to your `.env` file and models from that provider will automatically appear in the interface.

## Environment Variables

Add these to your `.env.local` file:

### Primary Providers (Recommended)

#### OpenAI
```env
OPENAI_API_KEY=sk-proj-...
```
- **Models**: GPT-4o, GPT-4o-mini, GPT-4.1 series, o1/o3/o4 reasoning models
- **Get Key**: [OpenAI API Keys](https://platform.openai.com/api-keys)
- **Cost**: Moderate to High
- **Status**: ✅ Highly recommended - best overall model selection

#### Anthropic
```env
ANTHROPIC_API_KEY=sk-ant-...
```
- **Models**: Claude 4 Opus, Claude 4 Sonnet, Claude Opus 4.1
- **Get Key**: [Anthropic Console](https://console.anthropic.com/account/keys)
- **Cost**: Moderate to High
- **Status**: ✅ Recommended - excellent for ethical reasoning

#### Google
```env
GOOGLE_AI_API_KEY=AIzaSy...
```
- **Models**: Gemini 2.5 Pro/Flash, Gemini 2.0 Flash
- **Get Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Cost**: Low to Moderate
- **Status**: ✅ Recommended - best value for performance

### Secondary Providers

#### X.AI (Grok)
```env
XAI_API_KEY=xai-...
```
- **Models**: Grok-4, Grok-3, Grok-2
- **Get Key**: [X.AI Console](https://console.x.ai/)
- **Cost**: Moderate
- **Status**: ✨ Good for creative/unconventional perspectives

#### Perplexity
```env
PERPLEXITY_API_KEY=pplx-...
```
- **Models**: Sonar Pro, Sonar Deep Research
- **Get Key**: [Perplexity Settings](https://www.perplexity.ai/settings/api)
- **Cost**: $5 per 1,000 searches
- **Status**: 🔍 Excellent for research-backed arguments

#### DeepSeek
```env
DEEPSEEK_API_KEY=sk-...
```
- **Models**: DeepSeek V3.1, DeepSeek R1-0528
- **Get Key**: [DeepSeek Platform](https://platform.deepseek.com/)
- **Cost**: Very Low
- **Status**: 💰 Best value - excellent reasoning at low cost

#### Meta (Llama)
```env
LLAMA_API_KEY=...
```
- **Models**: Llama 4 Scout/Maverick, Llama 3.3 70B
- **Get Key**: Multiple options:
  - [OpenRouter](https://openrouter.ai/keys) (Free tier available)
  - [Amazon Bedrock](https://aws.amazon.com/bedrock/)
  - [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- **Cost**: Free to Low
- **Status**: 🆓 Free options available - good open-source alternative

#### Mistral
```env
MISTRAL_API_KEY=...
```
- **Models**: Mistral Large 24.11, Mistral Medium 3
- **Get Key**: [Mistral La Plateforme](https://console.mistral.ai/)
- **Cost**: Moderate
- **Status**: 🇪🇺 European alternative, strong technical performance

### Specialized Providers

#### Moonshot (Kimi)
```env
KIMI_API_KEY=...
```
- **Models**: Kimi K2-Instruct
- **Get Key**: [Moonshot Platform](https://platform.moonshot.cn/)
- **Cost**: Low
- **Status**: 📱 Good for coding tasks, may require Chinese registration

#### Cohere
```env
COHERE_API_KEY=...
```
- **Models**: Command A 03-2025
- **Get Key**: [Cohere Dashboard](https://dashboard.cohere.ai/api-keys)
- **Cost**: Moderate
- **Status**: 🏢 Good for enterprise/business reasoning

#### AI21
```env
AI21_API_KEY=...
```
- **Models**: Jamba Large 1.7
- **Get Key**: [AI21 Studio](https://studio.ai21.com/)
- **Cost**: Moderate
- **Status**: 📚 Strong for long-context tasks (256K tokens)

#### Alibaba (Qwen)
```env
QWEN_API_KEY=...
```
- **Models**: Qwen 3 235B
- **Get Key**: [Alibaba Cloud](https://dashscope.aliyun.com/)
- **Cost**: Low
- **Status**: 🇨🇳 May require Chinese registration

#### Flux
```env
FLUX_API_KEY=...
```
- **Models**: Flux 1.1
- **Get Key**: [Flux AI Platform](https://flux-ai.com/)
- **Cost**: Varies
- **Status**: 🔬 Specialized use cases

## Recommended Starter Combinations

### Budget Setup (~$20-30/month)
```env
OPENAI_API_KEY=sk-proj-...     # GPT-4o-mini + o1-mini
GOOGLE_AI_API_KEY=AIzaSy...    # Gemini 2.5 Flash
DEEPSEEK_API_KEY=sk-...        # DeepSeek V3.1 (very cheap)
```

### Balanced Setup (~$50-80/month)
```env
OPENAI_API_KEY=sk-proj-...     # Full GPT-4 series
ANTHROPIC_API_KEY=sk-ant-...   # Claude 4 series
GOOGLE_AI_API_KEY=AIzaSy...    # Gemini 2.5 Pro/Flash
XAI_API_KEY=xai-...           # Grok-4
```

### Premium Setup (~$100+/month)
All of the above plus:
```env
PERPLEXITY_API_KEY=pplx-...   # Research-backed arguments
MISTRAL_API_KEY=...           # European perspective
LLAMA_API_KEY=...             # Open-source models
```

## Setup Instructions

1. **Create `.env.local`** in your project root (if it doesn't exist)
2. **Add desired API keys** from the list above
3. **Restart your development server** (`npm run dev`)
4. **Check the interface** - only models from configured providers will appear

## Testing Your Setup

1. Go to your DebatePanel homepage
2. Look for the provider count: "X providers configured • Y models available"
3. If you see 0 providers, check your `.env.local` file format
4. Models will automatically appear/disappear as you add/remove API keys

## Free Tier Options

Some providers offer free tiers:

- **Google AI**: Generous free tier for Gemini models
- **OpenRouter**: Free access to many Llama models
- **Anthropic**: Small free credit for new accounts
- **OpenAI**: Small free credit for new accounts

## Security Notes

- **Never commit** `.env.local` to version control
- **Keep API keys secure** - they're like passwords
- **Monitor usage** in each provider's dashboard
- **Set spending limits** where available

## Cost Monitoring

Estimated costs per debate (5 models, 3 rounds):

- **Budget models**: $0.05 - $0.15 per debate
- **Standard models**: $0.20 - $0.50 per debate  
- **Premium models**: $0.50 - $1.50 per debate
- **Flagship models**: $1.00 - $3.00 per debate

The DebatePanel pricing system automatically tracks and charges for actual usage.

## Troubleshooting

### "No API Keys Configured"
- Check `.env.local` exists and has correct format
- Restart development server
- Verify API keys are valid (test in provider's playground)

### "Some models missing"
- Check specific provider's API key is set correctly
- Verify the provider offers API access in your region
- Some providers require approval for API access

### "High costs"
- Monitor usage in provider dashboards
- Use smaller/cheaper models for initial testing
- Consider using GPT-4o-mini instead of GPT-4o for cost savings

## Support

For provider-specific issues:
- Check each provider's documentation and status pages
- Most providers have Discord/forums for API support
- Some require business verification for higher rate limits

---

*Last Updated: September 2, 2025*