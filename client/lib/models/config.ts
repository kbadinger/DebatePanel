import { Model, ModelStrength } from '@/types/debate';
import { MODEL_PRICING, getCostEmoji } from './pricing';

// Context limits for different model families (in tokens) - Updated September 2025
export const MODEL_CONTEXT_LIMITS = {
  'gpt-5-2025-08-07': 200000,
  'gpt-5': 200000,
  'claude-opus-4-1-20250805': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-3-7-sonnet-20250219': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'grok-4-0709': 256000,
  'grok-3': 128000,
};

// Model strengths and suggested roles - Updated for September 2025
const MODEL_ROLES: Record<string, { strengths: ModelStrength[], role: string }> = {
  // OpenAI - Current Models
  'gpt-4o': { strengths: ['business', 'general', 'creative'], role: 'Balanced business and creative analysis' },
  'gpt-4o-mini': { strengths: ['business', 'general'], role: 'Efficient business considerations' },
  'gpt-4.1': { strengths: ['business', 'general', 'analytical'], role: 'Advanced general-purpose analysis' },
  'gpt-4.1-mini': { strengths: ['business', 'general'], role: 'Practical business analysis' },
  'gpt-4.1-nano': { strengths: ['business'], role: 'Quick business insights' },
  'gpt-5': { strengths: ['business', 'analytical', 'creative'], role: 'Advanced flagship analysis across all domains' },
  'gpt-5-2025-08-07': { strengths: ['business', 'analytical', 'creative'], role: 'Latest GPT-5 model with enhanced capabilities' },
  'o4-mini': { strengths: ['analytical'], role: 'Efficient reasoning and analysis' },
  
  // OpenAI - Secondary Tier
  'o1': { strengths: ['analytical', 'technical'], role: 'Deep logical analysis and complex reasoning' },
  'o1-mini': { strengths: ['analytical'], role: 'Quick logical analysis' },
  'o3': { strengths: ['analytical', 'technical'], role: 'Advanced problem-solving and technical analysis' },
  'o3-mini': { strengths: ['analytical'], role: 'Efficient reasoning and problem-solving' },
  
  // Anthropic - Claude 4.1 and 3.5 Series
  'claude-opus-4-1-20250805': { strengths: ['ethical', 'analytical', 'general'], role: 'Most advanced Claude model with superior reasoning and ethical analysis' },
  'claude-sonnet-4-20250514': { strengths: ['ethical', 'analytical', 'general'], role: 'Claude 4 with balanced reasoning and creative capabilities' },
  'claude-opus-4-20250514': { strengths: ['ethical', 'analytical', 'general'], role: 'Claude 4 Opus with deep analytical and ethical reasoning' },
  'claude-3-7-sonnet-20250219': { strengths: ['ethical', 'analytical', 'general'], role: 'Advanced Sonnet model with enhanced capabilities' },
  'claude-3-5-sonnet-20241022': { strengths: ['general', 'ethical', 'analytical'], role: 'Balanced perspective with ethical considerations' },
  'claude-3-5-sonnet-20240620': { strengths: ['general', 'ethical', 'analytical'], role: 'Ethical reasoning and nuanced analysis' },
  'claude-3-opus-20240229': { strengths: ['ethical', 'analytical', 'general'], role: 'Deep ethical implications and comprehensive analysis' },
  
  // Google Gemini
  'gemini-2.5-pro': { strengths: ['research', 'analytical', 'technical'], role: 'Comprehensive research and technical analysis' },
  'gemini-2.5-flash': { strengths: ['research', 'general'], role: 'Efficient research and broad analysis' },
  'gemini-2.5-flash-lite': { strengths: ['research'], role: 'Ultra-efficient research synthesis' },
  'gemini-2.0-flash': { strengths: ['research', 'general'], role: 'Research-backed general analysis' },
  'gemini-1.5-pro': { strengths: ['research', 'general'], role: 'Broad knowledge and research synthesis' },
  'gemini-1.5-flash': { strengths: ['research'], role: 'Quick research and information synthesis' },
  'gemini-1.5-flash-8b': { strengths: ['research'], role: 'Lightweight research assistance' },
  
  // X.AI Grok
  'grok-4-0709': { strengths: ['creative', 'business', 'research'], role: 'Latest Grok with unconventional thinking and real-time insights' },
  'grok-4': { strengths: ['creative', 'business', 'research'], role: 'Unconventional thinking with real-time search' },
  'grok-3': { strengths: ['creative', 'business'], role: 'Creative solutions and alternative perspectives' },
  'grok-3-fast': { strengths: ['creative'], role: 'Fast creative analysis and unique perspectives' },
  'grok-3-mini': { strengths: ['creative'], role: 'Efficient creative thinking and alternative viewpoints' },
  'grok-2': { strengths: ['creative'], role: 'Alternative perspectives and creative approaches' },
  'grok-2-1212': { strengths: ['creative'], role: 'Creative analysis and unique viewpoints' },
  
  // Perplexity
  'sonar-pro': { strengths: ['research', 'analytical'], role: 'Current information and research-backed analysis' },
  'sonar-deep-research': { strengths: ['research', 'analytical'], role: 'Advanced research with deep context analysis' },
  'sonar-reasoning-pro': { strengths: ['research', 'analytical'], role: 'Research with chain-of-thought reasoning' },
  'sonar': { strengths: ['research'], role: 'Web-informed perspectives and current data' },
  
  // DeepSeek
  'deepseek-v3.1': { strengths: ['analytical', 'technical'], role: 'Hybrid reasoning and technical analysis' },
  'deepseek-r1-0528': { strengths: ['analytical', 'technical'], role: 'Enhanced mathematical and logical reasoning' },
  'deepseek-chat': { strengths: ['technical', 'analytical'], role: 'Technical expertise and detailed analysis' },
  'deepseek-reasoner': { strengths: ['analytical', 'technical'], role: 'Mathematical and logical reasoning' },
  
  // Meta Llama
  'llama-4-scout': { strengths: ['technical', 'general'], role: 'Open-source technical analysis and balanced perspective' },
  'llama-4-maverick': { strengths: ['technical', 'general', 'analytical'], role: 'Advanced open-source reasoning and analysis' },
  'llama-3.3-70b': { strengths: ['technical', 'general'], role: 'Open-source perspective and technical depth' },
  'llama-3.1-405b': { strengths: ['technical', 'analytical'], role: 'Large-scale technical and analytical reasoning' },
  
  // Mistral
  'mistral-large-24-11': { strengths: ['technical', 'business'], role: 'European perspective and technical analysis' },
  'mistral-medium-3': { strengths: ['business', 'general'], role: 'Balanced European perspective' },
  'pixtral-large': { strengths: ['technical'], role: 'Multimodal analysis and technical insights' },
  
  // Cohere
  'command-a-03-2025': { strengths: ['business', 'analytical'], role: 'Enterprise-focused business analysis' },
  
  // Moonshot Kimi
  'kimi-k2-instruct': { strengths: ['technical', 'analytical'], role: 'Advanced coding and technical problem-solving' },
  'kimi-k1.5': { strengths: ['technical'], role: 'Technical analysis with long context' },
  
  // AI21
  'jamba-large-1-7': { strengths: ['analytical', 'general'], role: 'Long-context analysis and comprehensive reasoning' },
  
  // Other providers
  'qwen-3-235b': { strengths: ['general', 'technical'], role: 'Large-scale general and technical analysis' },
  'flux-1.1': { strengths: ['general'], role: 'Specialized analysis and problem-solving' },
  
  // Default for others
  'default': { strengths: ['general'], role: 'General analysis and balanced perspective' }
};

// Helper to add cost info and context info to models
function withModelInfo(model: Omit<Model, 'costInfo' | 'contextInfo'>): Model {
  const pricing = MODEL_PRICING[model.id];
  let result: Model = {
    ...model,
    costInfo: undefined,
    contextInfo: {
      maxTokens: MODEL_CONTEXT_LIMITS[model.id] || 128000,
      strengths: MODEL_ROLES[model.id]?.strengths || ['general'],
      suggestedRole: MODEL_ROLES[model.id]?.role || 'General analysis and balanced perspective'
    }
  };
  
  if (pricing) {
    result.costInfo = {
      estimatedCostPerResponse: pricing.providerBaseCost * (1 + pricing.platformMarkup),
      category: pricing.costCategory as any,
      emoji: getCostEmoji(pricing.costCategory)
    };
  }
  
  return result;
}

// Model tiers for UI organization
export interface ModelTier {
  primary: Model[];  // Latest models shown by default
  secondary: Model[]; // Older models shown under "Show all"
}

// Provider expansion for clean primary view
export interface ProviderExpansion {
  featured: Model[];  // Always visible (2-3 best models)
  expanded: Model[];  // Hidden by default, shown on provider expansion
}

// FEATURED MODELS (always visible in primary tier)
const FEATURED_MODELS: Model[] = [
  // OpenAI - Flagship Models (Curated via Model Discovery System)
  withModelInfo({
    id: 'gpt-5',
    provider: 'openai',
    name: 'gpt-5',
    displayName: 'GPT-5'
  }),
  withModelInfo({
    id: 'gpt-5-2025-08-07',
    provider: 'openai',
    name: 'gpt-5-2025-08-07',
    displayName: 'GPT-5 (Aug 2025)'
  }),
  
  // Anthropic - Flagship Models (Curated via Model Discovery System)
  withModelInfo({
    id: 'claude-opus-4-1-20250805',
    provider: 'anthropic',
    name: 'claude-opus-4-1-20250805',
    displayName: 'Claude Opus 4.1 (Aug 2025)'
  }),
  withModelInfo({
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    name: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4.0 (May 2025)'
  }),
  withModelInfo({
    id: 'claude-opus-4-20250514',
    provider: 'anthropic',
    name: 'claude-opus-4-20250514',
    displayName: 'Claude Opus 4.0 (May 2025)'
  }),
  withModelInfo({
    id: 'claude-3-7-sonnet-20250219',
    provider: 'anthropic',
    name: 'claude-3-7-sonnet-20250219',
    displayName: 'Claude Sonnet 3.7 (Feb 2025)'
  }),
  
  // xAI - Flagship Grok Models (Discovered via API)
  withModelInfo({
    id: 'grok-4-0709',
    provider: 'xai',
    name: 'grok-4-0709',
    displayName: 'Grok 4 (July 2025)'
  }),
  withModelInfo({
    id: 'grok-3',
    provider: 'xai',
    name: 'grok-3',
    displayName: 'Grok 3'
  })
];

// EXPANDABLE MODELS (shown when provider is expanded)
const EXPANDABLE_MODELS: Record<string, Model[]> = {
  openai: [
    withModelInfo({
      id: 'gpt-4o-mini',
      provider: 'openai',
      name: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini'
    }),
    withModelInfo({
      id: 'gpt-4.1',
      provider: 'openai',
      name: 'gpt-4.1',
      displayName: 'GPT-4.1'
    }),
    withModelInfo({
      id: 'gpt-4.1-mini',
      provider: 'openai',
      name: 'gpt-4.1-mini',
      displayName: 'GPT-4.1 Mini'
    }),
    withModelInfo({
      id: 'gpt-4.1-nano',
      provider: 'openai',
      name: 'gpt-4.1-nano',
      displayName: 'GPT-4.1 Nano'
    }),
    withModelInfo({
      id: 'o4-mini',
      provider: 'openai',
      name: 'o4-mini',
      displayName: 'o4 Mini'
    })
  ],
  anthropic: [
    withModelInfo({
      id: 'claude-3-5-sonnet-20240620',
      provider: 'anthropic',
      name: 'claude-3-5-sonnet-20240620',
      displayName: 'Claude 3.5 Sonnet (June)'
    }),
    withModelInfo({
      id: 'claude-3-opus-20240229',
      provider: 'anthropic',
      name: 'claude-3-opus-20240229',
      displayName: 'Claude 3 Opus'
    })
  ],
  google: [
    withModelInfo({
      id: 'gemini-2.5-flash-lite',
      provider: 'google',
      name: 'gemini-2.5-flash-lite',
      displayName: 'Gemini 2.5 Flash Lite'
    }),
    withModelInfo({
      id: 'gemini-2.0-flash',
      provider: 'google',
      name: 'gemini-2.0-flash',
      displayName: 'Gemini 2.0 Flash'
    })
  ],
  xai: [
    withModelInfo({
      id: 'grok-3',
      provider: 'xai',
      name: 'grok-3',
      displayName: 'Grok 3'
    })
  ],
  perplexity: [
    withModelInfo({
      id: 'sonar-deep-research',
      provider: 'perplexity',
      name: 'sonar-deep-research',
      displayName: 'Sonar Deep Research'
    }),
    withModelInfo({
      id: 'sonar-reasoning-pro',
      provider: 'perplexity',
      name: 'sonar-reasoning-pro',
      displayName: 'Sonar Reasoning Pro'
    })
  ],
  deepseek: [
    withModelInfo({
      id: 'deepseek-r1-0528',
      provider: 'deepseek',
      name: 'deepseek-r1-0528',
      displayName: 'DeepSeek R1 Enhanced'
    })
  ],
  meta: [
    withModelInfo({
      id: 'llama-4-maverick',
      provider: 'meta',
      name: 'llama-4-maverick',
      displayName: 'Llama 4 Maverick'
    })
  ],
  mistral: [
    withModelInfo({
      id: 'mistral-medium-3',
      provider: 'mistral',
      name: 'mistral-medium-3',
      displayName: 'Mistral Medium 3'
    })
  ]
};

// Keep PRIMARY_MODELS as only featured for backward compatibility
const PRIMARY_MODELS: Model[] = FEATURED_MODELS;

// SECONDARY TIER MODELS (shown under "Show all models")
const SECONDARY_MODELS: Model[] = [
  // OpenAI - Older Models
  withModelInfo({
    id: 'o1',
    provider: 'openai',
    name: 'o1',
    displayName: 'o1'
  }),
  withModelInfo({
    id: 'o1-mini',
    provider: 'openai',
    name: 'o1-mini',
    displayName: 'o1 Mini'
  }),
  withModelInfo({
    id: 'o3',
    provider: 'openai',
    name: 'o3',
    displayName: 'o3'
  }),
  withModelInfo({
    id: 'o3-mini',
    provider: 'openai',
    name: 'o3-mini',
    displayName: 'o3 Mini'
  }),
  
  // Google - Older Gemini
  withModelInfo({
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro'
  }),
  withModelInfo({
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash'
  }),
  withModelInfo({
    id: 'gemini-1.5-flash-8b',
    provider: 'google',
    name: 'gemini-1.5-flash-8b',
    displayName: 'Gemini 1.5 Flash-8B'
  }),
  
  // X.AI - Older Grok
  withModelInfo({
    id: 'grok-2',
    provider: 'xai',
    name: 'grok-2',
    displayName: 'Grok 2'
  }),
  withModelInfo({
    id: 'grok-2-1212',
    provider: 'xai',
    name: 'grok-2-1212',
    displayName: 'Grok 2 (Dec 2024)'
  }),
  
  // Perplexity - Standard
  withModelInfo({
    id: 'sonar',
    provider: 'perplexity',
    name: 'sonar',
    displayName: 'Sonar'
  }),
  
  // DeepSeek - Legacy
  withModelInfo({
    id: 'deepseek-chat',
    provider: 'deepseek',
    name: 'deepseek-chat',
    displayName: 'DeepSeek V3'
  }),
  withModelInfo({
    id: 'deepseek-reasoner',
    provider: 'deepseek',
    name: 'deepseek-reasoner',
    displayName: 'DeepSeek R1'
  }),
  
  // Meta - Older Llama
  withModelInfo({
    id: 'llama-3.3-70b',
    provider: 'meta',
    name: 'llama-3.3-70b-instruct',
    displayName: 'Llama 3.3 70B Instruct'
  }),
  withModelInfo({
    id: 'llama-3.1-405b',
    provider: 'meta',
    name: 'llama-3.1-405b-instruct',
    displayName: 'Llama 3.1 405B Instruct'
  }),
  
  // Moonshot - Older
  withModelInfo({
    id: 'kimi-k1.5',
    provider: 'kimi',
    name: 'kimi-k1.5',
    displayName: 'Kimi k1.5'
  }),
  
  // Other providers
  withModelInfo({
    id: 'qwen-3-235b',
    provider: 'qwen',
    name: 'qwen-3-235b-chat',
    displayName: 'Qwen 3 235B Chat'
  }),
  withModelInfo({
    id: 'flux-1.1',
    provider: 'flux',
    name: 'flux-1.1',
    displayName: 'Flux 1.1'
  }),
  withModelInfo({
    id: 'pixtral-large',
    provider: 'mistral',
    name: 'pixtral-large',
    displayName: 'Pixtral Large'
  })
];

// Export all models and tiered structure
export const AVAILABLE_MODELS: Model[] = [
  ...FEATURED_MODELS, 
  ...Object.values(EXPANDABLE_MODELS).flat(),
  ...SECONDARY_MODELS
];

export const MODEL_TIERS: ModelTier = {
  primary: PRIMARY_MODELS,
  secondary: SECONDARY_MODELS
};

// Export the new expansion structure
export const PROVIDER_MODELS = {
  featured: FEATURED_MODELS,
  expandable: EXPANDABLE_MODELS
};