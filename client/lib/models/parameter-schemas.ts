/**
 * Model Parameter Schemas
 *
 * Defines supported parameters for each model to handle provider-specific differences.
 * Auto-generated from OpenRouter discovery, with manual overrides for special cases.
 *
 * Examples of parameter differences:
 * - OpenAI GPT-4: uses "max_tokens"
 * - OpenAI o3/GPT-5: uses "max_completion_tokens"
 * - OpenAI o3: doesn't support "temperature"
 * - Anthropic: temperature range 0-1 vs OpenAI 0-2
 */

export interface ParameterConfig {
  paramName: string;
  min?: number;
  max?: number;
  default: number | string | boolean;
  supported: boolean;
}

export interface ModelParameterSchema {
  modelId: string;
  supportedParameters: {
    maxTokens: {
      paramName: 'max_tokens' | 'max_completion_tokens' | 'maxOutputTokens';
      max: number;
      default: number;
    };
    temperature?: {
      paramName: 'temperature';
      min: number;
      max: number;
      default: number;
      supported: boolean;
    };
    topP?: {
      paramName: 'top_p';
      min: number;
      max: number;
      default: number;
      supported: boolean;
    };
    frequencyPenalty?: {
      paramName: 'frequency_penalty';
      min: number;
      max: number;
      default: number;
      supported: boolean;
    };
    presencePenalty?: {
      paramName: 'presence_penalty';
      min: number;
      max: number;
      default: number;
      supported: boolean;
    };
  };
}

/**
 * Parameter schemas for all models
 * Auto-populated by OpenRouter discovery, with manual overrides
 */
export const PARAMETER_SCHEMAS: Record<string, ModelParameterSchema> = {
  // OpenAI - Standard Models
  'gpt-4o': {
    modelId: 'gpt-4o',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 16384, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true },
      frequencyPenalty: { paramName: 'frequency_penalty', min: -2, max: 2, default: 0, supported: true },
      presencePenalty: { paramName: 'presence_penalty', min: -2, max: 2, default: 0, supported: true }
    }
  },

  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 16384, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true },
      frequencyPenalty: { paramName: 'frequency_penalty', min: -2, max: 2, default: 0, supported: true },
      presencePenalty: { paramName: 'presence_penalty', min: -2, max: 2, default: 0, supported: true }
    }
  },

  // OpenAI - GPT-5 Series (uses max_completion_tokens)
  'gpt-5-chat-latest': {
    modelId: 'gpt-5-chat-latest',
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 1000000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'gpt-5-mini': {
    modelId: 'gpt-5-mini',
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 1000000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'gpt-5-nano': {
    modelId: 'gpt-5-nano',
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 128000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  // OpenAI - Reasoning Models (no temperature support!)
  'o1': {
    modelId: 'o1',
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: false }
    }
  },

  'o1-mini': {
    modelId: 'o1-mini',
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 128000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: false }
    }
  },

  'o3': {
    modelId: 'o3',
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: false }
    }
  },

  'o3-mini': {
    modelId: 'o3-mini',
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: false }
    }
  },

  'o4-mini': {
    modelId: 'o4-mini',
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: false }
    }
  },

  // Anthropic - Claude Models (temperature 0-1 range)
  'claude-sonnet-4-5-20250929': {
    modelId: 'claude-sonnet-4-5-20250929',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 1, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'claude-opus-4-1-20250805': {
    modelId: 'claude-opus-4-1-20250805',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 1, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'claude-sonnet-4-20250514': {
    modelId: 'claude-sonnet-4-20250514',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 1, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'claude-opus-4-20250514': {
    modelId: 'claude-opus-4-20250514',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 1, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'claude-3-7-sonnet-20250219': {
    modelId: 'claude-3-7-sonnet-20250219',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 1, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'claude-3-5-sonnet-20241022': {
    modelId: 'claude-3-5-sonnet-20241022',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 1, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'claude-3-5-sonnet-20240620': {
    modelId: 'claude-3-5-sonnet-20240620',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 1, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'claude-3-opus-20240229': {
    modelId: 'claude-3-opus-20240229',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 200000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 1, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  // Google - Gemini Models
  'gemini-2.5-pro': {
    modelId: 'gemini-2.5-pro',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 2000000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'gemini-2.5-flash': {
    modelId: 'gemini-2.5-flash',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 1048576, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'gemini-2.5-flash-lite': {
    modelId: 'gemini-2.5-flash-lite',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 1048576, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'gemini-2.0-flash': {
    modelId: 'gemini-2.0-flash',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 1048576, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'gemini-1.5-pro': {
    modelId: 'gemini-1.5-pro',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 2000000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'gemini-1.5-flash': {
    modelId: 'gemini-1.5-flash',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 1000000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  },

  'gemini-1.5-flash-8b': {
    modelId: 'gemini-1.5-flash-8b',
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 1000000, default: 4096 },
      temperature: { paramName: 'temperature', min: 0, max: 2, default: 1, supported: true },
      topP: { paramName: 'top_p', min: 0, max: 1, default: 1, supported: true }
    }
  }

  // Additional models will be auto-generated by discovery script
};

/**
 * Get parameter schema for a model
 */
export function getParameterSchema(modelId: string): ModelParameterSchema | undefined {
  return PARAMETER_SCHEMAS[modelId];
}

/**
 * Check if a model supports a specific parameter
 */
export function supportsParameter(modelId: string, paramName: string): boolean {
  const schema = getParameterSchema(modelId);
  if (!schema) return true; // Unknown models = assume supported

  switch (paramName) {
    case 'temperature':
      return schema.supportedParameters.temperature?.supported ?? true;
    case 'top_p':
      return schema.supportedParameters.topP?.supported ?? true;
    case 'frequency_penalty':
      return schema.supportedParameters.frequencyPenalty?.supported ?? false;
    case 'presence_penalty':
      return schema.supportedParameters.presencePenalty?.supported ?? false;
    default:
      return true;
  }
}

/**
 * Get the correct parameter name for max tokens based on model
 */
export function getMaxTokensParamName(modelId: string): string {
  const schema = getParameterSchema(modelId);
  return schema?.supportedParameters.maxTokens.paramName || 'max_tokens';
}
