/**
 * AI Story Setup Wizard (Native WebGAL Style)
 *
 * Full-screen overlay shown before the game starts.
 * Uses NormalOption, NormalButton for consistent look.
 * Steps: API Key → Template → World → Characters → Scenes → Beginning → Start
 */

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { setProviderApiKey, getConfiguredProviders, isApiKeyFromEnv } from '@/Core/ai/aiInitialize';
import { initializeAIGame } from '@/Core/ai/aiInitialize';
import { STORY_TEMPLATES } from '@/Core/userConfig/templates';
import { NormalOption } from '@/UI/Menu/Options/NormalOption';
import { NormalButton } from '@/UI/Menu/Options/NormalButton';
import type { WorldSetting, Character, Scene, StoryConfig } from '@/Core/ai/types';
import { logger } from '@/Core/util/logger';

type Step = 'api' | 'template' | 'world' | 'characters' | 'scenes' | 'beginning';
const STEPS: Step[] = ['api', 'template', 'world', 'characters', 'scenes', 'beginning'];
const STEP_LABELS = ['API密钥', '模板', '世界观', '角色', '场景', '开头'];

// ---- Main Component ----

export function AISetup() {
  const configManager = getConfigManager();
  const config = configManager.getConfig();

  const [step, setStep] = useState<Step>('api');
  const [apiKey, setApiKey] = useState('');
  const [world, setWorld] = useState<WorldSetting>({ ...config.worldSetting });
  const [characters, setCharacters] = useState<Character[]>(
    config.characters.length > 0 ? config.characters.map((c) => ({ ...c, images: [...c.images] })) : []
  );
  const [scenes, setScenes] = useState<Scene[]>(
    config.scenes.length > 0 ? config.scenes.map((s) => ({ ...s, images: [...s.images] })) : []
  );
  const [beginning, setBeginning] = useState(config.storyBeginning);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const currentStepIndex = STEPS.indexOf(step);
  const envHasKey = isApiKeyFromEnv('deepseek');

  const handleStart = async () => {
    // Save everything
    if (apiKey) setProviderApiKey('deepseek', apiKey);
    configManager.setWorldSetting(world);
    config.characters.forEach((c) => { if (!characters.find((nc) => nc.id === c.id)) configManager.removeCharacter(c.id); });
    characters.forEach((c) => configManager.saveCharacter(c));
    config.scenes.forEach((s) => { if (!scenes.find((ns) => ns.id === s.id)) configManager.removeScene(s.id); });
    scenes.forEach((s) => configManager.saveScene(s));
    configManager.setStoryBeginning(beginning);

    const errors = configManager.validate();
    if (errors.length > 0) {
      setError(errors.map((e) => e.message).join('\n'));
      return;
    }

    setIsStarting(true);
    setError('');
    try {
      await initializeAIGame();
    } catch (err: any) {
      setError(err.message || '初始化失败');
      logger.error('[AISetup] Start failed:', err);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.92)', color: '#ccc',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: '"Microsoft YaHei","PingFang SC",sans-serif',
      overflow: 'auto', padding: '40px 20px',
    }}>
      <div style={{ maxWidth: '700px', width: '100%' }}>
        {/* Title */}
        <h1 style={{
          textAlign: 'center', fontSize: '180%', marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(81,110,65,0.9), rgba(120,160,100,0.9))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          🎮 AI 视觉小说 · 故事设定
        </h1>

        {error && (
          <div style={{ background: 'rgba(255,0,0,0.15)', padding: '12px', borderRadius: '8px', marginBottom: '16px', whiteSpace: 'pre-wrap', fontSize: '130%' }}>
            {error}
          </div>
        )}

        {/* Step indicator */}
        <NormalOption key="steps" title={`步骤 ${currentStepIndex + 1} / ${STEPS.length}`}>
          <NormalButton
            textList={STEP_LABELS}
            functionList={STEPS.map((s) => () => setStep(s))}
            currentChecked={currentStepIndex}
          />
        </NormalOption>

        <div style={{ marginTop: '16px', minHeight: '300px' }}>
          {step === 'api' && <ApiStep apiKey={apiKey} setApiKey={setApiKey} envHasKey={envHasKey} />}
          {step === 'template' && <TemplateStep onApply={(cfg) => {
            setWorld(cfg.worldSetting);
            setCharacters(cfg.characters);
            setScenes(cfg.scenes);
            setBeginning(cfg.storyBeginning);
            setStep('beginning');
          }} />}
          {step === 'world' && <WorldStep world={world} setWorld={setWorld} />}
          {step === 'characters' && <CharacterStep characters={characters} setCharacters={setCharacters} />}
          {step === 'scenes' && <SceneStep scenes={scenes} setScenes={setScenes} />}
          {step === 'beginning' && <BeginningStep beginning={beginning} setBeginning={setBeginning} onStart={handleStart} isStarting={isStarting} />}
        </div>

        {/* Navigation */}
        {step !== 'beginning' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <NormalButton
              textList={currentStepIndex > 0 ? ['← 上一步'] : []}
              functionList={[() => setStep(STEPS[currentStepIndex - 1])]}
              currentChecked={-1}
            />
            <NormalButton
              textList={['下一步 →']}
              functionList={[() => setStep(STEPS[currentStepIndex + 1])]}
              currentChecked={-1}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Shared field components ----

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: '6px',
  border: '1px solid rgba(128,128,128,0.3)', background: 'rgba(0,0,0,0.3)',
  color: '#ccc', fontSize: '130%', boxSizing: 'border-box', marginTop: '4px',
};
const taStyle: React.CSSProperties = { ...inputStyle, minHeight: '70px', resize: 'vertical' };

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <NormalOption key={label} title={label}>{children}</NormalOption>;
}

// ---- Step Components ----

function ApiStep({ apiKey, setApiKey, envHasKey }: { apiKey: string; setApiKey: (v: string) => void; envHasKey: boolean }) {
  return (
    <>
      <F label="DeepSeek API Key">
        <div style={{ width: '100%' }}>
          {envHasKey && (
            <div style={{ fontSize: '120%', color: 'rgba(81,110,65,0.9)', marginBottom: '6px' }}>
              ✅ 已从 .env 文件加载密钥
            </div>
          )}
          <input
            type="password" style={inputStyle}
            value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={envHasKey ? '留空使用 .env 中的密钥' : 'sk-...'}
          />
        </div>
      </F>
      <p style={{ fontSize: '120%', color: '#888', marginTop: '12px' }}>
        密钥优先级：此处输入 {'>'} .env 文件。留空则自动使用 .env 中配置的密钥。
      </p>
    </>
  );
}

function TemplateStep({ onApply }: { onApply: (cfg: StoryConfig) => void }) {
  return (
    <>
      <p style={{ fontSize: '130%', color: '#aaa', marginBottom: '16px' }}>
        选择一个预设模板快速开始，或跳过手动设定。
      </p>
      <NormalButton
        textList={['跳过 (手动设定)']}
        functionList={[() => { /* user stays on current step, just click next */ }]}
        currentChecked={-1}
      />
      <div style={{ marginTop: '16px' }}>
        {STORY_TEMPLATES.map((t) => (
          <NormalOption key={t.id} title={t.name}>
            <div style={{ fontSize: '120%', color: '#888', marginBottom: '8px' }}>{t.description}</div>
            <NormalButton
              textList={['使用此模板']}
              functionList={[() => onApply(t.config)]}
              currentChecked={-1}
            />
          </NormalOption>
        ))}
      </div>
    </>
  );
}

function WorldStep({ world, setWorld }: { world: WorldSetting; setWorld: (w: WorldSetting) => void }) {
  return (
    <>
      <F label="世界观名称"><input style={inputStyle} value={world.name} onChange={(e) => setWorld({ ...world, name: e.target.value })} placeholder="例：剑与魔法的异世界" /></F>
      <F label="题材"><input style={inputStyle} value={world.genre} onChange={(e) => setWorld({ ...world, genre: e.target.value })} placeholder="奇幻 / 科幻 / 现代 / 古风" /></F>
      <F label="时代背景"><input style={inputStyle} value={world.era} onChange={(e) => setWorld({ ...world, era: e.target.value })} placeholder="中世纪 / 近未来" /></F>
      <F label="详细描述"><textarea style={taStyle} value={world.description} onChange={(e) => setWorld({ ...world, description: e.target.value })} placeholder="详细描述世界观设定" /></F>
      <F label="特殊规则"><textarea style={taStyle} value={world.rules} onChange={(e) => setWorld({ ...world, rules: e.target.value })} placeholder="魔法体系、科技水平" /></F>
      <F label="氛围基调"><input style={inputStyle} value={world.atmosphere} onChange={(e) => setWorld({ ...world, atmosphere: e.target.value })} placeholder="轻松愉快 / 黑暗深沉 / 浪漫温情" /></F>
    </>
  );
}

function CharacterStep({ characters, setCharacters }: { characters: Character[]; setCharacters: (c: Character[]) => void }) {
  const [editing, setEditing] = useState<number | null>(null);

  const add = () => {
    const c: Character = { id: uuidv4(), name: '', description: '', personality: '', appearance: '', background: '', relationships: '', images: [], speakingStyle: '' };
    setCharacters([...characters, c]);
    setEditing(characters.length);
  };

  if (editing !== null && characters[editing]) {
    const c = characters[editing];
    const u = (up: Partial<Character>) => {
      const arr = [...characters];
      arr[editing] = { ...arr[editing], ...up };
      setCharacters(arr);
    };
    return (
      <>
        <NormalOption key="back" title=""><NormalButton textList={['← 返回列表']} functionList={[() => setEditing(null)]} currentChecked={-1} /></NormalOption>
        <F label="名字"><input style={inputStyle} value={c.name} onChange={(e) => u({ name: e.target.value })} /></F>
        <F label="简介"><textarea style={taStyle} value={c.description} onChange={(e) => u({ description: e.target.value })} /></F>
        <F label="性格"><textarea style={{ ...taStyle, minHeight: '40px' }} value={c.personality} onChange={(e) => u({ personality: e.target.value })} /></F>
        <F label="外貌"><textarea style={{ ...taStyle, minHeight: '40px' }} value={c.appearance} onChange={(e) => u({ appearance: e.target.value })} /></F>
        <F label="背景"><textarea style={{ ...taStyle, minHeight: '40px' }} value={c.background} onChange={(e) => u({ background: e.target.value })} /></F>
        <F label="关系"><input style={inputStyle} value={c.relationships} onChange={(e) => u({ relationships: e.target.value })} /></F>
        <F label="说话风格"><input style={inputStyle} value={c.speakingStyle || ''} onChange={(e) => u({ speakingStyle: e.target.value })} /></F>
        <F label="立绘图片">
          <div style={{ width: '100%' }}>
            {c.images.map((img, i) => (
              <div key={img.id} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                <input style={{ ...inputStyle, flex: 1, fontSize: '100%' }} value={img.url} onChange={(e) => { const imgs = [...c.images]; imgs[i] = { ...imgs[i], url: e.target.value }; u({ images: imgs }); }} placeholder="路径" />
                <input style={{ ...inputStyle, width: '80px', fontSize: '100%' }} value={img.mood} onChange={(e) => { const imgs = [...c.images]; imgs[i] = { ...imgs[i], mood: e.target.value }; u({ images: imgs }); }} placeholder="情绪" />
                <NormalButton textList={['✕']} functionList={[() => u({ images: c.images.filter((_, j) => j !== i) })]} currentChecked={-1} />
              </div>
            ))}
            <NormalButton textList={['+ 添加立绘']} functionList={[() => u({ images: [...c.images, { id: uuidv4(), url: '', mood: 'neutral', pose: 'standing', expression: '' }] })]} currentChecked={-1} />
          </div>
        </F>
      </>
    );
  }

  return (
    <>
      <NormalOption key="add" title={`角色列表 (${characters.length})`}>
        <NormalButton textList={['+ 添加角色']} functionList={[add]} currentChecked={-1} />
      </NormalOption>
      {characters.map((c, i) => (
        <NormalOption key={c.id} title={c.name || `未命名角色 ${i + 1}`}>
          <NormalButton textList={['编辑', '删除']} functionList={[() => setEditing(i), () => setCharacters(characters.filter((_, j) => j !== i))]} currentChecked={-1} />
        </NormalOption>
      ))}
    </>
  );
}

function SceneStep({ scenes, setScenes }: { scenes: Scene[]; setScenes: (s: Scene[]) => void }) {
  const [editing, setEditing] = useState<number | null>(null);

  const add = () => {
    const s: Scene = { id: uuidv4(), name: '', description: '', images: [] };
    setScenes([...scenes, s]);
    setEditing(scenes.length);
  };

  if (editing !== null && scenes[editing]) {
    const s = scenes[editing];
    const u = (up: Partial<Scene>) => {
      const arr = [...scenes];
      arr[editing] = { ...arr[editing], ...up };
      setScenes(arr);
    };
    return (
      <>
        <NormalOption key="back" title=""><NormalButton textList={['← 返回列表']} functionList={[() => setEditing(null)]} currentChecked={-1} /></NormalOption>
        <F label="场景名"><input style={inputStyle} value={s.name} onChange={(e) => u({ name: e.target.value })} /></F>
        <F label="描述"><textarea style={taStyle} value={s.description} onChange={(e) => u({ description: e.target.value })} /></F>
        <F label="背景图片">
          <div style={{ width: '100%' }}>
            {s.images.map((img, i) => (
              <div key={img.id} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                <input style={{ ...inputStyle, flex: 1, fontSize: '100%' }} value={img.url} onChange={(e) => { const imgs = [...s.images]; imgs[i] = { ...imgs[i], url: e.target.value }; u({ images: imgs }); }} placeholder="路径" />
                <input style={{ ...inputStyle, width: '70px', fontSize: '100%' }} value={img.timeOfDay} onChange={(e) => { const imgs = [...s.images]; imgs[i] = { ...imgs[i], timeOfDay: e.target.value }; u({ images: imgs }); }} placeholder="时间" />
                <NormalButton textList={['✕']} functionList={[() => u({ images: s.images.filter((_, j) => j !== i) })]} currentChecked={-1} />
              </div>
            ))}
            <NormalButton textList={['+ 添加背景图']} functionList={[() => u({ images: [...s.images, { id: uuidv4(), url: '', timeOfDay: 'day', weather: 'clear', mood: 'neutral', description: '' }] })]} currentChecked={-1} />
          </div>
        </F>
      </>
    );
  }

  return (
    <>
      <NormalOption key="add" title={`场景列表 (${scenes.length})`}>
        <NormalButton textList={['+ 添加场景']} functionList={[add]} currentChecked={-1} />
      </NormalOption>
      {scenes.map((s, i) => (
        <NormalOption key={s.id} title={s.name || `未命名场景 ${i + 1}`}>
          <NormalButton textList={['编辑', '删除']} functionList={[() => setEditing(i), () => setScenes(scenes.filter((_, j) => j !== i))]} currentChecked={-1} />
        </NormalOption>
      ))}
    </>
  );
}

function BeginningStep({ beginning, setBeginning, onStart, isStarting }: {
  beginning: string; setBeginning: (v: string) => void; onStart: () => void; isStarting: boolean;
}) {
  return (
    <>
      <F label="故事开头">
        <textarea
          style={{ ...taStyle, minHeight: '200px' }}
          value={beginning}
          onChange={(e) => setBeginning(e.target.value)}
          placeholder="那是一个阴雨绵绵的下午，我站在教室门口..."
        />
      </F>
      <p style={{ fontSize: '120%', color: '#888', margin: '12px 0' }}>
        故事开头越详细，AI 生成的剧情就越贴合期望。建议包含初始场景、出场角色、起点事件。
      </p>
      <NormalOption key="start" title="">
        <NormalButton
          textList={[isStarting ? '⏳ 正在初始化...' : '🚀 开始游戏']}
          functionList={[onStart]}
          currentChecked={-1}
        />
      </NormalOption>
    </>
  );
}

export default AISetup;
