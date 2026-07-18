/**
 * AI Module Index
 *
 * Barrel export for all AI-related modules.
 */

export * from './types';
export { AIScheduler, getScheduler, resetScheduler } from './scheduler';
export { AIStoryEngine, createStoryEngine } from './storyEngine';
export {
  buildStoryGenerationPrompt,
  buildChoiceGenerationPrompt,
  buildImageSelectionPrompt,
} from './promptBuilder';
export {
  AIGameController,
  getAIGameController,
  resetAIGameController,
  AIGameState,
} from './gameController';
export type { ProviderInitConfig } from './gameController';

// Script Converter
export {
  aiScriptToScene,
  createSaySentence,
  createChangeBgSentence,
  createChangeFigureSentence,
  createChoiceSentence,
  createSetVarSentence,
  createChangeSceneSentence,
  createEndSentence,
} from './scriptConverter';

export * from './aiInitialize';
export { setProviderApiKey, getConfiguredProviders } from './aiInitialize';

// Memory Manager
export { ContextMemoryManager, getMemoryManager, resetMemoryManager, estimateTokens } from './memoryManager';
export type { MemoryConfig } from './memoryManager';

// BGM Manager
export { AIBGMManager, getBGM } from './bgmManager';
export type { BGMMoodMap } from './bgmManager';

// Providers
export type { IAIProvider, ChatCompletionOptions, ChatCompletionResponse } from './providers/base';
export { DeepSeekProvider } from './providers/deepseek';
export { OpenAIProvider } from './providers/openai';
