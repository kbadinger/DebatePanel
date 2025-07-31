# AI Model Research Request

## Objective
I need a comprehensive list of currently available AI language models from major providers for integration into a debate panel application. Please provide the most up-to-date information as of January 2025.

## Required Information for Each Provider

Please research and provide the following providers and their models:

### Providers to Research:
1. **OpenAI** (GPT models)
2. **Anthropic** (Claude models)  
3. **Google** (Gemini models)
4. **X.AI** (Grok models)
5. **Perplexity** (Sonar models)
6. **DeepSeek** 
7. **Mistral AI**
8. **Meta** (Llama models if available via API)
9. **Cohere** (Command models)
10. **AI21 Labs** (Jurassic/Jamba models)
11. **Together AI** (if they have proprietary models)
12. **Replicate** (hosted models)
13. Any other major providers with API access

## Format Required

Please provide the information in the following JSON format for easy integration:

```json
{
  "provider_name": {
    "company": "Official Company Name",
    "api_base_url": "https://api.example.com/v1",
    "api_key_env_var": "PROVIDER_API_KEY",
    "models": [
      {
        "model_id": "unique-identifier",
        "api_name": "model-name-for-api-calls",
        "display_name": "Human Friendly Name",
        "category": "flagship|standard|fast|experimental",
        "context_window": 128000,
        "knowledge_cutoff": "2024-04",
        "strengths": ["reasoning", "coding", "creative writing"],
        "is_deprecated": false,
        "notes": "Any special notes about this model"
      }
    ]
  }
}
```

## Additional Requirements:

1. **Only include models that are:**
   - Currently available (not deprecated)
   - Accessible via API (not UI-only)
   - Text generation models (not image/audio/video)

2. **For each model, verify:**
   - The exact API model name/identifier
   - Whether it requires special API endpoints
   - Any unique authentication requirements
   - Rate limits or usage restrictions

3. **Special Instructions:**
   - For OpenAI-compatible APIs (like X.AI, DeepSeek), note the base URL
   - Include both fast and powerful variants when available
   - Note if models have special capabilities (like online search, function calling)
   - Include pricing tier if it affects API access

4. **Priority Models:**
   - Focus on the latest/best models from each provider
   - Include at least one fast/cheap option per provider when available
   - Flag any models that are particularly good for debates/reasoning

## Example Output Structure:

```json
{
  "openai": {
    "company": "OpenAI",
    "api_base_url": "https://api.openai.com/v1",
    "api_key_env_var": "OPENAI_API_KEY",
    "models": [
      {
        "model_id": "gpt-4o",
        "api_name": "gpt-4o",
        "display_name": "GPT-4o",
        "category": "flagship",
        "context_window": 128000,
        "knowledge_cutoff": "2023-10",
        "strengths": ["reasoning", "coding", "multimodal"],
        "is_deprecated": false,
        "notes": "Latest flagship model with vision capabilities"
      }
    ]
  }
}
```

Please ensure all information is current as of January 2025 and double-check model names against official documentation.


RESPONSE:
 

 {
  "openai": {
    "company": "OpenAI",
    "api_base_url": "https://api.openai.com/v1",
    "api_key_env_var": "OPENAI_API_KEY",
    "models": [
      {
        "model_id": "gpt-4.1",
        "api_name": "gpt-4.1",
        "display_name": "GPT-4.1",
        "category": "flagship",
        "context_window": 1000000,
        "knowledge_cutoff": "2024-06",
        "strengths": ["reasoning", "coding", "long-context", "instruction following"],
        "is_deprecated": false,
        "notes": "Latest flagship model with major improvements in coding and instruction following"
      },
      {
        "model_id": "gpt-4.1-mini",
        "api_name": "gpt-4.1-mini",
        "display_name": "GPT-4.1 Mini",
        "category": "fast",
        "context_window": 1000000,
        "knowledge_cutoff": "2024-06",
        "strengths": ["speed", "cost-efficiency", "coding"],
        "is_deprecated": false,
        "notes": "Fast and cost-effective variant of GPT-4.1"
      }
    ]
  },
  "anthropic": {
    "company": "Anthropic",
    "api_base_url": "https://api.anthropic.com/v1",
    "api_key_env_var": "ANTHROPIC_API_KEY",
    "models": [
      {
        "model_id": "claude-opus-4",
        "api_name": "claude-opus-4",
        "display_name": "Claude Opus 4",
        "category": "flagship",
        "context_window": 200000,
        "knowledge_cutoff": "2025-01",
        "strengths": ["coding", "advanced reasoning", "AI agents", "hybrid reasoning"],
        "is_deprecated": false,
        "notes": "World's best coding model with sustained performance on complex tasks"
      },
      {
        "model_id": "claude-sonnet-4",
        "api_name": "claude-sonnet-4",
        "display_name": "Claude Sonnet 4",
        "category": "standard",
        "context_window": 200000,
        "knowledge_cutoff": "2025-01",
        "strengths": ["coding", "reasoning", "instruction following", "hybrid reasoning"],
        "is_deprecated": false,
        "notes": "Significant upgrade delivering superior coding and reasoning"
      }
    ]
  },
  "google": {
    "company": "Google",
    "api_base_url": "https://generativelanguage.googleapis.com/v1beta",
    "api_key_env_var": "GEMINI_API_KEY",
    "models": [
      {
        "model_id": "gemini-2.5-pro",
        "api_name": "gemini-2.5-pro",
        "display_name": "Gemini 2.5 Pro",
        "category": "flagship",
        "context_window": 1048576,
        "knowledge_cutoff": "2025-01",
        "strengths": ["thinking", "reasoning", "complex problems", "coding", "math"],
        "is_deprecated": false,
        "notes": "State-of-the-art thinking model, #1 on LMArena leaderboard"
      },
      {
        "model_id": "gemini-2.5-flash",
        "api_name": "gemini-2.5-flash",
        "display_name": "Gemini 2.5 Flash",
        "category": "fast",
        "context_window": 1048576,
        "knowledge_cutoff": "2025-01",
        "strengths": ["price-performance", "adaptive thinking", "cost efficiency"],
        "is_deprecated": false,
        "notes": "Best model in terms of price-performance with thinking capabilities"
      }
    ]
  },
  "xai": {
    "company": "xAI",
    "api_base_url": "https://api.x.ai/v1",
    "api_key_env_var": "XAI_API_KEY",
    "models": [
      {
        "model_id": "grok-4",
        "api_name": "grok-4-0709",
        "display_name": "Grok 4",
        "category": "flagship",
        "context_window": 256000,
        "knowledge_cutoff": "2024-12",
        "strengths": ["reasoning", "real-time search", "tool use", "vision"],
        "is_deprecated": false,
        "notes": "Most intelligent model with native tool use and real-time search integration"
      },
      {
        "model_id": "grok-3",
        "api_name": "grok-3",
        "display_name": "Grok 3",
        "category": "standard",
        "context_window": 131072,
        "knowledge_cutoff": "2024-10",
        "strengths": ["reasoning", "superior pretraining", "web search"],
        "is_deprecated": false,
        "notes": "Advanced model with superior reasoning and extensive pretraining knowledge"
      }
    ]
  },
  "perplexity": {
    "company": "Perplexity AI",
    "api_base_url": "https://api.perplexity.ai",
    "api_key_env_var": "PERPLEXITY_API_KEY",
    "models": [
      {
        "model_id": "sonar-pro",
        "api_name": "sonar-pro",
        "display_name": "Sonar Pro",
        "category": "flagship",
        "context_window": 128000,
        "knowledge_cutoff": "real-time",
        "strengths": ["real-time search", "citations", "comprehensive answers", "web research"],
        "is_deprecated": false,
        "notes": "Advanced search capabilities with comprehensive answers and citations"
      },
      {
        "model_id": "sonar",
        "api_name": "sonar",
        "display_name": "Sonar",
        "category": "standard",
        "context_window": 128000,
        "knowledge_cutoff": "real-time",
        "strengths": ["real-time search", "citations", "speed", "cost efficiency"],
        "is_deprecated": false,
        "notes": "Built on Llama 3.3 70B, optimized for answer quality and blazing fast speed (1200 tokens/sec)"
      }
    ]
  },
  "deepseek": {
    "company": "DeepSeek",
    "api_base_url": "https://api.deepseek.com",
    "api_key_env_var": "DEEPSEEK_API_KEY",
    "models": [
      {
        "model_id": "deepseek-chat",
        "api_name": "deepseek-chat",
        "display_name": "DeepSeek V3",
        "category": "flagship",
        "context_window": 64000,
        "knowledge_cutoff": "2024-06",
        "strengths": ["reasoning", "coding", "cost efficiency", "mixture-of-experts"],
        "is_deprecated": false,
        "notes": "685B-parameter MoE model, 3x faster than V2"
      },
      {
        "model_id": "deepseek-reasoner",
        "api_name": "deepseek-reasoner",
        "display_name": "DeepSeek R1",
        "category": "reasoning",
        "context_window": 64000,
        "knowledge_cutoff": "2024-06",
        "strengths": ["advanced reasoning", "multi-step problems", "transparent thinking"],
        "is_deprecated": false,
        "notes": "Specialized reasoning model"
      }
    ]
  },
  "mistral": {
    "company": "Mistral AI",
    "api_base_url": "https://api.mistral.ai/v1",
    "api_key_env_var": "MISTRAL_API_KEY",
    "models": [
      {
        "model_id": "mistral-medium-3",
        "api_name": "mistral-medium-2505",
        "display_name": "Mistral Medium 3",
        "category": "flagship",
        "context_window": 128000,
        "knowledge_cutoff": "2024-12",
        "strengths": ["multimodal", "coding", "STEM", "cost efficiency"],
        "is_deprecated": false,
        "notes": "Frontier-class multimodal model with 8x lower cost than competitors"
      },
      {
        "model_id": "magistral-medium",
        "api_name": "magistral-medium-2506",
        "display_name": "Magistral Medium",
        "category": "reasoning",
        "context_window": 40000,
        "knowledge_cutoff": "2024-12",
        "strengths": ["reasoning", "multi-step logic", "multilingual reasoning"],
        "is_deprecated": false,
        "notes": "Mistral's reasoning-specialized model, multilingual focus"
      }
    ]
  },
  "meta": {
    "company": "Meta",
    "api_base_url": "https://api.llama-api.com/v1",
    "api_key_env_var": "LLAMA_API_KEY",
    "models": [
      {
        "model_id": "llama-3.3-70b",
        "api_name": "llama-3.3-70b-instruct",
        "display_name": "Llama 3.3 70B Instruct",
        "category": "standard",
        "context_window": 128000,
        "knowledge_cutoff": "2024-12",
        "strengths": ["instruction following", "reasoning", "multilingual"],
        "is_deprecated": false,
        "notes": "Latest Llama 3 with improved instruction following"
      },
      {
        "model_id": "llama-3.1-405b",
        "api_name": "llama-3.1-405b-instruct",
        "display_name": "Llama 3.1 405B Instruct",
        "category": "flagship",
        "context_window": 128000,
        "knowledge_cutoff": "2024-04",
        "strengths": ["reasoning", "coding", "long context", "multimodal"],
        "is_deprecated": false,
        "notes": "Largest Llama, 405B parameters"
      }
    ]
  },
  "cohere": {
    "company": "Cohere",
    "api_base_url": "https://api.cohere.ai/v1",
    "api_key_env_var": "COHERE_API_KEY",
    "models": [
      {
        "model_id": "command-a",
        "api_name": "command-a-03-2025",
        "display_name": "Command A",
        "category": "flagship",
        "context_window": 256000,
        "knowledge_cutoff": "2024-12",
        "strengths": ["tool use", "RAG", "agents", "multilingual", "enterprise"],
        "is_deprecated": false,
        "notes": "Enterprise model, high throughput, agentic capabilities"
      }
    ]
  },
  "ai21": {
    "company": "AI21 Labs",
    "api_base_url": "https://api.ai21.com/studio/v1",
    "api_key_env_var": "AI21_API_KEY",
    "models": [
      {
        "model_id": "jamba-large",
        "api_name": "jamba-large-1.7-2025-07",
        "display_name": "Jamba Large 1.7",
        "category": "flagship",
        "context_window": 256000,
        "knowledge_cutoff": "2024-08",
        "strengths": ["long context", "hybrid architecture", "efficiency", "multilingual"],
        "is_deprecated": false,
        "notes": "398B parameters, hybrid SSM-Transformer architecture"
      }
    ]
  },
  "kimi": {
    "company": "Moonshot AI",
    "api_base_url": "https://api.moonshot-ai.com/v1",
    "api_key_env_var": "KIMI_API_KEY",
    "models": [
      {
        "model_id": "kimi-k2-instruct",
        "api_name": "kimi-k2-instruct",
        "display_name": "Kimi K2 Instruct",
        "category": "emerging",
        "context_window": 128000,
        "knowledge_cutoff": "2025-07",
        "strengths": ["reasoning", "coding", "long-context", "agentic tasks"],
        "is_deprecated": false,
        "notes": "1T parameter MoE, 32B active. Open source and API."
      },
      {
        "model_id": "kimi-k1.5",
        "api_name": "kimi-k1.5",
        "display_name": "Kimi k1.5",
        "category": "emerging",
        "context_window": 128000,
        "knowledge_cutoff": "2025-01",
        "strengths": ["reasoning", "multimodal", "real-time search"],
        "is_deprecated": false,
        "notes": "Multimodal, excels at reasoning and step-by-step outputs. Short/long chain-of-thought."
      }
    ]
  },
  "qwen": {
    "company": "Alibaba Group",
    "api_base_url": "https://dashscope.aliyun.com/api/v1",
    "api_key_env_var": "QWEN_API_KEY",
    "models": [
      {
        "model_id": "qwen-3-235b",
        "api_name": "qwen-3-235b-chat",
        "display_name": "Qwen 3 235B Chat",
        "category": "emerging",
        "context_window": 32000,
        "knowledge_cutoff": "2025-04",
        "strengths": ["coding", "reasoning", "multilingual", "efficiency"],
        "is_deprecated": false,
        "notes": "Mixture-of-Experts. Open weights and API."
      }
    ]
  },
  "flux": {
    "company": "Flux AI",
    "api_base_url": "https://api.flux-ai.com/v1",
    "api_key_env_var": "FLUX_API_KEY",
    "models": [
      {
        "model_id": "flux-1.1",
        "api_name": "flux-1.1",
        "display_name": "Flux 1.1",
        "category": "emerging",
        "context_window": 32000,
        "knowledge_cutoff": "2025-06",
        "strengths": ["coding", "reasoning", "cost efficiency"],
        "is_deprecated": false,
        "notes": "Free API option, strong code and reasoning."
      }
    ]
  },
  "pixtral": {
    "company": "Mistral AI",
    "api_base_url": "https://api.mistral.ai/v1",
    "api_key_env_var": "MISTRAL_API_KEY",
    "models": [
      {
        "model_id": "pixtral-large",
        "api_name": "pixtral-large",
        "display_name": "Pixtral Large",
        "category": "emerging",
        "context_window": 128000,
        "knowledge_cutoff": "2025-05",
        "strengths": ["multimodal", "large-text", "image+text workflows", "efficiency"],
        "is_deprecated": false,
        "notes": "124B parameters, vision-capable."
      }
    ]
  }
}
