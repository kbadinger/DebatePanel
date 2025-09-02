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
  'gpt-5': {
    modelId: 'gpt-5',
    costPer1kTokens: {
      input: 0.010,  // Latest GPT flagship model
      output: 0.040
    },
    costCategory: 'flagship',
    providerBaseCost: 0.050,
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
  
  // Anthropic Models - Claude 3.5 Series (Real Models)
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

// Helper functions
export function calculateDebateCost(
  models: Model[], 
  rounds: number,
  topic: string = '',
  description: string = '',
  judgeModel?: Model | null
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