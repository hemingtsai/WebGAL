/**
 * Prompt Builder
 *
 * Constructs optimized prompts for AI models based on the story configuration.
 * Each task type has a specialized prompt template that includes relevant
 * world setting, character details, and scene descriptions.
 */

import {
  StoryConfig,
  StoryState,
  Character,
  Scene,
  ChatMessage,
  StoryEvent,
  CharacterImage,
  SceneImage,
} from './types';
import { getMemoryManager } from './memoryManager';

/**
 * Build the system prompt for story generation
 */
export function buildStoryGenerationPrompt(config: StoryConfig, state: StoryState): ChatMessage[] {
  const worldPrompt = buildWorldPrompt(config);
  const characterPrompt = buildCharacterPrompts(config.characters);
  const scenePrompt = buildScenePrompts(config.scenes, state.currentSceneId);
  const historyPrompt = buildHistoryPrompt(state);
  const outputFormat = buildOutputFormatPrompt();
  const memorySummary = getMemoryManager().getSummaryContext();

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `你是一个视觉小说/Galgame的故事生成引擎。你的任务是根据设定实时生成剧情内容。

## 世界观
${worldPrompt}

## 角色列表
${characterPrompt}

## 场景列表
${scenePrompt}

${memorySummary}

## 输出格式要求
${outputFormat}

## 规则
1. 每次只生成一小段剧情（3-8句对话或叙述），在关键决策点停下来让玩家选择
2. 生成的剧情要符合角色性格和世界观设定
3. 对话要自然生动，符合每个角色的说话风格
4. 适时切换场景和登场的角色
5. 保持剧情连贯性，不要重复已发生的内容
6. 在合适的时机（角色面临选择、剧情转折点等）插入选项
7. 在合适的时机切换背景图和角色立绘`,
  };

  const userMessage: ChatMessage = {
    role: 'user',
    content: buildUserPrompt(config, state, historyPrompt),
  };

  return [systemMessage, userMessage];
}

/**
 * Build the system prompt for choice generation
 */
export function buildChoiceGenerationPrompt(config: StoryConfig, state: StoryState): ChatMessage[] {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `你是一个视觉小说的选项生成器。根据当前剧情状态，生成有意义的选项。

## 世界观
${buildWorldPrompt(config)}

## 当前场景
${getCurrentSceneDescription(config, state.currentSceneId)}

## 规则
1. 生成2-4个选项
2. 每个选项都应对剧情有实质性影响
3. 选项要简短（不超过20字）
4. 选项应符合当前角色和场景`,
  };

  return [systemMessage];
}

/**
 * Build the system prompt for image selection
 * This is designed for a smaller model to select images based on text context
 */
export function buildImageSelectionPrompt(
  config: StoryConfig,
  state: StoryState,
  latestText: string,
): ChatMessage[] {
  const currentScene = config.scenes.find((s) => s.id === state.currentSceneId);
  const currentCharacters = config.characters.filter((c) =>
    state.currentCharacterIds.includes(c.id),
  );

  let sceneImageOptions = '';
  if (currentScene) {
    sceneImageOptions = currentScene.images
      .map(
        (img: SceneImage, i: number) =>
          `${i}: id="${img.id}", time="${img.timeOfDay}", weather="${img.weather}", mood="${img.mood}", desc="${img.description}"`,
      )
      .join('\n');
  }

  let characterImageOptions = '';
  for (const char of currentCharacters) {
    characterImageOptions += `\n角色 ${char.name}(${char.id}) 的图片:\n`;
    characterImageOptions += char.images
      .map(
        (img: CharacterImage, i: number) =>
          `  ${i}: id="${img.id}", mood="${img.mood}", pose="${img.pose}", expr="${img.expression}"`,
      )
      .join('\n');
  }

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `你是一个图片选择器。根据当前剧情文本，为场景和角色选择最合适的图片。

## 场景背景图选项
${sceneImageOptions || '无可用背景图'}

## 角色立绘图选项
${characterImageOptions || '无可用角色立绘'}

## 输出格式
{
  "backgroundImageId": "选中的背景图ID",
  "characterImages": {
    "角色ID": "选中的立绘ID"
  },
  "reasoning": "选择理由"
}

只输出JSON，不要有其他文字。`,
  };

  const userMessage: ChatMessage = {
    role: 'user',
    content: `当前剧情文本：\n${latestText}\n\n当前心情基调：${state.mood}\n\n请选择最合适的图片。`,
  };

  return [systemMessage, userMessage];
}

// ============================================================
// Private Helpers
// ============================================================

function buildWorldPrompt(config: StoryConfig): string {
  const w = config.worldSetting;
  return `名称：${w.name}
题材：${w.genre}
时代：${w.era}
描述：${w.description}
特殊规则：${w.rules}
氛围：${w.atmosphere}`;
}

function buildCharacterPrompts(characters: Character[]): string {
  return characters
    .map(
      (c: Character, i: number) =>
        `${i + 1}. ID="${c.id}", 姓名="${c.name}"
   简介：${c.description}
   性格：${c.personality}
   外貌：${c.appearance}
   背景：${c.background}
   ${c.relationships ? `关系：${c.relationships}` : ''}
   ${c.speakingStyle ? `说话风格：${c.speakingStyle}` : ''}`,
    )
    .join('\n\n');
}

function buildScenePrompts(scenes: Scene[], currentSceneId: string): string {
  return scenes
    .map((s: Scene) => {
      const isCurrent = s.id === currentSceneId ? '【当前场景】' : '';
      return `- ID="${s.id}", 名称="${s.name}" ${isCurrent}\n  描述：${s.description}`;
    })
    .join('\n');
}

function getCurrentSceneDescription(config: StoryConfig, currentSceneId: string): string {
  const scene = config.scenes.find((s: Scene) => s.id === currentSceneId);
  return scene ? `${scene.name}：${scene.description}` : '未知场景';
}

function buildHistoryPrompt(state: StoryState): string {
  if (state.history.length === 0) {
    return `## 故事开头
${state.config.storyBeginning}`;
  }

  const recentHistory = state.history.slice(-10);
  const historyText = recentHistory
    .map((e: StoryEvent) => {
      if (e.type === 'dialogue' && e.speaker) {
        const char = state.config.characters.find((c: Character) => c.id === e.speaker);
        return `${char?.name || e.speaker}："${e.content}"`;
      }
      return e.content;
    })
    .join('\n');

  return `## 最近剧情
${historyText}`;
}

function buildUserPrompt(config: StoryConfig, state: StoryState, historyPrompt: string): string {
  const currentScene = config.scenes.find((s: Scene) => s.id === state.currentSceneId);
  const currentCharacters = config.characters.filter((c: Character) =>
    state.currentCharacterIds.includes(c.id),
  );

  const promptParts: string[] = [historyPrompt];

  promptParts.push(`\n## 当前状态
- 当前场景：${currentScene?.name || '未知'} (ID: ${state.currentSceneId})
- 登场角色：${currentCharacters.map((c: Character) => c.name).join('、') || '无'}
- 氛围基调：${state.mood}`);

  if (state.history.length === 0) {
    promptParts.push(`\n请根据以上设定和故事开头，生成第一段剧情。`);
  } else {
    promptParts.push(`\n请根据以上信息，继续生成下一段剧情。在合适的时机插入选项让玩家选择。`);
  }

  return promptParts.join('\n');
}

function buildOutputFormatPrompt(): string {
  return `请严格按照以下JSON格式输出（不要包含markdown代码块标记）：
{
  "script": "WebGAL脚本命令（参见下方说明）",
  "summary": "本段剧情的一句话总结",
  "sceneId": "当前场景ID",
  "characterIds": ["登场的角色ID列表"],
  "mood": "本段剧情的情绪基调",
  "choicePoint": null 或 {
    "prompt": "选择提示文字",
    "options": [
      {"text": "选项文字", "consequence": "该选项的后果简述"}
    ]
  }
}

WebGAL脚本命令格式示例：
; 旁白/叙述（不带speaker参数）
旁白：这是场景描述文字
; 对话
角色A：你好！ -speaker=角色A
; 切换背景
changeBg:背景图文件名
; 切换立绘
changeFigure:立绘图文件名 -left
; 切换场景（需要选项时使用）
changeScene:场景文件名

注意：speaker参数要和角色的名字一致。如果没有choicePoint，则表示剧情继续进行，不需要玩家选择。`;
}
