import { Model, ModelStrength } from '@/types/debate';
import { MODEL_PRICING, getCostEmoji } from './pricing';

// Context limits for different model families (in tokens)
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // OpenAI Models
  'gpt-5': 128000,
  'gpt-5-mini': 128000,
  'gpt-5-nano': 128000,
  'o1': 128000,
  'o1-mini': 128000,
  'o3': 128000,
  'o3-mini': 128000,
  
  // Anthropic Models
  'claude-opus-4-1-20250805': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-3-7-sonnet-20250219': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-sonnet-20240620': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
  
  // Google Models
  'gemini-2.5-pro': 2000000, // 2M tokens
  'gemini-2.5-flash': 1000000, // 1M tokens
  'gemini-2.0-flash': 1000000,
  'gemini-1.5-pro': 2000000,
  'gemini-1.5-flash': 1000000,
  'gemini-1.5-flash-8b': 1000000,
  
  // Other models (typical limits)
  'grok-4': 128000,
  'grok-2': 128000,
  'grok-2-1212': 128000,
  'sonar-pro': 127000,
  'sonar': 127000,
  'deepseek-chat': 128000,
  'deepseek-reasoner': 128000,
  'mistral-saba-latest': 128000,
  'mistral-large-latest': 128000,
  'magistral-medium-latest': 128000,
  'llama-3.3-70b': 128000,
  'llama-3.1-405b': 128000,
  'command-a': 128000,
  'jamba-large': 256000, // AI21 has longer context
  'kimi-k2-instruct': 200000,
  'kimi-k1.5': 200000,
  'qwen-3-235b': 128000,
  'flux-1.1': 128000,
  'pixtral-large': 128000,
};

// Model strengths and suggested roles
const MODEL_ROLES: Record<string, { strengths: ModelStrength[], role: string }> = {
  // Reasoning Models - Analytical Focus
  'o1': { strengths: ['analytical', 'technical'], role: 'Deep logical analysis and complex reasoning' },
  'o3': { strengths: ['analytical', 'technical'], role: 'Advanced problem-solving and technical analysis' },
  'o1-mini': { strengths: ['analytical'], role: 'Quick logical analysis' },
  'o3-mini': { strengths: ['analytical'], role: 'Efficient reasoning and problem-solving' },
  'deepseek-reasoner': { strengths: ['analytical', 'technical'], role: 'Mathematical and logical reasoning' },
  
  // Business/General Models
  'gpt-5': { strengths: ['business', 'general', 'creative'], role: 'Balanced business and creative analysis' },
  'gpt-5-mini': { strengths: ['business', 'general'], role: 'Practical business considerations' },
  'claude-opus-4-1-20250805': { strengths: ['ethical', 'analytical', 'general'], role: 'Ethical implications and nuanced analysis' },
  'claude-sonnet-4-20250514': { strengths: ['general', 'ethical'], role: 'Balanced perspective with ethical considerations' },
  'claude-3-5-sonnet-20241022': { strengths: ['general', 'analytical'], role: 'Comprehensive analysis and clear reasoning' },
  
  // Creative/Diverse Perspectives
  'grok-4': { strengths: ['creative', 'business'], role: 'Unconventional thinking and creative solutions' },
  'grok-2': { strengths: ['creative'], role: 'Alternative perspectives and creative approaches' },
  
  // Research/Knowledge Models
  'sonar-pro': { strengths: ['research', 'analytical'], role: 'Current information and research-backed analysis' },
  'sonar': { strengths: ['research'], role: 'Web-informed perspectives and current data' },
  'gemini-2.5-pro': { strengths: ['research', 'analytical', 'technical'], role: 'Comprehensive research and technical analysis' },
  'gemini-1.5-pro': { strengths: ['research', 'general'], role: 'Broad knowledge and research synthesis' },
  
  // Technical/Specialized
  'deepseek-chat': { strengths: ['technical', 'analytical'], role: 'Technical expertise and detailed analysis' },
  'llama-3.1-405b': { strengths: ['technical', 'general'], role: 'Open-source perspective and technical depth' },
  'mistral-large-latest': { strengths: ['technical', 'business'], role: 'European perspective and technical analysis' },
  
  // Default for others
  'default': { strengths: ['general'], role: 'General analysis and balanced perspective' }
};

// Helper to add cost info and context info to models
function withModelInfo(model: Omit<Model, 'costInfo' | 'contextInfo'>): Model {
  const pricing = MODEL_PRICING[model.id];
  const contextLimit = MODEL_CONTEXT_LIMITS[model.id] || 128000; // Default to 128K
  const roleInfo = MODEL_ROLES[model.id] || MODEL_ROLES['default'];
  
  const result: Model = {
    ...model,
    contextInfo: {
      maxTokens: contextLimit,
      strengths: roleInfo.strengths,
      suggestedRole: roleInfo.role
    }
  };
  
  if (pricing) {
    result.costInfo = {
      estimatedCostPerResponse: pricing.providerBaseCost * (1 + pricing.platformMarkup),
      category: pricing.costCategory,
      emoji: getCostEmoji(pricing.costCategory)
    };
  }
  
  return result;
}

export const AVAILABLE_MODELS: Model[] = [
  // OpenAI Models - GPT-5 Series ONLY
  withModelInfo({
    id: 'gpt-5',
    provider: 'openai',
    name: 'gpt-5',
    displayName: 'GPT-5'
    // Latest flagship model - requires max_completion_tokens parameter
  }),
  withModelInfo({
    id: 'gpt-5-mini',
    provider: 'openai',
    name: 'gpt-5-mini',
    displayName: 'GPT-5 Mini'
  }),
  withModelInfo({
    id: 'gpt-5-nano',
    provider: 'openai',
    name: 'gpt-5-nano',
    displayName: 'GPT-5 Nano'
  }),
  
  // OpenAI Reasoning Models
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
  
  // Anthropic Models - Claude 4 Series (NEW!)
  withModelInfo({
    id: 'claude-opus-4-1-20250805',
    provider: 'anthropic',
    name: 'claude-opus-4-1-20250805',
    displayName: 'Claude Opus 4.1'
  }),
  withModelInfo({
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    name: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4'
  }),
  withModelInfo({
    id: 'claude-opus-4-20250514',
    provider: 'anthropic',
    name: 'claude-opus-4-20250514',
    displayName: 'Claude Opus 4'
  }),
  
  // Claude 3.7 Series
  withModelInfo({
    id: 'claude-3-7-sonnet-20250219',
    provider: 'anthropic',
    name: 'claude-3-7-sonnet-20250219',
    displayName: 'Claude 3.7 Sonnet'
  }),
  
  // Claude 3.5 Series
  withModelInfo({
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    name: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet'
  }),
  withModelInfo({
    id: 'claude-3-5-sonnet-20240620',
    provider: 'anthropic',
    name: 'claude-3-5-sonnet-20240620',
    displayName: 'Claude 3.5 Sonnet (June)'
  }),
  withModelInfo({
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    name: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku'
  }),
  
  // Claude 3 Series
  withModelInfo({
    id: 'claude-3-opus-20240229',
    provider: 'anthropic',
    name: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus'
  }),
  withModelInfo({
    id: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    name: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku'
  }),
  
  // Google Gemini Models (WORKING!)
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
  
  // X.AI Models (Grok)
  withModelInfo({
    id: 'grok-4',
    provider: 'xai',
    name: 'grok-4',
    displayName: 'Grok 4'
  }),
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
  
  // Perplexity Models
  withModelInfo({
    id: 'sonar-pro',
    provider: 'perplexity',
    name: 'sonar-pro',
    displayName: 'Perplexity Sonar Pro'
  }),
  withModelInfo({
    id: 'sonar',
    provider: 'perplexity',
    name: 'sonar',
    displayName: 'Perplexity Sonar'
  }),
  
  // DeepSeek Models
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
  
  // Mistral Models
  withModelInfo({
    id: 'mistral-saba-latest',
    provider: 'mistral',
    name: 'mistral-saba-latest',
    displayName: 'Mistral Saba'
  }),
  withModelInfo({
    id: 'mistral-large-latest',
    provider: 'mistral',
    name: 'mistral-large-latest',
    displayName: 'Mistral Large'
  }),
  withModelInfo({
    id: 'magistral-medium-latest',
    provider: 'mistral',
    name: 'magistral-medium-latest',
    displayName: 'Magistral Medium'
  }),
  
  // Meta Models
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
  
  // Cohere Models
  withModelInfo({
    id: 'command-a',
    provider: 'cohere',
    name: 'command-a-03-2025',
    displayName: 'Command A'
  }),
  
  // AI21 Models
  withModelInfo({
    id: 'jamba-large',
    provider: 'ai21',
    name: 'jamba-large-1.7-2025-07',
    displayName: 'Jamba Large 1.7'
  }),
  
  // Moonshot AI Models (Kimi)
  withModelInfo({
    id: 'kimi-k2-instruct',
    provider: 'kimi',
    name: 'kimi-k2-instruct',
    displayName: 'Kimi K2 Instruct'
  }),
  withModelInfo({
    id: 'kimi-k1.5',
    provider: 'kimi',
    name: 'kimi-k1.5',
    displayName: 'Kimi k1.5'
  }),
  
  // Alibaba Models (Qwen)
  withModelInfo({
    id: 'qwen-3-235b',
    provider: 'qwen',
    name: 'qwen-3-235b-chat',
    displayName: 'Qwen 3 235B Chat'
  }),
  
  // Flux AI Models
  withModelInfo({
    id: 'flux-1.1',
    provider: 'flux',
    name: 'flux-1.1',
    displayName: 'Flux 1.1'
  }),
  
  // Mistral Multimodal (Pixtral)
  withModelInfo({
    id: 'pixtral-large',
    provider: 'mistral',
    name: 'pixtral-large',
    displayName: 'Pixtral Large'
  })
];


