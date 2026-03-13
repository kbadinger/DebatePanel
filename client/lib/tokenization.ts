import { Model } from '@/types/debate';

// Response length options for user control
export type ResponseLength = 'concise' | 'standard' | 'detailed' | 'comprehensive';

export interface ResponseLengthConfig {
  label: string;
  description: string;
  targetTokens: number;
  maxTokens: number;
  costMultiplier: number; // relative to standard
}

export const RESPONSE_LENGTH_OPTIONS: Record<ResponseLength, ResponseLengthConfig> = {
  concise: {
    label: 'Concise',
    description: 'Brief, focused responses (200-300 tokens)',
    targetTokens: 250,
    maxTokens: 300,
    costMultiplier: 0.4
  },
  standard: {
    label: 'Standard',
    description: 'Balanced depth and brevity (500-750 tokens)',
    targetTokens: 600,
    maxTokens: 750,
    costMultiplier: 1.0
  },
  detailed: {
    label: 'Detailed',
    description: 'Comprehensive analysis (1000-1500 tokens)',
    targetTokens: 1200,
    maxTokens: 1500,
    costMultiplier: 2.0
  },
  comprehensive: {
    label: 'Comprehensive',
    description: 'In-depth exploration (2000+ tokens)',
    targetTokens: 2500,
    maxTokens: 3000,
    costMultiplier: 4.0
  }
};

// Model-specific token estimation functions
export function estimateTokens(text: string, provider?: string): number {
  if (!text) return 0;

  // Provider-specific estimation (more accurate than generic 4 chars per token)
  switch (provider) {
    case 'openai':
      // OpenAI models: roughly 3.2 characters per token for English
      return Math.ceil(text.length / 3.2);
    
    case 'anthropic':
      // Claude models: roughly 3.5 characters per token
      return Math.ceil(text.length / 3.5);
    
    case 'google':
      // Gemini models: roughly 3.8 characters per token
      return Math.ceil(text.length / 3.8);
    
    case 'deepseek':
    case 'mistral':
    case 'meta':
      // These models typically align with OpenAI tokenization
      return Math.ceil(text.length / 3.2);
    
    case 'xai':
    case 'perplexity':
      // Grok and Perplexity: roughly 3.6 characters per token
      return Math.ceil(text.length / 3.6);
    
    default:
      // Generic estimation: 4 characters per token (conservative)
      return Math.ceil(text.length / 4);
  }
}

// Calculate system prompt tokens based on debate configuration
export function calculateSystemPromptTokens(
  model: Model,
  debateStyle: 'consensus-seeking' | 'adversarial',
  round: number,
  hasContext: boolean = false
): number {
  let baseTokens = 200; // Base system prompt

  // Style-specific additions
  if (debateStyle === 'adversarial') {
    baseTokens += 150; // Additional adversarial instructions
  } else {
    baseTokens += 100; // Additional consensus-seeking instructions
  }

  // Round-specific additions
  if (round > 1) {
    baseTokens += 80; // Instructions for later rounds
  }

  // Context-aware additions
  if (hasContext) {
    baseTokens += 50; // Previous responses context instructions
  }

  // Model-specific role assignments add tokens
  if (model.contextInfo?.suggestedRole) {
    baseTokens += 100;
  }

  return baseTokens;
}

// Calculate context accumulation for multi-round debates
export function calculateContextTokens(
  previousRounds: Array<{ responses: Array<{ content: string; modelId: string }> }>,
  currentRound: number,
  provider: string
): number {
  let contextTokens = 0;

  // Add tokens from all previous rounds
  for (let i = 0; i < Math.min(previousRounds.length, currentRound - 1); i++) {
    const round = previousRounds[i];
    
    for (const response of round.responses) {
      // Add response content tokens
      contextTokens += estimateTokens(response.content, provider);
      
      // Add formatting tokens (speaker labels, separators)
      contextTokens += 10;
    }
    
    // Add round separator tokens
    contextTokens += 5;
  }

  // Context compression for older rounds (models summarize old content)
  if (previousRounds.length > 2) {
    const compressionRatio = Math.max(0.3, 1 - (previousRounds.length - 2) * 0.1);
    contextTokens *= compressionRatio;
  }

  return Math.ceil(contextTokens);
}

// Estimate total tokens for a model response including context
export function estimateResponseTokens(
  model: Model,
  topic: string,
  description: string,
  debateStyle: 'consensus-seeking' | 'adversarial',
  round: number,
  previousRounds: Array<{ responses: Array<{ content: string; modelId: string }> }>,
  responseLength: ResponseLength
): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  breakdown: {
    systemPrompt: number;
    topic: number;
    description: number;
    context: number;
    expectedOutput: number;
  };
} {
  const provider = model.provider;
  
  // Calculate input token components
  const systemPromptTokens = calculateSystemPromptTokens(model, debateStyle, round, previousRounds.length > 0);
  const topicTokens = estimateTokens(topic, provider);
  const descriptionTokens = estimateTokens(description || '', provider);
  const contextTokens = calculateContextTokens(previousRounds, round, provider);
  
  const inputTokens = systemPromptTokens + topicTokens + descriptionTokens + contextTokens;
  
  // Calculate expected output tokens based on response length setting
  const responseConfig = RESPONSE_LENGTH_OPTIONS[responseLength];
  const expectedOutputTokens = responseConfig.targetTokens;
  
  return {
    inputTokens,
    outputTokens: expectedOutputTokens,
    totalTokens: inputTokens + expectedOutputTokens,
    breakdown: {
      systemPrompt: systemPromptTokens,
      topic: topicTokens,
      description: descriptionTokens,
      context: contextTokens,
      expectedOutput: expectedOutputTokens
    }
  };
}

// Check if a model will exceed its context limit
export function checkContextLimit(
  model: Model,
  estimatedTokens: number
): {
  willExceed: boolean;
  usagePercentage: number;
  warningLevel: 'safe' | 'caution' | 'warning' | 'critical';
  recommendation: string;
} {
  const contextLimit = model.contextInfo?.maxTokens || 128000;
  const usagePercentage = (estimatedTokens / contextLimit) * 100;
  
  let warningLevel: 'safe' | 'caution' | 'warning' | 'critical' = 'safe';
  let recommendation = '';
  
  if (usagePercentage > 95) {
    warningLevel = 'critical';
    recommendation = 'Will exceed context limit. Choose shorter response length or fewer rounds.';
  } else if (usagePercentage > 80) {
    warningLevel = 'warning';
    recommendation = 'High context usage. Consider reducing response length or rounds.';
  } else if (usagePercentage > 50) {
    warningLevel = 'caution';
    recommendation = 'Moderate context usage. Monitor for longer debates.';
  } else {
    warningLevel = 'safe';
    recommendation = 'Safe context usage.';
  }
  
  return {
    willExceed: usagePercentage > 95,
    usagePercentage: Math.round(usagePercentage),
    warningLevel,
    recommendation
  };
}

// Calculate cost based on actual token usage
export function calculateTokenCost(
  model: Model,
  inputTokens: number,
  outputTokens: number
): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  platformFee: number;
  userCost: number;
} {
  // Import pricing data (we'll need to access this)
  const modelPricing = {
    // We'll need to import from pricing.ts or pass it in
    costPer1kTokens: {
      input: 0.003, // Default fallback
      output: 0.015
    },
    platformMarkup: 0.3
  };
  
  // TODO: Get actual pricing from MODEL_PRICING lookup
  const inputCost = (inputTokens / 1000) * modelPricing.costPer1kTokens.input;
  const outputCost = (outputTokens / 1000) * modelPricing.costPer1kTokens.output;
  const totalCost = inputCost + outputCost;
  const platformFee = totalCost * modelPricing.platformMarkup;
  const userCost = totalCost + platformFee;
  
  return {
    inputCost,
    outputCost,
    totalCost,
    platformFee,
    userCost
  };
}

// Format token counts for display
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens}`;
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
}

// Format cost estimate for display
export function formatTokenCost(cost: number): string {
  if (cost < 0.001) {
    return `~$${(cost * 1000).toFixed(2)}‰`; // Per mille symbol for very small costs
  } else if (cost < 0.01) {
    return `~$${(cost * 100).toFixed(2)}¢`;
  } else {
    return `~$${cost.toFixed(3)}`;
  }
}