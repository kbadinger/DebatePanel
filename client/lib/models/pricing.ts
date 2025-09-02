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
  'o3-pro': {
    modelId: 'o3-pro',
    costPer1kTokens: {
      input: 0.030,  // Advanced reasoning model
      output: 0.120
    },
    costCategory: 'flagship',
    providerBaseCost: 0.150,
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
  
  // OpenAI - Secondary Tier (Older Models)
  'o1': {
    modelId: 'o1',
    costPer1kTokens: {
      input: 0.015,  // Advanced reasoning
      output: 0.060
    },
    costCategory: 'premium',
    providerBaseCost: 0.075,
    platformMarkup: 0.3
  },
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
  
  // Anthropic Models - Claude 4 Series Only
  'claude-4-opus-20250522': {
    modelId: 'claude-4-opus-20250522',
    costPer1kTokens: {
      input: 0.015,
      output: 0.075
    },
    costCategory: 'flagship',
    providerBaseCost: 0.090,
    platformMarkup: 0.3
  },
  'claude-4-sonnet-20250522': {
    modelId: 'claude-4-sonnet-20250522',
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    costCategory: 'premium',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  'claude-opus-4-1-20250805': {
    modelId: 'claude-opus-4-1-20250805',
    costPer1kTokens: {
      input: 0.020,
      output: 0.100
    },
    costCategory: 'flagship',
    providerBaseCost: 0.120,
    platformMarkup: 0.3
  },
  
  // Google Gemini Models
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
  'mistral-large-24-11': {
    modelId: 'mistral-large-24-11',
    costPer1kTokens: {
      input: 0.003,
      output: 0.009
    },
    costCategory: 'premium',
    providerBaseCost: 0.012,
    platformMarkup: 0.3
  },
  'mistral-medium-3': {
    modelId: 'mistral-medium-3',
    costPer1kTokens: {
      input: 0.00125,
      output: 0.00375
    },
    costCategory: 'standard',
    providerBaseCost: 0.005,
    platformMarkup: 0.3
  },
  'pixtral-large': {
    modelId: 'pixtral-large',
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