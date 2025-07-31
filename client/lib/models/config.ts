import { Model } from '@/types/debate';
import { MODEL_PRICING, getCostEmoji } from './pricing';

// Helper to add cost info to models
function withCostInfo(model: Omit<Model, 'costInfo'>): Model {
  const pricing = MODEL_PRICING[model.id];
  if (!pricing) return model as Model;
  
  return {
    ...model,
    costInfo: {
      estimatedCostPerResponse: pricing.providerBaseCost * (1 + pricing.platformMarkup),
      category: pricing.costCategory,
      emoji: getCostEmoji(pricing.costCategory)
    }
  };
}

export const AVAILABLE_MODELS: Model[] = [
  // OpenAI Models
  withCostInfo({
    id: 'gpt-4.1',
    provider: 'openai',
    name: 'gpt-4.1',
    displayName: 'GPT-4.1'
  }),
  withCostInfo({
    id: 'gpt-4.1-mini',
    provider: 'openai',
    name: 'gpt-4.1-mini',
    displayName: 'GPT-4.1 Mini'
  }),
  withCostInfo({
    id: 'o3',
    provider: 'openai',
    name: 'o3',
    displayName: 'o3'
  }),
  withCostInfo({
    id: 'o4-mini',
    provider: 'openai',
    name: 'o4-mini',
    displayName: 'o4 Mini'
  }),
  
  // Anthropic Models
  withCostInfo({
    id: 'claude-opus-4',
    provider: 'anthropic',
    name: 'claude-opus-4',
    displayName: 'Claude Opus 4'
  }),
  withCostInfo({
    id: 'claude-sonnet-4',
    provider: 'anthropic',
    name: 'claude-sonnet-4',
    displayName: 'Claude Sonnet 4'
  }),
  withCostInfo({
    id: 'claude-3.7-sonnet',
    provider: 'anthropic',
    name: 'claude-3.7-sonnet',
    displayName: 'Claude 3.7 Sonnet'
  }),
  
  // Google Models
  withCostInfo({
    id: 'gemini-2.5-pro',
    provider: 'google',
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro'
  }),
  withCostInfo({
    id: 'gemini-2.5-flash',
    provider: 'google',
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash'
  }),
  
  // X.AI Models (Grok)
  withCostInfo({
    id: 'grok-4',
    provider: 'xai',
    name: 'grok-4-0709',
    displayName: 'Grok 4'
  }),
  withCostInfo({
    id: 'grok-3',
    provider: 'xai',
    name: 'grok-3',
    displayName: 'Grok 3'
  }),
  
  // Perplexity Models
  withCostInfo({
    id: 'sonar-pro',
    provider: 'perplexity',
    name: 'sonar-pro',
    displayName: 'Perplexity Sonar Pro'
  }),
  withCostInfo({
    id: 'sonar',
    provider: 'perplexity',
    name: 'sonar',
    displayName: 'Perplexity Sonar'
  }),
  
  // DeepSeek Models
  withCostInfo({
    id: 'deepseek-chat',
    provider: 'deepseek',
    name: 'deepseek-chat',
    displayName: 'DeepSeek V3'
  }),
  withCostInfo({
    id: 'deepseek-reasoner',
    provider: 'deepseek',
    name: 'deepseek-reasoner',
    displayName: 'DeepSeek R1'
  }),
  
  // Mistral Models
  withCostInfo({
    id: 'mistral-medium-3',
    provider: 'mistral',
    name: 'mistral-medium-2505',
    displayName: 'Mistral Medium 3'
  }),
  withCostInfo({
    id: 'magistral-medium',
    provider: 'mistral',
    name: 'magistral-medium-2506',
    displayName: 'Magistral Medium'
  }),
  
  // Meta Models
  withCostInfo({
    id: 'llama-3.3-70b',
    provider: 'meta',
    name: 'llama-3.3-70b-instruct',
    displayName: 'Llama 3.3 70B Instruct'
  }),
  withCostInfo({
    id: 'llama-3.1-405b',
    provider: 'meta',
    name: 'llama-3.1-405b-instruct',
    displayName: 'Llama 3.1 405B Instruct'
  }),
  
  // Cohere Models
  withCostInfo({
    id: 'command-a',
    provider: 'cohere',
    name: 'command-a-03-2025',
    displayName: 'Command A'
  }),
  
  // AI21 Models
  withCostInfo({
    id: 'jamba-large',
    provider: 'ai21',
    name: 'jamba-large-1.7-2025-07',
    displayName: 'Jamba Large 1.7'
  }),
  
  // Moonshot AI Models (Kimi)
  withCostInfo({
    id: 'kimi-k2-instruct',
    provider: 'kimi',
    name: 'kimi-k2-instruct',
    displayName: 'Kimi K2 Instruct'
  }),
  withCostInfo({
    id: 'kimi-k1.5',
    provider: 'kimi',
    name: 'kimi-k1.5',
    displayName: 'Kimi k1.5'
  }),
  
  // Alibaba Models (Qwen)
  withCostInfo({
    id: 'qwen-3-235b',
    provider: 'qwen',
    name: 'qwen-3-235b-chat',
    displayName: 'Qwen 3 235B Chat'
  }),
  
  // Flux AI Models
  withCostInfo({
    id: 'flux-1.1',
    provider: 'flux',
    name: 'flux-1.1',
    displayName: 'Flux 1.1'
  }),
  
  // Mistral Multimodal (Pixtral)
  withCostInfo({
    id: 'pixtral-large',
    provider: 'mistral',
    name: 'pixtral-large',
    displayName: 'Pixtral Large'
  })
];