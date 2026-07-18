/**
 * OpenAI-Compatible Streaming Mixin
 *
 * Shared SSE streaming implementation for providers that use
 * the OpenAI-compatible chat completion API format.
 * Both DeepSeek and OpenAI use the same streaming protocol.
 */

import { ChatCompletionOptions, ChatCompletionResponse, StreamCallback } from './base';

/**
 * Parse an SSE stream from an OpenAI-compatible API.
 * Calls onChunk for each text delta, returns the complete response.
 */
export async function parseSSEStream(
  response: Response,
  model: string,
  onChunk: StreamCallback,
): Promise<ChatCompletionResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let usage: ChatCompletionResponse['usage'];
  let finishReason: string | undefined;
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onChunk({ content: delta, done: false });
          }
          if (parsed.choices?.[0]?.finish_reason) {
            finishReason = parsed.choices[0].finish_reason;
          }
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens || 0,
              completionTokens: parsed.usage.completion_tokens || 0,
              totalTokens: parsed.usage.total_tokens || 0,
            };
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onChunk({ content: '', done: true, usage, finishReason });

  return {
    content: fullContent,
    model,
    usage,
    finishReason,
  };
}

/**
 * Helper to make a non-streaming chat completion request
 */
export async function fetchChatCompletion(
  baseURL: string,
  apiKey: string,
  options: ChatCompletionOptions,
  stream: boolean,
): Promise<Response> {
  const url = `${baseURL}/chat/completions`;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    stream,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response;
}

/**
 * Parse a non-streaming JSON response
 */
export async function parseJSONResponse(
  response: Response,
  model: string,
): Promise<ChatCompletionResponse> {
  const data = await response.json();

  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
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
