/**
 * API-First Model Discovery System
 *
 * This module queries provider APIs directly to discover available models,
 * verify they work, and generate configuration code automatically.
 */

import { ModelProvider } from '@/types/debate';

export interface DiscoveredModel {
  id: string;
  apiName: string;
  displayName: string;
  provider: ModelProvider;
  contextWindow?: number;
  verified: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ProviderDiscoveryResult {
  provider: ModelProvider;
  models: DiscoveredModel[];
  error?: string;
  timestamp: Date;
}

/**
 * OpenAI API Discovery
 * Uses the /v1/models endpoint to list available models
 */
export async function discoverOpenAIModels(): Promise<ProviderDiscoveryResult> {
  const provider: ModelProvider = 'openai';
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      provider,
      models: [],
      error: 'OPENAI_API_KEY not configured',
      timestamp: new Date()
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models: DiscoveredModel[] = [];

    // Filter for text generation models (gpt, o1, o3, etc.)
    const textModels = data.data.filter((m: any) =>
      m.id.startsWith('gpt-') ||
      m.id.startsWith('o1') ||
      m.id.startsWith('o3') ||
      m.id.startsWith('o4')
    );

    for (const model of textModels) {
      models.push({
        id: model.id,
        apiName: model.id,
        displayName: formatModelName(model.id),
        provider,
        verified: true,
        metadata: {
          created: model.created,
          ownedBy: model.owned_by
        }
      });
    }

    return {
      provider,
      models,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      provider,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

/**
 * Anthropic API Discovery
 * Note: Anthropic doesn't have a models list endpoint, so we use a known list
 * and verify each model works
 */
export async function discoverAnthropicModels(): Promise<ProviderDiscoveryResult> {
  const provider: ModelProvider = 'anthropic';
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      provider,
      models: [],
      error: 'ANTHROPIC_API_KEY not configured',
      timestamp: new Date()
    };
  }

  // Known Claude models - we'll verify these exist
  const knownModels = [
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307'
  ];

  const models: DiscoveredModel[] = [];

  for (const modelId of knownModels) {
    try {
      // Verify model works with a minimal API call
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      const verified = response.ok || response.status === 400; // 400 means model exists but request invalid

      models.push({
        id: modelId,
        apiName: modelId,
        displayName: formatModelName(modelId),
        provider,
        verified,
        error: !verified ? `HTTP ${response.status}` : undefined
      });
    } catch (error) {
      models.push({
        id: modelId,
        apiName: modelId,
        displayName: formatModelName(modelId),
        provider,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    provider,
    models,
    timestamp: new Date()
  };
}

/**
 * Google/Gemini API Discovery
 */
export async function discoverGoogleModels(): Promise<ProviderDiscoveryResult> {
  const provider: ModelProvider = 'google';
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return {
      provider,
      models: [],
      error: 'GOOGLE_AI_API_KEY not configured',
      timestamp: new Date()
    };
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models: DiscoveredModel[] = [];

    // Filter for Gemini models
    const geminiModels = data.models?.filter((m: any) =>
      m.name.includes('gemini')
    ) || [];

    for (const model of geminiModels) {
      const modelName = model.name.replace('models/', '');
      models.push({
        id: modelName,
        apiName: modelName,
        displayName: formatModelName(modelName),
        provider,
        verified: true,
        metadata: {
          supportedGenerationMethods: model.supportedGenerationMethods,
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit
        }
      });
    }

    return {
      provider,
      models,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      provider,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

/**
 * X.AI (Grok) API Discovery
 * Uses OpenAI-compatible API
 */
export async function discoverXAIModels(): Promise<ProviderDiscoveryResult> {
  const provider: ModelProvider = 'xai';
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return {
      provider,
      models: [],
      error: 'XAI_API_KEY not configured',
      timestamp: new Date()
    };
  }

  try {
    const response = await fetch('https://api.x.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`X.AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models: DiscoveredModel[] = [];

    // Filter for Grok models
    const grokModels = data.data?.filter((m: any) =>
      m.id.includes('grok')
    ) || [];

    for (const model of grokModels) {
      models.push({
        id: model.id,
        apiName: model.id,
        displayName: formatModelName(model.id),
        provider,
        verified: true,
        metadata: model
      });
    }

    return {
      provider,
      models,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      provider,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

/**
 * DeepSeek API Discovery
 * Uses OpenAI-compatible API
 */
export async function discoverDeepSeekModels(): Promise<ProviderDiscoveryResult> {
  const provider: ModelProvider = 'deepseek';
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return {
      provider,
      models: [],
      error: 'DEEPSEEK_API_KEY not configured',
      timestamp: new Date()
    };
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models: DiscoveredModel[] = [];

    for (const model of data.data || []) {
      models.push({
        id: model.id,
        apiName: model.id,
        displayName: formatModelName(model.id),
        provider,
        verified: true,
        metadata: model
      });
    }

    return {
      provider,
      models,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      provider,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

/**
 * Discover models from all providers
 */
export async function discoverAllModels(): Promise<ProviderDiscoveryResult[]> {
  const results = await Promise.all([
    discoverOpenAIModels(),
    discoverAnthropicModels(),
    discoverGoogleModels(),
    discoverXAIModels(),
    discoverDeepSeekModels()
  ]);

  return results;
}

/**
 * Helper to format model IDs into display names
 */
function formatModelName(modelId: string): string {
  // Handle Claude models
  if (modelId.startsWith('claude-')) {
    const parts = modelId.split('-');
    const tier = parts[1]; // opus, sonnet, haiku
    const version = parts[2]; // 3, 4, etc
    const date = parts[3]; // YYYYMMDD

    return `Claude ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${version}${date ? ` (${formatDate(date)})` : ''}`;
  }

  // Handle GPT models
  if (modelId.startsWith('gpt-')) {
    return modelId.toUpperCase().replace('-', ' ').replace('GPT ', 'GPT-');
  }

  // Handle Gemini models
  if (modelId.startsWith('gemini-')) {
    return modelId.split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }

  // Handle Grok models
  if (modelId.includes('grok')) {
    return modelId.split('-').map((part, i) =>
      i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part
    ).join(' ');
  }

  // Default: capitalize first letter of each word
  return modelId.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Helper to format date strings from model IDs
 */
function formatDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[parseInt(month) - 1] || month;

  return `${monthName} ${year}`;
}

/**
 * Compare discovered models against current configuration
 */
export function compareWithConfig(
  discovered: ProviderDiscoveryResult[],
  configuredModelIds: string[]
): {
  missing: DiscoveredModel[];  // In config but not discovered (DEPRECATED)
  new: DiscoveredModel[];      // Discovered but not in config
  matched: DiscoveredModel[];  // In both
  deprecated: DiscoveredModel[];  // Models that should be retired
} {
  const configSet = new Set(configuredModelIds);
  const allDiscovered = discovered.flatMap(r => r.models);
  const discoveredSet = new Set(allDiscovered.map(m => m.id));

  const missing = configuredModelIds
    .filter(id => !discoveredSet.has(id))
    .map(id => ({
      id,
      apiName: id,
      displayName: formatModelName(id),
      provider: 'openai' as ModelProvider, // Default, might be wrong
      verified: false,
      error: 'Not found in API discovery'
    }));

  const newModels = allDiscovered.filter(m => !configSet.has(m.id) && m.verified);
  const matched = allDiscovered.filter(m => configSet.has(m.id));

  // Models that are deprecated: in config but failed verification
  const deprecated = missing.filter(m => {
    // Check if model consistently fails across multiple providers
    const relatedResults = discovered.filter(r =>
      r.models.some(rm => rm.id === m.id && !rm.verified)
    );
    return relatedResults.length > 0;
  });

  return { missing, new: newModels, matched, deprecated };
}

/**
 * Generate TypeScript configuration code for new models
 */
export function generateConfigCode(models: DiscoveredModel[]): string {
  if (models.length === 0) return '// No new models to add';

  const code: string[] = [];

  code.push('// New models discovered - add to FEATURED_MODELS or EXPANDABLE_MODELS:');
  code.push('');

  for (const model of models) {
    code.push(`withModelInfo({`);
    code.push(`  id: '${model.id}',`);
    code.push(`  provider: '${model.provider}',`);
    code.push(`  name: '${model.apiName}',`);
    code.push(`  displayName: '${model.displayName}'`);
    code.push(`}),`);
    code.push('');
  }

  return code.join('\n');
}