import { Model, DebateConfig, ModelStrength } from '@/types/debate';

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
  
  // Token estimation varies by debate style
  const tokensPerRound: number[] = [];
  const totalTokensByRound: number[] = [];
  
  let cumulativeTokens = initialTokens;
  
  for (let round = 1; round <= config.rounds; round++) {
    let avgResponseTokens: number;
    
    if (config.style === 'adversarial') {
      // Adversarial: Responses get longer and more detailed as models defend positions
      if (round === 1) {
        avgResponseTokens = 500; // Initial position
      } else if (round === 2) {
        avgResponseTokens = 600; // Rebuttals and counter-arguments
      } else {
        avgResponseTokens = 650; // Deep argumentation, citations, edge cases
      }
    } else {
      // Consensus-seeking: Responses get shorter and more focused as they converge
      if (round === 1) {
        avgResponseTokens = 500; // Initial diverse perspectives
      } else if (round === 2) {
        avgResponseTokens = 400; // Building on others' ideas
      } else {
        avgResponseTokens = 300; // Focused convergence toward solution
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