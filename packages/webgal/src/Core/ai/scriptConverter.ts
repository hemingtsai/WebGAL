/**
 * AI Script Converter
 *
 * Converts AI-generated story output (in WebGAL script format) into
 * ISentence arrays that WebGAL's engine can execute.
 * Also handles dynamic scene injection into the game engine.
 */

import { ISentence, commandType, IScene } from '@/Core/controller/scene/sceneInterface';
import { sceneParser } from '@/Core/parser/sceneParser';
import { assetSetter, fileType } from '@/Core/util/gameAssetsAccess/assetSetter';
import { logger } from '@/Core/util/logger';

/**
 * Convert AI-generated text (WebGAL script format) into an IScene
 * that can be executed by the engine.
 */
export function aiScriptToScene(
  scriptText: string,
  sceneName: string = 'ai_generated',
): IScene {
  // Use existing WebGAL parser to parse the script
  const sceneUrl = `dynamic://${sceneName}_${Date.now()}`;
  try {
    const scene = sceneParser(scriptText, sceneName, sceneUrl);
    logger.info(`[AI] Parsed AI script into scene with ${scene.sentenceList.length} sentences`);
    return scene;
  } catch (error) {
    logger.error('[AI] Failed to parse AI script:', error);
    // Return a minimal fallback scene
    return {
      sceneName,
      sceneUrl,
      sentenceList: [
        {
          command: commandType.say,
          commandRaw: scriptText,
          content: scriptText,
          args: [],
          sentenceAssets: [],
          subScene: [],
          inlineComment: '',
        },
      ],
      assetsList: [],
      subSceneList: [],
    };
  }
}

/**
 * Create a simple "say" sentence for the WebGAL engine
 */
export function createSaySentence(
  content: string,
  speaker?: string,
  options?: {
    vocal?: string;
    left?: boolean;
    right?: boolean;
    center?: boolean;
    fontSize?: string;
  },
): ISentence {
  const args: Array<{ key: string; value: string | boolean | number }> = [];
  if (speaker) args.push({ key: 'speaker', value: speaker });
  if (options?.vocal) args.push({ key: 'vocal', value: options.vocal });
  if (options?.left) args.push({ key: 'left', value: true });
  if (options?.right) args.push({ key: 'right', value: true });
  if (options?.center) args.push({ key: 'center', value: true });

  return {
    command: commandType.say,
    commandRaw: content,
    content,
    args,
    sentenceAssets: [],
    subScene: [],
    inlineComment: '',
  };
}

/**
 * Create a changeBg sentence
 */
export function createChangeBgSentence(bgFile: string): ISentence {
  return {
    command: commandType.changeBg,
    commandRaw: `changeBg:${bgFile}`,
    content: bgFile,
    args: [],
    sentenceAssets: [
      {
        name: bgFile,
        type: fileType.background,
        url: assetSetter(bgFile, fileType.background),
        lineNumber: 0,
      },
    ],
    subScene: [],
    inlineComment: '',
  };
}

/**
 * Create a changeFigure sentence
 */
export function createChangeFigureSentence(
  figureFile: string,
  position?: 'left' | 'right' | 'center',
): ISentence {
  const args: Array<{ key: string; value: string | boolean | number }> = [];
  if (position) args.push({ key: position, value: true });

  return {
    command: commandType.changeFigure,
    commandRaw: `changeFigure:${figureFile}${position ? ` -${position}` : ''}`,
    content: figureFile,
    args,
    sentenceAssets: [
      {
        name: figureFile,
        type: fileType.figure,
        url: assetSetter(figureFile, fileType.figure),
        lineNumber: 0,
      },
    ],
    subScene: [],
    inlineComment: '',
  };
}

/**
 * Create a choice sentence
 */
export function createChoiceSentence(
  options: Array<{ text: string; target: string; isScene?: boolean }>,
  prompt?: string,
): ISentence {
  const content = options
    .map((opt) => {
      const target = opt.isScene ? `${opt.target}.txt` : opt.target;
      return `${opt.text}:${target}`;
    })
    .join('|');

  return {
    command: commandType.choose,
    commandRaw: `choose:${content}`,
    content,
    args: [],
    sentenceAssets: [],
    subScene: [],
    inlineComment: prompt || '',
  };
}

/**
 * Create a setVar sentence
 */
export function createSetVarSentence(varName: string, value: string): ISentence {
  return {
    command: commandType.setVar,
    commandRaw: `setVar:${varName}=${value}`,
    content: `${varName}=${value}`,
    args: [
      { key: varName, value },
    ],
    sentenceAssets: [],
    subScene: [],
    inlineComment: '',
  };
}

/**
 * Create a changeScene sentence
 */
export function createChangeSceneSentence(sceneFile: string): ISentence {
  return {
    command: commandType.changeScene,
    commandRaw: `changeScene:${sceneFile}`,
    content: sceneFile,
    args: [],
    sentenceAssets: [],
    subScene: [],
    inlineComment: '',
  };
}

/**
 * Create an end sentence (game over)
 */
export function createEndSentence(): ISentence {
  return {
    command: commandType.end,
    commandRaw: 'end',
    content: '',
    args: [],
    sentenceAssets: [],
    subScene: [],
    inlineComment: '',
  };
}
