/**
 * Context Memory Manager
 *
 * Manages AI context window by summarizing old conversation history
 * when the story gets too long. This prevents token limit issues
 * and keeps the AI focused on the current story state.
 */

import {
  StoryState,
  StoryEvent,
  ChatMessage,
  StoryConfig,
} from './types';
import { getScheduler } from './scheduler';
import { v4 as uuidv4 } from 'uuid';

/** Configuration for memory management */
export interface MemoryConfig {
  /** Maximum number of history events to keep before summarizing */
  maxRecentEvents: number;
  /** Maximum estimated tokens before triggering summarization */
  maxContextTokens: number;
  /** Whether to use AI for summarization (otherwise uses simple truncation) */
  useAISummarization: boolean;
}

const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxRecentEvents: 20,
  maxContextTokens: 8000,
  useAISummarization: true,
};

export class ContextMemoryManager {
  private config: MemoryConfig;
  /** Accumulated summaries of older events */
  private summaries: string[] = [];

  constructor(config?: Partial<MemoryConfig>) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  /**
   * Check if context needs trimming and handle it.
   * Returns a summary of trimmed events if summarization occurred.
   */
  async manageContext(state: StoryState): Promise<string | null> {
    const { history } = state;
    if (history.length <= this.config.maxRecentEvents) {
      return null; // No trimming needed
    }

    const eventsToSummarize = history.slice(
      0,
      history.length - this.config.maxRecentEvents,
    );

    if (eventsToSummarize.length === 0) return null;

    if (this.config.useAISummarization) {
      const summary = await this.summarizeEvents(eventsToSummarize, state.config);
      this.summaries.push(summary);

      // Trim history in-place
      state.history = history.slice(-this.config.maxRecentEvents);

      return summary;
    } else {
      // Simple truncation: just keep a note
      const summary = `[前略：${eventsToSummarize.length} 段剧情]`;
      this.summaries.push(summary);
      state.history = history.slice(-this.config.maxRecentEvents);
      return summary;
    }
  }

  /**
   * Get all accumulated summaries as context for the AI.
   */
  getSummaryContext(): string {
    if (this.summaries.length === 0) return '';
    return `## 之前的故事摘要\n${this.summaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`;
  }

  /**
   * Get current memory statistics
   */
  getStats(): { summaryCount: number; totalSummarizedEvents: number } {
    return {
      summaryCount: this.summaries.length,
      totalSummarizedEvents: this.summaries.reduce(
        (acc, s) => acc + (s.match(/段剧情/g)?.length || 0),
        0,
      ),
    };
  }

  /**
   * Reset memory
   */
  reset(): void {
    this.summaries = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  // ============================================================
  // Private
  // ============================================================

  /**
   * Use AI to summarize a batch of story events.
   */
  private async summarizeEvents(
    events: StoryEvent[],
    config: StoryConfig,
  ): Promise<string> {
    const eventText = events
      .map((e) => {
        if (e.type === 'dialogue' && e.speaker) {
          const char = config.characters.find((c) => c.id === e.speaker);
          return `${char?.name || e.speaker}: "${e.content}"`;
        }
        if (e.type === 'choice') return `【选项】${e.content}`;
        if (e.type === 'scene_change') return `【场景切换】`;
        return e.content;
      })
      .join('\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个故事摘要助手。用1-2句话概括以下剧情片段，保留关键情节、角色动向和重要事件。`,
      },
      {
        role: 'user',
        content: `请概括以下剧情：\n${eventText.slice(0, 2000)}`,
      },
    ];

    try {
      const scheduler = getScheduler();
      const result = await scheduler.executeTask({
        id: uuidv4(),
        taskType: 'generate_story',
        messages,
        options: {
          temperature: 0.3,
          maxTokens: 200,
        },
      });

      if (result.success) {
        return result.content.trim();
      }
    } catch {
      // Fallback to simple truncation
    }

    return `[前略：${events.length} 段剧情]`;
  }
}

/** Estimate token count for a string (rough approximation: ~4 chars per token for Chinese, ~1 word per token for English) */
export function estimateTokens(text: string): number {
  // Count Chinese characters (each ~1-2 tokens)
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // Count English words
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  // Count other chars roughly
  const otherChars = text.length - chineseChars - englishWords;

  return Math.ceil(chineseChars * 1.5 + englishWords * 0.3 + otherChars * 0.25);
}

/** Global memory manager instance */
let globalMemoryManager: ContextMemoryManager | null = null;

export function getMemoryManager(): ContextMemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new ContextMemoryManager();
  }
  return globalMemoryManager;
}

export function resetMemoryManager(): void {
  globalMemoryManager?.reset();
  globalMemoryManager = null;
}
