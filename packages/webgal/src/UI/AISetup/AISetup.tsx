/**
 * AI Story Setup Wizard — WebGAL Native Title Screen Style
 *
 * Matches the visual language of WebGAL's title screen:
 * - Light gradient background
 * - Skewed elegant buttons
 * - Green accent colors
 * - Serif title font
 * - Clean, airy spacing
 */

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { setProviderApiKey, isApiKeyFromEnv } from '@/Core/ai/aiInitialize';
import { initializeAIGame } from '@/Core/ai/aiInitialize';
import { STORY_TEMPLATES } from '@/Core/userConfig/templates';
import type { WorldSetting, Character, Scene, StoryConfig } from '@/Core/ai/types';
import { logger } from '@/Core/util/logger';

type Step = 'api' | 'template' | 'world' | 'characters' | 'scenes' | 'beginning';
const STEPS: Step[] = ['api', 'template', 'world', 'characters', 'scenes', 'beginning'];
const STEP_LABELS = ['API 密钥', '选择模板', '世界观', '角色', '场景', '故事开头'];

// ============================================================
// Styles matching WebGAL's title screen aesthetic
// ============================================================

const s = {
  // Main overlay — matches title screen's light gradient + backdrop
  overlay: {
    position: 'fixed' as const, inset: 0, zIndex: 10000,
    background: 'linear-gradient(135deg, #fdfbfb 0%, #dcddde 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '"Microsoft YaHei","PingFang SC","思源宋体",serif',
  },
  // Card — centered content area with glass effect
  card: {
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: '8px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
    padding: '48px 56px',
    maxWidth: '680px',
    width: '90%',
    maxHeight: '85vh',
    display: 'flex', flexDirection: 'column' as const,
  },
  // Title — gradient green like Options title
  title: {
    fontSize: '200%', fontWeight: 'bold' as const, textAlign: 'center' as const,
    marginBottom: '8px',
    color: 'transparent',
    background: 'linear-gradient(to left, #227D51, rgba(81,110,65,1))',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    fontFamily: '"思源宋体",serif',
  },
  subtitle: {
    textAlign: 'center' as const, color: 'rgba(81,110,65,0.6)',
    fontSize: '110%', marginBottom: '28px',
  },
  // Step indicator — row of skewed buttons like title buttons
  stepRow: {
    display: 'flex', justifyContent: 'center', gap: '6px',
    marginBottom: '28px', flexWrap: 'wrap' as const, flexShrink: 0,
  },
  stepBtn: (active: boolean) => ({
    padding: '6px 16px', fontSize: '90%', fontWeight: 'bold' as const,
    cursor: 'pointer', border: 'none', borderRadius: '4px',
    transform: 'skewX(-8deg)',
    background: active
      ? 'linear-gradient(to right, rgba(81,110,65,0.25), rgba(81,110,65,0.1))'
      : 'linear-gradient(to right, rgba(0,0,0,0.08), rgba(0,0,0,0.03))',
    color: active ? 'rgba(81,110,65,0.9)' : 'rgba(0,0,0,0.35)',
    transition: 'all 0.25s',
  }),
  // Scrollable content area
  content: {
    flex: 1, overflow: 'auto' as const, minHeight: 0,
    marginBottom: '20px',
  },
  // Bottom navigation
  navRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexShrink: 0, paddingTop: '16px',
    borderTop: '1px solid rgba(0,0,0,0.08)',
  },
  // Title-style nav button
  navBtn: (primary?: boolean) => ({
    padding: '10px 28px', fontSize: '110%', fontWeight: 'bold' as const,
    cursor: 'pointer', border: 'none', borderRadius: '4px',
    transform: 'skewX(-8deg)',
    background: primary
      ? 'linear-gradient(to right, rgba(81,110,65,0.35), rgba(81,110,65,0.2))'
      : 'linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.04))',
    color: primary ? 'rgba(81,110,65,1)' : 'rgba(0,0,0,0.5)',
    transition: 'all 0.25s',
  }),
  // Form field
  field: {
    marginBottom: '14px',
  },
  label: {
    display: 'block', fontSize: '95%', color: 'rgba(0,0,0,0.5)',
    marginBottom: '4px', fontWeight: 'bold' as const,
  },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: '6px',
    border: '1px solid rgba(0,0,0,0.12)', background: 'rgba(0,0,0,0.02)',
    fontSize: '100%', color: '#333', boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%', padding: '10px 14px', borderRadius: '6px',
    border: '1px solid rgba(0,0,0,0.12)', background: 'rgba(0,0,0,0.02)',
    fontSize: '100%', color: '#333', boxSizing: 'border-box' as const,
    minHeight: '70px', resize: 'vertical' as const, outline: 'none',
    fontFamily: 'inherit',
  },
  // Item card in lists
  item: {
    padding: '10px 14px', marginBottom: '6px', borderRadius: '6px',
    background: 'rgba(0,0,0,0.03)', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    border: '1px solid rgba(0,0,0,0.06)', transition: 'all 0.2s',
  },
  smallBtn: (danger?: boolean) => ({
    padding: '4px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer',
    fontSize: '85%', fontWeight: 'bold' as const,
    background: danger ? 'rgba(220,80,80,0.1)' : 'rgba(81,110,65,0.1)',
    color: danger ? '#c44' : 'rgba(81,110,65,0.8)',
    marginLeft: '8px',
  }),
  error: {
    background: 'rgba(220,80,80,0.08)', color: '#a33',
    padding: '10px 14px', borderRadius: '6px', marginBottom: '16px',
    fontSize: '90%', whiteSpace: 'pre-wrap' as const,
  },
  envBadge: {
    fontSize: '85%', color: 'rgba(81,110,65,0.7)', marginBottom: '6px',
  },
  hint: {
    fontSize: '90%', color: 'rgba(0,0,0,0.4)', marginTop: '8px',
  },
};

// ============================================================
// Main Component
// ============================================================

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

  const currentIdx = STEPS.indexOf(step);
  const envHasKey = isApiKeyFromEnv('deepseek');

  const saveAndStart = async () => {
    if (apiKey) setProviderApiKey('deepseek', apiKey);
    configManager.setWorldSetting(world);
    config.characters.forEach((c) => { if (!characters.find((nc) => nc.id === c.id)) configManager.removeCharacter(c.id); });
    characters.forEach((c) => configManager.saveCharacter(c));
    config.scenes.forEach((s) => { if (!scenes.find((ns) => ns.id === s.id)) configManager.removeScene(s.id); });
    scenes.forEach((s) => configManager.saveScene(s));
    configManager.setStoryBeginning(beginning);

    const errors = configManager.validate();
    if (errors.length > 0) { setError(errors.map((e) => e.message).join('\n')); return; }

    setIsStarting(true); setError('');
    try { await initializeAIGame(); }
    catch (err: any) { setError(err.message || '初始化失败'); logger.error('[AISetup]', err); }
    finally { setIsStarting(false); }
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        {/* Title */}
        <div style={s.title}>AI 视觉小说</div>
        <div style={s.subtitle}>配置你的故事世界，AI 将为你实时生成剧情</div>

        {error && <div style={s.error}>{error}</div>}

        {/* Step indicator */}
        <div style={s.stepRow}>
          {STEPS.map((st, i) => (
            <button key={st} style={s.stepBtn(step === st)} onClick={() => setStep(st)}>
              {i + 1}. {STEP_LABELS[i]}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={s.content}>
          {step === 'api' && <ApiStep apiKey={apiKey} setApiKey={setApiKey} envHasKey={envHasKey} />}
          {step === 'template' && <TemplateStep onApply={(cfg) => {
            setWorld(cfg.worldSetting); setCharacters(cfg.characters);
            setScenes(cfg.scenes); setBeginning(cfg.storyBeginning);
            setStep('beginning');
          }} />}
          {step === 'world' && <WorldStep world={world} setWorld={setWorld} />}
          {step === 'characters' && <CharStep chars={characters} setChars={setCharacters} />}
          {step === 'scenes' && <SceneStep scenes={scenes} setScenes={setScenes} />}
          {step === 'beginning' && <BeginningStep beginning={beginning} setBeginning={setBeginning} />}
        </div>

        {/* Bottom navigation */}
        <div style={s.navRow}>
          <div>
            {currentIdx > 0 && (
              <button style={s.navBtn()} onClick={() => setStep(STEPS[currentIdx - 1])}>
                ← {STEP_LABELS[currentIdx - 1]}
              </button>
            )}
          </div>
          <div>
            {step !== 'beginning' ? (
              <button style={s.navBtn(true)} onClick={() => setStep(STEPS[currentIdx + 1])}>
                {STEP_LABELS[currentIdx + 1]} →
              </button>
            ) : (
              <button style={s.navBtn(true)} onClick={saveAndStart} disabled={isStarting}>
                {isStarting ? '⏳ 初始化中...' : '🚀 开始游戏'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step Components
// ============================================================

function ApiStep({ apiKey, setApiKey, envHasKey }: { apiKey: string; setApiKey: (v: string) => void; envHasKey: boolean }) {
  return (
    <div style={s.field}>
      <div style={s.label}>DeepSeek API Key</div>
      {envHasKey && <div style={s.envBadge}>✅ 已从 .env 文件加载</div>}
      <input
        type="password" style={s.input}
        value={apiKey} onChange={(e) => setApiKey(e.target.value)}
        placeholder={envHasKey ? '留空使用 .env 密钥' : 'sk-...'}
        autoFocus
      />
      <div style={s.hint}>密钥优先级：此处输入 &gt; .env 文件。留空则自动使用 .env 中配置的密钥。</div>
    </div>
  );
}

function TemplateStep({ onApply }: { onApply: (cfg: StoryConfig) => void }) {
  return (
    <div>
      <div style={{ ...s.label, marginBottom: '12px' }}>选择一个预设模板快速开始，或点击"跳过"手动设定</div>
      {STORY_TEMPLATES.map((t) => (
        <div key={t.id} style={s.item} onClick={() => onApply(t.config)}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{t.name}</div>
            <div style={{ fontSize: '85%', color: 'rgba(0,0,0,0.45)' }}>{t.description}</div>
            <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
              {t.tags.map((tag) => (
                <span key={tag} style={{ fontSize: '75%', padding: '1px 8px', borderRadius: '8px', background: 'rgba(81,110,65,0.1)', color: 'rgba(81,110,65,0.7)' }}>{tag}</span>
              ))}
            </div>
          </div>
          <span style={{ color: 'rgba(81,110,65,0.5)', fontSize: '120%' }}>→</span>
        </div>
      ))}
    </div>
  );
}

function WorldStep({ world, setWorld }: { world: WorldSetting; setWorld: (w: WorldSetting) => void }) {
  const f = (k: keyof WorldSetting, placeholder?: string, ta?: boolean) => (
    <div style={s.field} key={k}>
      <div style={s.label}>{({ name: '名称', genre: '题材', era: '时代', description: '详细描述', rules: '特殊规则', atmosphere: '氛围基调' } as any)[k]}</div>
      {ta
        ? <textarea style={s.textarea} value={world[k]} onChange={(e) => setWorld({ ...world, [k]: e.target.value })} placeholder={placeholder} />
        : <input style={s.input} value={world[k]} onChange={(e) => setWorld({ ...world, [k]: e.target.value })} placeholder={placeholder} />}
    </div>
  );
  return <>{f('name', '例：剑与魔法的异世界')}{f('genre', '奇幻 / 科幻 / 现代 / 古风')}{f('era', '中世纪 / 近未来')}{f('description', '详细描述世界观设定...', true)}{f('rules', '魔法体系、科技水平...', true)}{f('atmosphere', '轻松愉快 / 黑暗深沉 / 浪漫温情')}</>;
}

function CharStep({ chars, setChars }: { chars: Character[]; setChars: (c: Character[]) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);

  if (editIdx !== null && chars[editIdx]) {
    const c = chars[editIdx];
    const u = (up: Partial<Character>) => { const arr = [...chars]; arr[editIdx] = { ...arr[editIdx], ...up }; setChars(arr); };
    return (
      <div>
        <button style={s.smallBtn()} onClick={() => setEditIdx(null)}>← 返回列表</button>
        <div style={s.field}><div style={s.label}>名字</div><input style={s.input} value={c.name} onChange={(e) => u({ name: e.target.value })} /></div>
        <div style={s.field}><div style={s.label}>简介</div><textarea style={s.textarea} value={c.description} onChange={(e) => u({ description: e.target.value })} /></div>
        <div style={s.field}><div style={s.label}>性格</div><textarea style={{ ...s.textarea, minHeight: '40px' }} value={c.personality} onChange={(e) => u({ personality: e.target.value })} /></div>
        <div style={s.field}><div style={s.label}>外貌</div><textarea style={{ ...s.textarea, minHeight: '40px' }} value={c.appearance} onChange={(e) => u({ appearance: e.target.value })} /></div>
        <div style={s.field}><div style={s.label}>背景</div><textarea style={{ ...s.textarea, minHeight: '40px' }} value={c.background} onChange={(e) => u({ background: e.target.value })} /></div>
        <div style={s.field}><div style={s.label}>关系</div><input style={s.input} value={c.relationships} onChange={(e) => u({ relationships: e.target.value })} /></div>
        <div style={s.field}><div style={s.label}>说话风格</div><input style={s.input} value={c.speakingStyle || ''} onChange={(e) => u({ speakingStyle: e.target.value })} /></div>
        <div style={s.field}>
          <div style={s.label}>立绘图片（情绪/姿态）</div>
          {c.images.map((img, i) => (
            <div key={img.id} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <input style={{ ...s.input, flex: 1 }} value={img.url} onChange={(e) => { const im = [...c.images]; im[i] = { ...im[i], url: e.target.value }; u({ images: im }); }} placeholder="图片路径" />
              <input style={{ ...s.input, width: '90px' }} value={img.mood} onChange={(e) => { const im = [...c.images]; im[i] = { ...im[i], mood: e.target.value }; u({ images: im }); }} placeholder="情绪" />
              <button style={s.smallBtn(true)} onClick={() => u({ images: c.images.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button style={s.smallBtn()} onClick={() => u({ images: [...c.images, { id: uuidv4(), url: '', mood: 'neutral', pose: 'standing', expression: '' }] })}>+ 添加立绘</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button style={{ ...s.smallBtn(), marginBottom: '12px' }} onClick={() => { setChars([...chars, { id: uuidv4(), name: '', description: '', personality: '', appearance: '', background: '', relationships: '', images: [], speakingStyle: '' }]); setEditIdx(chars.length); }}>
        + 添加角色
      </button>
      {chars.map((c, i) => (
        <div key={c.id} style={s.item} onClick={() => setEditIdx(i)}>
          <span style={{ fontWeight: 'bold' }}>{c.name || `未命名角色 ${i + 1}`}</span>
          <div>
            <button style={s.smallBtn()} onClick={(e) => { e.stopPropagation(); setEditIdx(i); }}>编辑</button>
            <button style={s.smallBtn(true)} onClick={(e) => { e.stopPropagation(); setChars(chars.filter((_, j) => j !== i)); }}>删除</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SceneStep({ scenes, setScenes }: { scenes: Scene[]; setScenes: (s: Scene[]) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);

  if (editIdx !== null && scenes[editIdx]) {
    const sc = scenes[editIdx];
    const u = (up: Partial<Scene>) => { const arr = [...scenes]; arr[editIdx] = { ...arr[editIdx], ...up }; setScenes(arr); };
    return (
      <div>
        <button style={s.smallBtn()} onClick={() => setEditIdx(null)}>← 返回列表</button>
        <div style={s.field}><div style={s.label}>场景名</div><input style={s.input} value={sc.name} onChange={(e) => u({ name: e.target.value })} /></div>
        <div style={s.field}><div style={s.label}>描述</div><textarea style={s.textarea} value={sc.description} onChange={(e) => u({ description: e.target.value })} /></div>
        <div style={s.field}>
          <div style={s.label}>背景图片（时间/天气）</div>
          {sc.images.map((img, i) => (
            <div key={img.id} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <input style={{ ...s.input, flex: 1 }} value={img.url} onChange={(e) => { const im = [...sc.images]; im[i] = { ...im[i], url: e.target.value }; u({ images: im }); }} placeholder="图片路径" />
              <input style={{ ...s.input, width: '80px' }} value={img.timeOfDay} onChange={(e) => { const im = [...sc.images]; im[i] = { ...im[i], timeOfDay: e.target.value }; u({ images: im }); }} placeholder="时间" />
              <button style={s.smallBtn(true)} onClick={() => u({ images: sc.images.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button style={s.smallBtn()} onClick={() => u({ images: [...sc.images, { id: uuidv4(), url: '', timeOfDay: 'day', weather: 'clear', mood: 'neutral', description: '' }] })}>+ 添加背景图</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button style={{ ...s.smallBtn(), marginBottom: '12px' }} onClick={() => { setScenes([...scenes, { id: uuidv4(), name: '', description: '', images: [] }]); setEditIdx(scenes.length); }}>
        + 添加场景
      </button>
      {scenes.map((sc, i) => (
        <div key={sc.id} style={s.item} onClick={() => setEditIdx(i)}>
          <span style={{ fontWeight: 'bold' }}>{sc.name || `未命名场景 ${i + 1}`}</span>
          <div>
            <button style={s.smallBtn()} onClick={(e) => { e.stopPropagation(); setEditIdx(i); }}>编辑</button>
            <button style={s.smallBtn(true)} onClick={(e) => { e.stopPropagation(); setScenes(scenes.filter((_, j) => j !== i)); }}>删除</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BeginningStep({ beginning, setBeginning }: { beginning: string; setBeginning: (v: string) => void }) {
  return (
    <div style={s.field}>
      <div style={s.label}>故事开头</div>
      <textarea
        style={{ ...s.textarea, minHeight: '200px' }}
        value={beginning}
        onChange={(e) => setBeginning(e.target.value)}
        placeholder="那是一个阴雨绵绵的下午，我站在教室门口，手心里全是汗..."
        autoFocus
      />
      <div style={s.hint}>故事开头越详细，AI 生成的剧情就越贴合你的期望。建议包含初始场景、出场角色和起点事件。</div>
    </div>
  );
}

export default AISetup;
