/**
 * Universal Request Builder
 *
 * Builds API requests for any model, adapting to provider-specific parameter differences.
 * Uses parameter schemas to ensure correct parameter names and support.
 */

import { getParameterSchema, getMaxTokensParamName, supportsParameter } from '../models/parameter-schemas';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RequestPreferences {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ModelRequest {
  messages: Message[];
  [key: string]: any; // Allow additional provider-specific params
}

/**
 * Build a model request with correct parameters for the specific model
 */
export function buildModelRequest(
  modelId: string,
  messages: Message[],
  preferences: RequestPreferences = {}
): ModelRequest {
  const schema = getParameterSchema(modelId);
  const request: ModelRequest = { messages };

  // Max tokens - use correct parameter name
  const maxTokensParamName = getMaxTokensParamName(modelId);
  const maxTokens = preferences.maxTokens ?? schema?.supportedParameters.maxTokens.default ?? 4096;
  request[maxTokensParamName] = maxTokens;

  // Temperature - only if supported
  if (supportsParameter(modelId, 'temperature')) {
    const tempDefault = schema?.supportedParameters.temperature?.default ?? 1;
    const tempMax = schema?.supportedParameters.temperature?.max ?? 2;
    const tempMin = schema?.supportedParameters.temperature?.min ?? 0;

    let temperature = preferences.temperature ?? tempDefault;
    // Clamp to valid range
    temperature = Math.max(tempMin, Math.min(tempMax, temperature));
    request.temperature = temperature;
  }

  // Top P - only if supported
  if (supportsParameter(modelId, 'top_p') && preferences.topP !== undefined) {
    request.top_p = Math.max(0, Math.min(1, preferences.topP));
  }

  // Frequency penalty - only if supported
  if (supportsParameter(modelId, 'frequency_penalty') && preferences.frequencyPenalty !== undefined) {
    request.frequency_penalty = Math.max(-2, Math.min(2, preferences.frequencyPenalty));
  }

  // Presence penalty - only if supported
  if (supportsParameter(modelId, 'presence_penalty') && preferences.presencePenalty !== undefined) {
    request.presence_penalty = Math.max(-2, Math.min(2, preferences.presencePenalty));
  }

  return request;
}

/**
 * Validate request parameters against model schema
 */
export function validateRequest(modelId: string, request: ModelRequest): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const schema = getParameterSchema(modelId);

  if (!schema) {
    warnings.push(`No parameter schema found for model: ${modelId}. Assuming all parameters supported.`);
    return { valid: true, warnings };
  }

  // Check for unsupported parameters
  if (request.temperature !== undefined && !supportsParameter(modelId, 'temperature')) {
    warnings.push(`Model ${modelId} does not support temperature parameter. It will be ignored.`);
  }

  if (request.top_p !== undefined && !supportsParameter(modelId, 'top_p')) {
    warnings.push(`Model ${modelId} does not support top_p parameter. It will be ignored.`);
  }

  // Check max tokens limits
  const maxTokensParamName = getMaxTokensParamName(modelId);
  const maxTokensValue = request[maxTokensParamName];
  const maxAllowed = schema.supportedParameters.maxTokens.max;

  if (maxTokensValue && maxTokensValue > maxAllowed) {
    warnings.push(`Requested ${maxTokensValue} tokens exceeds model limit of ${maxAllowed}. Consider reducing.`);
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Sanitize request by removing unsupported parameters
 */
export function sanitizeRequest(modelId: string, request: ModelRequest): ModelRequest {
  const sanitized = { ...request };

  // Remove unsupported parameters
  if (!supportsParameter(modelId, 'temperature')) {
    delete sanitized.temperature;
  }

  if (!supportsParameter(modelId, 'top_p')) {
    delete sanitized.top_p;
  }

  if (!supportsParameter(modelId, 'frequency_penalty')) {
    delete sanitized.frequency_penalty;
  }

  if (!supportsParameter(modelId, 'presence_penalty')) {
    delete sanitized.presence_penalty;
  }

  return sanitized;
}

/**
 * Get default request for a model (with no custom preferences)
 */
export function getDefaultRequest(modelId: string, messages: Message[]): ModelRequest {
  return buildModelRequest(modelId, messages, {});
}
