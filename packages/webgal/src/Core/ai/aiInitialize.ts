/**
 * AI-Powered Game Initialization
 *
 * New entry point replacing the original initializeScript.
 * Steps:
 * 1. Load user config
 * 2. Init providers with API keys
 * 3. Generate first story segment (streaming to stage)
 * 4. Wire up click-to-continue for AI story flow
 */

import { WebGAL } from '@/Core/WebGAL';
import { logger } from '@/Core/util/logger';
import { getAIGameController, AIGameState } from '@/Core/ai/gameController';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { webgalStore } from '@/store/store';
import { setVisibility } from '@/store/GUIReducer';
import { stageStateManager } from '@/Core/Modules/stage/stageStateManager';

const DEFAULT_API_KEYS: Record<string, string> = {
  deepseek: '',  // User provides via UI
  openai: '',
};

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
    // Step 1: Init providers
    const providers = getProviderConfigs();
    aiController.initializeProviders(providers);

    // Step 2: Init engine with config
    await aiController.initializeGame();

    // Step 3: Generate the first story segment with streaming
    logger.info('[AI] Generating first story segment...');
    await aiController.startStoryStreaming();

    // Step 4: Hide title and show game
    webgalStore.dispatch(setVisibility({ component: 'showTitle', visibility: false }));
    webgalStore.dispatch(setVisibility({ component: 'showTextBox', visibility: true }));
  } catch (error: any) {
    logger.error('[AI] Failed to initialize AI game:', error);
  }

  WebGAL.aiController = aiController;
}

/**
 * Continue the AI story — called when user clicks to advance.
 * Uses streaming to show text in real-time.
 */
export async function continueAIStory(): Promise<void> {
  const aiController = WebGAL.aiController;
  if (!aiController || !aiController.isReady()) return;

  const state = aiController.getState();
  if (state === AIGameState.GENERATING) return; // Already generating

  try {
    logger.info('[AI] Continuing story...');
    await aiController.continueStoryStreaming();
  } catch (error: any) {
    logger.error('[AI] Failed to continue story:', error);
  }
}

/**
 * Handle user choice selection with streaming continuation.
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
 * Get provider configs from stored API keys
 */
function getProviderConfigs() {
  const configs: Array<{ provider: string; apiKey: string; baseURL?: string }> = [];

  for (const [provider] of Object.entries(DEFAULT_API_KEYS)) {
    const key = localStorage.getItem(`ai_api_key_${provider}`);
    if (key) {
      configs.push({ provider, apiKey: key });
    }
  }

  return configs;
}

/**
 * Set an API key for a provider
 */
export function setProviderApiKey(provider: string, apiKey: string): void {
  localStorage.setItem(`ai_api_key_${provider}`, apiKey);
  logger.info(`[AI] API key set for provider: ${provider}`);
}

/**
 * Get all configured API key providers
 */
export function getConfiguredProviders(): string[] {
  const providers: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('ai_api_key_')) {
      providers.push(key.replace('ai_api_key_', ''));
    }
  }
  return providers;
}
