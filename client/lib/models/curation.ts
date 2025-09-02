/**
 * Model Curation System
 * 
 * Filters discovered models to show only CURRENT, RELEVANT models
 * No more 75 random OpenAI models - just the flagships!
 */

import { DiscoveredModel } from './discovery';

export interface CuratedModel extends DiscoveredModel {
  tier: 'flagship' | 'premium' | 'standard' | 'budget';
  category: 'reasoning' | 'creative' | 'general' | 'fast' | 'research';
  isRecommended: boolean;
  releaseDate?: Date;
  contextTokens?: number;
  costTier?: 'free' | 'cheap' | 'moderate' | 'expensive' | 'premium';
}

export interface ModelCurationRules {
  maxModelsPerProvider: number;
  minReleaseDate: Date;
  preferredTiers: string[];
  excludePatterns: string[];
  flagshipOnly: boolean;
}

/**
 * Curates discovered models to show only the best, most current options
 */
export class ModelCurator {
  
  private readonly DEFAULT_RULES: ModelCurationRules = {
    maxModelsPerProvider: 4, // Max 4 models per provider in UI
    minReleaseDate: new Date('2024-01-01'), // Nothing older than Jan 2024
    preferredTiers: ['flagship', 'premium', 'standard'],
    excludePatterns: [
      // Exclude old/deprecated models
      'turbo-instruct', '0613', '1106', '0125', '2024-04-09',
      
      // Exclude specialized non-chat models  
      'embedding', 'tts', 'whisper', 'dall-e', 'realtime', 'audio',
      'transcribe', 'image', 'search-preview',
      
      // Exclude preview/beta models
      'preview', '-preview', 'beta',
      
      // Exclude very old models
      '3.5-turbo', 'gpt-4-turbo', 'gpt-3'
    ],
    flagshipOnly: false
  };

  /**
   * Curate models based on rules
   */
  curateModels(models: DiscoveredModel[], rules: Partial<ModelCurationRules> = {}): CuratedModel[] {
    const finalRules = { ...this.DEFAULT_RULES, ...rules };
    
    console.log(`🎯 Curating models with rules:`, finalRules);
    
    // Step 1: Filter out unwanted models
    const filtered = models.filter(model => this.shouldIncludeModel(model, finalRules));
    console.log(`📝 Filtered ${models.length} → ${filtered.length} models`);
    
    // Step 2: Enrich with metadata
    const enriched = filtered.map(model => this.enrichModel(model));
    
    // Step 3: Sort by importance
    const sorted = enriched.sort(this.compareModelImportance);
    
    // Step 4: Limit per provider
    const limited = this.limitPerProvider(sorted, finalRules.maxModelsPerProvider);
    
    console.log(`✅ Final curated models: ${limited.length}`);
    return limited;
  }

  /**
   * Get only flagship models (the absolute best)
   */
  getFlagshipModels(models: DiscoveredModel[]): CuratedModel[] {
    return this.curateModels(models, {
      flagshipOnly: true,
      maxModelsPerProvider: 2, // Only top 2 per provider
    });
  }

  /**
   * Should we include this model?
   */
  private shouldIncludeModel(model: DiscoveredModel, rules: ModelCurationRules): boolean {
    // Must be verified working
    if (!model.verified) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of rules.excludePatterns) {
      if (model.id.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`🚫 Excluding ${model.id} - matches pattern: ${pattern}`);
        return false;
      }
    }

    // Check if it's a flagship model we definitely want
    if (this.isFlagshipModel(model)) {
      return true;
    }

    // For non-flagship, apply stricter rules
    if (rules.flagshipOnly) {
      return false;
    }

    return true;
  }

  /**
   * Is this a flagship model we definitely want?
   */
  private isFlagshipModel(model: DiscoveredModel): boolean {
    const flagshipPatterns = [
      // OpenAI flagships
      'gpt-5$', 'gpt-5-2025', 'o1$', 'o3$', 'gpt-4o$',
      
      // Anthropic flagships (all Claude 4 models)
      'claude-opus-4', 'claude-sonnet-4', 'claude-3-7-sonnet', 'claude-3-5-sonnet-20241022',
      
      // Google flagships
      'gemini-2.5-pro$', 'gemini-1.5-pro$',
      
      // X.AI flagships
      'grok-4', 'grok-3$',
      
      // Other flagships
      'sonar-pro$', 'deepseek-v3'
    ];

    return flagshipPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(model.id)
    );
  }

  /**
   * Add metadata to model
   */
  private enrichModel(model: DiscoveredModel): CuratedModel {
    const tier = this.getTier(model);
    const category = this.getCategory(model);
    const isRecommended = this.isRecommended(model);
    const releaseDate = this.guessReleaseDate(model);
    const contextTokens = this.guessContextTokens(model);
    const costTier = this.guessCostTier(model);

    return {
      ...model,
      tier,
      category,
      isRecommended,
      releaseDate,
      contextTokens,
      costTier
    };
  }

  /**
   * Determine model tier
   */
  private getTier(model: DiscoveredModel): CuratedModel['tier'] {
    if (this.isFlagshipModel(model)) return 'flagship';
    
    // Premium tier indicators
    if (model.id.includes('pro') || model.id.includes('opus') || model.id.includes('large')) {
      return 'premium';
    }
    
    // Budget tier indicators
    if (model.id.includes('mini') || model.id.includes('nano') || model.id.includes('haiku')) {
      return 'budget';
    }
    
    return 'standard';
  }

  /**
   * Determine model category
   */
  private getCategory(model: DiscoveredModel): CuratedModel['category'] {
    if (model.id.includes('o1') || model.id.includes('o3') || model.id.includes('reasoning')) {
      return 'reasoning';
    }
    if (model.id.includes('creative') || model.id.includes('grok')) {
      return 'creative';
    }
    if (model.id.includes('research') || model.id.includes('sonar')) {
      return 'research';
    }
    if (model.id.includes('flash') || model.id.includes('mini') || model.id.includes('haiku')) {
      return 'fast';
    }
    return 'general';
  }

  /**
   * Is this model recommended for most users?
   */
  private isRecommended(model: DiscoveredModel): boolean {
    // Flagship models are always recommended
    if (this.isFlagshipModel(model)) return true;
    
    // Popular, well-established models
    const recommendedIds = [
      'gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro'
    ];
    
    return recommendedIds.includes(model.id);
  }

  /**
   * Guess release date from model ID
   */
  private guessReleaseDate(model: DiscoveredModel): Date | undefined {
    // Look for date patterns in model ID
    const dateMatch = model.id.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Fallback dates based on known releases
    if (model.id.includes('gpt-5')) return new Date('2025-08-07');
    if (model.id.includes('claude-opus-4')) return new Date('2025-08-05');
    if (model.id.includes('gpt-4o')) return new Date('2024-05-13');
    
    return undefined;
  }

  /**
   * Guess context window size
   */
  private guessContextTokens(model: DiscoveredModel): number | undefined {
    if (model.context_length) return model.context_length;
    
    // Known context sizes
    const contextMap: Record<string, number> = {
      'gpt-5': 200000,
      'gpt-4o': 128000,
      'claude-opus-4': 200000,
      'claude-sonnet-4': 200000,
      'claude-3-7-sonnet': 200000,
      'claude-3-5-sonnet': 200000,
      'grok-4': 256000,
      'grok-3': 128000,
      'gemini-1.5-pro': 2000000,
      'gemini-2.5-pro': 2000000,
      'o1': 128000,
      'o3': 128000,
    };
    
    for (const [pattern, tokens] of Object.entries(contextMap)) {
      if (model.id.includes(pattern)) {
        return tokens;
      }
    }
    
    return undefined;
  }

  /**
   * Guess cost tier
   */
  private guessCostTier(model: DiscoveredModel): CuratedModel['costTier'] {
    if (model.id.includes('nano') || model.id.includes('mini')) return 'cheap';
    if (model.id.includes('gpt-5') || model.id.includes('opus-4')) return 'premium';
    if (model.id.includes('pro') || model.id.includes('large')) return 'expensive';
    if (model.id.includes('haiku') || model.id.includes('flash')) return 'moderate';
    return 'moderate';
  }

  /**
   * Compare model importance for sorting
   */
  private compareModelImportance = (a: CuratedModel, b: CuratedModel): number => {
    // 1. Flagship models first
    const tierOrder = { flagship: 0, premium: 1, standard: 2, budget: 3 };
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;
    
    // 2. Recommended models first
    if (a.isRecommended !== b.isRecommended) {
      return a.isRecommended ? -1 : 1;
    }
    
    // 3. Newer models first
    if (a.releaseDate && b.releaseDate) {
      return b.releaseDate.getTime() - a.releaseDate.getTime();
    }
    
    // 4. Larger context first
    if (a.contextTokens && b.contextTokens) {
      return b.contextTokens - a.contextTokens;
    }
    
    // 5. Alphabetical by display name
    return a.displayName.localeCompare(b.displayName);
  };

  /**
   * Limit models per provider
   */
  private limitPerProvider(models: CuratedModel[], maxPerProvider: number): CuratedModel[] {
    const providerCounts: Record<string, number> = {};
    const result: CuratedModel[] = [];
    
    for (const model of models) {
      const count = providerCounts[model.provider] || 0;
      
      if (count < maxPerProvider) {
        result.push(model);
        providerCounts[model.provider] = count + 1;
      }
    }
    
    return result;
  }

  /**
   * Get model recommendations for different use cases
   */
  getRecommendationsForUseCase(models: DiscoveredModel[], useCase: string): CuratedModel[] {
    const curated = this.curateModels(models);
    
    switch (useCase) {
      case 'business-decisions':
        return curated.filter(m => 
          m.category === 'reasoning' || 
          (m.category === 'general' && m.tier === 'flagship')
        ).slice(0, 3);
        
      case 'creative-writing':
        return curated.filter(m => 
          m.category === 'creative' || 
          (m.tier === 'flagship' && m.provider === 'anthropic')
        ).slice(0, 3);
        
      case 'technical-analysis':
        return curated.filter(m => 
          m.category === 'reasoning' || 
          m.id.includes('gpt-4o') || 
          m.id.includes('claude')
        ).slice(0, 4);
        
      case 'research':
        return curated.filter(m => 
          m.category === 'research' || 
          m.contextTokens && m.contextTokens > 100000
        ).slice(0, 3);
        
      default:
        return this.getFlagshipModels(models);
    }
  }
}

// Singleton instance
export const modelCurator = new ModelCurator();