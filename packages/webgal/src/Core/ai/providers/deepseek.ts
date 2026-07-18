/**
 * DeepSeek AI Provider
 *
 * Implements the IAIProvider interface for DeepSeek's API.
 * Uses OpenAI-compatible API format with full streaming support.
 * Base URL: https://api.deepseek.com/v1
 */

import { AIModel } from '../types';
import { ChatCompletionOptions, ChatCompletionResponse, IAIProvider, StreamCallback } from './base';
import { fetchChatCompletion, parseJSONResponse, parseSSEStream } from './streamUtils';

const DEEPSEEK_MODELS: AIModel[] = [
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

export class DeepSeekProvider implements IAIProvider {
  readonly id = 'deepseek';
  readonly name = 'DeepSeek';
  readonly baseURL: string;
  readonly models: AIModel[];
  private apiKey: string;

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://api.deepseek.com/v1';
    this.models = DEEPSEEK_MODELS;
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
