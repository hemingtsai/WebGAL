/**
 * AI Game Controller
 *
 * Integrates AI-powered story generation with WebGAL's existing game engine.
 * Replaces the hardcoded script-based story flow with dynamic AI generation.
 *
 * Flow:
 * 1. User sets up world, characters, scenes, and story beginning
 * 2. AI generates the first story segment
 * 3. Story segment is converted to WebGAL script format
 * 4. WebGAL engine executes the script
 * 5. When a choice point is reached, AI generates options
 * 6. User selects a choice → AI generates next segment
 * 7. Images are selected by a small model based on generated text
 */

import { AIStoryEngine, createStoryEngine } from './storyEngine';
import { getScheduler } from './scheduler';
import { DeepSeekProvider } from './providers/deepseek';
import { OpenAIProvider } from './providers/openai';
import { getConfigManager } from '../userConfig/configManager';
import {
  StoryConfig,
  StoryGenerationOutput,
  ChoicePoint,
  ImageSelectionOutput,
  AIModel,
} from './types';
import { IAIProvider } from './providers/base';
import { WebGAL } from '@/Core/WebGAL';
import { logger } from '@/Core/util/logger';

/** Provider initialization config */
export interface ProviderInitConfig {
  provider: string;
  apiKey: string;
  baseURL?: string;
}

/** AI Game Controller state */
export enum AIGameState {
  UNINITIALIZED = 'uninitialized',
  CONFIGURING = 'configuring',   // User is setting up the story
  READY = 'ready',               // Config is set, ready to generate
  GENERATING = 'generating',     // AI is generating story
  PLAYING = 'playing',           // Executing generated script
  CHOOSING = 'choosing',         // Waiting for user choice
  ERROR = 'error',
}

export class AIGameController {
  private engine: AIStoryEngine | null = null;
  private state: AIGameState = AIGameState.UNINITIALIZED;
  private generationCallbacks: Array<(output: StoryGenerationOutput) => void> = [];
  private imageCallbacks: Array<(output: ImageSelectionOutput) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];

  // ============================================================
  // Initialization
  // ============================================================

  /**
   * Initialize AI providers with API keys
   */
  initializeProviders(providers: ProviderInitConfig[]): void {
    const scheduler = getScheduler();

    for (const config of providers) {
      let provider: IAIProvider;

      switch (config.provider) {
        case 'deepseek':
          provider = new DeepSeekProvider(config.apiKey, config.baseURL);
          break;
        case 'openai':
          provider = new OpenAIProvider(config.apiKey, config.baseURL);
          break;
        default:
          // For custom providers, try DeepSeek-compatible API
          provider = new DeepSeekProvider(
            config.apiKey,
            config.baseURL || `https://api.${config.provider}.com/v1`,
          );
          (provider as any).id = config.provider;
          (provider as any).name = config.provider;
          break;
      }

      scheduler.registerProvider(provider);
      logger.info(`[AI] Registered provider: ${provider.id}`);
    }
  }

  /**
   * Initialize the AI game controller with story config
   */
  async initializeGame(): Promise<void> {
    const configManager = getConfigManager();
    const config = configManager.getConfig();

    if (!configManager.isReady()) {
      throw new Error('Story configuration is not complete. Please set up world, characters, scenes, and story beginning.');
    }

    const scheduler = getScheduler();
    this.engine = new AIStoryEngine(config, scheduler);
    this.state = AIGameState.READY;

    logger.info('[AI] Game initialized with config:', {
      worldName: config.worldSetting.name,
      characters: config.characters.length,
      scenes: config.scenes.length,
    });
  }

  /**
   * Check if game is ready to start
   */
  isReady(): boolean {
    return this.state === AIGameState.READY;
  }

  /**
   * Get current game state
   */
  getState(): AIGameState {
    return this.state;
  }

  // ============================================================
  // Story Generation
  // ============================================================

  /**
   * Generate the first story segment (called after initialization)
   */
  async startStory(): Promise<StoryGenerationOutput | null> {
    if (!this.engine) {
      this.setState(AIGameState.ERROR);
      throw new Error('Game not initialized');
    }

    this.setState(AIGameState.GENERATING);
    try {
      const output = await this.engine.initialize();
      this.handleGenerationComplete(output);
      return output;
    } catch (error: any) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Continue story to next segment
   */
  async continueStory(): Promise<StoryGenerationOutput | null> {
    if (!this.engine) {
      throw new Error('Game not initialized');
    }

    if (this.state === AIGameState.CHOOSING) {
      throw new Error('A choice is pending — user must select first');
    }

    this.setState(AIGameState.GENERATING);
    try {
      const output = await this.engine.generateNextSegment();
      this.handleGenerationComplete(output);
      return output;
    } catch (error: any) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * User selects a choice option
   */
  async selectChoice(optionIndex: number): Promise<StoryGenerationOutput | null> {
    if (!this.engine) {
      throw new Error('Game not initialized');
    }

    if (this.state !== AIGameState.CHOOSING) {
      throw new Error('No choice is pending');
    }

    this.setState(AIGameState.GENERATING);
    try {
      const output = await this.engine.selectChoice(optionIndex);
      this.handleGenerationComplete(output);
      return output;
    } catch (error: any) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Get current choice point (if any)
   */
  getChoicePoint(): ChoicePoint | null {
    return this.engine?.getCurrentChoicePoint() || null;
  }

  // ============================================================
  // Image Selection
  // ============================================================

  /**
   * Select images based on generated story text
   */
  async selectImages(latestText: string): Promise<ImageSelectionOutput | null> {
    if (!this.engine) return null;

    try {
      const output = await this.engine.selectImages(latestText);
      if (output) {
        this.imageCallbacks.forEach((cb) => cb(output));
      }
      return output;
    } catch (error) {
      console.warn('[AI] Image selection failed:', error);
      return null;
    }
  }

  // ============================================================
  // Callbacks
  // ============================================================

  onGenerationComplete(callback: (output: StoryGenerationOutput) => void): void {
    this.generationCallbacks.push(callback);
  }

  onImageSelected(callback: (output: ImageSelectionOutput) => void): void {
    this.imageCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  removeCallbacks(): void {
    this.generationCallbacks = [];
    this.imageCallbacks = [];
    this.errorCallbacks = [];
  }

  // ============================================================
  // WebGAL Script Conversion
  // ============================================================

  /**
   * Convert AI story output to WebGAL-compatible script format
   * This produces text that WebGAL's parser can understand
   */
  outputToWebGALScript(output: StoryGenerationOutput): string {
    if (!this.engine) return output.script;

    return this.engine.convertToScript(output);
  }

  // ============================================================
  // Reset
  // ============================================================

  reset(): void {
    this.engine?.reset();
    this.state = AIGameState.UNINITIALIZED;
    this.removeCallbacks();
  }

  // ============================================================
  // Private
  // ============================================================

  private setState(state: AIGameState): void {
    this.state = state;
    logger.info(`[AI] State changed: ${state}`);
  }

  private handleGenerationComplete(output: StoryGenerationOutput): void {
    if (output.choicePoint) {
      this.setState(AIGameState.CHOOSING);
    } else {
      this.setState(AIGameState.PLAYING);
    }
    this.generationCallbacks.forEach((cb) => cb(output));
  }

  private handleError(error: Error): void {
    this.setState(AIGameState.ERROR);
    logger.error('[AI] Error:', error);
    this.errorCallbacks.forEach((cb) => cb(error));
  }
}

/** Global AI game controller instance */
let globalAIController: AIGameController | null = null;

export function getAIGameController(): AIGameController {
  if (!globalAIController) {
    globalAIController = new AIGameController();
  }
  return globalAIController;
}

export function resetAIGameController(): void {
  globalAIController?.reset();
  globalAIController = null;
}
