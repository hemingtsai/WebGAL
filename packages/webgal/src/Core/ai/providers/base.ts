/**
 * Base AI Provider Interface
 *
 * All AI providers must implement this interface to be used by the scheduler.
 * Supports both batch (one-shot) and streaming (SSE) chat completions.
 * The interface follows an OpenAI-compatible chat completion pattern since
 * most providers (DeepSeek, OpenAI, etc.) support this format.
 */

import { AIModel, ChatMessage, TokenUsage } from '../types';

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

/** A single chunk from a streaming response */
export interface StreamChunk {
  /** Delta content (accumulated or per-chunk) */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Usage info, only present on final chunk */
  usage?: TokenUsage;
  /** Finish reason, only present on final chunk */
  finishReason?: string;
}

/** Callback for streaming chunks */
export type StreamCallback = (chunk: StreamChunk) => void;

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
   * Send a chat completion request (batch/one-shot)
   */
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  /**
   * Send a streaming chat completion request.
   * Calls onChunk for each text delta, returns the full response at the end.
   */
  streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: StreamCallback,
  ): Promise<ChatCompletionResponse>;

  /**
   * Check if the provider is healthy/available
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get a specific model by ID
   */
  getModel(modelId: string): AIModel | undefined;
}
