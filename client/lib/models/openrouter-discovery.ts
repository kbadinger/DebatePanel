/**
 * OpenRouter Model Discovery System
 *
 * Uses OpenRouter's API to discover available models, pricing, and capabilities.
 * Classifies models into direct vs OpenRouter routing based on provider integration status.
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  created: number;
  context_length: number;
  pricing: {
    prompt: string;  // USD per token
    completion: string;
    request?: string;
    image?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated: boolean;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  supported_parameters?: string[];
}

export interface DiscoveredModel {
  id: string;
  provider: string;
  displayName: string;
  apiName: string;
  verified: boolean;
  contextLimit: number;
  pricing: {
    input: number;  // Per 1k tokens
    output: number;
  };
  supportedParameters: string[];
  metadata: {
    created?: number;
    description?: string;
    modality?: string;
  };
  routing: {
    recommended: 'direct' | 'openrouter';
    reasoning: string;
    hasDirectIntegration: boolean;
    estimatedMonthlyUsage?: string;
  };
}

export interface DiscoveryResult {
  provider: string;
  models: DiscoveredModel[];
  stats: {
    total: number;
    direct: number;
    openrouter: number;
    newProviders: string[];
  };
  lastUpdated: string;
  error?: string;
}

// Providers with direct API integrations
const DIRECT_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'xai',
  'deepseek',
  'perplexity'
];

// Providers considered "major" (worth direct integration if not already)
const MAJOR_PROVIDERS = [
  ...DIRECT_PROVIDERS,
  'meta',
  'mistral',
  'cohere'
];

/**
 * Fetch all models from OpenRouter API
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  OPENROUTER_API_KEY not set. Discovery will be limited.');
    return [];
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://debatepanel.com',
        'X-Title': 'DebatePanel Model Discovery'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error);
    throw error;
  }
}

/**
 * Detect provider from model ID
 * Examples:
 *   "openai/gpt-4o" → "openai"
 *   "anthropic/claude-3-opus" → "anthropic"
 *   "gpt-4o" → "openai"
 */
export function detectProvider(modelId: string): string | null {
  const id = modelId.toLowerCase();

  // Check for explicit provider prefix
  if (id.includes('/')) {
    const provider = id.split('/')[0];
    return provider;
  }

  // Pattern matching
  if (id.includes('gpt-') || id.includes('o1') || id.includes('o3') || id.includes('o4')) return 'openai';
  if (id.includes('claude')) return 'anthropic';
  if (id.includes('gemini')) return 'google';
  if (id.includes('grok')) return 'xai';
  if (id.includes('deepseek')) return 'deepseek';
  if (id.includes('llama')) return 'meta';
  if (id.includes('mistral') || id.includes('pixtral')) return 'mistral';
  if (id.includes('sonar')) return 'perplexity';
  if (id.includes('command')) return 'cohere';
  if (id.includes('kimi')) return 'kimi';
  if (id.includes('qwen')) return 'qwen';
  if (id.includes('yi-')) return 'yi';

  return null;
}

/**
 * Check if provider has direct API integration
 */
export function hasDirectIntegration(provider: string): boolean {
  return DIRECT_PROVIDERS.includes(provider.toLowerCase());
}

/**
 * Check if provider is considered major (worth direct integration)
 */
export function isMajorProvider(provider: string): boolean {
  return MAJOR_PROVIDERS.includes(provider.toLowerCase());
}

/**
 * Classify model routing strategy
 */
export function classifyRouting(
  provider: string,
  modelId: string,
  estimatedUsage?: number
): {
  recommended: 'direct' | 'openrouter';
  reasoning: string;
  markup: number;
} {
  const hasDirect = hasDirectIntegration(provider);
  const isMajor = isMajorProvider(provider);

  // Has direct integration - always use it
  if (hasDirect) {
    return {
      recommended: 'direct',
      reasoning: `Direct ${provider} API integration available. Best margins (30% markup).`,
      markup: 0.30
    };
  }

  // Major provider without integration - recommend building it
  if (isMajor && estimatedUsage && estimatedUsage > 500) {
    return {
      recommended: 'openrouter',
      reasoning: `Major provider (${provider}) with high usage (${estimatedUsage} debates/month). Consider direct integration for better margins. Using OpenRouter temporarily (40% markup).`,
      markup: 0.40
    };
  }

  // Major provider, low usage
  if (isMajor) {
    return {
      recommended: 'openrouter',
      reasoning: `Major provider (${provider}) via OpenRouter (40% markup). Monitor usage - if >500 debates/month, prioritize direct integration.`,
      markup: 0.40
    };
  }

  // Fringe model - OpenRouter is fine
  return {
    recommended: 'openrouter',
    reasoning: `Fringe provider (${provider}) via OpenRouter (50% markup). Direct integration not cost-effective at current usage levels.`,
    markup: 0.50
  };
}

/**
 * Convert OpenRouter pricing to per-1k-tokens format
 */
export function convertPricing(openRouterPricing: OpenRouterModel['pricing']) {
  return {
    input: parseFloat(openRouterPricing.prompt) * 1_000_000, // Convert per-token to per-1k
    output: parseFloat(openRouterPricing.completion) * 1_000_000
  };
}

/**
 * Infer cost category from pricing
 */
export function inferCostCategory(inputCostPer1k: number): 'budget' | 'standard' | 'premium' | 'luxury' | 'flagship' {
  if (inputCostPer1k < 0.001) return 'budget';
  if (inputCostPer1k < 0.005) return 'standard';
  if (inputCostPer1k < 0.015) return 'premium';
  if (inputCostPer1k < 0.030) return 'luxury';
  return 'flagship';
}

/**
 * Discover all models from OpenRouter and classify them
 */
export async function discoverModels(): Promise<DiscoveryResult> {
  try {
    const openRouterModels = await fetchOpenRouterModels();
    const discovered: DiscoveredModel[] = [];
    const newProviders = new Set<string>();
    let directCount = 0;
    let openrouterCount = 0;

    for (const model of openRouterModels) {
      const provider = detectProvider(model.id);
      if (!provider) continue; // Skip unknown providers

      // Track new providers not in our system
      if (!hasDirectIntegration(provider) && isMajorProvider(provider)) {
        newProviders.add(provider);
      }

      const pricing = convertPricing(model.pricing);
      const routing = classifyRouting(provider, model.id);

      if (routing.recommended === 'direct') directCount++;
      else openrouterCount++;

      discovered.push({
        id: model.id,
        provider,
        displayName: model.name || formatModelName(model.id),
        apiName: model.id,
        verified: true,
        contextLimit: model.context_length || model.top_provider?.context_length || 128000,
        pricing,
        supportedParameters: model.supported_parameters || [],
        metadata: {
          created: model.created,
          description: model.description,
          modality: model.architecture?.modality
        },
        routing: {
          recommended: routing.recommended,
          reasoning: routing.reasoning,
          hasDirectIntegration: hasDirectIntegration(provider)
        }
      });
    }

    return {
      provider: 'openrouter',
      models: discovered,
      stats: {
        total: discovered.length,
        direct: directCount,
        openrouter: openrouterCount,
        newProviders: Array.from(newProviders)
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    return {
      provider: 'openrouter',
      models: [],
      stats: {
        total: 0,
        direct: 0,
        openrouter: 0,
        newProviders: []
      },
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Format model ID into display name
 */
function formatModelName(modelId: string): string {
  // Remove provider prefix
  let name = modelId.includes('/') ? modelId.split('/')[1] : modelId;

  // Capitalize and format
  name = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return name;
}

/**
 * Generate TypeScript code for config.ts
 */
export function generateModelConfig(models: DiscoveredModel[]): string {
  const lines: string[] = [];

  for (const model of models) {
    lines.push(`  withModelInfo({`);
    lines.push(`    id: '${model.id}',`);
    lines.push(`    provider: '${model.provider}',`);
    lines.push(`    name: '${model.apiName}',`);
    lines.push(`    displayName: '${model.displayName}'`);
    if (model.routing.recommended === 'openrouter') {
      lines.push(`    routeVia: 'openrouter', // ${model.routing.reasoning}`);
    }
    lines.push(`  }),`);
  }

  return lines.join('\n');
}

/**
 * Generate TypeScript code for pricing.ts
 */
export function generatePricingConfig(models: DiscoveredModel[]): string {
  const lines: string[] = [];

  for (const model of models) {
    const routing = classifyRouting(model.provider, model.id);
    const category = inferCostCategory(model.pricing.input);
    const baseCost = (model.pricing.input + model.pricing.output) / 2 / 1000; // Average, simplified

    lines.push(`  '${model.id}': {`);
    lines.push(`    modelId: '${model.id}',`);
    lines.push(`    costPer1kTokens: {`);
    lines.push(`      input: ${model.pricing.input.toFixed(6)},`);
    lines.push(`      output: ${model.pricing.output.toFixed(6)}`);
    lines.push(`    },`);
    lines.push(`    costCategory: '${category}',`);
    lines.push(`    providerBaseCost: ${baseCost.toFixed(6)},`);
    lines.push(`    platformMarkup: ${routing.markup} // ${routing.recommended === 'direct' ? 'Direct API' : 'Via OpenRouter'}`);
    lines.push(`  },`);
  }

  return lines.join('\n');
}

/**
 * Generate TypeScript code for parameter schemas
 */
export function generateParameterSchemas(models: DiscoveredModel[]): string {
  const lines: string[] = [];

  for (const model of models) {
    lines.push(`  '${model.id}': {`);
    lines.push(`    modelId: '${model.id}',`);
    lines.push(`    supportedParameters: {`);

    // Determine max tokens parameter name
    const hasMaxCompletionTokens = model.supportedParameters.includes('max_completion_tokens');
    const maxTokensParam = hasMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens';

    lines.push(`      maxTokens: {`);
    lines.push(`        paramName: '${maxTokensParam}',`);
    lines.push(`        max: ${model.contextLimit},`);
    lines.push(`        default: 4096`);
    lines.push(`      },`);

    // Temperature support
    const supportsTemperature = model.supportedParameters.includes('temperature');
    lines.push(`      temperature: {`);
    lines.push(`        paramName: 'temperature',`);
    lines.push(`        min: 0,`);
    lines.push(`        max: 2,`);
    lines.push(`        default: 1,`);
    lines.push(`        supported: ${supportsTemperature}`);
    lines.push(`      }`);

    lines.push(`    }`);
    lines.push(`  },`);
  }

  return lines.join('\n');
}
