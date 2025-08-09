import { Model } from '@/types/debate';

export interface ModelPricing {
  modelId: string;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  costCategory: 'budget' | 'standard' | 'premium' | 'luxury';
  providerBaseCost: number; // What we pay the provider (per 1k response at standard rates)
  platformMarkup: number; // Our markup percentage (e.g., 0.3 for 30%)
}

// Actual costs from providers (as of Jan 2025)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4-turbo-preview': {
    modelId: 'gpt-4-turbo-preview',
    costPer1kTokens: {
      input: 0.01,
      output: 0.03
    },
    costCategory: 'premium',
    providerBaseCost: 0.04,
    platformMarkup: 0.3
  },
  'gpt-4o': {
    modelId: 'gpt-4o',
    costPer1kTokens: {
      input: 0.005,
      output: 0.015
    },
    costCategory: 'standard',
    providerBaseCost: 0.02,
    platformMarkup: 0.3
  },
  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    costPer1kTokens: {
      input: 0.00015,
      output: 0.0006
    },
    costCategory: 'budget',
    providerBaseCost: 0.00075,
    platformMarkup: 0.3
  },
  'gpt-3.5-turbo': {
    modelId: 'gpt-3.5-turbo',
    costPer1kTokens: {
      input: 0.0005,
      output: 0.0015
    },
    costCategory: 'budget',
    providerBaseCost: 0.002,
    platformMarkup: 0.3
  },
  
  // Anthropic Models
  'claude-3-opus-20240229': {
    modelId: 'claude-3-opus-20240229',
    costPer1kTokens: {
      input: 0.015,
      output: 0.075
    },
    costCategory: 'luxury',
    providerBaseCost: 0.09,
    platformMarkup: 0.3
  },
  'claude-3-5-sonnet-20241022': {
    modelId: 'claude-3-5-sonnet-20241022',
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    costCategory: 'standard',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  'claude-3-haiku-20240307': {
    modelId: 'claude-3-haiku-20240307',
    costPer1kTokens: {
      input: 0.00025,
      output: 0.00125
    },
    costCategory: 'budget',
    providerBaseCost: 0.0015,
    platformMarkup: 0.3
  },
  
  // Google Models
  'gemini-1.5-pro': {
    modelId: 'gemini-1.5-pro',
    costPer1kTokens: {
      input: 0.00125,
      output: 0.005
    },
    costCategory: 'standard',
    providerBaseCost: 0.00625,
    platformMarkup: 0.3
  },
  'gemini-2.5-flash': {
    modelId: 'gemini-2.5-flash',
    costPer1kTokens: {
      input: 0.000075,
      output: 0.0003
    },
    costCategory: 'budget',
    providerBaseCost: 0.000375,
    platformMarkup: 0.3
  },
  
  // X.AI Models
  'grok-4': {
    modelId: 'grok-4',
    costPer1kTokens: {
      input: 0.005,
      output: 0.015
    },
    costCategory: 'premium',
    providerBaseCost: 0.020,
    platformMarkup: 0.3
  },
  'grok-3': {
    modelId: 'grok-3',
    costPer1kTokens: {
      input: 0.002,
      output: 0.01
    },
    costCategory: 'standard',
    providerBaseCost: 0.012,
    platformMarkup: 0.3
  },
  
  // Perplexity Models
  'sonar-pro': {
    modelId: 'sonar-pro',
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    costCategory: 'premium',
    providerBaseCost: 0.018,
    platformMarkup: 0.3
  },
  'sonar': {
    modelId: 'sonar',
    costPer1kTokens: {
      input: 0.001,
      output: 0.005
    },
    costCategory: 'standard',
    providerBaseCost: 0.006,
    platformMarkup: 0.3
  },
  
  // DeepSeek Models
  'deepseek-chat': {
    modelId: 'deepseek-chat',
    costPer1kTokens: {
      input: 0.00014,
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
      output: 0.00219
    },
    costCategory: 'standard',
    providerBaseCost: 0.00274,
    platformMarkup: 0.3
  },
  
  // Mistral Models
  'mistral-medium-3': {
    modelId: 'mistral-medium-3',
    costPer1kTokens: {
      input: 0.00065,
      output: 0.00196
    },
    costCategory: 'standard',
    providerBaseCost: 0.00261,
    platformMarkup: 0.3
  },
  'magistral-medium': {
    modelId: 'magistral-medium',
    costPer1kTokens: {
      input: 0.002,
      output: 0.006
    },
    costCategory: 'premium',
    providerBaseCost: 0.008,
    platformMarkup: 0.3
  },
  
  // Meta Models
  'llama-3.3-70b': {
    modelId: 'llama-3.3-70b',
    costPer1kTokens: {
      input: 0.0008,
      output: 0.0008
    },
    costCategory: 'budget',
    providerBaseCost: 0.0008,
    platformMarkup: 0.3
  },
  'llama-3.1-405b': {
    modelId: 'llama-3.1-405b',
    costPer1kTokens: {
      input: 0.0035,
      output: 0.0035
    },
    costCategory: 'premium',
    providerBaseCost: 0.0035,
    platformMarkup: 0.3
  },
  
  // Cohere Models
  'command-a': {
    modelId: 'command-a',
    costPer1kTokens: {
      input: 0.001,
      output: 0.002
    },
    costCategory: 'standard',
    providerBaseCost: 0.0025,
    platformMarkup: 0.3
  },
  
  // AI21 Models
  'jamba-large': {
    modelId: 'jamba-large',
    costPer1kTokens: {
      input: 0.005,
      output: 0.007
    },
    costCategory: 'premium',
    providerBaseCost: 0.0085,
    platformMarkup: 0.3
  },
  
  // Moonshot AI Models (Kimi)
  'kimi-k2-instruct': {
    modelId: 'kimi-k2-instruct',
    costPer1kTokens: {
      input: 0.0003,
      output: 0.0012
    },
    costCategory: 'budget',
    providerBaseCost: 0.0015,
    platformMarkup: 0.3
  },
  'kimi-k1.5': {
    modelId: 'kimi-k1.5',
    costPer1kTokens: {
      input: 0.0002,
      output: 0.0008
    },
    costCategory: 'budget',
    providerBaseCost: 0.001,
    platformMarkup: 0.3
  },
  
  // Alibaba Models (Qwen)
  'qwen-3-235b': {
    modelId: 'qwen-3-235b',
    costPer1kTokens: {
      input: 0.0005,
      output: 0.0005
    },
    costCategory: 'standard',
    providerBaseCost: 0.0005,
    platformMarkup: 0.3
  },
  
  // Flux AI Models
  'flux-1.1': {
    modelId: 'flux-1.1',
    costPer1kTokens: {
      input: 0.0,
      output: 0.0
    },
    costCategory: 'budget',
    providerBaseCost: 0.0,
    platformMarkup: 0.0
  },
  
  // Mistral Multimodal (Pixtral)
  'pixtral-large': {
    modelId: 'pixtral-large',
    costPer1kTokens: {
      input: 0.002,
      output: 0.006
    },
    costCategory: 'premium',
    providerBaseCost: 0.008,
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
  console.log('=== COST CALCULATION DEBUG ===');
  console.log('Input parameters:', {
    modelCount: models.length,
    rounds,
    topicLength: topic.length,
    descriptionLength: description.length,
    totalTextLength: topic.length + description.length
  });

  // If no models selected, return zero
  if (models.length === 0) {
    console.log('No models selected, returning zero cost');
    return {
      apiCost: 0,
      platformFee: 0,
      totalCost: 0,
      breakdown: []
    };
  }

  let totalApiCost = 0;
  const breakdown = [];

  // Calculate prompt tokens based on actual text (more accurate: 1 token ≈ 3 chars for English)
  const promptChars = topic.length + description.length;
  const systemPromptTokens = 30; // Fixed overhead for system instructions
  const userPromptTokens = Math.ceil(promptChars / 3);
  const basePromptTokens = systemPromptTokens + userPromptTokens;
  
  console.log('Token calculation:', {
    promptChars,
    systemPromptTokens,
    userPromptTokens,
    basePromptTokens,
    calculation: `${systemPromptTokens} (system) + ceil(${promptChars} / 3) = ${basePromptTokens}`
  });
  
  for (const model of models) {
    const pricing = MODEL_PRICING[model.id];
    if (!pricing) {
      console.log(`No pricing found for model: ${model.id}`);
      continue;
    }

    // Adjust response tokens based on model category
    const responseTokensPerRound = pricing.costCategory === 'budget' ? 750 : 
                                  pricing.costCategory === 'standard' ? 1000 :
                                  pricing.costCategory === 'premium' ? 1250 : 1500;

    // Calculate tokens for each round with more realistic growth
    let totalInputTokens = 0;
    let cumulativeContext = 0;
    
    for (let round = 1; round <= rounds; round++) {
      const contextGrowth = round === 1 ? 0 : 
                           round === 2 ? responseTokensPerRound * 0.3 :
                           responseTokensPerRound * 0.5;
      cumulativeContext += contextGrowth;
      const roundInputTokens = basePromptTokens + cumulativeContext;
      totalInputTokens += roundInputTokens;
      
      console.log(`  Round ${round} tokens:`, {
        contextGrowth,
        cumulativeContext,
        roundInputTokens
      });
    }
    
    totalInputTokens = totalInputTokens / 1000; // Convert to thousands
    const totalOutputTokens = (responseTokensPerRound * rounds) / 1000;
    
    const inputCost = totalInputTokens * pricing.costPer1kTokens.input;
    const outputCost = totalOutputTokens * pricing.costPer1kTokens.output;
    const modelApiCost = inputCost + outputCost;
    
    const modelUserCost = modelApiCost * (1 + pricing.platformMarkup);
    
    console.log(`Model: ${model.displayName} (${model.id})`, {
      category: pricing.costCategory,
      responseTokensPerRound,
      totalInputTokens: totalInputTokens * 1000,
      totalOutputTokens: totalOutputTokens * 1000,
      inputRate: pricing.costPer1kTokens.input,
      outputRate: pricing.costPer1kTokens.output,
      inputCost,
      outputCost,
      modelApiCost,
      platformMarkup: pricing.platformMarkup,
      modelUserCost,
      breakdown: {
        inputCostExplained: `${totalInputTokens}k × $${pricing.costPer1kTokens.input} = $${inputCost.toFixed(4)}`,
        outputCostExplained: `${totalOutputTokens}k × $${pricing.costPer1kTokens.output} = $${outputCost.toFixed(4)}`
      }
    });
    
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
      console.log('Calculating judge cost...');
      
      // Judge reviews the final round's responses
      const finalRoundResponses = models.length;
      const judgeInputChars = promptChars + (finalRoundResponses * 1000 * 3); // Estimate 1000 tokens per response to review
      const judgeInputTokens = (systemPromptTokens + Math.ceil(judgeInputChars / 3)) / 1000;
      const judgeOutputTokens = 0.5; // Judge writes ~500 token analysis
      
      const judgeInputCost = judgeInputTokens * judgePricing.costPer1kTokens.input;
      const judgeOutputCost = judgeOutputTokens * judgePricing.costPer1kTokens.output;
      const judgeApiCost = judgeInputCost + judgeOutputCost;
      const judgeUserCost = judgeApiCost * (1 + judgePricing.platformMarkup);
      
      console.log(`Judge: ${judgeModel.displayName}`, {
        inputTokens: judgeInputTokens * 1000,
        outputTokens: judgeOutputTokens * 1000,
        apiCost: judgeApiCost,
        userCost: judgeUserCost
      });
      
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

  console.log('Final calculation:', {
    totalApiCost,
    platformFee,
    totalCost,
    breakdown
  });
  console.log('=== END COST CALCULATION ===');

  return {
    apiCost: totalApiCost,
    platformFee,
    totalCost,
    breakdown
  };
}

export function getCostEmoji(category: ModelPricing['costCategory']): string {
  switch (category) {
    case 'budget': return '🟢';
    case 'standard': return '🔵';
    case 'premium': return '🟣';
    case 'luxury': return '⚫';
  }
}

export function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return '$0.00';
  if (cost === 0) return 'Free';
  if (cost < 0.01) return `$${(cost * 100).toFixed(2)}¢`;
  return `$${cost.toFixed(3)}`;
}