import { Model } from '@/types/debate';

export interface ModelPricing {
  modelId: string;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  costCategory: 'budget' | 'standard' | 'premium' | 'luxury' | 'flagship';
  providerBaseCost: number; // What we pay the provider (per 1k response at standard rates)
  platformMarkup: number; // Our markup percentage (e.g., 0.3 for 30%)
}

/**
 * MARKUP STRATEGY (Hybrid Routing Architecture)
 *
 * Direct API (0.30 = 30% markup):
 *   - OpenAI, Anthropic, Google, xAI, DeepSeek, Perplexity
 *   - Best margins, full control, fastest feature access
 *
 * OpenRouter - Mainstream (0.40 = 40% markup):
 *   - Meta Llama, Mistral (major providers without direct integration yet)
 *   - Popular models via OpenRouter for convenience
 *   - Monitor usage - if >500 debates/month, build direct integration
 *
 * OpenRouter - Fringe (0.50 = 50% markup):
 *   - Kimi, Qwen, Flux, and other niche providers
 *   - Lower volume = higher markup justified
 *   - Fast time-to-market without full integration cost
 *
 * Pricing auto-populated by OpenRouter discovery system.
 * See: lib/models/openrouter-discovery.ts
 */

// Actual costs from providers (as of September 2025)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models - Current Generation
  'gpt-4o': {
    modelId: 'gpt-4o',
    costPer1kTokens: {
      input: 0.0025,  // Current pricing
      output: 0.010
    },
    costCategory: 'premium',
    providerBaseCost: 0.0125,
    platformMarkup: 0.3
  },
  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    costPer1kTokens: {
      input: 0.00015,  // Budget option
      output: 0.0006
    },
    costCategory: 'budget',
    providerBaseCost: 0.00075,
    platformMarkup: 0.3
  },
  'gpt-4.1': {
    modelId: 'gpt-4.1',
    costPer1kTokens: {
      input: 0.005,  // Latest API model with 1M context
      output: 0.020
    },
    costCategory: 'flagship',
    providerBaseCost: 0.025,
    platformMarkup: 0.3
  },
  'gpt-4.1-mini': {
    modelId: 'gpt-4.1-mini',
    costPer1kTokens: {
      input: 0.002,  // Efficient GPT-4.1
      output: 0.008
    },
    costCategory: 'premium',
    providerBaseCost: 0.010,
    platformMarkup: 0.3
  },
  'gpt-4.1-nano': {
    modelId: 'gpt-4.1-nano',
    costPer1kTokens: {
      input: 0.0005,  // Ultra-efficient
      output: 0.002
    },
    costCategory: 'standard',
    providerBaseCost: 0.0025,
    platformMarkup: 0.3
  },
  'gpt-5': {
    modelId: 'gpt-5',
    costPer1kTokens: {
      input: 0.00125,  // $1.25 per 1M input = $0.00125 per 1k
      output: 0.010    // $10 per 1M output = $0.010 per 1k
    },
    costCategory: 'flagship',
    providerBaseCost: 0.01125,
    platformMarkup: 0.3
  },
  'gpt-5-mini': {
    modelId: 'gpt-5-mini',
    costPer1kTokens: {
      input: 0.00025,  // $0.25 per 1M input = $0.00025 per 1k
      output: 0.002    // $2 per 1M output = $0.002 per 1k
    },
    costCategory: 'premium',
    providerBaseCost: 0.00225,
    platformMarkup: 0.3
  },
  'gpt-5-nano': {
    modelId: 'gpt-5-nano',
    costPer1kTokens: {
      input: 0.00005,  // $0.05 per 1M input = $0.00005 per 1k
      output: 0.0004   // $0.40 per 1M output = $0.0004 per 1k
    },
    costCategory: 'budget',
    providerBaseCost: 0.00045,
    platformMarkup: 0.3
  },
  'gpt-5-pro': {
    modelId: 'gpt-5-pro',
    costPer1kTokens: {
      input: 0.002,  // Premium GPT-5 tier
      output: 0.015
    },
    costCategory: 'flagship',
    providerBaseCost: 0.017,
    platformMarkup: 0.3
  },
  'gpt-5-codex': {
    modelId: 'gpt-5-codex',
    costPer1kTokens: {
      input: 0.00125,  // Coding specialist
      output: 0.010
    },
    costCategory: 'premium',
    providerBaseCost: 0.01125,
    platformMarkup: 0.3
  },
  // GPT-5.2 Series (December 2025 Release)
  'gpt-5.2': {
    modelId: 'gpt-5.2',
    costPer1kTokens: {
      input: 0.00175,  // $1.75 per 1M input = $0.00175 per 1k
      output: 0.014    // $14 per 1M output = $0.014 per 1k
    },
    costCategory: 'flagship',
    providerBaseCost: 0.01575,
    platformMarkup: 0.3
  },
  'gpt-5.2-chat-latest': {
    modelId: 'gpt-5.2-chat-latest',
    costPer1kTokens: {
      input: 0.00175,  // $1.75 per 1M input (same as base GPT-5.2)
      output: 0.014    // $14 per 1M output
    },
    costCategory: 'flagship',
    providerBaseCost: 0.01575,
    platformMarkup: 0.3
  },
  'gpt-5.2-pro': {
    modelId: 'gpt-5.2-pro',
    costPer1kTokens: {
      input: 0.003,   // Higher for Pro with reasoning
      output: 0.020
    },
    costCategory: 'flagship',
    providerBaseCost: 0.023,
    platformMarkup: 0.3
  },
  // GPT-5.1 Series (January 2025 Release)
  'gpt-5.1': {
    modelId: 'gpt-5.1',
    costPer1kTokens: {
      input: 0.00125,  // $1.25 per 1M input = $0.00125 per 1k
      output: 0.010    // $10 per 1M output = $0.010 per 1k
    },
    costCategory: 'flagship',
    providerBaseCost: 0.01125,
    platformMarkup: 0.3
  },
  'gpt-5.1-codex': {
    modelId: 'gpt-5.1-codex',
    costPer1kTokens: {
      input: 0.00125,  // Same as GPT-5.1
      output: 0.010
    },
    costCategory: 'premium',
    providerBaseCost: 0.01125,
    platformMarkup: 0.3
  },
  'gpt-5.1-codex-mini': {
    modelId: 'gpt-5.1-codex-mini',
    costPer1kTokens: {
      input: 0.00025,  // $0.25 per 1M input = $0.00025 per 1k
      output: 0.002    // $2 per 1M output = $0.002 per 1k
    },
    costCategory: 'standard',
    providerBaseCost: 0.00225,
    platformMarkup: 0.3
  },
  'gpt-5.1-chat': {
    modelId: 'gpt-5.1-chat',
    costPer1kTokens: {
      input: 0.00125,  // $1.25 per 1M input (optimized for chat)
      output: 0.010    // $10 per 1M output
    },
    costCategory: 'flagship',
    providerBaseCost: 0.01125,
    platformMarkup: 0.3
  },
  'o1': {
    modelId: 'o1',
    costPer1kTokens: {
      input: 0.015,  // OpenAI o1 reasoning model
      output: 0.060
    },
    costCategory: 'flagship',
    providerBaseCost: 0.075,
    platformMarkup: 0.3
  },
  'o4-mini': {
    modelId: 'o4-mini',
    costPer1kTokens: {
      input: 0.008,  // Efficient reasoning
      output: 0.032
    },
    costCategory: 'premium',
    providerBaseCost: 0.040,
    platformMarkup: 0.3
  },
  'o3-deep-research': {
    modelId: 'o3-deep-research',
    costPer1kTokens: {
      input: 0.025,  // Deep research variant
      output: 0.100
    },
    costCategory: 'flagship',
    providerBaseCost: 0.125,
    platformMarkup: 0.3
  },
  'o4-mini-deep-research': {
    modelId: 'o4-mini-deep-research',
    costPer1kTokens: {
      input: 0.010,  // Efficient deep research
      output: 0.040
    },
    costCategory: 'premium',
    providerBaseCost: 0.050,
    platformMarkup: 0.3
  },

  // OpenAI - Secondary Tier (Older Models)
  'o1-mini': {
    modelId: 'o1-mini',
    costPer1kTokens: {
      input: 0.003,  // Faster reasoning
      output: 0.012
    },
    costCategory: 'standard',
    providerBaseCost: 0.015,
    platformMarkup: 0.3
  },
  'o3': {
    modelId: 'o3',
    costPer1kTokens: {
      input: 0.020,  // Original o3
      output: 0.080
    },
    costCategory: 'premium',
    providerBaseCost: 0.100,
    platformMarkup: 0.3
  },
  'o3-mini': {
    modelId: 'o3-mini',
    costPer1kTokens: {
      input: 0.005,  // Efficient reasoning
      output: 0.020
    },
    costCategory: 'standard',
    providerBaseCost: 0.025,
    platformMarkup: 0.3
  },
  
  // Anthropic Models - Claude 4.6, 4.5, 4.1 and 3.5 Series (Real Models)
  'claude-sonnet-4-6': {
    modelId: 'claude-sonnet-4-6',
    costPer1kTokens: {
      input: 0.003,  // $3 per 1M input = $0.003 per 1k
      output: 0.015  // $15 per 1M output = $0.015 per 1k
    },
    costCategory: 'flagship',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  'claude-opus-4-6': {
    modelId: 'claude-opus-4-6',
    costPer1kTokens: {
      input: 0.015,  // $15 per 1M input = $0.015 per 1k
      output: 0.075  // $75 per 1M output = $0.075 per 1k
    },
    costCategory: 'flagship',
    providerBaseCost: 0.090,
    platformMarkup: 0.3
  },
  'claude-opus-4-5-20251101': {
    modelId: 'claude-opus-4-5-20251101',
    costPer1kTokens: {
      input: 0.015,  // $15 per 1M input = $0.015 per 1k
      output: 0.075  // $75 per 1M output = $0.075 per 1k
    },
    costCategory: 'flagship',
    providerBaseCost: 0.090,
    platformMarkup: 0.3
  },
  'claude-sonnet-4-5-20250929': {
    modelId: 'claude-sonnet-4-5-20250929',
    costPer1kTokens: {
      input: 0.003,  // $3 per 1M input = $0.003 per 1k
      output: 0.015  // $15 per 1M output = $0.015 per 1k
    },
    costCategory: 'flagship',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  'claude-haiku-4-5-20251001': {
    modelId: 'claude-haiku-4-5-20251001',
    costPer1kTokens: {
      input: 0.001,  // $1 per 1M input = $0.001 per 1k
      output: 0.005  // $5 per 1M output = $0.005 per 1k
    },
    costCategory: 'standard',
    providerBaseCost: 0.006,
    platformMarkup: 0.3
  },
  'claude-opus-4-1-20250805': {
    modelId: 'claude-opus-4-1-20250805',
    costPer1kTokens: {
      input: 0.025,  // Premium flagship Anthropic model
      output: 0.125
    },
    costCategory: 'flagship',
    providerBaseCost: 0.150,
    platformMarkup: 0.3
  },
  'claude-sonnet-4-20250514': {
    modelId: 'claude-sonnet-4-20250514',
    costPer1kTokens: {
      input: 0.020,  // Claude 4 Sonnet model
      output: 0.100
    },
    costCategory: 'flagship',
    providerBaseCost: 0.120,
    platformMarkup: 0.3
  },
  'claude-opus-4-20250514': {
    modelId: 'claude-opus-4-20250514',
    costPer1kTokens: {
      input: 0.025,  // Claude 4 Opus model
      output: 0.125
    },
    costCategory: 'flagship',
    providerBaseCost: 0.150,
    platformMarkup: 0.3
  },
  'claude-3-7-sonnet-20250219': {
    modelId: 'claude-3-7-sonnet-20250219',
    costPer1kTokens: {
      input: 0.015,  // Claude 3.7 Sonnet model
      output: 0.075
    },
    costCategory: 'premium',
    providerBaseCost: 0.090,
    platformMarkup: 0.3
  },
  'claude-3-5-sonnet-20241022': {
    modelId: 'claude-3-5-sonnet-20241022',
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    costCategory: 'premium',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  'claude-3-5-sonnet-20240620': {
    modelId: 'claude-3-5-sonnet-20240620',
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    costCategory: 'premium',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  'claude-3-opus-20240229': {
    modelId: 'claude-3-opus-20240229',
    costPer1kTokens: {
      input: 0.020,
      output: 0.100
    },
    costCategory: 'flagship',
    providerBaseCost: 0.120,
    platformMarkup: 0.3
  },
  'claude-3-5-haiku-20241022': {
    modelId: 'claude-3-5-haiku-20241022',
    costPer1kTokens: {
      input: 0.001,  // $1 per 1M input
      output: 0.005  // $5 per 1M output
    },
    costCategory: 'standard',
    providerBaseCost: 0.006,
    platformMarkup: 0.3
  },
  'claude-3-haiku-20240307': {
    modelId: 'claude-3-haiku-20240307',
    costPer1kTokens: {
      input: 0.00025,  // $0.25 per 1M input
      output: 0.00125  // $1.25 per 1M output
    },
    costCategory: 'budget',
    providerBaseCost: 0.00150,
    platformMarkup: 0.3
  },

  // Google Gemini Models
  'gemini-3-pro-preview': {
    modelId: 'gemini-3-pro-preview',
    costPer1kTokens: {
      input: 0.002,   // Official: $2/million tokens (≤200K context)
      output: 0.012   // Official: $12/million tokens (≤200K context)
    },
    costCategory: 'premium',
    providerBaseCost: 0.014,
    platformMarkup: 0.3
  },
  'gemini-3-flash': {
    modelId: 'gemini-3-flash',
    costPer1kTokens: {
      input: 0.0001,  // Fast and efficient (Jan 2026)
      output: 0.0004
    },
    costCategory: 'budget',
    providerBaseCost: 0.0005,
    platformMarkup: 0.3
  },
  'gemini-3-deep-think': {
    modelId: 'gemini-3-deep-think',
    costPer1kTokens: {
      input: 0.003,   // Deep reasoning model (Nov 2025)
      output: 0.015
    },
    costCategory: 'premium',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  'gemini-2.5-pro': {
    modelId: 'gemini-2.5-pro',
    costPer1kTokens: {
      input: 0.00125,  // Competitive pricing
      output: 0.005
    },
    costCategory: 'premium',
    providerBaseCost: 0.00625,
    platformMarkup: 0.3
  },
  'gemini-2.5-flash': {
    modelId: 'gemini-2.5-flash',
    costPer1kTokens: {
      input: 0.000075,  // Very cost-effective
      output: 0.0003
    },
    costCategory: 'budget',
    providerBaseCost: 0.000375,
    platformMarkup: 0.3
  },
  'gemini-2.5-flash-lite': {
    modelId: 'gemini-2.5-flash-lite',
    costPer1kTokens: {
      input: 0.000025,  // Ultra-efficient
      output: 0.0001
    },
    costCategory: 'budget',
    providerBaseCost: 0.000125,
    platformMarkup: 0.3
  },
  'gemini-2.0-flash': {
    modelId: 'gemini-2.0-flash',
    costPer1kTokens: {
      input: 0.0001,
      output: 0.0004
    },
    costCategory: 'budget',
    providerBaseCost: 0.0005,
    platformMarkup: 0.3
  },
  'gemini-2.0-pro-exp': {
    modelId: 'gemini-2.0-pro-exp',
    costPer1kTokens: {
      input: 0.00125,  // Experimental Pro pricing
      output: 0.005
    },
    costCategory: 'premium',
    providerBaseCost: 0.00625,
    platformMarkup: 0.3
  },
  'gemini-2.0-flash-thinking-exp': {
    modelId: 'gemini-2.0-flash-thinking-exp',
    costPer1kTokens: {
      input: 0.00015,  // Thinking mode
      output: 0.0006
    },
    costCategory: 'standard',
    providerBaseCost: 0.00075,
    platformMarkup: 0.3
  },
  'gemini-1.5-pro': {
    modelId: 'gemini-1.5-pro',
    costPer1kTokens: {
      input: 0.00125,  // Legacy pricing
      output: 0.005
    },
    costCategory: 'premium',
    providerBaseCost: 0.00625,
    platformMarkup: 0.3
  },
  'gemini-1.5-flash': {
    modelId: 'gemini-1.5-flash',
    costPer1kTokens: {
      input: 0.000075,
      output: 0.0003
    },
    costCategory: 'budget',
    providerBaseCost: 0.000375,
    platformMarkup: 0.3
  },
  'gemini-1.5-flash-8b': {
    modelId: 'gemini-1.5-flash-8b',
    costPer1kTokens: {
      input: 0.0000375,
      output: 0.00015
    },
    costCategory: 'budget',
    providerBaseCost: 0.0001875,
    platformMarkup: 0.3
  },
  
  // X.AI Grok Models
  'grok-4': {
    modelId: 'grok-4',
    costPer1kTokens: {
      input: 0.005,  // Premium with real-time search
      output: 0.020
    },
    costCategory: 'flagship',
    providerBaseCost: 0.025,
    platformMarkup: 0.3
  },
  'grok-3': {
    modelId: 'grok-3',
    costPer1kTokens: {
      input: 0.003,
      output: 0.012
    },
    costCategory: 'premium',
    providerBaseCost: 0.015,
    platformMarkup: 0.3
  },
  'grok-2': {
    modelId: 'grok-2',
    costPer1kTokens: {
      input: 0.002,
      output: 0.008
    },
    costCategory: 'standard',
    providerBaseCost: 0.010,
    platformMarkup: 0.3
  },
  'grok-2-1212': {
    modelId: 'grok-2-1212',
    costPer1kTokens: {
      input: 0.002,
      output: 0.008
    },
    costCategory: 'standard',
    providerBaseCost: 0.010,
    platformMarkup: 0.3
  },
  'grok-4-1-fast-reasoning': {
    modelId: 'grok-4-1-fast-reasoning',
    costPer1kTokens: {
      input: 0.010,  // Grok 4.1 fast reasoning (Nov 2025)
      output: 0.040
    },
    costCategory: 'premium',
    providerBaseCost: 0.050,
    platformMarkup: 0.3
  },
  'grok-4-1-fast-non-reasoning': {
    modelId: 'grok-4-1-fast-non-reasoning',
    costPer1kTokens: {
      input: 0.008,  // Grok 4.1 fast non-reasoning (Nov 2025)
      output: 0.032
    },
    costCategory: 'premium',
    providerBaseCost: 0.040,
    platformMarkup: 0.3
  },
  'grok-4-fast-reasoning': {
    modelId: 'grok-4-fast-reasoning',
    costPer1kTokens: {
      input: 0.010,  // Fast reasoning variant
      output: 0.040
    },
    costCategory: 'premium',
    providerBaseCost: 0.050,
    platformMarkup: 0.3
  },
  'grok-4-fast-non-reasoning': {
    modelId: 'grok-4-fast-non-reasoning',
    costPer1kTokens: {
      input: 0.008,  // Fast non-reasoning variant
      output: 0.032
    },
    costCategory: 'premium',
    providerBaseCost: 0.040,
    platformMarkup: 0.3
  },
  'grok-3-mini': {
    modelId: 'grok-3-mini',
    costPer1kTokens: {
      input: 0.002,  // Mini variant
      output: 0.008
    },
    costCategory: 'standard',
    providerBaseCost: 0.010,
    platformMarkup: 0.3
  },

  // Perplexity Models (per search, not tokens)
  'sonar-pro': {
    modelId: 'sonar-pro',
    costPer1kTokens: {
      input: 0.005,  // Estimated per search
      output: 0.005
    },
    costCategory: 'premium',
    providerBaseCost: 0.010,
    platformMarkup: 0.3
  },
  'sonar-deep-research': {
    modelId: 'sonar-deep-research',
    costPer1kTokens: {
      input: 0.008,  // More comprehensive research
      output: 0.008
    },
    costCategory: 'flagship',
    providerBaseCost: 0.016,
    platformMarkup: 0.3
  },
  'sonar-reasoning-pro': {
    modelId: 'sonar-reasoning-pro',
    costPer1kTokens: {
      input: 0.006,
      output: 0.006
    },
    costCategory: 'premium',
    providerBaseCost: 0.012,
    platformMarkup: 0.3
  },
  'sonar': {
    modelId: 'sonar',
    costPer1kTokens: {
      input: 0.001,
      output: 0.001
    },
    costCategory: 'standard',
    providerBaseCost: 0.002,
    platformMarkup: 0.3
  },
  
  // DeepSeek Models (Very competitive pricing)
  'deepseek-v3.2': {
    modelId: 'deepseek-v3.2',
    costPer1kTokens: {
      input: 0.00027,  // DeepSeek V3.2 - outperforms GPT-5 on reasoning (Jan 2026)
      output: 0.0011
    },
    costCategory: 'budget',
    providerBaseCost: 0.00137,
    platformMarkup: 0.3
  },
  'deepseek-v3.1': {
    modelId: 'deepseek-v3.1',
    costPer1kTokens: {
      input: 0.00027,  // Extremely cost-effective
      output: 0.0011
    },
    costCategory: 'budget',
    providerBaseCost: 0.00137,
    platformMarkup: 0.3
  },
  'deepseek-chat-v3.1': {
    modelId: 'deepseek-chat-v3.1',
    costPer1kTokens: {
      input: 0.00027,  // Extremely cost-effective
      output: 0.0011
    },
    costCategory: 'budget',
    providerBaseCost: 0.00137,
    platformMarkup: 0.3
  },
  'deepseek-r1-0528': {
    modelId: 'deepseek-r1-0528',
    costPer1kTokens: {
      input: 0.0008,  // Enhanced reasoning
      output: 0.0032
    },
    costCategory: 'budget',
    providerBaseCost: 0.004,
    platformMarkup: 0.3
  },
  'deepseek-chat': {
    modelId: 'deepseek-chat',
    costPer1kTokens: {
      input: 0.00014,  // Legacy pricing
      output: 0.00028
    },
    costCategory: 'budget',
    providerBaseCost: 0.00042,
    platformMarkup: 0.3
  },
  'deepseek-reasoner': {
    modelId: 'deepseek-reasoner',
    costPer1kTokens: {
      input: 0.00055,
      output: 0.0022
    },
    costCategory: 'budget',
    providerBaseCost: 0.00275,
    platformMarkup: 0.3
  },
  
  // X.AI Grok Models
  'grok-4-2': {
    modelId: 'grok-4-2',
    costPer1kTokens: {
      input: 0.015,  // Grok 4.2 beta - flagship pricing
      output: 0.060
    },
    costCategory: 'flagship',
    providerBaseCost: 0.075,
    platformMarkup: 0.3
  },
  'grok-4-0709': {
    modelId: 'grok-4-0709',
    costPer1kTokens: {
      input: 0.015,  // Latest Grok flagship model
      output: 0.060
    },
    costCategory: 'flagship',
    providerBaseCost: 0.075,
    platformMarkup: 0.3
  },
  'grok-3': {
    modelId: 'grok-3',
    costPer1kTokens: {
      input: 0.010,  // Grok 3 model
      output: 0.040
    },
    costCategory: 'premium',
    providerBaseCost: 0.050,
    platformMarkup: 0.3
  },
  
  // Meta Llama Models (often free via various providers)
  'llama-4-scout': {
    modelId: 'llama-4-scout',
    costPer1kTokens: {
      input: 0.0005,  // Via OpenRouter/others
      output: 0.0005
    },
    costCategory: 'budget',
    providerBaseCost: 0.001,
    platformMarkup: 0.3
  },
  'llama-4-maverick': {
    modelId: 'llama-4-maverick',
    costPer1kTokens: {
      input: 0.001,  // Larger model
      output: 0.001
    },
    costCategory: 'standard',
    providerBaseCost: 0.002,
    platformMarkup: 0.3
  },
  'llama-3.3-70b': {
    modelId: 'llama-3.3-70b',
    costPer1kTokens: {
      input: 0.0004,
      output: 0.0004
    },
    costCategory: 'budget',
    providerBaseCost: 0.0008,
    platformMarkup: 0.3
  },
  'llama-3.1-405b': {
    modelId: 'llama-3.1-405b',
    costPer1kTokens: {
      input: 0.002,
      output: 0.002
    },
    costCategory: 'standard',
    providerBaseCost: 0.004,
    platformMarkup: 0.3
  },
  
  // Mistral Models
  'mistral-large-latest': {
    modelId: 'mistral-large-latest',
    costPer1kTokens: {
      input: 0.003,
      output: 0.009
    },
    costCategory: 'premium',
    providerBaseCost: 0.012,
    platformMarkup: 0.3
  },
  'mistral-small-latest': {
    modelId: 'mistral-small-latest',
    costPer1kTokens: {
      input: 0.001,
      output: 0.003
    },
    costCategory: 'standard',
    providerBaseCost: 0.004,
    platformMarkup: 0.3
  },
  'mistral-medium-2508': {
    modelId: 'mistral-medium-2508',
    costPer1kTokens: {
      input: 0.00125,
      output: 0.00375
    },
    costCategory: 'standard',
    providerBaseCost: 0.005,
    platformMarkup: 0.3
  },
  'pixtral-large-2411': {
    modelId: 'pixtral-large-2411',
    costPer1kTokens: {
      input: 0.003,
      output: 0.009
    },
    costCategory: 'premium',
    providerBaseCost: 0.012,
    platformMarkup: 0.3
  },
  
  // Cohere Models
  'command-a-03-2025': {
    modelId: 'command-a-03-2025',
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    costCategory: 'premium',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  
  // Moonshot Kimi Models
  'kimi-k2.5': {
    modelId: 'kimi-k2.5',
    costPer1kTokens: {
      input: 0.0000006,  // $0.0006 per 1M = $0.0000006 per 1k
      output: 0.000003   // $0.003 per 1M = $0.000003 per 1k
    },
    costCategory: 'budget',
    providerBaseCost: 0.0000036,
    platformMarkup: 0.5  // OpenRouter fringe provider
  },
  'kimi-k2-preview': {
    modelId: 'kimi-k2-preview',
    costPer1kTokens: {
      input: 0.0003,  // Latest K2 preview
      output: 0.0012
    },
    costCategory: 'budget',
    providerBaseCost: 0.0015,
    platformMarkup: 0.3
  },
  'kimi-k2-instruct': {
    modelId: 'kimi-k2-instruct',
    costPer1kTokens: {
      input: 0.0002,  // Very competitive
      output: 0.0008
    },
    costCategory: 'budget',
    providerBaseCost: 0.001,
    platformMarkup: 0.3
  },
  'kimi-k1.5': {
    modelId: 'kimi-k1.5',
    costPer1kTokens: {
      input: 0.00014,
      output: 0.0004
    },
    costCategory: 'budget',
    providerBaseCost: 0.00054,
    platformMarkup: 0.3
  },
  
  // AI21 Models
  'jamba-large-1-7': {
    modelId: 'jamba-large-1-7',
    costPer1kTokens: {
      input: 0.002,
      output: 0.008
    },
    costCategory: 'standard',
    providerBaseCost: 0.010,
    platformMarkup: 0.3
  },
  
  // Other Providers
  'qwen-3-235b': {
    modelId: 'qwen-3-235b',
    costPer1kTokens: {
      input: 0.001,
      output: 0.002
    },
    costCategory: 'standard',
    providerBaseCost: 0.003,
    platformMarkup: 0.3
  },
  'flux-1.1': {
    modelId: 'flux-1.1',
    costPer1kTokens: {
      input: 0.002,
      output: 0.004
    },
    costCategory: 'standard',
    providerBaseCost: 0.006,
    platformMarkup: 0.3
  }
};

// Helper functions
export function calculateDebateCost(
  models: Model[],
  rounds: number,
  topic: string = '',
  description: string = '',
  judgeModel?: Model | null,
  challengerModel?: Model | null
): {
  apiCost: number;
  platformFee: number;
  totalCost: number;
  breakdown: Array<{
    modelId: string;
    displayName: string;
    apiCost: number;
    userCost: number;
  }>;
} {
  // If no models selected, return zero
  if (models.length === 0) {
    return {
      apiCost: 0,
      platformFee: 0,
      totalCost: 0,
      breakdown: []
    };
  }

  let totalApiCost = 0;
  const breakdown = [];

  // Calculate prompt tokens based on actual text (1 token ≈ 3 chars for English)
  const promptChars = topic.length + description.length;
  const systemPromptTokens = 30; // Fixed overhead for system instructions
  const userPromptTokens = Math.ceil(promptChars / 3);
  const basePromptTokens = systemPromptTokens + userPromptTokens;
  
  for (const model of models) {
    const pricing = MODEL_PRICING[model.id];
    if (!pricing) continue;

    // Adjust response tokens based on model category
    const responseTokensPerRound = pricing.costCategory === 'budget' ? 750 : 
                                  pricing.costCategory === 'standard' ? 1000 :
                                  pricing.costCategory === 'premium' ? 1250 : 
                                  pricing.costCategory === 'luxury' ? 1500 : 
                                  pricing.costCategory === 'flagship' ? 2000 : 1000;

    // Calculate tokens for each round with realistic growth
    let totalInputTokens = 0;
    let cumulativeContext = 0;
    
    for (let round = 1; round <= rounds; round++) {
      const contextGrowth = round === 1 ? 0 : 
                           round === 2 ? responseTokensPerRound * 0.3 :
                           responseTokensPerRound * 0.5;
      cumulativeContext += contextGrowth;
      const roundInputTokens = basePromptTokens + cumulativeContext;
      totalInputTokens += roundInputTokens;
    }
    
    totalInputTokens = totalInputTokens / 1000; // Convert to thousands
    const totalOutputTokens = (responseTokensPerRound * rounds) / 1000;
    
    const inputCost = totalInputTokens * pricing.costPer1kTokens.input;
    const outputCost = totalOutputTokens * pricing.costPer1kTokens.output;
    const modelApiCost = inputCost + outputCost;
    
    const modelUserCost = modelApiCost * (1 + pricing.platformMarkup);
    
    totalApiCost += modelApiCost;
    breakdown.push({
      modelId: model.id,
      displayName: model.displayName,
      apiCost: modelApiCost,
      userCost: modelUserCost
    });
  }

  // Add judge cost if enabled
  if (judgeModel) {
    const judgePricing = MODEL_PRICING[judgeModel.id];
    if (judgePricing) {
      // Judge reviews the final round's responses
      const finalRoundResponses = models.length;
      const judgeInputChars = promptChars + (finalRoundResponses * 1000 * 3);
      const judgeInputTokens = (systemPromptTokens + Math.ceil(judgeInputChars / 3)) / 1000;
      const judgeOutputTokens = 0.5; // Judge writes ~500 token analysis

      const judgeInputCost = judgeInputTokens * judgePricing.costPer1kTokens.input;
      const judgeOutputCost = judgeOutputTokens * judgePricing.costPer1kTokens.output;
      const judgeApiCost = judgeInputCost + judgeOutputCost;
      const judgeUserCost = judgeApiCost * (1 + judgePricing.platformMarkup);

      totalApiCost += judgeApiCost;
      breakdown.push({
        modelId: judgeModel.id,
        displayName: `${judgeModel.displayName} (Judge)`,
        apiCost: judgeApiCost,
        userCost: judgeUserCost
      });
    }
  }

  // Add challenger cost if enabled (participates in all rounds like regular models)
  if (challengerModel && !models.some(m => m.id === challengerModel.id)) {
    const challengerPricing = MODEL_PRICING[challengerModel.id];
    if (challengerPricing) {
      const responseTokensPerRound = challengerPricing.costCategory === 'budget' ? 750 :
                                    challengerPricing.costCategory === 'standard' ? 1000 :
                                    challengerPricing.costCategory === 'premium' ? 1250 :
                                    challengerPricing.costCategory === 'luxury' ? 1500 :
                                    challengerPricing.costCategory === 'flagship' ? 2000 : 1000;

      let totalInputTokens = 0;
      let cumulativeContext = 0;

      for (let round = 1; round <= rounds; round++) {
        const contextGrowth = round === 1 ? 0 :
                             round === 2 ? responseTokensPerRound * 0.3 :
                             responseTokensPerRound * 0.5;
        cumulativeContext += contextGrowth;
        const roundInputTokens = basePromptTokens + cumulativeContext;
        totalInputTokens += roundInputTokens;
      }

      totalInputTokens = totalInputTokens / 1000;
      const totalOutputTokens = (responseTokensPerRound * rounds) / 1000;

      const inputCost = totalInputTokens * challengerPricing.costPer1kTokens.input;
      const outputCost = totalOutputTokens * challengerPricing.costPer1kTokens.output;
      const challengerApiCost = inputCost + outputCost;
      const challengerUserCost = challengerApiCost * (1 + challengerPricing.platformMarkup);

      totalApiCost += challengerApiCost;
      breakdown.push({
        modelId: challengerModel.id,
        displayName: `${challengerModel.displayName} (Challenger)`,
        apiCost: challengerApiCost,
        userCost: challengerUserCost
      });
    }
  }

  const platformFee = totalApiCost * 0.3; // Average 30% markup
  const totalCost = totalApiCost + platformFee;

  return {
    apiCost: totalApiCost,
    platformFee,
    totalCost,
    breakdown
  };
}

export function getCostEmoji(category: string): string {
  switch (category) {
    case 'budget': return '💰';
    case 'standard': return '📊';
    case 'premium': return '⭐';
    case 'luxury': return '💎';
    case 'flagship': return '🚀';
    default: return '📊';
  }
}

export function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return '$0.00';
  if (cost === 0) return 'Free';
  if (cost < 0.01) return `$${(cost * 100).toFixed(2)}¢`;
  return `$${cost.toFixed(3)}`;
}