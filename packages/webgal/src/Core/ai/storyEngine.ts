/**
 * AI Story Engine
 *
 * Core engine for real-time visual novel story generation.
 * Manages the story state, generates story segments via AI,
 * handles choice points, and converts AI output to WebGAL script format.
 */

import {
  StoryConfig,
  StoryState,
  StoryEvent,
  StoryGenerationOutput,
  ChoicePoint,
  ChoiceOption,
  ImageSelectionOutput,
  TaskRequest,
  TaskResult,
} from './types';
import { AIScheduler, getScheduler } from './scheduler';
import {
  buildStoryGenerationPrompt,
  buildImageSelectionPrompt,
} from './promptBuilder';
import { IAIProvider } from './providers/base';
import { v4 as uuidv4 } from 'uuid';
import { getMemoryManager, ContextMemoryManager } from './memoryManager';

/** Default story state */
function createInitialState(config: StoryConfig): StoryState {
  return {
    config,
    history: [],
    currentSceneId: config.scenes[0]?.id || 'default',
    currentCharacterIds: [],
    variables: {},
    mood: config.worldSetting.atmosphere || 'neutral',
    pendingScript: '',
  };
}

/**
 * AI Story Engine class
 */
export class AIStoryEngine {
  private state: StoryState;
  private scheduler: AIScheduler;
  private isGenerating = false;
  private currentChoicePoint: ChoicePoint | null = null;
  private memoryManager: ContextMemoryManager;

  constructor(config: StoryConfig, scheduler?: AIScheduler) {
    this.state = createInitialState(config);
    this.scheduler = scheduler || getScheduler();
    this.memoryManager = getMemoryManager();
  }

  // ============================================================
  // Public API
  // ============================================================

  /** Get current story state */
  getState(): Readonly<StoryState> {
    return this.state;
  }

  /** Get current choice point (if waiting for user choice) */
  getCurrentChoicePoint(): ChoicePoint | null {
    return this.currentChoicePoint;
  }

  /** Initialize the story — generate the first segment from the story beginning */
  async initialize(): Promise<StoryGenerationOutput> {
    this.state = createInitialState(this.state.config);
    return this.generateNextSegment();
  }

  /**
   * Generate the next story segment
   * If there's a pending choice point, this will fail — the user must select a choice first
   */
  async generateNextSegment(): Promise<StoryGenerationOutput> {
    if (this.isGenerating) {
      throw new Error('Story generation already in progress');
    }

    if (this.currentChoicePoint) {
      throw new Error('A choice point is pending — user must select a choice first');
    }

    this.isGenerating = true;
    try {
      const output = await this.doGenerateStory();
      this.applyGenerationOutput(output);
      return output;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate the next story segment with streaming.
   * Calls onTextChunk for each text delta as it arrives from AI.
   */
  async generateNextSegmentStreaming(
    onTextChunk: (text: string) => void,
  ): Promise<StoryGenerationOutput> {
    if (this.isGenerating) {
      throw new Error('Story generation already in progress');
    }

    if (this.currentChoicePoint) {
      throw new Error('A choice point is pending — user must select a choice first');
    }

    this.isGenerating = true;
    try {
      const output = await this.doGenerateStoryStreaming(onTextChunk);
      this.applyGenerationOutput(output);
      return output;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * User selects a choice option, then continues the story
   */
  async selectChoice(optionIndex: number): Promise<StoryGenerationOutput> {
    if (!this.currentChoicePoint) {
      throw new Error('No choice point is active');
    }

    if (optionIndex < 0 || optionIndex >= this.currentChoicePoint.options.length) {
      throw new Error(`Invalid choice index: ${optionIndex}`);
    }

    const selectedOption = this.currentChoicePoint.options[optionIndex];

    // Record the choice in history
    this.addHistoryEvent({
      id: uuidv4(),
      type: 'choice',
      content: `【选择】${selectedOption.text}`,
    });

    // Add consequence note
    this.addHistoryEvent({
      id: uuidv4(),
      type: 'system',
      content: selectedOption.consequence || '',
    });

    // If the choice leads to a different scene, update
    if (selectedOption.sceneId) {
      this.state.currentSceneId = selectedOption.sceneId;
      this.addHistoryEvent({
        id: uuidv4(),
        type: 'scene_change',
        content: '',
        sceneId: selectedOption.sceneId,
      });
    }

    if (selectedOption.mood) {
      this.state.mood = selectedOption.mood;
    }

    // Clear the choice point
    this.currentChoicePoint = null;

    // Generate the next segment based on the choice
    return this.generateNextSegment();
  }

  /**
   * User selects a choice with streaming continuation.
   */
  async selectChoiceStreaming(
    optionIndex: number,
    onTextChunk: (text: string) => void,
  ): Promise<StoryGenerationOutput> {
    if (!this.currentChoicePoint) {
      throw new Error('No choice point is active');
    }

    if (optionIndex < 0 || optionIndex >= this.currentChoicePoint.options.length) {
      throw new Error(`Invalid choice index: ${optionIndex}`);
    }

    const selectedOption = this.currentChoicePoint.options[optionIndex];

    this.addHistoryEvent({
      id: uuidv4(),
      type: 'choice',
      content: `【选择】${selectedOption.text}`,
    });

    this.addHistoryEvent({
      id: uuidv4(),
      type: 'system',
      content: selectedOption.consequence || '',
    });

    if (selectedOption.sceneId) {
      this.state.currentSceneId = selectedOption.sceneId;
      this.addHistoryEvent({
        id: uuidv4(),
        type: 'scene_change',
        content: '',
        sceneId: selectedOption.sceneId,
      });
    }

    if (selectedOption.mood) {
      this.state.mood = selectedOption.mood;
    }

    this.currentChoicePoint = null;

    return this.generateNextSegmentStreaming(onTextChunk);
  }

  /**
   * Select/update images based on the latest generated text
   * Uses a smaller model for efficient image selection
   */
  async selectImages(latestText: string): Promise<ImageSelectionOutput | null> {
    const currentScene = this.state.config.scenes.find(
      (s: import('./types').Scene) => s.id === this.state.currentSceneId,
    );
    const hasImages =
      currentScene?.images.length ||
      this.state.currentCharacterIds.some((cid: string) => {
        const char = this.state.config.characters.find((c: import('./types').Character) => c.id === cid);
        return char?.images.length;
      });

    if (!hasImages) return null;

    const messages = buildImageSelectionPrompt(
      this.state.config,
      this.state,
      latestText,
    );

    const taskId = uuidv4();
    const taskRequest: TaskRequest = {
      id: taskId,
      taskType: 'select_image',
      messages,
      options: {
        temperature: 0.3,
        maxTokens: 500,
      },
    };

    const result = await this.scheduler.executeTask(taskRequest);
    if (!result.success) {
      console.warn('Image selection failed:', result.error);
      return null;
    }

    try {
      return JSON.parse(result.content) as ImageSelectionOutput;
    } catch {
      console.warn('Failed to parse image selection output');
      return null;
    }
  }

  /**
   * Generate WebGAL script from AI output
   */
  convertToScript(output: StoryGenerationOutput): string {
    let script = '';

    // If scene changed
    if (output.sceneId !== this.state.currentSceneId) {
      const scene = this.state.config.scenes.find((s: import('./types').Scene) => s.id === output.sceneId);
      if (scene) {
        script += `; 切换场景到 ${scene.name}\n`;
      }
    }

    // Add the AI-generated script
    script += output.script;

    // Add choice point if present
    if (output.choicePoint) {
      script += '\n; 选项\n';
      const choiceScript = output.choicePoint.options
        .map((opt: import('./types').ChoiceOption, i: number) => {
          const label = `choice_${i}`;
          return `${opt.text}:${label}`;
        })
        .join('|');
      script += `; ${output.choicePoint.prompt}\n`;
      script += `choose:${choiceScript}`;
    }

    return script;
  }

  /** Reset the engine with a new config */
  reset(config?: StoryConfig): void {
    if (config) {
      this.state = createInitialState(config);
    } else {
      this.state = createInitialState(this.state.config);
    }
    this.currentChoicePoint = null;
    this.isGenerating = false;
  }

  // ============================================================
  // Private Implementation
  // ============================================================

  private async doGenerateStory(): Promise<StoryGenerationOutput> {
    // Manage memory before generating (summarize old events if needed)
    await this.memoryManager.manageContext(this.state);

    const messages = buildStoryGenerationPrompt(this.state.config, this.state);

    const taskId = uuidv4();
    const taskRequest: TaskRequest = {
      id: taskId,
      taskType: 'generate_story',
      messages,
      options: {
        temperature: 0.8,
        maxTokens: 4096,
      },
    };

    const result = await this.scheduler.executeTask(taskRequest);
    if (!result.success) {
      throw new Error(`Story generation failed: ${result.error}`);
    }

    return this.parseGenerationResponse(result);
  }

  private async doGenerateStoryStreaming(
    onTextChunk: (text: string) => void,
  ): Promise<StoryGenerationOutput> {
    // Manage memory before generating
    await this.memoryManager.manageContext(this.state);

    const messages = buildStoryGenerationPrompt(this.state.config, this.state);

    const taskId = uuidv4();
    const taskRequest: TaskRequest = {
      id: taskId,
      taskType: 'generate_story',
      messages,
      options: {
        temperature: 0.8,
        maxTokens: 4096,
      },
    };

    const result = await this.scheduler.executeTaskStreaming(
      taskRequest,
      onTextChunk,
    );
    if (!result.success) {
      throw new Error(`Story generation failed: ${result.error}`);
    }

    return this.parseGenerationResponse(result);
  }

  private parseGenerationResponse(result: TaskResult): StoryGenerationOutput {
    let content = result.content.trim();

    // Strip markdown code blocks if present
    content = content.replace(/^```(?:json)?\s*\n?/i, '');
    content = content.replace(/\n?```\s*$/, '');

    try {
      const parsed = JSON.parse(content) as StoryGenerationOutput;

      // Validate required fields
      if (!parsed.script) {
        throw new Error('AI response missing script field');
      }

      return parsed;
    } catch (error: any) {
      // If JSON parsing fails, try to extract content as plain text
      console.warn('Failed to parse AI response as JSON, using raw text:', error);
      return {
        script: content,
        summary: '',
        sceneId: this.state.currentSceneId,
        characterIds: this.state.currentCharacterIds,
        mood: this.state.mood,
      };
    }
  }

  private applyGenerationOutput(output: StoryGenerationOutput): void {
    // Update state
    if (output.sceneId && output.sceneId !== this.state.currentSceneId) {
      this.addHistoryEvent({
        id: uuidv4(),
        type: 'scene_change',
        content: '',
        sceneId: output.sceneId,
      });
      this.state.currentSceneId = output.sceneId;
    }

    if (output.characterIds) {
      this.state.currentCharacterIds = output.characterIds;
    }

    if (output.mood) {
      this.state.mood = output.mood;
    }

    // Add summary to history
    if (output.summary) {
      this.addHistoryEvent({
        id: uuidv4(),
        type: 'narration',
        content: output.summary,
      });
    }

    // Store pending script
    this.state.pendingScript = output.script;

    // Set choice point if present
    this.currentChoicePoint = output.choicePoint || null;
  }

  private addHistoryEvent(event: StoryEvent): void {
    this.state.history.push(event);
    // Keep history bounded
    if (this.state.history.length > 100) {
      this.state.history = this.state.history.slice(-80);
    }
  }
}

/**
 * Create an AIStoryEngine with pre-configured providers
 */
export function createStoryEngine(
  config: StoryConfig,
  providers: { provider: IAIProvider; models?: string[] }[],
  schedulerConfig?: any,
): AIStoryEngine {
  const scheduler = getScheduler();

  for (const { provider } of providers) {
    scheduler.registerProvider(provider);
  }

  if (schedulerConfig) {
    scheduler.updateConfig(schedulerConfig);
  }

  return new AIStoryEngine(config, scheduler);
}
