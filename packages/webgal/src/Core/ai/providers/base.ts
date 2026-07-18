/**
 * Base AI Provider Interface
 *
 * All AI providers must implement this interface to be used by the scheduler.
 * The interface follows an OpenAI-compatible chat completion pattern since
 * most providers (DeepSeek, OpenAI, etc.) support this format.
 */

import { AIModel, ChatMessage, TaskResult, TokenUsage } from '../types';

/** Options for a chat completion request */
export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/** Raw API response from an AI provider */
export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: TokenUsage;
  finishReason?: string;
}

/**
 * Base AI Provider Interface
 */
export interface IAIProvider {
  /** Unique provider ID */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Base URL for API requests */
  readonly baseURL: string;
  /** Available models for this provider */
  readonly models: AIModel[];

  /**
   * Send a chat completion request
   */
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  /**
   * Check if the provider is healthy/available
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get a specific model by ID
   */
  getModel(modelId: string): AIModel | undefined;
}
