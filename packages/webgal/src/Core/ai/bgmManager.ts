/**
 * AI BGM Manager
 *
 * Integrates AI mood detection with WebGAL's BGM system.
 * Maps story moods to appropriate background music selections.
 */

import { stageStateManager } from '@/Core/Modules/stage/stageStateManager';
import { WebGAL } from '@/Core/WebGAL';
import { logger } from '@/Core/util/logger';

/** Mood-to-BGM mapping */
export interface BGMMoodMap {
  mood: string;
  /** BGM file name (relative to game/bgm/) */
  bgmFile: string;
  /** Volume level (0-100) */
  volume?: number;
  /** Fade-in duration in ms */
  fadeIn?: number;
}

/** Default mood-to-BGM suggestions */
const DEFAULT_MOOD_BGM: BGMMoodMap[] = [
  { mood: 'peaceful', bgmFile: 'peaceful.mp3', volume: 60, fadeIn: 2000 },
  { mood: 'tense', bgmFile: 'tense.mp3', volume: 70, fadeIn: 1000 },
  { mood: 'romantic', bgmFile: 'romantic.mp3', volume: 65, fadeIn: 2000 },
  { mood: 'sad', bgmFile: 'sad.mp3', volume: 55, fadeIn: 3000 },
  { mood: 'happy', bgmFile: 'happy.mp3', volume: 70, fadeIn: 1500 },
  { mood: 'mysterious', bgmFile: 'mysterious.mp3', volume: 60, fadeIn: 2000 },
  { mood: 'action', bgmFile: 'action.mp3', volume: 80, fadeIn: 500 },
  { mood: 'neutral', bgmFile: 'neutral.mp3', volume: 50, fadeIn: 2000 },
  { mood: 'dark', bgmFile: 'dark.mp3', volume: 60, fadeIn: 3000 },
  { mood: 'hopeful', bgmFile: 'hopeful.mp3', volume: 65, fadeIn: 2000 },
];

export class AIBGMManager {
  private moodMap: BGMMoodMap[];
  private currentMood: string = '';
  private bgmEnabled: boolean = true;

  constructor(moodMap?: BGMMoodMap[]) {
    this.moodMap = moodMap || DEFAULT_MOOD_BGM;
  }

  /**
   * Set custom mood-to-BGM mapping
   */
  setMoodMap(moodMap: BGMMoodMap[]): void {
    this.moodMap = moodMap;
  }

  /**
   * Get the current BGM map
   */
  getMoodMap(): BGMMoodMap[] {
    return [...this.moodMap];
  }

  /**
   * Enable/disable BGM
   */
  setEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.stopBGM();
    }
  }

  /**
   * Play BGM based on the current story mood.
   * Only changes BGM if the mood has actually changed.
   */
  playBGMForMood(mood: string): void {
    if (!this.bgmEnabled) return;
    if (mood === this.currentMood) return; // Same mood, don't change

    const moodEntry = this.findMoodEntry(mood);
    if (!moodEntry) {
      logger.warn(`[AI BGM] No BGM mapping for mood: ${mood}`);
      return;
    }

    this.currentMood = mood;
    this.playBGM(moodEntry);
  }

  /**
   * Stop current BGM
   */
  stopBGM(): void {
    stageStateManager.setStage('bgm', { src: '', enter: 0, volume: 0 });
    stageStateManager.commit({ notifyReact: true });
    this.currentMood = '';
  }

  /**
   * Fade out current BGM
   */
  fadeOutBGM(durationMs: number = 2000): void {
    const currentBgm = stageStateManager.getViewStageState().bgm;
    if (currentBgm.src) {
      // Negative enter means fade out
      stageStateManager.setStage('bgm', {
        src: currentBgm.src,
        enter: -durationMs,
        volume: 0,
      });
      stageStateManager.commit({ notifyReact: true });
    }
    this.currentMood = '';
  }

  // ============================================================
  // Private
  // ============================================================

  private findMoodEntry(mood: string): BGMMoodMap | undefined {
    // Exact match first
    let entry = this.moodMap.find((m) => m.mood === mood);
    if (entry) return entry;

    // Fuzzy match: check if mood contains any known mood keywords
    for (const known of this.moodMap) {
      if (mood.toLowerCase().includes(known.mood.toLowerCase())) {
        return known;
      }
      if (known.mood.toLowerCase().includes(mood.toLowerCase())) {
        return known;
      }
    }

    // Fallback to neutral
    return this.moodMap.find((m) => m.mood === 'neutral');
  }

  private playBGM(moodEntry: BGMMoodMap): void {
    const volume = moodEntry.volume ?? 60;
    const enter = moodEntry.fadeIn ?? 2000;

    // Use WebGAL's BGM system
    stageStateManager.setStage('bgm', {
      src: moodEntry.bgmFile,
      enter,
      volume,
    });
    stageStateManager.commit({ notifyReact: true });

    logger.info(`[AI BGM] Playing: ${moodEntry.bgmFile} (mood: ${moodEntry.mood}, vol: ${volume})`);
  }
}

/** Global BGM manager instance */
let globalBGM: AIBGMManager | null = null;

export function getBGM(): AIBGMManager {
  if (!globalBGM) {
    globalBGM = new AIBGMManager();
  }
  return globalBGM;
}
