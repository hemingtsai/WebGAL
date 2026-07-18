/**
 * AI Game Controller
 *
 * Integrates AI-powered story generation with WebGAL's existing game engine.
 * Supports both batch and streaming generation.
 *
 * Streaming flow:
 * 1. AI generates text via SSE streaming
 * 2. Text chunks are fed to WebGAL's stage state in real-time
 * 3. WebGAL's existing text animation handles the typewriter effect
 * 4. When complete, the full response is parsed into WebGAL script
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
  TaskRequest,
} from './types';
import { IAIProvider } from './providers/base';
import { WebGAL } from '@/Core/WebGAL';
import { logger } from '@/Core/util/logger';
import { stageStateManager } from '@/Core/Modules/stage/stageStateManager';
import { webgalStore } from '@/store/store';
import { setVisibility } from '@/store/GUIReducer';
import { showAIChoices, hideAIChoices } from '@/UI/AISetup/AIChoiceUI';
import { getBGM } from './bgmManager';

/** Provider initialization config */
export interface ProviderInitConfig {
  provider: string;
  apiKey: string;
  baseURL?: string;
}

/** AI Game Controller state */
export enum AIGameState {
  UNINITIALIZED = 'uninitialized',
  CONFIGURING = 'configuring',
  READY = 'ready',
  GENERATING = 'generating',
  PLAYING = 'playing',
  CHOOSING = 'choosing',
  ERROR = 'error',
}

/** Pending choice that will be shown after current text finishes */
interface PendingChoice {
  choicePoint: ChoicePoint;
  output: StoryGenerationOutput;
}

export class AIGameController {
  private engine: AIStoryEngine | null = null;
  private state: AIGameState = AIGameState.UNINITIALIZED;
  private generationCallbacks: Array<(output: StoryGenerationOutput) => void> = [];
  private imageCallbacks: Array<(output: ImageSelectionOutput) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];
  private pendingChoice: PendingChoice | null = null;
  private streamingBuffer = '';
  private abortController: AbortController | null = null;

  // ============================================================
  // Initialization
  // ============================================================

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

  async initializeGame(): Promise<void> {
    const configManager = getConfigManager();
    const config = configManager.getConfig();

    if (!configManager.isReady()) {
      throw new Error('Story configuration is not complete.');
    }

    const scheduler = getScheduler();
    this.engine = new AIStoryEngine(config, scheduler);
    this.state = AIGameState.READY;

    logger.info('[AI] Game initialized:', {
      worldName: config.worldSetting.name,
      characters: config.characters.length,
      scenes: config.scenes.length,
    });
  }

  isReady(): boolean {
    return this.state === AIGameState.READY || this.state === AIGameState.PLAYING || this.state === AIGameState.CHOOSING;
  }

  getState(): AIGameState {
    return this.state;
  }

  // ============================================================
  // Streaming Story Generation (main API)
  // ============================================================

  /**
   * Generate the first story segment with streaming text display.
   * Text appears in WebGAL's text box as it's generated.
   */
  async startStoryStreaming(): Promise<StoryGenerationOutput | null> {
    if (!this.engine) throw new Error('Game not initialized');

    this.setState(AIGameState.GENERATING);
    this.showThinking();

    try {
      const output = await this.engine.initialize();
      // For initialization, we use batch mode then display
      await this.displayStoryOutput(output);
      return output;
    } catch (error: any) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Continue story with streaming text display.
   * AI text streams into WebGAL's text box in real-time.
   */
  async continueStoryStreaming(): Promise<StoryGenerationOutput | null> {
    if (!this.engine) throw new Error('Game not initialized');
    if (this.state === AIGameState.CHOOSING) throw new Error('Choice pending');

    // If in error state, try to recover by regenerating
    if (this.state === AIGameState.ERROR) {
      logger.info('[AI] Retrying after error...');
    }

    this.setState(AIGameState.GENERATING);
    this.showThinking();

    try {
      // Use streaming generation
      const output = await this.engine.generateNextSegmentStreaming(
        (chunk: string) => {
          this.streamTextToStage(chunk);
        },
      );
      await this.finalizeStreamedText(output);
      return output;
    } catch (error: any) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * User selects a choice, then continues with streaming.
   */
  async selectChoiceStreaming(optionIndex: number): Promise<StoryGenerationOutput | null> {
    if (!this.engine) throw new Error('Game not initialized');
    if (this.state !== AIGameState.CHOOSING) throw new Error('No choice pending');

    // Hide choice UI
    hideAIChoices();

    this.setState(AIGameState.GENERATING);
    this.showThinking();

    try {
      // Record choice then generate
      const output = await this.engine.selectChoice(optionIndex);
      // Generate next with streaming
      const nextOutput = await this.engine.generateNextSegmentStreaming(
        (chunk: string) => {
          this.streamTextToStage(chunk);
        },
      );
      await this.finalizeStreamedText(nextOutput);
      return nextOutput;
    } catch (error: any) {
      this.handleError(error);
      return null;
    }
  }

  getChoicePoint(): ChoicePoint | null {
    return this.pendingChoice?.choicePoint || this.engine?.getCurrentChoicePoint() || null;
  }

  // ============================================================
  // Text Streaming to WebGAL Stage
  // ============================================================

  /**
   * Show "AI thinking" indicator in the text box
   */
  private showThinking(): void {
    this.streamingBuffer = '';
    stageStateManager.setStage('showText', '⏳ AI 正在生成剧情...');
    stageStateManager.setStage('showName', '系统');
    stageStateManager.setStage('isDisableTextbox', false);
    stageStateManager.commit({ notifyReact: true });
    webgalStore.dispatch(setVisibility({ component: 'showTextBox', visibility: true }));
  }

  /**
   * Stream raw AI text to WebGAL's stage in real-time.
   * This creates a typewriter-like effect as AI generates.
   */
  private streamTextToStage(chunk: string): void {
    this.streamingBuffer += chunk;

    // Try to extract speaker and text for better display
    const parsed = this.tryParseStreamingText(this.streamingBuffer);

    stageStateManager.setStage('showText', parsed.text);
    if (parsed.speaker) {
      stageStateManager.setStage('showName', parsed.speaker);
    }
    stageStateManager.commit({ notifyReact: true });
  }

  /**
   * After streaming completes, finalize the text and show choices if any.
   */
  private async finalizeStreamedText(output: StoryGenerationOutput): Promise<void> {
    this.streamingBuffer = '';

    if (output.choicePoint) {
      this.pendingChoice = { choicePoint: output.choicePoint, output };
      this.setState(AIGameState.CHOOSING);
      // Show choice UI
      showAIChoices(output.choicePoint);
    } else {
      this.setState(AIGameState.PLAYING);
    }

    this.generationCallbacks.forEach((cb) => cb(output));

    // Auto-select BGM based on story mood
    if (output.mood) {
      getBGM().playBGMForMood(output.mood);
    }

    // Select images based on generated text
    const contentText = output.script || output.summary;
    if (contentText && this.engine) {
      this.engine.selectImages(contentText).then((imageSelection) => {
        if (imageSelection) {
          this.imageCallbacks.forEach((cb) => cb(imageSelection));
        }
      });
    }
  }

  /**
   * Try to parse streaming text to extract speaker and content.
   * Handles WebGAL script format like: "Character：dialog -speaker=Character"
   */
  private tryParseStreamingText(raw: string): { speaker: string; text: string } {
    // Try to match WebGAL dialogue format
    const dialogueMatch = raw.match(/^(.+?)[：:]\s*(.+?)(?:\s+-speaker=.*)?$/s);
    if (dialogueMatch) {
      return { speaker: dialogueMatch[1].trim(), text: dialogueMatch[2].trim() };
    }

    // Try plain text with speaker name
    const speakerMatch = raw.match(/^(.+?)[：:]\s*(.+)$/s);
    if (speakerMatch) {
      return { speaker: speakerMatch[1].trim(), text: speakerMatch[2].trim() };
    }

    // Fallback: just raw text
    return { speaker: '', text: raw };
  }

  // ============================================================
  // Legacy Batch API (for compatibility)
  // ============================================================

  async startStory(): Promise<StoryGenerationOutput | null> {
    return this.startStoryStreaming();
  }

  async continueStory(): Promise<StoryGenerationOutput | null> {
    if (!this.engine) throw new Error('Game not initialized');
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

  async selectChoice(optionIndex: number): Promise<StoryGenerationOutput | null> {
    if (!this.engine) throw new Error('Game not initialized');
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
   * For batch mode: display generated output as WebGAL script
   */
  async displayStoryOutput(output: StoryGenerationOutput): Promise<void> {
    if (output.script) {
      const lines = output.script.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        const parsed = this.tryParseStreamingText(line);
        stageStateManager.setStage('showText', parsed.text);
        stageStateManager.setStage('showName', parsed.speaker);
        stageStateManager.setStage('isDisableTextbox', false);
        stageStateManager.commit({ notifyReact: true });
        webgalStore.dispatch(setVisibility({ component: 'showTextBox', visibility: true }));
        // Small delay between lines for readability
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (output.choicePoint) {
      this.pendingChoice = { choicePoint: output.choicePoint, output };
      this.setState(AIGameState.CHOOSING);
      showAIChoices(output.choicePoint);
    } else {
      this.setState(AIGameState.PLAYING);
    }
    this.generationCallbacks.forEach((cb) => cb(output));
  }

  // ============================================================
  // Save / Load AI Context
  // ============================================================

  /**
   * Serialize AI engine state for saving.
   * Returns a JSON-serializable object containing the full story state.
   */
  serializeState(): Record<string, unknown> | null {
    if (!this.engine) return null;
    const state = this.engine.getState();
    return {
      history: state.history,
      currentSceneId: state.currentSceneId,
      currentCharacterIds: state.currentCharacterIds,
      variables: state.variables,
      mood: state.mood,
      hasPendingChoice: !!this.pendingChoice,
      pendingChoice: this.pendingChoice?.choicePoint || null,
    };
  }

  /**
   * Restore AI engine state from saved data.
   */
  restoreState(savedState: any): void {
    if (!this.engine) return;

    const state = this.engine.getState() as any;
    if (savedState.history) state.history = savedState.history;
    if (savedState.currentSceneId) state.currentSceneId = savedState.currentSceneId;
    if (savedState.currentCharacterIds) state.currentCharacterIds = savedState.currentCharacterIds;
    if (savedState.variables) state.variables = savedState.variables;
    if (savedState.mood) state.mood = savedState.mood;

    if (savedState.hasPendingChoice && savedState.pendingChoice) {
      this.pendingChoice = { choicePoint: savedState.pendingChoice, output: {} as any };
      this.setState(AIGameState.CHOOSING);
    } else {
      this.setState(AIGameState.PLAYING);
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
  // Abort / Reset
  // ============================================================

  abortGeneration(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  reset(): void {
    this.abortController?.abort();
    this.engine?.reset();
    this.pendingChoice = null;
    this.streamingBuffer = '';
    this.state = AIGameState.UNINITIALIZED;
    this.removeCallbacks();
  }

  // ============================================================
  // Private
  // ============================================================

  private setState(state: AIGameState): void {
    this.state = state;
    logger.info(`[AI] State: ${state}`);
  }

  private handleGenerationComplete(output: StoryGenerationOutput): void {
    if (output.choicePoint) {
      this.pendingChoice = { choicePoint: output.choicePoint, output };
      this.setState(AIGameState.CHOOSING);
    } else {
      this.setState(AIGameState.PLAYING);
    }
    this.generationCallbacks.forEach((cb) => cb(output));
  }

  private handleError(error: Error): void {
    this.setState(AIGameState.ERROR);
    logger.error('[AI] Error:', error);

    // Show error with retry option in the text box
    const errorMsg = `❌ AI 生成失败

${error.message}

点击屏幕重试，或按 Esc 打开设置调整模型。`;
    stageStateManager.setStage('showText', errorMsg);
    stageStateManager.setStage('showName', '系统');
    stageStateManager.commit({ notifyReact: true });
    webgalStore.dispatch(setVisibility({ component: 'showTextBox', visibility: true }));
    this.errorCallbacks.forEach((cb) => cb(error));

    // Auto-recover: after error, next click will retry
    // The click handler in Stage.tsx checks if state is ERROR and will retry
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
