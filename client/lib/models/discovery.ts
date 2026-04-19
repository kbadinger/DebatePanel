export interface DiscoveredModel {
  id: string;
  provider: string;
  displayName: string;
  verified: boolean;
  deprecated?: boolean;
  context_length?: number;
  lastTested?: string;
}

export interface ModelDiscoveryResult {
  provider: string;
  models: DiscoveredModel[];
  error?: string;
  lastUpdated: string;
}

/**
 * Discovers available models from each AI provider programmatically
 * This replaces our manual model configuration with real-time discovery
 */
export class ModelDiscovery {
  private cache = new Map<string, ModelDiscoveryResult>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Discover all available models from OpenAI
   */
  async discoverOpenAIModels(): Promise<ModelDiscoveryResult> {
    const cacheKey = 'openai';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // OpenAI provides a models endpoint
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const models: DiscoveredModel[] = data.data
        .filter((model: any) => {
          // Filter to relevant chat models
          return model.id.includes('gpt') || 
                 model.id.includes('o1') || 
                 model.id.includes('o3') ||
                 model.id.includes('o4');
        })
        .map((model: any) => ({
          id: model.id,
          provider: 'openai',
          displayName: this.formatModelName(model.id),
          verified: true,
          deprecated: false,
          lastTested: new Date().toISOString(),
        }));

      const result = {
        provider: 'openai',
        models,
        lastUpdated: new Date().toISOString(),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        provider: 'openai',
        models: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Discover available models from Anthropic using their /v1/models API
   * Note: Anthropic DOES have a models endpoint! SDK types were wrong.
   */
  async discoverAnthropicModels(): Promise<ModelDiscoveryResult> {
    const cacheKey = 'anthropic';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Use Anthropic's /v1/models endpoint - the ONLY reliable source
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models: DiscoveredModel[] = [];

      // Process each model from the API
      for (const apiModel of data.data) {
        // Test the model to ensure it actually works
        try {
          const isWorking = await this.testAnthropicModel(apiModel.id);
          models.push({
            id: apiModel.id,
            provider: 'anthropic',
            displayName: apiModel.display_name || this.formatModelName(apiModel.id),
            verified: isWorking,
            deprecated: false,
            lastTested: new Date().toISOString(),
          });
        } catch (error) {
          console.log(`Anthropic model ${apiModel.id} test failed: ${error}`);
          // Still add it but mark as unverified
          models.push({
            id: apiModel.id,
            provider: 'anthropic',
            displayName: apiModel.display_name || this.formatModelName(apiModel.id),
            verified: false,
            deprecated: false,
            lastTested: new Date().toISOString(),
          });
        }
      }

      const result = {
        provider: 'anthropic',
        models,
        lastUpdated: new Date().toISOString(),
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Failed to discover Anthropic models:', error);
      return {
        provider: 'anthropic',
        models: [],
        error: `Failed to discover models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Test if an Anthropic model actually works
   */
  private async testAnthropicModel(modelId: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Discover available models from Google (Gemini)
   */
  async discoverGoogleModels(): Promise<ModelDiscoveryResult> {
    const cacheKey = 'google';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Google has a models endpoint - use v1beta as suggested
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_API_KEY}`);
      
      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();
      const models: DiscoveredModel[] = data.models
        .filter((model: any) => {
          // Filter to text generation models
          return model.name.includes('gemini') && 
                 model.supportedGenerationMethods?.includes('generateContent');
        })
        .map((model: any) => ({
          id: model.name.replace('models/', ''),
          provider: 'google',
          displayName: this.formatModelName(model.name.replace('models/', '')),
          verified: true,
          deprecated: false,
          context_length: model.inputTokenLimit,
          lastTested: new Date().toISOString(),
        }));

      const result = {
        provider: 'google',
        models,
        lastUpdated: new Date().toISOString(),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        provider: 'google',
        models: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Discover available models from xAI (Grok) using their /v1/models API
   */
  async discoverXAIModels(): Promise<ModelDiscoveryResult> {
    const cacheKey = 'xai';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Use xAI's /v1/models endpoint
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models: DiscoveredModel[] = [];

      // Filter to only text/chat models (exclude image models for now)
      const chatModels = data.data.filter((model: any) => 
        !model.id.includes('image') && !model.id.includes('vision')
      );

      for (const apiModel of chatModels) {
        models.push({
          id: apiModel.id,
          provider: 'xai',
          displayName: this.formatModelName(apiModel.id),
          verified: true, // Assume xAI models work if listed
          deprecated: false,
          lastTested: new Date().toISOString(),
        });
      }

      const result = {
        provider: 'xai',
        models,
        lastUpdated: new Date().toISOString(),
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Failed to discover xAI models:', error);
      return {
        provider: 'xai',
        models: [],
        error: `Failed to discover models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Discover available models from Mistral (based on documentation)
   */
  async discoverMistralModels(): Promise<ModelDiscoveryResult> {
    const cacheKey = 'mistral';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Based on https://docs.mistral.ai/getting-started/models/models_overview/
      const knownMistralModels = [
        'mistral-large-latest',
        'mistral-small-latest',
        'pixtral-large-latest',
        'ministral-8b-latest',
        'ministral-3b-latest',
        'open-mistral-7b',
        'open-mixtral-8x7b',
        'open-mixtral-8x22b',
      ];

      const models: DiscoveredModel[] = knownMistralModels.map(modelId => ({
        id: modelId,
        provider: 'mistral',
        displayName: this.formatModelName(modelId),
        verified: true, // Assume working based on documentation
        deprecated: false,
        lastTested: new Date().toISOString(),
      }));

      const result = {
        provider: 'mistral',
        models,
        lastUpdated: new Date().toISOString(),
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Failed to discover Mistral models:', error);
      return {
        provider: 'mistral',
        models: [],
        error: `Failed to discover models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Discover available models from Perplexity (based on documentation)
   */
  async discoverPerplexityModels(): Promise<ModelDiscoveryResult> {
    const cacheKey = 'perplexity';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Based on https://docs.perplexity.ai/getting-started/models
      const knownPerplexityModels = [
        'sonar-pro',
        'sonar-reasoning-pro',
        'sonar-deep-research',
      ];

      const models: DiscoveredModel[] = knownPerplexityModels.map(modelId => ({
        id: modelId,
        provider: 'perplexity',
        displayName: this.formatModelName(modelId),
        verified: true, // Assume working based on documentation
        deprecated: false,
        lastTested: new Date().toISOString(),
      }));

      const result = {
        provider: 'perplexity',
        models,
        lastUpdated: new Date().toISOString(),
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Failed to discover Perplexity models:', error);
      return {
        provider: 'perplexity',
        models: [],
        error: `Failed to discover models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Discover available models from AIML API (Kimi)
   */
  async discoverAIMLModels(): Promise<ModelDiscoveryResult> {
    const cacheKey = 'aiml';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Based on https://docs.aimlapi.com/api-references/text-models-llm/moonshot/kimi-k2-preview
      const knownAIMLModels = [
        'kimi-k2-preview',
        'kimi-k1.5',
      ];

      const models: DiscoveredModel[] = knownAIMLModels.map(modelId => ({
        id: modelId,
        provider: 'aiml',
        displayName: this.formatModelName(modelId),
        verified: true, // Assume working based on documentation
        deprecated: false,
        lastTested: new Date().toISOString(),
      }));

      const result = {
        provider: 'aiml',
        models,
        lastUpdated: new Date().toISOString(),
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Failed to discover AIML models:', error);
      return {
        provider: 'aiml',
        models: [],
        error: `Failed to discover models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Discover all models from all providers
   */
  async discoverAllModels(): Promise<ModelDiscoveryResult[]> {
    const results = await Promise.allSettled([
      this.discoverOpenAIModels(),
      this.discoverAnthropicModels(),
      this.discoverGoogleModels(),
      this.discoverXAIModels(),
      this.discoverMistralModels(),
      this.discoverPerplexityModels(),
      this.discoverAIMLModels(),
    ]);

    return results
      .filter((result): result is PromiseFulfilledResult<ModelDiscoveryResult> => 
        result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Format model ID into display name
   */
  private formatModelName(modelId: string): string {
    // Convert model IDs to readable names
    const nameMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-5': 'GPT-5',
      'o1': 'o1',
      'o1-mini': 'o1 Mini',
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (Oct 2024)',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku (Oct 2024)',
      'claude-opus-4-1-20250805': 'Claude Opus 4.1 (Aug 2025)',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
    };

    return nameMap[modelId] || this.autoFormatModelName(modelId);
  }

  private autoFormatModelName(modelId: string): string {
    return modelId
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): ModelDiscoveryResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - new Date(cached.lastUpdated).getTime();
    if (age > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  private setCache(key: string, result: ModelDiscoveryResult): void {
    this.cache.set(key, result);
  }

  /**
   * Clear cache for fresh discovery
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const modelDiscovery = new ModelDiscovery();

// Convenience function for API routes
export async function getLatestModels(forceRefresh = false): Promise<ModelDiscoveryResult[]> {
  if (forceRefresh) {
    modelDiscovery.clearCache();
  }
  return await modelDiscovery.discoverAllModels();
}