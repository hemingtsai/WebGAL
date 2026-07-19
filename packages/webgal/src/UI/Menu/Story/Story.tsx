/**
 * Story Configuration Panel (Native WebGAL Style)
 *
 * Edit world, characters, scenes, and story beginning
 * from within the game's native menu.
 * Uses NormalOption and NormalButton for consistent look.
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { WebGAL } from '@/Core/WebGAL';
import { getAIGameController } from '@/Core/ai/gameController';
import { logger } from '@/Core/util/logger';
import { v4 as uuidv4 } from 'uuid';
import type { WorldSetting, Character, Scene } from '@/Core/ai/types';
import { NormalOption } from '@/UI/Menu/Options/NormalOption';
import { NormalButton } from '@/UI/Menu/Options/NormalButton';
import styles from '../Options/options.module.scss';

type SubTab = 'world' | 'characters' | 'scenes' | 'beginning';
const TAB_KEYS: SubTab[] = ['world', 'characters', 'scenes', 'beginning'];
const TAB_LABELS = ['世界观', '角色', '场景', '开头'];

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

  const saveAll = () => {
    configManager.setWorldSetting(world);
    config.characters.forEach((c) => { if (!characters.find((nc) => nc.id === c.id)) configManager.removeCharacter(c.id); });
    characters.forEach((c) => configManager.saveCharacter(c));
    config.scenes.forEach((s) => { if (!scenes.find((ns) => ns.id === s.id)) configManager.removeScene(s.id); });
    scenes.forEach((s) => configManager.saveScene(s));
    configManager.setStoryBeginning(beginning);
    const ai = getAIGameController();
    ai.reset();
    ai.initializeGame().catch(() => {});
    WebGAL.aiController = ai;
    logger.info('[Story] Settings saved');
  };

  return (
    <div className={styles.Options_main_content}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '95%', padding: '0 0 0 3em' }}>
        {/* Top: Sub-tab buttons */}
        <div style={{ flexShrink: 0 }}>
          <NormalOption key="subTabs" title="编辑">
            <NormalButton
              textList={TAB_LABELS}
              functionList={TAB_KEYS.map((tab) => () => setSubTab(tab))}
              currentChecked={TAB_KEYS.indexOf(subTab)}
            />
          </NormalOption>
        </div>

        {/* Middle: Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {subTab === 'world' && <WorldEditor world={world} setWorld={setWorld} />}
          {subTab === 'characters' && <CharactersEditor characters={characters} setCharacters={setCharacters} />}
          {subTab === 'scenes' && <ScenesEditor scenes={scenes} setScenes={setScenes} />}
          {subTab === 'beginning' && <BeginningEditor beginning={beginning} setBeginning={setBeginning} />}
        </div>

        {/* Bottom: Save button */}
        <div style={{ flexShrink: 0, paddingTop: '8px' }}>
          <NormalOption key="save" title="">
            <NormalButton
              textList={['💾 保存故事设定']}
              functionList={[saveAll]}
              currentChecked={-1}
            />
          </NormalOption>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Field helpers
// ============================================================

const fieldInputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: '6px',
  border: '1px solid rgba(128,128,128,0.3)', background: 'rgba(0,0,0,0.2)',
  color: '#ccc', fontSize: '130%', boxSizing: 'border-box',
  marginTop: '4px',
};
const fieldTextareaStyle: React.CSSProperties = { ...fieldInputStyle, minHeight: '60px', resize: 'vertical' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <NormalOption key={label} title={label}>
      {children}
    </NormalOption>
  );
}

function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input style={fieldInputStyle} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Field>
  );
}

function TextareaField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <Field label={label}>
      <textarea style={fieldTextareaStyle} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Field>
  );
}

// ============================================================
// Sub-editors
// ============================================================

function WorldEditor({ world, setWorld }: { world: WorldSetting; setWorld: (w: WorldSetting) => void }) {
  return (
    <>
      <InputField label="世界观名称" value={world.name} onChange={(v) => setWorld({ ...world, name: v })} placeholder="例：剑与魔法的异世界" />
      <InputField label="题材" value={world.genre} onChange={(v) => setWorld({ ...world, genre: v })} placeholder="奇幻 / 科幻 / 现代 / 古风" />
      <InputField label="时代背景" value={world.era} onChange={(v) => setWorld({ ...world, era: v })} placeholder="中世纪 / 近未来 / 现代都市" />
      <TextareaField label="详细描述" value={world.description} onChange={(v) => setWorld({ ...world, description: v })} placeholder="详细描述这个世界的设定" />
      <TextareaField label="特殊规则" value={world.rules} onChange={(v) => setWorld({ ...world, rules: v })} placeholder="魔法体系、科技水平" />
      <InputField label="氛围基调" value={world.atmosphere} onChange={(v) => setWorld({ ...world, atmosphere: v })} placeholder="轻松愉快 / 黑暗深沉" />
    </>
  );
}

function CharactersEditor({ characters, setCharacters }: { characters: Character[]; setCharacters: (c: Character[]) => void }) {
  const [editing, setEditing] = useState<number | null>(null);

  const addChar = () => {
    const c: Character = { id: uuidv4(), name: '', description: '', personality: '', appearance: '', background: '', relationships: '', images: [], speakingStyle: '' };
    setCharacters([...characters, c]);
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
      <>
        <NormalOption key="back" title="">
          <NormalButton textList={['← 返回列表']} functionList={[() => setEditing(null)]} currentChecked={-1} />
        </NormalOption>
        <InputField label="名字" value={char.name} onChange={(v) => update({ name: v })} />
        <TextareaField label="简介" value={char.description} onChange={(v) => update({ description: v })} />
        <TextareaField label="性格" value={char.personality} onChange={(v) => update({ personality: v })} />
        <TextareaField label="外貌" value={char.appearance} onChange={(v) => update({ appearance: v })} />
        <TextareaField label="背景" value={char.background} onChange={(v) => update({ background: v })} />
        <InputField label="关系" value={char.relationships} onChange={(v) => update({ relationships: v })} />
        <InputField label="说话风格" value={char.speakingStyle || ''} onChange={(v) => update({ speakingStyle: v })} />
        {/* Images */}
        <NormalOption key="images" title="立绘图片">
          <div style={{ width: '100%' }}>
            {char.images.map((img, i) => (
              <div key={img.id} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                <input style={{ ...fieldInputStyle, flex: 1, fontSize: '100%' }} value={img.url} onChange={(e) => {
                  const imgs = [...char.images]; imgs[i] = { ...imgs[i], url: e.target.value }; update({ images: imgs });
                }} placeholder="图片路径" />
                <input style={{ ...fieldInputStyle, width: '80px', fontSize: '100%' }} value={img.mood} onChange={(e) => {
                  const imgs = [...char.images]; imgs[i] = { ...imgs[i], mood: e.target.value }; update({ images: imgs });
                }} placeholder="情绪" />
                <NormalButton textList={['✕']} functionList={[() => update({ images: char.images.filter((_, j) => j !== i) })]} currentChecked={-1} />
              </div>
            ))}
            <NormalButton textList={['+ 添加立绘']} functionList={[() => {
              update({ images: [...char.images, { id: uuidv4(), url: '', mood: 'neutral', pose: 'standing', expression: '' }] });
            }]} currentChecked={-1} />
          </div>
        </NormalOption>
      </>
    );
  }

  return (
    <>
      <NormalOption key="add" title="角色列表">
        <NormalButton textList={['+ 添加角色']} functionList={[addChar]} currentChecked={-1} />
      </NormalOption>
      {characters.map((char, i) => (
        <NormalOption key={char.id} title={char.name || `未命名角色 ${i + 1}`}>
          <NormalButton
            textList={['编辑', '删除']}
            functionList={[
              () => setEditing(i),
              () => setCharacters(characters.filter((_, j) => j !== i)),
            ]}
            currentChecked={-1}
          />
        </NormalOption>
      ))}
    </>
  );
}

function ScenesEditor({ scenes, setScenes }: { scenes: Scene[]; setScenes: (s: Scene[]) => void }) {
  const [editing, setEditing] = useState<number | null>(null);

  const addScene = () => {
    const s: Scene = { id: uuidv4(), name: '', description: '', images: [] };
    setScenes([...scenes, s]);
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
      <>
        <NormalOption key="back" title="">
          <NormalButton textList={['← 返回列表']} functionList={[() => setEditing(null)]} currentChecked={-1} />
        </NormalOption>
        <InputField label="场景名" value={scene.name} onChange={(v) => update({ name: v })} />
        <TextareaField label="描述" value={scene.description} onChange={(v) => update({ description: v })} />
        <NormalOption key="images" title="背景图片">
          <div style={{ width: '100%' }}>
            {scene.images.map((img, i) => (
              <div key={img.id} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                <input style={{ ...fieldInputStyle, flex: 1, fontSize: '100%' }} value={img.url} onChange={(e) => {
                  const imgs = [...scene.images]; imgs[i] = { ...imgs[i], url: e.target.value }; update({ images: imgs });
                }} placeholder="图片路径" />
                <input style={{ ...fieldInputStyle, width: '70px', fontSize: '100%' }} value={img.timeOfDay} onChange={(e) => {
                  const imgs = [...scene.images]; imgs[i] = { ...imgs[i], timeOfDay: e.target.value }; update({ images: imgs });
                }} placeholder="时间" />
                <NormalButton textList={['✕']} functionList={[() => update({ images: scene.images.filter((_, j) => j !== i) })]} currentChecked={-1} />
              </div>
            ))}
            <NormalButton textList={['+ 添加背景图']} functionList={[() => {
              update({ images: [...scene.images, { id: uuidv4(), url: '', timeOfDay: 'day', weather: 'clear', mood: 'neutral', description: '' }] });
            }]} currentChecked={-1} />
          </div>
        </NormalOption>
      </>
    );
  }

  return (
    <>
      <NormalOption key="add" title="场景列表">
        <NormalButton textList={['+ 添加场景']} functionList={[addScene]} currentChecked={-1} />
      </NormalOption>
      {scenes.map((scene, i) => (
        <NormalOption key={scene.id} title={scene.name || `未命名场景 ${i + 1}`}>
          <NormalButton
            textList={['编辑', '删除']}
            functionList={[
              () => setEditing(i),
              () => setScenes(scenes.filter((_, j) => j !== i)),
            ]}
            currentChecked={-1}
          />
        </NormalOption>
      ))}
    </>
  );
}

function BeginningEditor({ beginning, setBeginning }: { beginning: string; setBeginning: (v: string) => void }) {
  return (
    <TextareaField
      label="故事开头"
      value={beginning}
      onChange={setBeginning}
      placeholder="那是一个阴雨绵绵的下午，我站在教室门口..."
    />
  );
}

export default StorySettings;
