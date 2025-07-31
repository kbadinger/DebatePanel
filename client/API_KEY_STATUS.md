# API Key Status Dashboard

This document tracks all required API keys for the debate panel application and their corresponding environment variables.

## API Key Requirements

| Provider | Company | Environment Variable | API Base URL | Status |
|----------|---------|---------------------|--------------|--------|
| OpenAI | OpenAI | `OPENAI_API_KEY` | https://api.openai.com/v1 | ⬜ Required |
| Anthropic | Anthropic | `ANTHROPIC_API_KEY` | https://api.anthropic.com/v1 | ⬜ Required |
| Google | Google | `GEMINI_API_KEY` | https://generativelanguage.googleapis.com/v1beta | ⬜ Required |
| X.AI | xAI | `XAI_API_KEY` | https://api.x.ai/v1 | ⬜ Required |
| Perplexity | Perplexity AI | `PERPLEXITY_API_KEY` | https://api.perplexity.ai | ⬜ Required |
| DeepSeek | DeepSeek | `DEEPSEEK_API_KEY` | https://api.deepseek.com | ⬜ Required |
| Mistral | Mistral AI | `MISTRAL_API_KEY` | https://api.mistral.ai/v1 | ⬜ Required |
| Meta | Meta | `LLAMA_API_KEY` | https://api.llama-api.com/v1 | ⬜ Required |
| Cohere | Cohere | `COHERE_API_KEY` | https://api.cohere.ai/v1 | ⬜ Required |
| AI21 | AI21 Labs | `AI21_API_KEY` | https://api.ai21.com/studio/v1 | ⬜ Required |
| Kimi | Moonshot AI | `KIMI_API_KEY` | https://api.moonshot-ai.com/v1 | ⬜ Required |
| Qwen | Alibaba Group | `QWEN_API_KEY` | https://dashscope.aliyun.com/api/v1 | ⬜ Required |
| Flux | Flux AI | `FLUX_API_KEY` | https://api.flux-ai.com/v1 | ⬜ Required |

## Available Models by Provider

### OpenAI
- **GPT-4.1** - Latest flagship model with 1M context window
- **GPT-4.1 Mini** - Fast and cost-effective variant

### Anthropic  
- **Claude Opus 4** - World's best coding model
- **Claude Sonnet 4** - Superior coding and reasoning
- **Claude 3.7 Sonnet** - Hybrid reasoning with controllable thinking time

### Google
- **Gemini 2.5 Pro** - #1 on LMArena leaderboard, thinking model
- **Gemini 2.5 Flash** - Best price-performance with thinking capabilities

### X.AI (Grok)
- **Grok 4** - Most intelligent with real-time search integration
- **Grok 3** - Advanced reasoning with web search

### Perplexity
- **Sonar Pro** - Advanced search with citations
- **Sonar** - Fast search based on Llama 3.3 70B

### DeepSeek
- **DeepSeek V3** - 685B MoE model, 3x faster than V2
- **DeepSeek R1** - Specialized reasoning model

### Mistral
- **Mistral Medium 3** - Frontier multimodal, 8x cheaper than competitors
- **Magistral Medium** - Reasoning-specialized, multilingual
- **Pixtral Large** - 124B multimodal (uses same MISTRAL_API_KEY)

### Meta (Llama)
- **Llama 3.3 70B** - Latest with improved instruction following
- **Llama 3.1 405B** - Largest Llama model

### Cohere
- **Command A** - Enterprise model with agentic capabilities

### AI21 Labs
- **Jamba Large 1.7** - 398B hybrid SSM-Transformer

### Moonshot AI (Kimi)
- **Kimi K2 Instruct** - 1T MoE, 32B active, beats GPT-4.1 on coding
- **Kimi k1.5** - Multimodal with chain-of-thought

### Alibaba (Qwen)
- **Qwen 3 235B** - Mixture-of-Experts, open weights

### Flux AI
- **Flux 1.1** - Free API option with strong reasoning

## Setup Instructions

1. Copy `.env.example` to `.env`
2. Add your API keys to the `.env` file
3. Only add keys for providers you want to use
4. The app will only show models for which API keys are configured

## Getting API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google**: https://makersuite.google.com/app/apikey
- **X.AI**: https://console.x.ai/
- **Perplexity**: https://www.perplexity.ai/settings/api
- **DeepSeek**: https://platform.deepseek.com/
- **Mistral**: https://console.mistral.ai/
- **Meta/Llama**: Various providers (Together AI, Replicate, etc.)
- **Cohere**: https://dashboard.cohere.ai/api-keys
- **AI21**: https://studio.ai21.com/account/api-keys
- **Kimi**: https://platform.moonshot.ai/
- **Qwen**: https://dashscope.console.aliyun.com/
- **Flux**: https://flux-ai.com/

## Cost Categories

- 🟢 **Budget**: Lowest cost models
- 🔵 **Standard**: Balanced price/performance  
- 🟣 **Premium**: High-end models
- ⚫ **Luxury**: Most expensive, cutting-edge models

## Notes

- Some providers share API keys (e.g., Pixtral uses MISTRAL_API_KEY)
- Not all models require paid API keys (e.g., some open models via Together AI)
- The app dynamically shows only models with configured API keys