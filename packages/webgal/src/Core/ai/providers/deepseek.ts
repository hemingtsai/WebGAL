/**
 * DeepSeek AI Provider
 *
 * Implements the IAIProvider interface for DeepSeek's API.
 * DeepSeek uses an OpenAI-compatible API format.
 * Base URL: https://api.deepseek.com/v1
 */

import { AIModel } from '../types';
import { ChatCompletionOptions, ChatCompletionResponse, IAIProvider } from './base';

const DEEPSEEK_MODELS: AIModel[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    capabilities: ['story_generation', 'choice_generation', 'scheduling', 'translation'],
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
    const url = `${this.baseURL}/chat/completions`;

    const body = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || options.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
      finishReason: data.choices?.[0]?.finish_reason,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
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
