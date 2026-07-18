/**
 * AI-Powered Game Initialization
 *
 * Replaces the hardcoded script-based initialization with an AI-driven flow:
 * 1. Load user story configuration (world, characters, scenes)
 * 2. Initialize AI providers with API keys
 * 3. Generate the first story segment via AI
 * 4. Convert AI output to WebGAL script format
 * 5. Inject into the game engine for execution
 *
 * This is called instead of the original initializeScript's start.txt loading.
 */

import { WebGAL } from '@/Core/WebGAL';
import { logger } from '@/Core/util/logger';
import { getAIGameController } from '@/Core/ai/gameController';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { aiScriptToScene } from '@/Core/ai/scriptConverter';

/** API key configuration — in production, these would be user-provided */
const DEFAULT_API_KEYS: Record<string, string> = {
  deepseek: '',  // User provides via UI
  openai: '',    // User provides via UI
};

/**
 * Initialize the AI-powered game engine.
 * This is the new entry point that replaces the original initializeScript.
 */
export async function initializeAIGame(): Promise<void> {
  logger.info('[AI] Initializing AI-powered game engine...');

  const configManager = getConfigManager();
  const aiController = getAIGameController();

  // Check if user has configured the story
  if (!configManager.isReady()) {
    logger.info('[AI] Story not configured yet — showing setup UI');
    WebGAL.aiController = aiController;
    // The setup UI will be shown by the React layer
    return;
  }

  try {
    // Step 1: Initialize AI providers
    const providers = getProviderConfigs();
    aiController.initializeProviders(providers);

    // Step 2: Initialize game with story config
    await aiController.initializeGame();

    // Step 3: Generate the first story segment
    logger.info('[AI] Generating first story segment...');
    const output = await aiController.startStory();

    if (output) {
      // Step 4: Convert AI output to WebGAL scene
      const scriptText = aiController.outputToWebGALScript(output);
      logger.info('[AI] Generated script:', scriptText);

      const scene = aiScriptToScene(scriptText, 'start');

      // Step 5: Inject into WebGAL engine
      WebGAL.sceneManager.sceneData.currentScene = scene;
      WebGAL.sceneManager.settledScenes.add('dynamic://start');
      WebGAL.flowchartManager.waitForCurrentSceneDialog();

      // Step 6: Select images based on generated text
      const contentText = output.script || output.summary;
      if (contentText) {
        aiController.selectImages(contentText).then((imageSelection) => {
          if (imageSelection) {
            logger.info('[AI] Image selection:', imageSelection);
            // Apply image selection to stage state
            applyImageSelection(imageSelection);
          }
        });
      }
    }
  } catch (error: any) {
    logger.error('[AI] Failed to initialize AI game:', error);
    // Fall back to showing setup UI
  }

  WebGAL.aiController = aiController;
}

/**
 * Continue the AI-generated story (called when user clicks to advance)
 */
export async function continueAIStory(): Promise<void> {
  const aiController = WebGAL.aiController;
  if (!aiController || !aiController.isReady()) return;

  try {
    const output = await aiController.continueStory();
    if (output) {
      const scriptText = aiController.outputToWebGALScript(output);
      const scene = aiScriptToScene(scriptText, `ai_segment_${Date.now()}`);

      // Replace the current scene with the new AI-generated content
      WebGAL.sceneManager.sceneData.currentScene = scene;
      WebGAL.sceneManager.sceneData.currentSentenceId = 0;
      WebGAL.sceneManager.settledScenes.clear();
      WebGAL.sceneManager.settledScenes.add(`dynamic://${Date.now()}`);

      // Select images
      const contentText = output.script || output.summary;
      if (contentText) {
        aiController.selectImages(contentText).then((imageSelection) => {
          if (imageSelection) {
            applyImageSelection(imageSelection);
          }
        });
      }
    }
  } catch (error: any) {
    logger.error('[AI] Failed to continue story:', error);
  }
}

/**
 * Handle user choice selection
 */
export async function handleAIChoice(optionIndex: number): Promise<void> {
  const aiController = WebGAL.aiController;
  if (!aiController) return;

  try {
    const output = await aiController.selectChoice(optionIndex);
    if (output) {
      const scriptText = aiController.outputToWebGALScript(output);
      const scene = aiScriptToScene(scriptText, `ai_choice_${Date.now()}`);

      WebGAL.sceneManager.sceneData.currentScene = scene;
      WebGAL.sceneManager.sceneData.currentSentenceId = 0;
      WebGAL.sceneManager.settledScenes.clear();
      WebGAL.sceneManager.settledScenes.add(`dynamic://${Date.now()}`);
    }
  } catch (error: any) {
    logger.error('[AI] Failed to handle choice:', error);
  }
}

/**
 * Get provider configurations from stored API keys
 */
function getProviderConfigs() {
  const configs: Array<{ provider: string; apiKey: string; baseURL?: string }> = [];

  // Get API keys from localStorage
  for (const [provider, defaultKey] of Object.entries(DEFAULT_API_KEYS)) {
    const key = localStorage.getItem(`ai_api_key_${provider}`) || defaultKey;
    if (key) {
      configs.push({ provider, apiKey: key });
    }
  }

  return configs;
}

/**
 * Apply image selection to the WebGAL stage state
 */
function applyImageSelection(imageSelection: any): void {
  // This would update the stage state to show the selected images
  // Implementation depends on the current stage state structure
  if (imageSelection.backgroundImageId) {
    // WebGAL.stageManager.setStage('bgName', imageSelection.backgroundImageId);
  }
  if (imageSelection.characterImages) {
    for (const [charId, imageId] of Object.entries(imageSelection.characterImages)) {
      // WebGAL.stageManager... set character image
    }
  }
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
