import { Model, DebateConfig, ModelStrength } from '@/types/debate';
import { RESPONSE_LENGTH_OPTIONS } from '@/lib/tokenization';

// Rough token estimation for text (approximately 4 characters per token)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Calculate estimated context usage for a debate
export function calculateContextRequirements(config: DebateConfig): {
  initialTokens: number;
  tokensPerRound: number[];
  totalTokensByRound: number[];
  warnings: Array<{
    modelId: string;
    modelName: string;
    warning: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
} {
  // Base context: topic + description + system prompt
  const topicTokens = estimateTokens(config.topic);
  const descriptionTokens = estimateTokens(config.description || '');
  const systemPromptTokens = 1000; // Approximate system prompt size (higher for role-based prompts)
  const initialTokens = topicTokens + descriptionTokens + systemPromptTokens;
  
  // Get response length configuration
  const responseLength = config.responseLength || 'standard';
  const responseConfig = RESPONSE_LENGTH_OPTIONS[responseLength];
  
  // Token estimation varies by debate style
  const tokensPerRound: number[] = [];
  const totalTokensByRound: number[] = [];
  
  let cumulativeTokens = initialTokens;
  
  for (let round = 1; round <= config.rounds; round++) {
    let avgResponseTokens: number;
    
    // Base response length on user's setting
    const baseTokens = responseConfig.targetTokens;
    
    if (config.style === 'adversarial') {
      // Adversarial: Responses get longer and more detailed as models defend positions
      if (round === 1) {
        avgResponseTokens = baseTokens; // Initial position at target length
      } else if (round === 2) {
        avgResponseTokens = Math.min(baseTokens * 1.2, responseConfig.maxTokens); // 20% longer for rebuttals
      } else {
        avgResponseTokens = Math.min(baseTokens * 1.3, responseConfig.maxTokens); // 30% longer for deep argumentation
      }
    } else {
      // Consensus-seeking: Responses get shorter and more focused as they converge
      if (round === 1) {
        avgResponseTokens = baseTokens; // Initial diverse perspectives at target length
      } else if (round === 2) {
        avgResponseTokens = Math.max(baseTokens * 0.8, 200); // 20% shorter for building on ideas
      } else {
        avgResponseTokens = Math.max(baseTokens * 0.6, 150); // 40% shorter for focused convergence
      }
    }
    
    const roundTokens = config.models.length * avgResponseTokens;
    tokensPerRound.push(roundTokens);
    
    cumulativeTokens += roundTokens;
    totalTokensByRound.push(cumulativeTokens);
  }
  
  // Generate warnings for models that might exceed context limits
  const warnings: Array<{
    modelId: string;
    modelName: string;
    warning: string;
    severity: 'info' | 'warning' | 'critical';
  }> = [];
  
  config.models.forEach(model => {
    const maxTokens = model.contextInfo?.maxTokens || 128000;
    const finalRoundTokens = totalTokensByRound[config.rounds - 1];

    // Skip warnings for unlimited context models
    if (maxTokens === Infinity) {
      // Optional: Add info message for unlimited models
      warnings.push({
        modelId: model.id,
        modelName: model.displayName,
        warning: `Unlimited context - can handle very long debates`,
        severity: 'info'
      });
      return;
    }

    if (finalRoundTokens > maxTokens) {
      const exceedsAtRound = totalTokensByRound.findIndex(tokens => tokens > maxTokens) + 1;
      warnings.push({
        modelId: model.id,
        modelName: model.displayName,
        warning: `May exceed context limit at round ${exceedsAtRound}`,
        severity: 'critical'
      });
    } else if (finalRoundTokens > maxTokens * 0.8) {
      warnings.push({
        modelId: model.id,
        modelName: model.displayName,
        warning: `Will use ${Math.round((finalRoundTokens / maxTokens) * 100)}% of context window`,
        severity: 'warning'
      });
    } else if (finalRoundTokens > maxTokens * 0.5) {
      warnings.push({
        modelId: model.id,
        modelName: model.displayName,
        warning: `Will use ${Math.round((finalRoundTokens / maxTokens) * 100)}% of context window`,
        severity: 'info'
      });
    }
  });
  
  return {
    initialTokens,
    tokensPerRound,
    totalTokensByRound,
    warnings
  };
}

// Analyze panel diversity and suggest improvements
export function analyzePanelDiversity(models: Model[]): {
  strengths: Record<ModelStrength, number>;
  diversityScore: number; // 0-100
  warnings: Array<{
    type: 'missing_perspective' | 'too_similar' | 'good_diversity';
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  suggestions: string[];
} {
  if (models.length === 0) {
    return {
      strengths: {} as Record<ModelStrength, number>,
      diversityScore: 0,
      warnings: [{ type: 'missing_perspective', message: 'No models selected', severity: 'critical' }],
      suggestions: []
    };
  }
  
  // Count strength coverage
  const strengths: Record<ModelStrength, number> = {
    analytical: 0,
    creative: 0,
    ethical: 0,
    technical: 0,
    business: 0,
    research: 0,
    general: 0
  };
  
  models.forEach(model => {
    model.contextInfo?.strengths.forEach(strength => {
      strengths[strength]++;
    });
  });
  
  // Calculate diversity score
  const totalStrengths = Object.values(strengths).reduce((sum, count) => sum + count, 0);
  const uniqueStrengths = Object.values(strengths).filter(count => count > 0).length;
  const maxPossibleStrengths = Object.keys(strengths).length;
  const diversityScore = Math.round((uniqueStrengths / maxPossibleStrengths) * 100);
  
  // Generate warnings and suggestions
  const warnings: Array<{
    type: 'missing_perspective' | 'too_similar' | 'good_diversity';
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }> = [];
  
  const suggestions: string[] = [];
  
  // Check for missing key perspectives
  if (strengths.analytical === 0 && models.length > 1) {
    warnings.push({
      type: 'missing_perspective',
      message: 'No analytical/reasoning models selected',
      severity: 'warning'
    });
    suggestions.push('Add a reasoning model like o3, o1, or DeepSeek R1 for logical analysis');
  }
  
  if (strengths.creative === 0 && models.length > 2) {
    warnings.push({
      type: 'missing_perspective',
      message: 'No creative perspective models selected',
      severity: 'info'
    });
    suggestions.push('Consider adding Grok for unconventional thinking');
  }
  
  if (strengths.ethical === 0 && models.length > 2) {
    warnings.push({
      type: 'missing_perspective',
      message: 'No models with strong ethical reasoning selected',
      severity: 'info'
    });
    suggestions.push('Claude models excel at considering ethical implications');
  }
  
  // Check for too many similar models
  const providerCounts = models.reduce((acc, model) => {
    acc[model.provider] = (acc[model.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(providerCounts).forEach(([provider, count]) => {
    if (count > 2 && models.length > 3) {
      warnings.push({
        type: 'too_similar',
        message: `${count} models from ${provider} - may produce similar perspectives`,
        severity: 'warning'
      });
      suggestions.push(`Consider replacing one ${provider} model with a different provider`);
    }
  });
  
  // Check for good diversity
  if (diversityScore >= 70 && models.length >= 3) {
    warnings.push({
      type: 'good_diversity',
      message: 'Good diversity across different AI perspectives',
      severity: 'info'
    });
  }
  
  return {
    strengths,
    diversityScore,
    warnings,
    suggestions
  };
}

// Get smart recommendations for model combinations
export function getSmartRecommendations(
  config: Partial<DebateConfig>,
  availableModels: Model[]
): {
  recommended: Model[];
  reasoning: string;
} {
  const topic = config.topic?.toLowerCase() || '';
  const description = config.description?.toLowerCase() || '';
  const style = config.style || 'consensus-seeking';
  
  // Analyze topic for key themes
  const isFinancial = /financ|money|cost|revenue|profit|budget|price/.test(topic + ' ' + description);
  const isTechnical = /technical|software|code|programming|engineering|system/.test(topic + ' ' + description);
  const isEthical = /ethic|moral|right|wrong|should|ought|fair/.test(topic + ' ' + description);
  const isCreative = /creative|innovation|design|art|novel|unique/.test(topic + ' ' + description);
  const isResearch = /research|study|data|evidence|analyze|investigate/.test(topic + ' ' + description);
  
  let recommended: Model[] = [];
  let reasoning = '';
  
  if (style === 'consensus-seeking') {
    // For consensus-seeking, prioritize complementary strengths
    recommended = [
      availableModels.find(m => m.contextInfo?.strengths.includes('analytical')) || availableModels[0],
      availableModels.find(m => m.contextInfo?.strengths.includes('ethical')) || availableModels[1],
      availableModels.find(m => m.contextInfo?.strengths.includes('business')) || availableModels[2]
    ].filter(Boolean);
    
    reasoning = 'Balanced panel for collaborative problem-solving: analytical reasoning + ethical considerations + business perspective';
  } else {
    // For adversarial, prioritize diverse thinking styles
    recommended = [
      availableModels.find(m => m.contextInfo?.strengths.includes('analytical')) || availableModels[0],
      availableModels.find(m => m.contextInfo?.strengths.includes('creative')) || availableModels[1],
      availableModels.find(m => m.contextInfo?.strengths.includes('general')) || availableModels[2]
    ].filter(Boolean);
    
    reasoning = 'Diverse panel for rigorous debate: logical analysis vs creative thinking vs balanced perspective';
  }
  
  // Adjust based on topic
  if (isTechnical && availableModels.find(m => m.contextInfo?.strengths.includes('technical'))) {
    recommended[0] = availableModels.find(m => m.contextInfo?.strengths.includes('technical'))!;
    reasoning += ' + technical expertise for the topic';
  }
  
  if (isResearch && availableModels.find(m => m.contextInfo?.strengths.includes('research'))) {
    recommended[1] = availableModels.find(m => m.contextInfo?.strengths.includes('research'))!;
    reasoning += ' + research capabilities for evidence-based analysis';
  }
  
  return {
    recommended: recommended.slice(0, 3), // Limit to 3 recommendations
    reasoning
  };
}

// Calculate estimated debate duration and detect slow thinking models
export function calculateDebateDuration(config: DebateConfig): {
  estimatedMinutes: number;
  slowModels: Model[];
  warnings: Array<{
    message: string;
    severity: 'info' | 'warning' | 'critical';
    suggestion?: string;
  }>;
} {
  const slowModels = config.models.filter(m => m.contextInfo?.isSlowThinking);
  const warnings: Array<{
    message: string;
    severity: 'info' | 'warning' | 'critical';
    suggestion?: string;
  }> = [];

  if (slowModels.length === 0) {
    // No slow models, estimate ~1 minute per round (fast models running in parallel)
    return {
      estimatedMinutes: Math.ceil(config.rounds * 1),
      slowModels: [],
      warnings: []
    };
  }

  // Find slowest model (models run sequentially in current implementation)
  const slowestModel = slowModels.reduce((slowest, model) => {
    const currentTime = model.contextInfo?.avgTimePerRound || 30;
    const slowestTime = slowest.contextInfo?.avgTimePerRound || 30;
    return currentTime > slowestTime ? model : slowest;
  });

  const avgTimePerRound = slowestModel.contextInfo?.avgTimePerRound || 120;
  const totalSeconds = config.rounds * avgTimePerRound;
  const estimatedMinutes = Math.ceil(totalSeconds / 60);

  // Generate warnings based on estimated time
  if (estimatedMinutes > 15) {
    warnings.push({
      message: `Estimated ${estimatedMinutes} minutes - exceeds 15-minute proxy timeout`,
      severity: 'critical',
      suggestion: 'Stream will disconnect at 15 minutes, but polling will recover the result'
    });
  }

  if (config.rounds > 3 && slowModels.length > 0) {
    warnings.push({
      message: `Using ${slowModels.length} reasoning model${slowModels.length > 1 ? 's' : ''} (${slowModels.map(m => m.displayName).join(', ')}) with ${config.rounds} rounds`,
      severity: estimatedMinutes > 15 ? 'critical' : 'warning',
      suggestion: config.rounds > 3 ? 'Consider reducing to 3 or fewer rounds for faster results' : undefined
    });
  }

  // Info about specific slow models
  if (slowModels.some(m => m.id === 'gpt-5-pro')) {
    warnings.push({
      message: 'GPT-5 Pro uses advanced reasoning and takes ~6 minutes per round',
      severity: 'info',
      suggestion: 'High quality responses but slower than other models'
    });
  }

  return {
    estimatedMinutes,
    slowModels,
    warnings
  };
}