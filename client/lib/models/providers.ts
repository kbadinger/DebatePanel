import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';

// OpenAI-compatible providers using custom base URLs
export const xai = createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.XAI_API_KEY,
});

export const perplexity = createOpenAI({
  baseURL: 'https://api.perplexity.ai',
  apiKey: process.env.PERPLEXITY_API_KEY,
});

export const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Meta/Llama via OpenRouter (using OpenAI-compatible API)
// Note: Meta doesn't have a direct API yet, so we route through OpenRouter
// This gives us access to Llama models with unified billing
export const meta = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://debatepanel.com',
    'X-Title': 'DebatePanel'
  }
});

// Kimi/Moonshot AI
export const kimi = createOpenAI({
  baseURL: 'https://api.moonshot.ai/v1',
  apiKey: process.env.KIMI_API_KEY,
});

// Standard providers
export { openai } from '@ai-sdk/openai';
export { anthropic } from '@ai-sdk/anthropic';
export { mistral } from '@ai-sdk/mistral';

// Configure Google provider with custom API key
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
