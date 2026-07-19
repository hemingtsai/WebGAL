/**
 * Story Configuration Panel (Native WebGAL Menu Tab)
 *
 * Allows editing world setting, characters, scenes, and story beginning
 * from within the game's native menu system.
 * Changes take effect on the next AI generation.
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { WebGAL } from '@/Core/WebGAL';
import { getAIGameController } from '@/Core/ai/gameController';
import { logger } from '@/Core/util/logger';
import { v4 as uuidv4 } from 'uuid';
import type { WorldSetting, Character, Scene, CharacterImage, SceneImage } from '@/Core/ai/types';
import styles from '../Options/options.module.scss';

type SubTab = 'world' | 'characters' | 'scenes' | 'beginning';

const tabLabels: Record<SubTab, string> = {
  world: '世界观',
  characters: '角色',
  scenes: '场景',
  beginning: '开头',
};

export function StorySettings() {
  const GUIState = useSelector((state: RootState) => state.GUI);
  if (!GUIState.showMenuPanel) return null;

  const configManager = getConfigManager();
  const config = configManager.getConfig();

  const [subTab, setSubTab] = useState<SubTab>('world');
  const [world, setWorld] = useState<WorldSetting>({ ...config.worldSetting });
  const [characters, setCharacters] = useState<Character[]>(config.characters.map((c) => ({ ...c, images: [...c.images] })));
  const [scenes, setScenes] = useState<Scene[]>(config.scenes.map((s) => ({ ...s, images: [...s.images] })));
  const [beginning, setBeginning] = useState(config.storyBeginning);
  const [saved, setSaved] = useState(false);

  const saveAll = () => {
    configManager.setWorldSetting(world);
    config.characters.forEach((c) => {
      if (!characters.find((nc) => nc.id === c.id)) configManager.removeCharacter(c.id);
    });
    characters.forEach((c) => configManager.saveCharacter(c));
    config.scenes.forEach((s) => {
      if (!scenes.find((ns) => ns.id === s.id)) configManager.removeScene(s.id);
    });
    scenes.forEach((s) => configManager.saveScene(s));
    configManager.setStoryBeginning(beginning);

    // Re-init AI engine with new config
    const ai = getAIGameController();
    ai.reset();
    ai.initializeGame().catch(() => {});
    WebGAL.aiController = ai;

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    logger.info('[Story] Settings saved');
  };

  return (
    <div className={styles.Options_main_content}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {(Object.keys(tabLabels) as SubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              background: subTab === tab ? 'linear-gradient(135deg, #c44dff, #ff6b9d)' : 'rgba(255,255,255,0.08)',
              color: '#fff',
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: '55vh', overflow: 'auto', paddingRight: '4px' }}>
        {subTab === 'world' && <WorldEditor world={world} setWorld={setWorld} />}
        {subTab === 'characters' && <CharactersEditor characters={characters} setCharacters={setCharacters} />}
        {subTab === 'scenes' && <ScenesEditor scenes={scenes} setScenes={setScenes} />}
        {subTab === 'beginning' && <BeginningEditor beginning={beginning} setBeginning={setBeginning} />}
      </div>

      <button
        onClick={saveAll}
        style={{
          width: '100%', padding: '10px', marginTop: '12px',
          borderRadius: '8px', border: 'none', cursor: 'pointer',
          fontSize: '14px', fontWeight: 'bold',
          background: saved ? 'rgba(68,204,68,0.3)' : 'linear-gradient(135deg, #c44dff, #ff6b9d)',
          color: '#fff',
        }}
      >
        {saved ? '✅ 已保存' : '💾 保存故事设定'}
      </button>
    </div>
  );
}

// ============================================================
// Sub-editors
// ============================================================

const fieldStyle: React.CSSProperties = { marginBottom: '8px' };
const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#999', marginBottom: '3px', display: 'block' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)',
  color: '#fff', fontSize: '13px', boxSizing: 'border-box',
};
const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: '60px', resize: 'vertical' };
const btnStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
  fontSize: '12px', marginRight: '6px', marginTop: '4px',
};

function WorldEditor({ world, setWorld }: { world: WorldSetting; setWorld: (w: WorldSetting) => void }) {
  return (
    <div>
      <div style={fieldStyle}>
        <span style={labelStyle}>世界观名称</span>
        <input style={inputStyle} value={world.name} onChange={(e) => setWorld({ ...world, name: e.target.value })} placeholder="例：剑与魔法的异世界" />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>题材</span>
        <input style={inputStyle} value={world.genre} onChange={(e) => setWorld({ ...world, genre: e.target.value })} placeholder="奇幻 / 科幻 / 现代 / 古风" />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>时代背景</span>
        <input style={inputStyle} value={world.era} onChange={(e) => setWorld({ ...world, era: e.target.value })} placeholder="中世纪 / 近未来 / 现代都市" />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>详细描述</span>
        <textarea style={textareaStyle} value={world.description} onChange={(e) => setWorld({ ...world, description: e.target.value })} placeholder="详细描述这个世界的设定、社会结构、历史背景" />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>特殊规则</span>
        <textarea style={textareaStyle} value={world.rules} onChange={(e) => setWorld({ ...world, rules: e.target.value })} placeholder="魔法体系、科技水平、特殊规则" />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>氛围基调</span>
        <input style={inputStyle} value={world.atmosphere} onChange={(e) => setWorld({ ...world, atmosphere: e.target.value })} placeholder="轻松愉快 / 黑暗深沉 / 浪漫温情" />
      </div>
    </div>
  );
}

function CharactersEditor({ characters, setCharacters }: { characters: Character[]; setCharacters: (c: Character[]) => void }) {
  const [editing, setEditing] = useState<number | null>(null);

  const addChar = () => {
    const newChar: Character = {
      id: uuidv4(), name: '', description: '', personality: '', appearance: '', background: '', relationships: '', images: [], speakingStyle: '',
    };
    setCharacters([...characters, newChar]);
    setEditing(characters.length);
  };

  if (editing !== null && characters[editing]) {
    const char = characters[editing];
    const update = (u: Partial<Character>) => {
      const updated = [...characters];
      updated[editing] = { ...updated[editing], ...u };
      setCharacters(updated);
    };
    return (
      <div>
        <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setEditing(null)}>← 返回列表</button>
        <div style={fieldStyle}><span style={labelStyle}>名字</span><input style={inputStyle} value={char.name} onChange={(e) => update({ name: e.target.value })} /></div>
        <div style={fieldStyle}><span style={labelStyle}>简介</span><textarea style={textareaStyle} value={char.description} onChange={(e) => update({ description: e.target.value })} /></div>
        <div style={fieldStyle}><span style={labelStyle}>性格</span><textarea style={{ ...textareaStyle, minHeight: '40px' }} value={char.personality} onChange={(e) => update({ personality: e.target.value })} /></div>
        <div style={fieldStyle}><span style={labelStyle}>外貌</span><textarea style={{ ...textareaStyle, minHeight: '40px' }} value={char.appearance} onChange={(e) => update({ appearance: e.target.value })} /></div>
        <div style={fieldStyle}><span style={labelStyle}>背景</span><textarea style={{ ...textareaStyle, minHeight: '40px' }} value={char.background} onChange={(e) => update({ background: e.target.value })} /></div>
        <div style={fieldStyle}><span style={labelStyle}>关系</span><input style={inputStyle} value={char.relationships} onChange={(e) => update({ relationships: e.target.value })} /></div>
        <div style={fieldStyle}><span style={labelStyle}>说话风格</span><input style={inputStyle} value={char.speakingStyle || ''} onChange={(e) => update({ speakingStyle: e.target.value })} /></div>
        {/* Images */}
        <div style={{ marginTop: '8px' }}>
          <span style={labelStyle}>立绘图片 (情绪/姿态)</span>
          {char.images.map((img, i) => (
            <div key={img.id} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
              <input style={{ ...inputStyle, flex: 1, fontSize: '11px' }} value={img.url} onChange={(e) => {
                const imgs = [...char.images]; imgs[i] = { ...imgs[i], url: e.target.value }; update({ images: imgs });
              }} placeholder="路径" />
              <input style={{ ...inputStyle, width: '80px', fontSize: '11px' }} value={img.mood} onChange={(e) => {
                const imgs = [...char.images]; imgs[i] = { ...imgs[i], mood: e.target.value }; update({ images: imgs });
              }} placeholder="情绪" />
              <button style={{ ...btnStyle, background: 'rgba(255,80,80,0.3)', color: '#f88', fontSize: '11px' }} onClick={() => {
                update({ images: char.images.filter((_, j) => j !== i) });
              }}>✕</button>
            </div>
          ))}
          <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} onClick={() => {
            update({ images: [...char.images, { id: uuidv4(), url: '', mood: 'neutral', pose: 'standing', expression: '' }] });
          }}>+ 添加立绘</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff', marginBottom: '8px' }} onClick={addChar}>+ 添加角色</button>
      {characters.map((char, i) => (
        <div key={char.id} style={{
          padding: '8px 12px', marginBottom: '6px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }} onClick={() => setEditing(i)}>
          <span>{char.name || `未命名角色 ${i + 1}`}</span>
          <button style={{ ...btnStyle, background: 'rgba(255,80,80,0.3)', color: '#f88', fontSize: '11px' }} onClick={(e) => {
            e.stopPropagation();
            setCharacters(characters.filter((_, j) => j !== i));
          }}>删除</button>
        </div>
      ))}
    </div>
  );
}

function ScenesEditor({ scenes, setScenes }: { scenes: Scene[]; setScenes: (s: Scene[]) => void }) {
  const [editing, setEditing] = useState<number | null>(null);

  const addScene = () => {
    const newScene: Scene = { id: uuidv4(), name: '', description: '', images: [] };
    setScenes([...scenes, newScene]);
    setEditing(scenes.length);
  };

  if (editing !== null && scenes[editing]) {
    const scene = scenes[editing];
    const update = (u: Partial<Scene>) => {
      const updated = [...scenes];
      updated[editing] = { ...updated[editing], ...u };
      setScenes(updated);
    };
    return (
      <div>
        <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setEditing(null)}>← 返回列表</button>
        <div style={fieldStyle}><span style={labelStyle}>场景名</span><input style={inputStyle} value={scene.name} onChange={(e) => update({ name: e.target.value })} /></div>
        <div style={fieldStyle}><span style={labelStyle}>描述</span><textarea style={textareaStyle} value={scene.description} onChange={(e) => update({ description: e.target.value })} /></div>
        <div style={{ marginTop: '8px' }}>
          <span style={labelStyle}>背景图片 (时间/天气/氛围)</span>
          {scene.images.map((img, i) => (
            <div key={img.id} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
              <input style={{ ...inputStyle, flex: 1, fontSize: '11px' }} value={img.url} onChange={(e) => {
                const imgs = [...scene.images]; imgs[i] = { ...imgs[i], url: e.target.value }; update({ images: imgs });
              }} placeholder="路径" />
              <input style={{ ...inputStyle, width: '70px', fontSize: '11px' }} value={img.timeOfDay} onChange={(e) => {
                const imgs = [...scene.images]; imgs[i] = { ...imgs[i], timeOfDay: e.target.value }; update({ images: imgs });
              }} placeholder="时间" />
              <button style={{ ...btnStyle, background: 'rgba(255,80,80,0.3)', color: '#f88', fontSize: '11px' }} onClick={() => {
                update({ images: scene.images.filter((_, j) => j !== i) });
              }}>✕</button>
            </div>
          ))}
          <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} onClick={() => {
            update({ images: [...scene.images, { id: uuidv4(), url: '', timeOfDay: 'day', weather: 'clear', mood: 'neutral', description: '' }] });
          }}>+ 添加背景图</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff', marginBottom: '8px' }} onClick={addScene}>+ 添加场景</button>
      {scenes.map((scene, i) => (
        <div key={scene.id} style={{
          padding: '8px 12px', marginBottom: '6px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }} onClick={() => setEditing(i)}>
          <span>{scene.name || `未命名场景 ${i + 1}`}</span>
          <button style={{ ...btnStyle, background: 'rgba(255,80,80,0.3)', color: '#f88', fontSize: '11px' }} onClick={(e) => {
            e.stopPropagation();
            setScenes(scenes.filter((_, j) => j !== i));
          }}>删除</button>
        </div>
      ))}
    </div>
  );
}

function BeginningEditor({ beginning, setBeginning }: { beginning: string; setBeginning: (v: string) => void }) {
  return (
    <div>
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
        故事开头越详细，AI 生成的剧情就越贴合你的期望。建议包含初始场景、出场角色、起点事件。
      </p>
      <textarea
        style={{ ...textareaStyle, minHeight: '200px' }}
        value={beginning}
        onChange={(e) => setBeginning(e.target.value)}
        placeholder="那是一个阴雨绵绵的下午，我站在教室门口..."
      />
    </div>
  );
}

export default StorySettings;
