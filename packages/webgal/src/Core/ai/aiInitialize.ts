/**
 * AI-Powered Game Initialization
 *
 * New entry point replacing the original initializeScript.
 * API keys are loaded from environment variables (.env) by default,
 * with localStorage as an override for users who want to use different keys.
 *
 * Priority: localStorage > .env > default
 */

import { WebGAL } from '@/Core/WebGAL';
import { logger } from '@/Core/util/logger';
import { getAIGameController, AIGameState } from '@/Core/ai/gameController';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { webgalStore } from '@/store/store';
import { setVisibility } from '@/store/GUIReducer';

// ============================================================
// API Key Configuration
// ============================================================

/**
 * Read API key from Vite environment variables.
 * Vite exposes VITE_* vars via import.meta.env at build time.
 * Priority: localStorage (user-set in UI) > .env file > default
 */
function getApiKey(provider: string): string {
  // 1. Check localStorage (user manually set via UI)
  const localKey = localStorage.getItem(`ai_api_key_${provider}`);
  if (localKey) return localKey;

  // 2. Check Vite env vars (from .env file)
  const envKeyMap: Record<string, string | undefined> = {
    deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined,
    openai: import.meta.env.VITE_OPENAI_API_KEY as string | undefined,
  };
  const envKey = envKeyMap[provider];
  if (envKey) return envKey;

  return '';
}

/**
 * Get all available provider configs (with valid API keys).
 */
function getProviderConfigs() {
  const configs: Array<{ provider: string; apiKey: string; baseURL?: string }> = [];
  const providers = ['deepseek', 'openai'];

  for (const provider of providers) {
    const key = getApiKey(provider);
    if (key) {
      configs.push({ provider, apiKey: key });
    }
  }

  return configs;
}

// ============================================================
// Public API
// ============================================================

/**
 * Initialize the AI-powered game engine.
 */
export async function initializeAIGame(): Promise<void> {
  logger.info('[AI] Initializing AI-powered game engine...');

  const configManager = getConfigManager();
  const aiController = getAIGameController();

  if (!configManager.isReady()) {
    logger.info('[AI] Story not configured yet — showing setup UI');
    WebGAL.aiController = aiController;
    return;
  }

  try {
    const providers = getProviderConfigs();
    if (providers.length === 0) {
      logger.warn('[AI] No API keys configured — showing setup UI');
      WebGAL.aiController = aiController;
      return;
    }

    aiController.initializeProviders(providers);
    await aiController.initializeGame();

    logger.info('[AI] Generating first story segment...');
    await aiController.startStoryStreaming();

    webgalStore.dispatch(setVisibility({ component: 'showTitle', visibility: false }));
    webgalStore.dispatch(setVisibility({ component: 'showTextBox', visibility: true }));
  } catch (error: any) {
    logger.error('[AI] Failed to initialize AI game:', error);
  }

  WebGAL.aiController = aiController;
}

/**
 * Continue the AI story — called when user clicks to advance.
 */
export async function continueAIStory(): Promise<void> {
  const aiController = WebGAL.aiController;
  if (!aiController || !aiController.isReady()) return;

  const state = aiController.getState();
  if (state === AIGameState.GENERATING) return;

  try {
    logger.info('[AI] Continuing story...');
    await aiController.continueStoryStreaming();
  } catch (error: any) {
    logger.error('[AI] Failed to continue story:', error);
  }
}

/**
 * Handle user choice selection.
 */
export async function handleAIChoice(optionIndex: number): Promise<void> {
  const aiController = WebGAL.aiController;
  if (!aiController) return;

  try {
    logger.info(`[AI] User selected choice ${optionIndex}`);
    await aiController.selectChoiceStreaming(optionIndex);
  } catch (error: any) {
    logger.error('[AI] Failed to handle choice:', error);
  }
}

/**
 * Set an API key for a provider (saves to localStorage, overrides .env).
 */
export function setProviderApiKey(provider: string, apiKey: string): void {
  localStorage.setItem(`ai_api_key_${provider}`, apiKey);
  logger.info(`[AI] API key set for provider: ${provider}`);
}

/**
 * Get all configured API key providers (from any source).
 */
export function getConfiguredProviders(): string[] {
  const providers: string[] = [];
  const allProviders = ['deepseek', 'openai'];

  for (const p of allProviders) {
    if (getApiKey(p)) {
      providers.push(p);
    }
  }

  return providers;
}

/**
 * Check if the API key comes from env (vs localStorage).
 */
export function isApiKeyFromEnv(provider: string): boolean {
  const localKey = localStorage.getItem(`ai_api_key_${provider}`);
  if (localKey) return false;

  const envKeyMap: Record<string, string | undefined> = {
    deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined,
    openai: import.meta.env.VITE_OPENAI_API_KEY as string | undefined,
  };
  return !!envKeyMap[provider];
}
