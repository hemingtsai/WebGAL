/**
 * AI Story Setup UI
 *
 * Provides the interface for users to:
 * 1. Set API keys for AI providers
 * 2. Define world setting
 * 3. Add/edit characters with detailed profiles and images
 * 4. Add/edit scenes with images
 * 5. Write the story beginning
 * 6. Start the AI-powered game
 */

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { setProviderApiKey, getConfiguredProviders, isApiKeyFromEnv } from '@/Core/ai/aiInitialize';
import { initializeAIGame } from '@/Core/ai/aiInitialize';
import { WebGAL } from '@/Core/WebGAL';
import { STORY_TEMPLATES, applyTemplate } from '@/Core/userConfig/templates';
import type {
  WorldSetting,
  Character,
  Scene,
  CharacterImage,
  SceneImage,
} from '@/Core/ai/types';
import { logger } from '@/Core/util/logger';

// ============================================================
// Styles (inline for simplicity — can be moved to SCSS later)
// ============================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    color: '#fff',
    zIndex: 10000,
    overflow: 'auto',
    padding: '20px',
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  inner: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    textAlign: 'center' as const,
    marginBottom: '30px',
    color: '#ff6b9d',
  },
  section: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '15px',
    color: '#ff8fb3',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: '8px',
  },
  field: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    color: '#ccc',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  button: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginRight: '8px',
    marginTop: '4px',
  },
  primaryButton: {
    padding: '12px 30px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #ff6b9d, #c44dff)',
    color: '#fff',
    display: 'block',
    margin: '30px auto 0',
  },
  addButton: {
    background: 'rgba(255,255,255,0.15)',
    color: '#ff8fb3',
  },
  removeButton: {
    background: 'rgba(255,80,80,0.3)',
    color: '#ff8888',
  },
  card: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ff8fb3',
  },
  imageGrid: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
    marginTop: '8px',
  },
  imageItem: {
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '12px',
    maxWidth: '150px',
  },
};

// ============================================================
// Main Component
// ============================================================

export function AISetup() {
  const configManager = getConfigManager();
  const config = configManager.getConfig();

  const [step, setStep] = useState<'api' | 'world' | 'characters' | 'scenes' | 'story' | 'done'>('api');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [world, setWorld] = useState<WorldSetting>(config.worldSetting);
  const [characters, setCharacters] = useState<Character[]>(config.characters);
  const [scenes, setScenes] = useState<Scene[]>(config.scenes);
  const [storyBeginning, setStoryBeginning] = useState(config.storyBeginning);
  const [language, setLanguage] = useState(config.language || 'zh-CN');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load saved API keys
    const providers = ['deepseek', 'openai'];
    const keys: Record<string, string> = {};
    for (const p of providers) {
      const key = localStorage.getItem(`ai_api_key_${p}`) || '';
      if (key) keys[p] = key;
    }
    setApiKeys(keys);
  }, []);

  const saveAndNext = async (nextStep: typeof step) => {
    // Save current step data
    switch (step) {
      case 'api':
        for (const [provider, key] of Object.entries(apiKeys)) {
          if (key) setProviderApiKey(provider, key);
        }
        break;
      case 'world':
        configManager.setWorldSetting(world);
        break;
      case 'characters':
        config.characters.forEach((c) => {
          if (!characters.find((nc) => nc.id === c.id)) {
            configManager.removeCharacter(c.id);
          }
        });
        characters.forEach((c) => configManager.saveCharacter(c));
        break;
      case 'scenes':
        config.scenes.forEach((s) => {
          if (!scenes.find((ns) => ns.id === s.id)) {
            configManager.removeScene(s.id);
          }
        });
        scenes.forEach((s) => configManager.saveScene(s));
        break;
      case 'story':
        configManager.setStoryBeginning(storyBeginning);
        configManager.setLanguage(language);
        break;
    }
    setStep(nextStep);
  };

  const handleStart = async () => {
    // Final save
    configManager.setWorldSetting(world);
    characters.forEach((c) => configManager.saveCharacter(c));
    scenes.forEach((s) => configManager.saveScene(s));
    configManager.setStoryBeginning(storyBeginning);
    configManager.setLanguage(language);

    if (!configManager.isReady()) {
      const errors = configManager.validate();
      setError(errors.map((e) => e.message).join('\n'));
      return;
    }

    setIsStarting(true);
    setError('');

    try {
      await initializeAIGame();
      setStep('done');
      // Force re-render to show the game
    } catch (err: any) {
      setError(err.message || '初始化失败');
      logger.error('[AISetup] Failed to start:', err);
    } finally {
      setIsStarting(false);
    }
  };

  if (step === 'done') {
    return null; // Game is running
  }

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <h1 style={styles.title}>🎮 AI 视觉小说 · 故事设定</h1>

        {error && (
          <div style={{ background: 'rgba(255,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
            {error}
          </div>
        )}

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          {(['api', 'world', 'characters', 'scenes', 'story'] as const).map((s, i) => (
            <div
              key={s}
              onClick={() => setStep(s)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                background: step === s ? 'linear-gradient(135deg, #ff6b9d, #c44dff)' : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: step === s ? 'bold' : 'normal',
              }}
            >
              {['API密钥', '世界观', '角色', '场景', '开头'][i]}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 'api' && (
          <>
            <APIStep apiKeys={apiKeys} setApiKeys={setApiKeys} />
            <TemplateSelector
              onSelect={(config) => {
                setWorld(config.worldSetting);
                setCharacters(config.characters);
                setScenes(config.scenes);
                setStoryBeginning(config.storyBeginning);
                setLanguage(config.language);
                // Jump to story step to review and start
                setStep('story');
              }}
            />
          </>
        )}
        {step === 'world' && <WorldStep world={world} setWorld={setWorld} />}
        {step === 'characters' && <CharactersStep characters={characters} setCharacters={setCharacters} />}
        {step === 'scenes' && <ScenesStep scenes={scenes} setScenes={setScenes} />}
        {step === 'story' && <StoryStep storyBeginning={storyBeginning} setStoryBeginning={setStoryBeginning} language={language} setLanguage={setLanguage} />}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button
            style={{ ...styles.button, ...styles.addButton }}
            onClick={() => {
              const steps: Array<'api' | 'world' | 'characters' | 'scenes' | 'story'> = ['api', 'world', 'characters', 'scenes', 'story'];
              const idx = steps.indexOf(step);
              if (idx > 0) setStep(steps[idx - 1]);
            }}
            disabled={step === 'api'}
          >
            ← 上一步
          </button>
          {step !== 'story' ? (
            <button
              style={{ ...styles.button, background: '#c44dff', color: '#fff' }}
              onClick={() => {
                const steps: Array<'api' | 'world' | 'characters' | 'scenes' | 'story'> = ['api', 'world', 'characters', 'scenes', 'story'];
                const idx = steps.indexOf(step);
                saveAndNext(steps[idx + 1]);
              }}
            >
              下一步 →
            </button>
          ) : (
            <button
              style={{ ...styles.primaryButton, opacity: isStarting ? 0.6 : 1 }}
              onClick={handleStart}
              disabled={isStarting}
            >
              {isStarting ? '⏳ 正在初始化...' : '🚀 开始游戏'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step Components
// ============================================================

function APIStep({ apiKeys, setApiKeys }: { apiKeys: Record<string, string>; setApiKeys: (v: Record<string, string>) => void }) {
  const deepseekFromEnv = isApiKeyFromEnv('deepseek');
  const openaiFromEnv = isApiKeyFromEnv('openai');

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>API 密钥配置</h2>
      <p style={{ color: '#999', fontSize: '13px', marginBottom: '16px' }}>
        密钥优先从 <code>.env</code> 文件读取（VITE_DEEPSEEK_API_KEY）。
        留空则使用 .env 中的密钥。
      </p>
      <div style={styles.field}>
        <label style={styles.label}>
          DeepSeek API Key
          {deepseekFromEnv && (
            <span style={{ color: '#44cc44', marginLeft: '8px', fontSize: '12px' }}>
              ✅ 已从 .env 加载
            </span>
          )}
        </label>
        <input
          style={styles.input}
          type="password"
          value={apiKeys.deepseek || ''}
          onChange={(e) => setApiKeys({ ...apiKeys, deepseek: e.target.value })}
          placeholder={deepseekFromEnv ? '已从 .env 加载，留空使用' : 'sk-...'}
        />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>
          OpenAI API Key (可选)
          {openaiFromEnv && (
            <span style={{ color: '#44cc44', marginLeft: '8px', fontSize: '12px' }}>
              ✅ 已从 .env 加载
            </span>
          )}
        </label>
        <input
          style={styles.input}
          type="password"
          value={apiKeys.openai || ''}
          onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
          placeholder={openaiFromEnv ? '已从 .env 加载，留空使用' : 'sk-...'}
        />
      </div>
    </div>
  );
}

function WorldStep({ world, setWorld }: { world: WorldSetting; setWorld: (w: WorldSetting) => void }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>世界观设定</h2>
      <div style={styles.field}>
        <label style={styles.label}>世界观名称 *</label>
        <input style={styles.input} value={world.name} onChange={(e) => setWorld({ ...world, name: e.target.value })} placeholder="例：剑与魔法的异世界" />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>题材</label>
        <input style={styles.input} value={world.genre} onChange={(e) => setWorld({ ...world, genre: e.target.value })} placeholder="奇幻 / 科幻 / 现代 / 古风 / 校园" />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>时代背景</label>
        <input style={styles.input} value={world.era} onChange={(e) => setWorld({ ...world, era: e.target.value })} placeholder="中世纪 / 近未来 / 现代都市" />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>世界观详细描述 *</label>
        <textarea style={styles.textarea} value={world.description} onChange={(e) => setWorld({ ...world, description: e.target.value })} placeholder="详细描述这个世界的设定、社会结构、历史背景等..." />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>特殊规则/法则</label>
        <textarea style={styles.textarea} value={world.rules} onChange={(e) => setWorld({ ...world, rules: e.target.value })} placeholder="魔法体系、科技水平、特殊规则等..." />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>氛围基调</label>
        <input style={styles.input} value={world.atmosphere} onChange={(e) => setWorld({ ...world, atmosphere: e.target.value })} placeholder="轻松愉快 / 黑暗深沉 / 浪漫温情 / 悬疑紧张" />
      </div>
    </div>
  );
}

function CharactersStep({ characters, setCharacters }: { characters: Character[]; setCharacters: (c: Character[]) => void }) {
  const addCharacter = () => {
    setCharacters([
      ...characters,
      {
        id: uuidv4(),
        name: '',
        description: '',
        personality: '',
        appearance: '',
        background: '',
        relationships: '',
        images: [],
        speakingStyle: '',
      },
    ]);
  };

  const updateCharacter = (index: number, updates: Partial<Character>) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], ...updates };
    setCharacters(updated);
  };

  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  const addImage = (charIndex: number) => {
    const updated = [...characters];
    updated[charIndex].images.push({
      id: uuidv4(),
      url: '',
      mood: 'neutral',
      pose: 'standing',
      expression: '',
    });
    setCharacters(updated);
  };

  const updateImage = (charIndex: number, imgIndex: number, updates: Partial<CharacterImage>) => {
    const updated = [...characters];
    updated[charIndex].images[imgIndex] = { ...updated[charIndex].images[imgIndex], ...updates };
    setCharacters(updated);
  };

  const removeImage = (charIndex: number, imgIndex: number) => {
    const updated = [...characters];
    updated[charIndex].images = updated[charIndex].images.filter((_, i) => i !== imgIndex);
    setCharacters(updated);
  };

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>角色设定 ({characters.length})</h2>
      <button style={{ ...styles.button, ...styles.addButton }} onClick={addCharacter}>+ 添加角色</button>

      {characters.map((char, i) => (
        <div key={char.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>{char.name || `角色 ${i + 1}`}</span>
            <button style={{ ...styles.button, ...styles.removeButton }} onClick={() => removeCharacter(i)}>删除</button>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>名字 *</label>
            <input style={styles.input} value={char.name} onChange={(e) => updateCharacter(i, { name: e.target.value })} placeholder="角色姓名" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>角色简介 *</label>
            <textarea style={styles.textarea} value={char.description} onChange={(e) => updateCharacter(i, { description: e.target.value })} placeholder="这个角色是谁？" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>性格</label>
            <textarea style={{ ...styles.textarea, minHeight: '50px' }} value={char.personality} onChange={(e) => updateCharacter(i, { personality: e.target.value })} placeholder="性格特点" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>外貌</label>
            <textarea style={{ ...styles.textarea, minHeight: '50px' }} value={char.appearance} onChange={(e) => updateCharacter(i, { appearance: e.target.value })} placeholder="外貌描述" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>背景故事</label>
            <textarea style={{ ...styles.textarea, minHeight: '50px' }} value={char.background} onChange={(e) => updateCharacter(i, { background: e.target.value })} placeholder="角色背景" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>与其他人物的关系</label>
            <input style={styles.input} value={char.relationships} onChange={(e) => updateCharacter(i, { relationships: e.target.value })} placeholder="例：XX的妹妹，YY的暗恋对象" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>说话风格</label>
            <input style={styles.input} value={char.speakingStyle || ''} onChange={(e) => updateCharacter(i, { speakingStyle: e.target.value })} placeholder="温柔礼貌 / 粗鲁直率 / 傲娇 / 冷淡" />
          </div>

          {/* Character images */}
          <div style={{ marginTop: '10px' }}>
            <label style={styles.label}>立绘图片（不同情绪状态）</label>
            <div style={styles.imageGrid}>
              {char.images.map((img, j) => (
                <div key={img.id} style={styles.imageItem}>
                  <input
                    style={{ ...styles.input, fontSize: '11px', marginBottom: '4px' }}
                    value={img.url}
                    onChange={(e) => updateImage(i, j, { url: e.target.value })}
                    placeholder="图片路径"
                  />
                  <input
                    style={{ ...styles.input, fontSize: '11px', marginBottom: '4px' }}
                    value={img.mood}
                    onChange={(e) => updateImage(i, j, { mood: e.target.value })}
                    placeholder="情绪: happy, sad..."
                  />
                  <input
                    style={{ ...styles.input, fontSize: '11px', marginBottom: '4px' }}
                    value={img.pose}
                    onChange={(e) => updateImage(i, j, { pose: e.target.value })}
                    placeholder="姿势: standing..."
                  />
                  <input
                    style={{ ...styles.input, fontSize: '11px', marginBottom: '4px' }}
                    value={img.expression}
                    onChange={(e) => updateImage(i, j, { expression: e.target.value })}
                    placeholder="表情描述"
                  />
                  <button
                    style={{ ...styles.button, ...styles.removeButton, fontSize: '11px', padding: '4px 8px' }}
                    onClick={() => removeImage(i, j)}
                  >
                    移除图片
                  </button>
                </div>
              ))}
            </div>
            <button style={{ ...styles.button, ...styles.addButton, fontSize: '12px', marginTop: '8px' }} onClick={() => addImage(i)}>
              + 添加立绘
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScenesStep({ scenes, setScenes }: { scenes: Scene[]; setScenes: (s: Scene[]) => void }) {
  const addScene = () => {
    setScenes([
      ...scenes,
      {
        id: uuidv4(),
        name: '',
        description: '',
        images: [],
      },
    ]);
  };

  const updateScene = (index: number, updates: Partial<Scene>) => {
    const updated = [...scenes];
    updated[index] = { ...updated[index], ...updates };
    setScenes(updated);
  };

  const removeScene = (index: number) => {
    setScenes(scenes.filter((_, i) => i !== index));
  };

  const addImage = (sceneIndex: number) => {
    const updated = [...scenes];
    updated[sceneIndex].images.push({
      id: uuidv4(),
      url: '',
      timeOfDay: 'day',
      weather: 'clear',
      mood: 'neutral',
      description: '',
    });
    setScenes(updated);
  };

  const updateImage = (sceneIndex: number, imgIndex: number, updates: Partial<SceneImage>) => {
    const updated = [...scenes];
    updated[sceneIndex].images[imgIndex] = { ...updated[sceneIndex].images[imgIndex], ...updates };
    setScenes(updated);
  };

  const removeImage = (sceneIndex: number, imgIndex: number) => {
    const updated = [...scenes];
    updated[sceneIndex].images = updated[sceneIndex].images.filter((_, i) => i !== imgIndex);
    setScenes(updated);
  };

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>场景设定 ({scenes.length})</h2>
      <button style={{ ...styles.button, ...styles.addButton }} onClick={addScene}>+ 添加场景</button>

      {scenes.map((scene, i) => (
        <div key={scene.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>{scene.name || `场景 ${i + 1}`}</span>
            <button style={{ ...styles.button, ...styles.removeButton }} onClick={() => removeScene(i)}>删除</button>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>场景名称 *</label>
            <input style={styles.input} value={scene.name} onChange={(e) => updateScene(i, { name: e.target.value })} placeholder="例：教室、公园、城堡大厅" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>场景描述 *</label>
            <textarea style={styles.textarea} value={scene.description} onChange={(e) => updateScene(i, { description: e.target.value })} placeholder="这个场景的环境、氛围、特点..." />
          </div>

          {/* Scene images */}
          <div style={{ marginTop: '10px' }}>
            <label style={styles.label}>背景图片（不同时间/天气/氛围）</label>
            <div style={styles.imageGrid}>
              {scene.images.map((img, j) => (
                <div key={img.id} style={styles.imageItem}>
                  <input
                    style={{ ...styles.input, fontSize: '11px', marginBottom: '4px' }}
                    value={img.url}
                    onChange={(e) => updateImage(i, j, { url: e.target.value })}
                    placeholder="图片路径"
                  />
                  <input
                    style={{ ...styles.input, fontSize: '11px', marginBottom: '4px' }}
                    value={img.timeOfDay}
                    onChange={(e) => updateImage(i, j, { timeOfDay: e.target.value })}
                    placeholder="时间: morning/evening/night"
                  />
                  <input
                    style={{ ...styles.input, fontSize: '11px', marginBottom: '4px' }}
                    value={img.weather}
                    onChange={(e) => updateImage(i, j, { weather: e.target.value })}
                    placeholder="天气: sunny/rainy..."
                  />
                  <input
                    style={{ ...styles.input, fontSize: '11px', marginBottom: '4px' }}
                    value={img.mood}
                    onChange={(e) => updateImage(i, j, { mood: e.target.value })}
                    placeholder="氛围: peaceful/tense..."
                  />
                  <button
                    style={{ ...styles.button, ...styles.removeButton, fontSize: '11px', padding: '4px 8px' }}
                    onClick={() => removeImage(i, j)}
                  >
                    移除图片
                  </button>
                </div>
              ))}
            </div>
            <button style={{ ...styles.button, ...styles.addButton, fontSize: '12px', marginTop: '8px' }} onClick={() => addImage(i)}>
              + 添加背景图
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StoryStep({
  storyBeginning,
  setStoryBeginning,
  language,
  setLanguage,
}: {
  storyBeginning: string;
  setStoryBeginning: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
}) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>故事开头 & 语言</h2>
      <div style={styles.field}>
        <label style={styles.label}>输出语言</label>
        <select
          style={styles.input}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="zh-CN">简体中文</option>
          <option value="zh-TW">繁體中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>故事开头 *</label>
        <textarea
          style={{ ...styles.textarea, minHeight: '200px' }}
          value={storyBeginning}
          onChange={(e) => setStoryBeginning(e.target.value)}
          placeholder={`请描述故事的开头场景和初始状态。AI将从此处开始续写剧情。\n\n示例：\n"那是一个阴雨绵绵的下午，我站在教室门口，手心里全是汗。这是我转学到这里的第一天，而我已经迟到了整整二十分钟。班主任的声音透过门板传来，我深吸一口气，推开了门..."`}
        />
      </div>
      <p style={{ color: '#999', fontSize: '12px' }}>
        提示：故事开头越详细，AI生成的剧情就越贴合你的期望。建议包含初始场景、出场的角色、以及故事的起点事件。
      </p>
    </div>
  );
}

function TemplateSelector({ onSelect }: { onSelect: (config: import('@/Core/ai/types').StoryConfig) => void }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>🚀 快速开始（可选）</h2>
      <p style={{ color: '#999', fontSize: '13px', marginBottom: '12px' }}>
        选择一个预设模板快速开始，也可以跳过手动设定。
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {STORY_TEMPLATES.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelect(t.config)}
            style={{
              flex: '1 1 280px',
              maxWidth: '400px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(196, 77, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(196, 77, 255, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>{t.name}</div>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>{t.description}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(255,107,157,0.2)',
                    color: '#ff8fb3',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AISetup;
