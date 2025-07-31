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

// Standard providers
export { openai } from '@ai-sdk/openai';
export { anthropic } from '@ai-sdk/anthropic';
export { google } from '@ai-sdk/google';
export { mistral } from '@ai-sdk/mistral';