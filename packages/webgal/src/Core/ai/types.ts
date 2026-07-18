/**
 * AI Integration Types for AI-Powered Galgame Engine
 *
 * Defines all types for AI providers, models, scheduling, story generation,
 * and image selection in the dynamic visual novel system.
 */

// ============================================================
// AI Provider & Model Types
// ============================================================

/** Capabilities a model can have */
export type ModelCapability =
  | 'story_generation'    // Generate story text & scene descriptions
  | 'choice_generation'   // Generate branching choices
  | 'image_selection'     // Select appropriate image for scene/character state
  | 'scheduling'          // Act as dispatcher to decide which model handles a task
  | 'translation';        // Translate text

/** AI model definition */
export interface AIModel {
  id: string;
  name: string;           // Display name
  provider: string;       // Provider ID this model belongs to
  capabilities: ModelCapability[];
  maxTokens: number;
  defaultTemperature?: number;
  /** Cost per 1K tokens (input), for display/cost tracking */
  inputCostPer1K?: number;
  /** Cost per 1K tokens (output), for display/cost tracking */
  outputCostPer1K?: number;
}

/** AI Provider (service) definition */
export interface AIProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  models: AIModel[];
  /** Additional headers for API requests */
  headers?: Record<string, string>;
}

// ============================================================
// Task & Scheduler Types
// ============================================================

/** Types of tasks that can be dispatched */
export type TaskType =
  | 'generate_story'
  | 'generate_choices'
  | 'select_image'
  | 'initialize_world';

/** A task request sent to the scheduler */
export interface TaskRequest {
  id: string;
  taskType: TaskType;
  /** The messages to send to the model */
  messages: ChatMessage[];
  /** Additional options */
  options?: TaskOptions;
}

/** Options for task execution */
export interface TaskOptions {
  temperature?: number;
  maxTokens?: number;
  /** Force a specific model to handle this task */
  forceModel?: string;
  /** Priority (lower = higher priority) */
  priority?: number;
}

/** Result of a dispatched task */
export interface TaskResult {
  taskId: string;
  success: boolean;
  content: string;
  modelUsed: string;
  providerUsed: string;
  tokensUsed?: TokenUsage;
  error?: string;
}

/** Token usage statistics */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Chat message format (OpenAI-compatible) */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================
// Scheduler Configuration
// ============================================================

/** Model assignment strategy */
export type SchedulingStrategy =
  | 'fixed'        // Use predefined mapping
  | 'ai_dispatch'  // Use an AI model to decide
  | 'cost_optimized' // Pick cheapest capable model
  | 'round_robin'; // Rotate through available models

/** Scheduler configuration */
export interface SchedulerConfig {
  /** How models are selected for tasks */
  strategy: SchedulingStrategy;
  /** Fixed mapping when strategy is 'fixed' */
  taskModelMapping: Partial<Record<TaskType, string>>;
  /** Default model to use when no mapping exists */
  defaultModel: string;
  /** The model used for AI dispatch scheduling */
  schedulerModel?: string;
  /** Maximum retries for failed tasks */
  maxRetries: number;
  /** Timeout in ms for API calls */
  timeoutMs: number;
}

// ============================================================
// Story Configuration (User-defined)
// ============================================================

/** World setting */
export interface WorldSetting {
  name: string;           // 世界观名称
  description: string;    // 世界观详细描述
  genre: string;          // 题材（奇幻/科幻/现代/古风等）
  era: string;            // 时代背景
  rules: string;          // 特殊规则/法则
  atmosphere: string;     // 氛围基调
}

/** Character image (for different states/moods) */
export interface CharacterImage {
  id: string;
  url: string;            // Path/URL to image
  mood: string;           // Emotion/mood: happy, sad, angry, surprised, neutral, etc.
  pose: string;           // Pose description: standing, sitting, etc.
  expression: string;     // Detailed expression description
}

/** Character definition */
export interface Character {
  id: string;
  name: string;
  description: string;    // 角色简介
  personality: string;    // 性格
  appearance: string;     // 外貌
  background: string;     // 背景故事
  relationships: string;  // 与其他角色的关系
  images: CharacterImage[];
  /** Voice / speaking style */
  speakingStyle?: string;
}

/** Scene image (for different states) */
export interface SceneImage {
  id: string;
  url: string;            // Path/URL to image
  timeOfDay: string;      // morning, afternoon, evening, night
  weather: string;        // sunny, rainy, cloudy, etc.
  mood: string;           // peaceful, tense, romantic, etc.
  description: string;
}

/** Scene definition */
export interface Scene {
  id: string;
  name: string;
  description: string;    // 场景描述
  images: SceneImage[];
}

/** Complete story configuration */
export interface StoryConfig {
  worldSetting: WorldSetting;
  characters: Character[];
  scenes: Scene[];
  storyBeginning: string; // 故事开头
  language: string;       // Output language
}

// ============================================================
// Story Runtime Types
// ============================================================

/** An event in the story history */
export interface StoryEvent {
  id: string;
  type: 'narration' | 'dialogue' | 'choice' | 'scene_change' | 'system';
  speaker?: string;       // Character ID for dialogue
  content: string;
  sceneId?: string;
  /** AI metadata */
  modelUsed?: string;
}

/** Current story state at runtime */
export interface StoryState {
  config: StoryConfig;
  history: StoryEvent[];
  currentSceneId: string;
  currentCharacterIds: string[];
  variables: Record<string, string>;
  /** Current emotional tone */
  mood: string;
  /** The latest AI-generated script text to be executed */
  pendingScript: string;
}

// ============================================================
// AI Response Types
// ============================================================

/** Parsed story generation response */
export interface StoryGenerationOutput {
  /** WebGAL script commands to execute */
  script: string;
  /** Human-readable summary of what happened */
  summary: string;
  /** Which scene this takes place in */
  sceneId: string;
  /** Which characters appear */
  characterIds: string[];
  /** Emotional tone of this segment */
  mood: string;
  /** If the story has reached a choice point */
  choicePoint?: ChoicePoint;
}

/** A choice point in the story */
export interface ChoicePoint {
  prompt: string;         // The question/prompt shown to the player
  options: ChoiceOption[];
}

/** A single choice option */
export interface ChoiceOption {
  text: string;           // Display text
  consequence: string;    // Brief description of what this leads to
  sceneId?: string;       // Scene this leads to, if scene change
  mood?: string;          // Emotional impact
}

/** Image selection output from small model */
export interface ImageSelectionOutput {
  /** Selected background image ID */
  backgroundImageId: string;
  /** Selected character images: characterId -> imageId */
  characterImages: Record<string, string>;
  /** Reasoning for selection */
  reasoning: string;
}
