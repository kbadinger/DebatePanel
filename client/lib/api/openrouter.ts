/**
 * OpenRouter Runtime Client
 *
 * Handles inference requests to OpenRouter for models routed via OpenRouter.
 * Used for fringe models without direct API integrations.
 */

import { ModelRequest } from './request-builder';

export interface OpenRouterResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * Call OpenRouter API for inference
 */
export async function callOpenRouter(
  modelId: string,
  request: ModelRequest
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY not configured. This model requires OpenRouter routing.'
    );
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://debatepanel.com',
        'X-Title': 'DebatePanel'
      },
      body: JSON.stringify({
        model: modelId,
        ...request
      })
    });

    if (!response.ok) {
      const error: OpenRouterError = await response.json();
      throw new Error(
        `OpenRouter API error (${response.status}): ${error.error?.message || response.statusText}`
      );
    }

    const data: OpenRouterResponse = await response.json();
    return data;
  } catch (error) {
    console.error(`OpenRouter API call failed for model ${modelId}:`, error);
    throw error;
  }
}

/**
 * Stream from OpenRouter (for future streaming support)
 */
export async function streamOpenRouter(
  modelId: string,
  request: ModelRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY not configured. This model requires OpenRouter routing.'
    );
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://debatepanel.com',
        'X-Title': 'DebatePanel'
      },
      body: JSON.stringify({
        model: modelId,
        ...request,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

      for (const line of lines) {
        const data = line.replace('data: ', '');
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  } catch (error) {
    console.error(`OpenRouter streaming failed for model ${modelId}:`, error);
    throw error;
  }
}

/**
 * Get model info from OpenRouter
 */
export async function getOpenRouterModelInfo(modelId: string): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data.find((model: any) => model.id === modelId);
  } catch (error) {
    console.error('Failed to fetch OpenRouter model info:', error);
    return null;
  }
}
