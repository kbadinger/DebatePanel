import { ModelProvider } from '@/types/debate';

export const PROVIDER_API_KEYS: Record<ModelProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GEMINI_API_KEY',
  xai: 'XAI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  meta: 'LLAMA_API_KEY',
  cohere: 'COHERE_API_KEY',
  ai21: 'AI21_API_KEY',
  kimi: 'KIMI_API_KEY',
  qwen: 'QWEN_API_KEY',
  flux: 'FLUX_API_KEY'
};

export function hasApiKey(provider: ModelProvider): boolean {
  const envVar = PROVIDER_API_KEYS[provider];
  return !!process.env[envVar];
}

export function getConfiguredProviders(): ModelProvider[] {
  return (Object.keys(PROVIDER_API_KEYS) as ModelProvider[])
    .filter(provider => hasApiKey(provider));
}