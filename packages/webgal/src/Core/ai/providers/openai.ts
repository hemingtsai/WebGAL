/**
 * OpenAI AI Provider
 *
 * Implements the IAIProvider interface for OpenAI's API.
 * Full streaming support via SSE.
 * Base URL: https://api.openai.com/v1
 */

import { AIModel } from '../types';
import { ChatCompletionOptions, ChatCompletionResponse, IAIProvider, StreamCallback } from './base';
import { fetchChatCompletion, parseJSONResponse, parseSSEStream } from './streamUtils';

const OPENAI_MODELS: AIModel[] = [
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
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    capabilities: ['story_generation', 'choice_generation', 'scheduling'],
    maxTokens: 1000000,
    defaultTemperature: 0.7,
  },
];

export class OpenAIProvider implements IAIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly baseURL: string;
  readonly models: AIModel[];
  private apiKey: string;

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://api.openai.com/v1';
    this.models = OPENAI_MODELS;
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
