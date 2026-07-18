/**
 * User Configuration Manager
 *
 * Manages user-defined story configuration including world setting,
 * characters, scenes, images, and story beginning.
 * Provides validation, serialization, and default configuration.
 */

import {
  StoryConfig,
  WorldSetting,
  Character,
  Scene,
  CharacterImage,
  SceneImage,
} from '../ai/types';

// ============================================================
// Default Configuration
// ============================================================

export const DEFAULT_WORLD_SETTING: WorldSetting = {
  name: '',
  description: '',
  genre: '',
  era: '',
  rules: '',
  atmosphere: '',
};

export const DEFAULT_STORY_CONFIG: StoryConfig = {
  worldSetting: { ...DEFAULT_WORLD_SETTING },
  characters: [],
  scenes: [],
  storyBeginning: '',
  language: 'zh-CN',
};

// ============================================================
// Validation
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
}

export function validateStoryConfig(config: StoryConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // World setting validation
  if (!config.worldSetting.name?.trim()) {
    errors.push({ field: 'worldSetting.name', message: '请输入世界观名称' });
  }
  if (!config.worldSetting.description?.trim()) {
    errors.push({ field: 'worldSetting.description', message: '请输入世界观描述' });
  }

  // Characters validation
  if (config.characters.length === 0) {
    errors.push({ field: 'characters', message: '请至少添加一个角色' });
  }
  config.characters.forEach((char, i) => {
    if (!char.name?.trim()) {
      errors.push({ field: `characters[${i}].name`, message: '角色名不能为空' });
    }
    if (!char.description?.trim()) {
      errors.push({ field: `characters[${i}].description`, message: `${char.name || '角色'}的描述不能为空` });
    }
  });

  // Scenes validation
  if (config.scenes.length === 0) {
    errors.push({ field: 'scenes', message: '请至少添加一个场景' });
  }
  config.scenes.forEach((scene, i) => {
    if (!scene.name?.trim()) {
      errors.push({ field: `scenes[${i}].name`, message: '场景名不能为空' });
    }
    if (!scene.description?.trim()) {
      errors.push({ field: `scenes[${i}].description`, message: `${scene.name || '场景'}的描述不能为空` });
    }
  });

  // Story beginning validation
  if (!config.storyBeginning?.trim()) {
    errors.push({ field: 'storyBeginning', message: '请输入故事开头' });
  }

  return errors;
}

// ============================================================
// Config Manager
// ============================================================

const STORAGE_KEY = 'webgal_ai_story_config';

export class UserConfigManager {
  private config: StoryConfig;

  constructor() {
    this.config = this.loadFromStorage() || { ...DEFAULT_STORY_CONFIG };
  }

  /** Get current configuration */
  getConfig(): StoryConfig {
    return this.config;
  }

  /** Set full configuration */
  setConfig(config: StoryConfig): void {
    this.config = config;
    this.saveToStorage();
    // Also save individual parts for convenience
    if (config.worldSetting) this.saveWorldSetting(config.worldSetting);
    if (config.characters) this.saveCharacters(config.characters);
    if (config.scenes) this.saveScenes(config.scenes);
  }

  /** Update world setting */
  setWorldSetting(worldSetting: WorldSetting): void {
    this.config.worldSetting = worldSetting;
    this.saveToStorage();
  }

  /** Add or update a character */
  saveCharacter(character: Character): void {
    const index = this.config.characters.findIndex((c) => c.id === character.id);
    if (index >= 0) {
      this.config.characters[index] = character;
    } else {
      this.config.characters.push(character);
    }
    this.saveToStorage();
  }

  /** Remove a character */
  removeCharacter(characterId: string): void {
    this.config.characters = this.config.characters.filter((c) => c.id !== characterId);
    this.saveToStorage();
  }

  /** Add or update a scene */
  saveScene(scene: Scene): void {
    const index = this.config.scenes.findIndex((s) => s.id === scene.id);
    if (index >= 0) {
      this.config.scenes[index] = scene;
    } else {
      this.config.scenes.push(scene);
    }
    this.saveToStorage();
  }

  /** Remove a scene */
  removeScene(sceneId: string): void {
    this.config.scenes = this.config.scenes.filter((s) => s.id !== sceneId);
    this.saveToStorage();
  }

  /** Set story beginning */
  setStoryBeginning(beginning: string): void {
    this.config.storyBeginning = beginning;
    this.saveToStorage();
  }

  /** Set language */
  setLanguage(language: string): void {
    this.config.language = language;
    this.saveToStorage();
  }

  /**
   * Associate an image with a character
   */
  addCharacterImage(
    characterId: string,
    image: CharacterImage,
  ): void {
    const character = this.config.characters.find((c) => c.id === characterId);
    if (character) {
      character.images.push(image);
      this.saveToStorage();
    }
  }

  /**
   * Remove an image from a character
   */
  removeCharacterImage(characterId: string, imageId: string): void {
    const character = this.config.characters.find((c) => c.id === characterId);
    if (character) {
      character.images = character.images.filter((img) => img.id !== imageId);
      this.saveToStorage();
    }
  }

  /**
   * Associate an image with a scene
   */
  addSceneImage(sceneId: string, image: SceneImage): void {
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (scene) {
      scene.images.push(image);
      this.saveToStorage();
    }
  }

  /**
   * Remove an image from a scene
   */
  removeSceneImage(sceneId: string, imageId: string): void {
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (scene) {
      scene.images = scene.images.filter((img) => img.id !== imageId);
      this.saveToStorage();
    }
  }

  /** Validate and get errors */
  validate(): ValidationError[] {
    return validateStoryConfig(this.config);
  }

  /** Check if config is complete enough to start */
  isReady(): boolean {
    return this.validate().length === 0;
  }

  /** Reset to default */
  reset(): void {
    this.config = { ...DEFAULT_STORY_CONFIG };
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Export config as JSON string */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /** Import config from JSON string */
  importConfig(json: string): boolean {
    try {
      const config = JSON.parse(json) as StoryConfig;
      this.setConfig(config);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Private
  // ============================================================

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      console.warn('Failed to save config to localStorage');
    }
  }

  private loadFromStorage(): StoryConfig | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const config = JSON.parse(raw) as StoryConfig;
        // Ensure backward compatibility
        if (!config.worldSetting) config.worldSetting = { ...DEFAULT_WORLD_SETTING };
        if (!config.characters) config.characters = [];
        if (!config.scenes) config.scenes = [];
        if (!config.language) config.language = 'zh-CN';
        return config;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  private saveWorldSetting(worldSetting: WorldSetting): void {
    // Handled by setConfig -> saveToStorage
  }

  private saveCharacters(characters: Character[]): void {
    // Handled by setConfig -> saveToStorage
  }

  private saveScenes(scenes: Scene[]): void {
    // Handled by setConfig -> saveToStorage
  }
}

/** Global config manager instance */
let globalConfigManager: UserConfigManager | null = null;

export function getConfigManager(): UserConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new UserConfigManager();
  }
  return globalConfigManager;
}

export function resetConfigManager(): void {
  globalConfigManager = null;
}
