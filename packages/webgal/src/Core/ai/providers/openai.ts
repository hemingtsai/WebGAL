/**
 * OpenAI AI Provider
 *
 * Implements the IAIProvider interface for OpenAI's API.
 * Fetches available models from API, with hardcoded fallbacks.
 * Base URL: https://api.openai.com/v1
 */

import { AIModel } from '../types';
import { ChatCompletionOptions, ChatCompletionResponse, IAIProvider, StreamCallback } from './base';
import { fetchChatCompletion, parseJSONResponse, parseSSEStream } from './streamUtils';
import { logger } from '@/Core/util/logger';

const FALLBACK_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    capabilities: ['story_generation', 'choice_generation', 'scheduling', 'translation'],
    maxTokens: 128000,
    defaultTemperature: 0.7,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    capabilities: ['story_generation', 'choice_generation', 'image_selection', 'translation'],
    maxTokens: 128000,
    defaultTemperature: 0.7,
  },
];

function inferCapabilities(id: string): AIModel['capabilities'] {
  const lower = id.toLowerCase();
  const caps: AIModel['capabilities'] = ['story_generation', 'choice_generation'];
  if (lower.includes('gpt-4')) caps.push('scheduling', 'translation');
  if (lower.includes('mini')) caps.push('image_selection');
  return caps;
}

export class OpenAIProvider implements IAIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly baseURL: string;
  models: AIModel[];
  private apiKey: string;

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://api.openai.com/v1';
    this.models = [...FALLBACK_MODELS];
  }

  async fetchModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const apiModels: AIModel[] = (data.data || [])
        .filter((m: any) => m.id && (m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3')))
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          provider: 'openai',
          capabilities: inferCapabilities(m.id),
          maxTokens: 128000,
          defaultTemperature: 0.7,
        }));

      if (apiModels.length > 0) {
        this.models = apiModels;
        logger.info(`[OpenAI] Fetched ${apiModels.length} models from API`);
      }

      return this.models;
    } catch (err: any) {
      logger.warn(`[OpenAI] Failed to fetch models, using fallbacks: ${err.message}`);
      this.models = [...FALLBACK_MODELS];
      return this.models;
    }
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await fetchChatCompletion(this.baseURL, this.apiKey, options, false);
    return parseJSONResponse(response, options.model);
  }

  async streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: StreamCallback,
  ): Promise<ChatCompletionResponse> {
    const response = await fetchChatCompletion(this.baseURL, this.apiKey, options, true);
    return parseSSEStream(response, options.model, onChunk);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getModel(modelId: string): AIModel | undefined {
    return this.models.find((m) => m.id === modelId);
  }
}
