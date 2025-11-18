import { Model, ModelStrength } from '@/types/debate';
import { MODEL_PRICING, getCostEmoji } from './pricing';

// Context limits for different model families (in tokens) - Updated November 2025
export const MODEL_CONTEXT_LIMITS = {
  // OpenAI - Flagship models have large context windows
  'gpt-5-chat-latest': 1000000, // 1M token context window (working variant)
  'gpt-5-pro': 1000000, // 1M token context window
  'gpt-5-mini': 1000000, // 1M token context window
  'gpt-5-nano': 128000, // 128k token context window
  'gpt-5-codex': 1000000, // 1M token context window
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'o1': 200000,
  'o1-mini': 128000,
  'o3': 200000,
  'o3-mini': 200000,
  'o3-deep-research': 200000, // Deep research variant
  'o4-mini': 200000,
  'o4-mini-deep-research': 200000, // Deep research variant

  // Anthropic - Large context windows for Claude 4+ series
  'claude-sonnet-4-5-20250929': 200000, // Claude 4.5 - 200k context
  'claude-haiku-4-5-20251001': 200000, // Claude Haiku 4.5 - 200k context
  'claude-opus-4-1-20250805': 200000, // Flagship Claude 4.1 - 200k context
  'claude-sonnet-4-20250514': 200000, // Claude 4 - 200k context
  'claude-opus-4-20250514': 200000, // Claude 4 - 200k context
  'claude-3-7-sonnet-20250219': 200000, // Advanced Claude - 200k context
  'claude-3-5-haiku-20241022': 200000, // Claude 3.5 Haiku - 200k context
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-sonnet-20240620': 200000,
  'claude-3-haiku-20240307': 200000, // Claude 3 Haiku - 200k context
  'claude-3-opus-20240229': 200000,

  // Google - 2M context for Gemini 2.5 Pro
  'gemini-3-pro-preview': 1048576, // 1M tokens (preview)
  'gemini-2.5-pro': 2000000, // 2M tokens
  'gemini-2.5-flash': 1048576, // 1M tokens
  'gemini-2.5-flash-lite': 1048576,
  'gemini-2.0-pro-exp': 1048576, // 1M tokens (experimental)
  'gemini-2.0-flash': 1048576, // 1M tokens
  'gemini-2.0-flash-thinking-exp': 1048576, // 1M tokens (thinking mode)
  'gemini-1.5-pro': 2000000, // 2M tokens
  'gemini-1.5-flash': 1000000,

  // xAI - Keep conservative for now
  'grok-4-0709': 256000, // Slightly higher for newest
  'grok-4': 200000,
  'grok-4-fast-reasoning': 256000, // Fast reasoning variant
  'grok-4-fast-non-reasoning': 256000, // Fast non-reasoning variant
  'grok-3': 128000,
  'grok-3-mini': 128000, // Grok 3 Mini
  'grok-2': 131072,

  // DeepSeek - Unlimited for reasoning model
  'deepseek-r1-0528': Infinity, // Reasoning model - unlimited
  'deepseek-v3.1': 128000,
  'deepseek-chat': 128000,
  'deepseek-reasoner': 200000,

  // Other providers
  'mistral-large-latest': 128000,
  'mistral-small-latest': 128000,
  'mistral-medium-2505': 128000,
  'pixtral-large-2411': 128000,
  'kimi-k2-preview': 200000, // New K2 variant
  'kimi-k2-instruct': 200000,
  'kimi-k1.5': 200000,
  'llama-4-maverick': 256000,
  'llama-4-scout': 128000,
};

// Model strengths and suggested roles - Updated for November 2025
const MODEL_ROLES: Record<string, { strengths: ModelStrength[], role: string }> = {
  // OpenAI - Current Models
  'gpt-5-chat-latest': { strengths: ['business', 'analytical', 'creative', 'technical'], role: 'Most advanced flagship model - excels across all domains' },
  'gpt-5-pro': { strengths: ['business', 'analytical', 'creative', 'technical'], role: 'Premium GPT-5 tier with enhanced capabilities' },
  'gpt-5-mini': { strengths: ['business', 'analytical', 'general'], role: 'Fast and efficient variant of GPT-5' },
  'gpt-5-nano': { strengths: ['business', 'general'], role: 'Ultra-efficient GPT-5 for quick tasks' },
  'gpt-5-codex': { strengths: ['technical', 'analytical'], role: 'Specialized coding and software development model' },
  'gpt-4o': { strengths: ['business', 'general', 'creative'], role: 'Balanced business and creative analysis' },
  'gpt-4o-mini': { strengths: ['business', 'general'], role: 'Efficient business considerations' },
  'o4-mini': { strengths: ['analytical', 'technical'], role: 'Latest reasoning model - efficient problem-solving' },
  'o4-mini-deep-research': { strengths: ['analytical', 'research', 'technical'], role: 'Deep research with efficient reasoning' },

  // OpenAI - Secondary Tier
  'o1': { strengths: ['analytical', 'technical'], role: 'Deep logical analysis and complex reasoning' },
  'o1-mini': { strengths: ['analytical'], role: 'Quick logical analysis' },
  'o3': { strengths: ['analytical', 'technical'], role: 'Advanced problem-solving and technical analysis' },
  'o3-mini': { strengths: ['analytical'], role: 'Efficient reasoning and problem-solving' },
  'o3-deep-research': { strengths: ['analytical', 'research', 'technical'], role: 'Deep research with advanced reasoning' },

  // Anthropic - Claude 4.5, 4.1 and 3.5 Series
  'claude-sonnet-4-5-20250929': { strengths: ['technical', 'analytical', 'ethical'], role: 'Best coding model in the world - excels at complex agents and reasoning' },
  'claude-haiku-4-5-20251001': { strengths: ['general', 'ethical', 'business'], role: 'Fast and efficient Claude 4.5 - excellent value for cost' },
  'claude-opus-4-1-20250805': { strengths: ['ethical', 'analytical', 'general'], role: 'Most advanced Claude model with superior reasoning and ethical analysis' },
  'claude-sonnet-4-20250514': { strengths: ['ethical', 'analytical', 'general'], role: 'Claude 4 with balanced reasoning and creative capabilities' },
  'claude-opus-4-20250514': { strengths: ['ethical', 'analytical', 'general'], role: 'Claude 4 Opus with deep analytical and ethical reasoning' },
  'claude-3-7-sonnet-20250219': { strengths: ['ethical', 'analytical', 'general'], role: 'Advanced Sonnet model with enhanced capabilities' },
  'claude-3-5-haiku-20241022': { strengths: ['general', 'ethical', 'business'], role: 'Fast and cost-effective Claude 3.5 - great for budget debates' },
  'claude-3-5-sonnet-20241022': { strengths: ['general', 'ethical', 'analytical'], role: 'Balanced perspective with ethical considerations' },
  'claude-3-5-sonnet-20240620': { strengths: ['general', 'ethical', 'analytical'], role: 'Ethical reasoning and nuanced analysis' },
  'claude-3-haiku-20240307': { strengths: ['general', 'ethical', 'business'], role: 'Original fast Claude 3 model - budget-friendly' },
  'claude-3-opus-20240229': { strengths: ['ethical', 'analytical', 'general'], role: 'Deep ethical implications and comprehensive analysis' },
  
  // Google Gemini
  'gemini-3-pro-preview': { strengths: ['research', 'analytical', 'technical', 'creative'], role: 'Most advanced Gemini model - state-of-the-art reasoning and multimodal analysis' },
  'gemini-2.5-pro': { strengths: ['research', 'analytical', 'technical'], role: 'Comprehensive research and technical analysis' },
  'gemini-2.5-flash': { strengths: ['research', 'general'], role: 'Efficient research and broad analysis' },
  'gemini-2.5-flash-lite': { strengths: ['research'], role: 'Ultra-efficient research synthesis' },
  'gemini-2.0-pro-exp': { strengths: ['research', 'analytical', 'technical'], role: 'Experimental Pro 2.0 - cutting-edge capabilities' },
  'gemini-2.0-flash': { strengths: ['research', 'general'], role: 'Research-backed general analysis' },
  'gemini-2.0-flash-thinking-exp': { strengths: ['analytical', 'research'], role: 'Thinking mode with chain-of-thought reasoning' },
  'gemini-1.5-pro': { strengths: ['research', 'general'], role: 'Broad knowledge and research synthesis' },
  'gemini-1.5-flash': { strengths: ['research'], role: 'Quick research and information synthesis' },
  'gemini-1.5-flash-8b': { strengths: ['research'], role: 'Lightweight research assistance' },

  // X.AI Grok
  'grok-4-0709': { strengths: ['creative', 'business', 'research'], role: 'Latest Grok with unconventional thinking and real-time insights' },
  'grok-4': { strengths: ['creative', 'business', 'research'], role: 'Unconventional thinking with real-time search' },
  'grok-4-fast-reasoning': { strengths: ['creative', 'analytical'], role: 'Fast reasoning with unconventional thinking' },
  'grok-4-fast-non-reasoning': { strengths: ['creative', 'business'], role: 'Fast general analysis with creative perspectives' },
  'grok-3': { strengths: ['creative', 'business'], role: 'Creative solutions and alternative perspectives' },
  'grok-3-fast': { strengths: ['creative'], role: 'Fast creative analysis and unique perspectives' },
  'grok-3-mini': { strengths: ['creative', 'business'], role: 'Efficient creative thinking and alternative viewpoints' },
  'grok-2': { strengths: ['creative'], role: 'Alternative perspectives and creative approaches' },
  'grok-2-1212': { strengths: ['creative'], role: 'Creative analysis and unique viewpoints' },
  
  // Perplexity
  'sonar-pro': { strengths: ['research', 'analytical'], role: 'Current information and research-backed analysis' },
  'sonar-deep-research': { strengths: ['research', 'analytical'], role: 'Advanced research with deep context analysis' },
  'sonar-reasoning-pro': { strengths: ['research', 'analytical'], role: 'Research with chain-of-thought reasoning' },
  'sonar': { strengths: ['research'], role: 'Web-informed perspectives and current data' },
  
  // DeepSeek
  'deepseek-v3.1': { strengths: ['analytical', 'technical'], role: 'Latest hybrid reasoning and technical analysis model' },
  'deepseek-chat-v3.1': { strengths: ['analytical', 'technical'], role: 'Latest hybrid reasoning and technical analysis model' },
  'deepseek-r1-0528': { strengths: ['analytical', 'technical'], role: 'Enhanced mathematical and logical reasoning' },
  'deepseek-chat': { strengths: ['technical', 'analytical'], role: 'Technical expertise and detailed analysis' },
  'deepseek-reasoner': { strengths: ['analytical', 'technical'], role: 'Mathematical and logical reasoning' },
  
  // Meta Llama
  'llama-4-scout': { strengths: ['technical', 'general'], role: 'Open-source technical analysis and balanced perspective' },
  'llama-4-maverick': { strengths: ['technical', 'general', 'analytical'], role: 'Advanced open-source reasoning and analysis' },
  'llama-3.3-70b': { strengths: ['technical', 'general'], role: 'Open-source perspective and technical depth' },
  'llama-3.1-405b': { strengths: ['technical', 'analytical'], role: 'Large-scale technical and analytical reasoning' },
  
  // Mistral
  'mistral-large-latest': { strengths: ['technical', 'business'], role: 'Latest European flagship - technical and business analysis' },
  'mistral-small-latest': { strengths: ['business', 'general'], role: 'Latest efficient Mistral - cost-effective European perspective' },
  'mistral-large-24-11': { strengths: ['technical', 'business'], role: 'European perspective and technical analysis' },
  'mistral-medium-2505': { strengths: ['business', 'general'], role: 'Balanced European perspective' },
  'pixtral-large-2411': { strengths: ['technical'], role: 'Multimodal analysis and technical insights' },
  
  // Cohere
  'command-a-03-2025': { strengths: ['business', 'analytical'], role: 'Enterprise-focused business analysis' },
  
  // Moonshot Kimi
  'kimi-k2-preview': { strengths: ['technical', 'analytical'], role: 'Latest Kimi K2 - advanced coding and technical problem-solving' },
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

// Model performance characteristics for slow thinking/reasoning models
const MODEL_PERFORMANCE_CHARACTERISTICS: Record<string, { isSlowThinking: boolean, avgTimePerRound: number }> = {
  // OpenAI Reasoning Models - Very slow but high quality
  'gpt-5-pro': { isSlowThinking: true, avgTimePerRound: 360 }, // ~6 minutes per round
  'o1': { isSlowThinking: true, avgTimePerRound: 180 }, // ~3 minutes per round
  'o1-mini': { isSlowThinking: true, avgTimePerRound: 120 }, // ~2 minutes per round
  'o3': { isSlowThinking: true, avgTimePerRound: 180 }, // ~3 minutes per round
  'o3-mini': { isSlowThinking: true, avgTimePerRound: 120 }, // ~2 minutes per round
  'o3-deep-research': { isSlowThinking: true, avgTimePerRound: 240 }, // ~4 minutes per round
  'o4-mini': { isSlowThinking: true, avgTimePerRound: 120 }, // ~2 minutes per round
  'o4-mini-deep-research': { isSlowThinking: true, avgTimePerRound: 240 }, // ~4 minutes per round

  // DeepSeek Reasoning Models - Moderately slow
  'deepseek-r1-0528': { isSlowThinking: true, avgTimePerRound: 90 }, // ~1.5 minutes per round
  'deepseek-reasoner': { isSlowThinking: true, avgTimePerRound: 90 }, // ~1.5 minutes per round

  // Google Thinking Models
  'gemini-2.0-flash-thinking-exp': { isSlowThinking: true, avgTimePerRound: 120 }, // ~2 minutes per round

  // Perplexity Reasoning
  'sonar-reasoning-pro': { isSlowThinking: true, avgTimePerRound: 150 }, // ~2.5 minutes per round
  'sonar-deep-research': { isSlowThinking: true, avgTimePerRound: 150 }, // ~2.5 minutes per round

  // xAI Fast Reasoning (still slower than standard models)
  'grok-4-fast-reasoning': { isSlowThinking: true, avgTimePerRound: 90 }, // ~1.5 minutes per round
};

// Helper to add cost info and context info to models
function withModelInfo(model: Omit<Model, 'costInfo' | 'contextInfo'>): Model {
  const pricing = MODEL_PRICING[model.id];
  const performance = MODEL_PERFORMANCE_CHARACTERISTICS[model.id];

  let result: Model = {
    ...model,
    costInfo: undefined,
    contextInfo: {
      maxTokens: MODEL_CONTEXT_LIMITS[model.id] || 128000,
      strengths: MODEL_ROLES[model.id]?.strengths || ['general'],
      suggestedRole: MODEL_ROLES[model.id]?.role || 'General analysis and balanced perspective',
      isSlowThinking: performance?.isSlowThinking || false,
      avgTimePerRound: performance?.avgTimePerRound || 30 // Default to 30 seconds for normal models
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
    id: 'gpt-5-chat-latest',
    provider: 'openai',
    name: 'gpt-5-chat-latest',
    displayName: 'GPT-5'
  }),
  withModelInfo({
    id: 'gpt-5-pro',
    provider: 'openai',
    name: 'gpt-5-pro',
    displayName: 'GPT-5 Pro'
  }),
  withModelInfo({
    id: 'gpt-5-mini',
    provider: 'openai',
    name: 'gpt-5-mini',
    displayName: 'GPT-5 Mini'
  }),
  withModelInfo({
    id: 'o4-mini',
    provider: 'openai',
    name: 'o4-mini',
    displayName: 'o4 Mini'
  }),

  // Anthropic - Flagship Models (Curated via Model Discovery System)
  withModelInfo({
    id: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    name: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5 (Sep 2025)'
  }),
  withModelInfo({
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    name: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5 (Oct 2025)'
  }),
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

  // Google - Flagship Gemini 3 & 2.5 Series (Latest Generation)
  withModelInfo({
    id: 'gemini-3-pro-preview',
    provider: 'google',
    name: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro (Preview)'
  }),
  withModelInfo({
    id: 'gemini-2.5-pro',
    provider: 'google',
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro'
  }),
  withModelInfo({
    id: 'gemini-2.5-flash',
    provider: 'google',
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash'
  }),
  withModelInfo({
    id: 'gemini-2.0-flash',
    provider: 'google',
    name: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash'
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
  }),

  // Perplexity - Research Models
  withModelInfo({
    id: 'sonar-pro',
    provider: 'perplexity',
    name: 'sonar-pro',
    displayName: 'Sonar Pro'
  }),

  // DeepSeek - Flagship Models
  withModelInfo({
    id: 'deepseek-v3.1',
    provider: 'deepseek',
    name: 'deepseek-chat-v3.1',
    displayName: 'DeepSeek V3.1'
  })
];

// EXPANDABLE MODELS (shown when provider is expanded)
const EXPANDABLE_MODELS: Record<string, Model[]> = {
  openai: [
    withModelInfo({
      id: 'o3-deep-research',
      provider: 'openai',
      name: 'o3-deep-research',
      displayName: 'o3 Deep Research'
    }),
    withModelInfo({
      id: 'o4-mini-deep-research',
      provider: 'openai',
      name: 'o4-mini-deep-research',
      displayName: 'o4 Mini Deep Research'
    }),
    withModelInfo({
      id: 'gpt-5-codex',
      provider: 'openai',
      name: 'gpt-5-codex',
      displayName: 'GPT-5 Codex'
    }),
    withModelInfo({
      id: 'gpt-5-nano',
      provider: 'openai',
      name: 'gpt-5-nano',
      displayName: 'GPT-5 Nano'
    }),
    withModelInfo({
      id: 'gpt-4o',
      provider: 'openai',
      name: 'gpt-4o',
      displayName: 'GPT-4o'
    }),
    withModelInfo({
      id: 'gpt-4o-mini',
      provider: 'openai',
      name: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini'
    })
  ],
  anthropic: [
    withModelInfo({
      id: 'claude-3-5-haiku-20241022',
      provider: 'anthropic',
      name: 'claude-3-5-haiku-20241022',
      displayName: 'Claude 3.5 Haiku (Oct 2024)'
    }),
    withModelInfo({
      id: 'claude-3-haiku-20240307',
      provider: 'anthropic',
      name: 'claude-3-haiku-20240307',
      displayName: 'Claude 3 Haiku'
    }),
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
      id: 'gemini-2.0-pro-exp',
      provider: 'google',
      name: 'gemini-2.0-pro-exp',
      displayName: 'Gemini 2.0 Pro (Experimental)'
    }),
    withModelInfo({
      id: 'gemini-2.0-flash-thinking-exp',
      provider: 'google',
      name: 'gemini-2.0-flash-thinking-exp',
      displayName: 'Gemini 2.0 Flash Thinking'
    }),
    withModelInfo({
      id: 'gemini-2.5-flash-lite',
      provider: 'google',
      name: 'gemini-2.5-flash-lite',
      displayName: 'Gemini 2.5 Flash Lite'
    })
  ],
  xai: [
    withModelInfo({
      id: 'grok-4-fast-reasoning',
      provider: 'xai',
      name: 'grok-4-fast-reasoning',
      displayName: 'Grok 4 Fast (Reasoning)'
    }),
    withModelInfo({
      id: 'grok-4-fast-non-reasoning',
      provider: 'xai',
      name: 'grok-4-fast-non-reasoning',
      displayName: 'Grok 4 Fast (Non-Reasoning)'
    }),
    withModelInfo({
      id: 'grok-3-mini',
      provider: 'xai',
      name: 'grok-3-mini',
      displayName: 'Grok 3 Mini'
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
      id: 'mistral-large-latest',
      provider: 'mistral',
      name: 'mistral-large-latest',
      displayName: 'Mistral Large (Latest)'
    }),
    withModelInfo({
      id: 'mistral-small-latest',
      provider: 'mistral',
      name: 'mistral-small-latest',
      displayName: 'Mistral Small (Latest)'
    }),
    withModelInfo({
      id: 'mistral-medium-2505',
      provider: 'mistral',
      name: 'mistral-medium-2505',
      displayName: 'Mistral Medium 3'
    })
  ],
  kimi: [
    withModelInfo({
      id: 'kimi-k2-preview',
      provider: 'kimi',
      name: 'kimi-k2-0905-preview',
      displayName: 'Kimi K2 Preview'
    }),
    withModelInfo({
      id: 'kimi-k2-instruct',
      provider: 'kimi',
      name: 'kimi-k2-0711-preview',
      displayName: 'Kimi K2 Instruct'
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
  
  // Google - Legacy Gemini Models  
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
    id: 'pixtral-large-2411',
    provider: 'mistral',
    name: 'pixtral-large-2411',
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