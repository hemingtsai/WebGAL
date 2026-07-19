/**
 * DeepSeek AI Provider
 *
 * Implements the IAIProvider interface for DeepSeek's API.
 * Fetches available models from the API on initialization,
 * with hardcoded fallbacks for offline/error cases.
 * Base URL: https://api.deepseek.com/v1
 */

import { AIModel } from '../types';
import { ChatCompletionOptions, ChatCompletionResponse, IAIProvider, StreamCallback } from './base';
import { fetchChatCompletion, parseJSONResponse, parseSSEStream } from './streamUtils';
import { logger } from '@/Core/util/logger';

/** Hardcoded fallback models (used if API fetch fails) */
const FALLBACK_MODELS: AIModel[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    capabilities: ['story_generation', 'choice_generation', 'scheduling', 'translation', 'image_selection'],
    maxTokens: 65536,
    defaultTemperature: 0.7,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    capabilities: ['story_generation', 'choice_generation', 'scheduling'],
    maxTokens: 65536,
    defaultTemperature: 0.6,
  },
];

/** Infer capabilities from model ID/name */
function inferCapabilities(modelId: string, modelName: string): AIModel['capabilities'] {
  const id = modelId.toLowerCase();
  const name = modelName.toLowerCase();
  const caps: AIModel['capabilities'] = [];

  // All models can do basic tasks
  caps.push('story_generation', 'choice_generation');

  // Reasoner models
  if (id.includes('reasoner') || name.includes('reasoner') || name.includes('r1')) {
    caps.push('scheduling');
  }

  // Chat models
  if (id.includes('chat') || name.includes('chat') || name.includes('v3')) {
    caps.push('scheduling', 'translation', 'image_selection');
  }

  return caps;
}

export class DeepSeekProvider implements IAIProvider {
  readonly id = 'deepseek';
  readonly name = 'DeepSeek';
  readonly baseURL: string;
  models: AIModel[];
  private apiKey: string;
  private modelsFetched = false;

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://api.deepseek.com/v1';
    this.models = [...FALLBACK_MODELS];
  }

  async fetchModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const apiModels: AIModel[] = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: 'deepseek',
        capabilities: inferCapabilities(m.id, m.id),
        maxTokens: 65536,
        defaultTemperature: 0.7,
      }));

      if (apiModels.length > 0) {
        this.models = apiModels;
        logger.info(`[DeepSeek] Fetched ${apiModels.length} models from API`);
      }

      this.modelsFetched = true;
      return this.models;
    } catch (err: any) {
      logger.warn(`[DeepSeek] Failed to fetch models, using fallbacks: ${err.message}`);
      this.models = [...FALLBACK_MODELS];
      this.modelsFetched = true;
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
