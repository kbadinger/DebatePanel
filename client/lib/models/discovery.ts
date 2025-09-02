import { openai } from 'ai';
import { anthropic } from 'ai';
import { google } from 'ai';

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
   * Discover available models from Anthropic (Claude)
   * Note: Anthropic doesn't have a public models endpoint, so we test known patterns
   */
  async discoverAnthropicModels(): Promise<ModelDiscoveryResult> {
    const cacheKey = 'anthropic';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Known Claude model patterns to test
    const modelsToTest = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620', 
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
      // Test newer patterns
      'claude-4-opus-20250101',
      'claude-4-sonnet-20250101',
      'claude-opus-4-1-20250805', // Your missing model
    ];

    const models: DiscoveredModel[] = [];
    
    for (const modelId of modelsToTest) {
      try {
        const isWorking = await this.testAnthropicModel(modelId);
        if (isWorking) {
          models.push({
            id: modelId,
            provider: 'anthropic',
            displayName: this.formatModelName(modelId),
            verified: true,
            deprecated: false,
            lastTested: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Model doesn't work, skip it
        console.log(`Anthropic model ${modelId} not available: ${error}`);
      }
    }

    const result = {
      provider: 'anthropic',
      models,
      lastUpdated: new Date().toISOString(),
    };

    this.setCache(cacheKey, result);
    return result;
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
      // Google has a models endpoint
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GOOGLE_API_KEY}`);
      
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
   * Discover all models from all providers
   */
  async discoverAllModels(): Promise<ModelDiscoveryResult[]> {
    const results = await Promise.allSettled([
      this.discoverOpenAIModels(),
      this.discoverAnthropicModels(),
      this.discoverGoogleModels(),
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