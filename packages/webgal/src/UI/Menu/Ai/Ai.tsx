/**
 * AI Settings Panel (Native WebGAL Menu Tab)
 *
 * Integrated into WebGAL's native menu system as a top-level tab.
 * Provides model selection, scheduling strategy, and parameter controls.
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { getScheduler } from '@/Core/ai/scheduler';
import { getAIGameController, AIGameState } from '@/Core/ai/gameController';
import { getMemoryManager } from '@/Core/ai/memoryManager';
import { getBGM } from '@/Core/ai/bgmManager';
import { getConfiguredProviders } from '@/Core/ai/aiInitialize';
import type { SchedulerConfig, TaskType, SchedulingStrategy, AIModel } from '@/Core/ai/types';
import styles from '../Options/options.module.scss';

const TASK_LABELS: Record<TaskType, string> = {
  generate_story: '故事生成',
  generate_choices: '选项生成',
  select_image: '图片选择',
  initialize_world: '世界观初始化',
};

const STRATEGY_LABELS: Record<SchedulingStrategy, string> = {
  fixed: '固定映射',
  ai_dispatch: 'AI 调度',
  cost_optimized: '成本优先',
  round_robin: '轮询',
};

export function AiSettings() {
  const GUIState = useSelector((state: RootState) => state.GUI);
  if (!GUIState.showMenuPanel) return null;

  const scheduler = getScheduler();
  const aiController = getAIGameController();
  const memory = getMemoryManager();
  const bgm = getBGM();

  const [config, setConfig] = useState<SchedulerConfig>(scheduler.getConfig());
  const [aiState, setAiState] = useState<AIGameState>(aiController.getState());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAiState(aiController.getState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const allModels = scheduler.getAllModels();
  const memStats = memory.getStats();
  const [bgmOn, setBgmOn] = useState(true);
  const providers = getConfiguredProviders();

  const handleSave = () => {
    scheduler.updateConfig(config);
    memory.updateConfig(memory.getConfig());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateTaskModel = (task: TaskType, modelId: string) => {
    setConfig((prev) => ({
      ...prev,
      taskModelMapping: { ...prev.taskModelMapping, [task]: modelId || undefined as any },
    }));
  };

  const stateColors: Record<string, string> = {
    uninitialized: '#888',
    configuring: '#ffaa00',
    ready: '#44cc44',
    generating: '#4488ff',
    playing: '#44cc44',
    choosing: '#ff6b9d',
    error: '#ff4444',
  };

  return (
    <div className={styles.Options_main_content}>
      <div className={styles.Options_main_content_half}>
        {/* Status */}
        <div style={{ padding: '12px 16px', marginBottom: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stateColors[aiState] || '#888', display: 'inline-block' }} />
            <span>引擎状态: {aiState}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            已注册模型: {allModels.length} | 提供者: {providers.join(', ') || '无'} |
            记忆摘要: {memStats.summaryCount}
          </div>
        </div>

        {/* Scheduling Strategy */}
        <div style={optionFieldStyle}>
          <div style={labelStyle}>调度策略</div>
          <select
            value={config.strategy}
            onChange={(e) => setConfig({ ...config, strategy: e.target.value as SchedulingStrategy })}
            style={selectStyle}
          >
            {Object.entries(STRATEGY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Default Model */}
        <div style={optionFieldStyle}>
          <div style={labelStyle}>默认模型</div>
          <select
            value={config.defaultModel}
            onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
            style={selectStyle}
          >
            {allModels.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.provider}] {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Task Model Mapping */}
        <div style={{ ...optionFieldStyle, marginBottom: '8px' }}>
          <div style={{ ...labelStyle, fontWeight: 'bold', marginBottom: '8px' }}>任务模型分配</div>
          {(Object.keys(TASK_LABELS) as TaskType[]).map((task) => (
            <div key={task} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ minWidth: '80px', fontSize: '12px', color: '#aaa' }}>{TASK_LABELS[task]}</span>
              <select
                value={config.taskModelMapping[task] || ''}
                onChange={(e) => updateTaskModel(task, e.target.value)}
                style={{ ...selectStyle, flex: 1 }}
              >
                <option value="">默认</option>
                {allModels.map((m) => (
                  <option key={m.id} value={m.id}>[{m.provider}] {m.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Scheduler Model (for AI dispatch) */}
        {config.strategy === 'ai_dispatch' && (
          <div style={optionFieldStyle}>
            <div style={labelStyle}>调度器模型</div>
            <select
              value={config.schedulerModel || ''}
              onChange={(e) => setConfig({ ...config, schedulerModel: e.target.value || undefined })}
              style={selectStyle}
            >
              <option value="">使用默认模型</option>
              {allModels.filter((m) => m.capabilities.includes('scheduling')).map((m) => (
                <option key={m.id} value={m.id}>[{m.provider}] {m.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Retries & Timeout */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ ...optionFieldStyle, flex: 1 }}>
            <div style={labelStyle}>重试次数</div>
            <input
              type="number" min={0} max={5}
              value={config.maxRetries}
              onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) || 0 })}
              style={inputStyle}
            />
          </div>
          <div style={{ ...optionFieldStyle, flex: 1 }}>
            <div style={labelStyle}>超时 (ms)</div>
            <input
              type="number" min={5000} max={300000} step={5000}
              value={config.timeoutMs}
              onChange={(e) => setConfig({ ...config, timeoutMs: parseInt(e.target.value) || 60000 })}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Memory Settings */}
        <div style={{ ...optionFieldStyle, marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ ...labelStyle, fontWeight: 'bold' }}>🧠 记忆管理</div>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
            当故事历史过长时自动摘要，防止超出 token 限制。
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>保留最近事件数</div>
              <input
                type="number" min={5} max={100}
                value={memory.getConfig().maxRecentEvents}
                onChange={(e) => memory.updateConfig({ maxRecentEvents: parseInt(e.target.value) || 20 })}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>最大上下文 tokens</div>
              <input
                type="number" min={1000} max={64000} step={1000}
                value={memory.getConfig().maxContextTokens}
                onChange={(e) => memory.updateConfig({ maxContextTokens: parseInt(e.target.value) || 8000 })}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* BGM */}
        <div style={{ ...optionFieldStyle, marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={labelStyle}>🎵 AI 情绪 BGM</div>
            <button
              onClick={() => {
                bgm.setEnabled(!bgmOn);
                setBgmOn(!bgmOn);
              }}
              style={{
                padding: '4px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: bgmOn ? 'rgba(68,204,68,0.3)' : 'rgba(255,255,255,0.1)',
                color: bgmOn ? '#4c4' : '#888', fontSize: '12px',
              }}
            >
              {bgmOn ? '已开启' : '已关闭'}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: '12px', marginTop: '16px',
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 'bold',
            background: saved ? 'rgba(68,204,68,0.3)' : 'linear-gradient(135deg, #c44dff, #ff6b9d)',
            color: '#fff',
          }}
        >
          {saved ? '✅ 已保存' : '💾 保存 AI 设置'}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px', color: '#aaa', marginBottom: '4px',
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)',
  color: '#fff', fontSize: '13px', boxSizing: 'border-box',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)',
  color: '#fff', fontSize: '13px', boxSizing: 'border-box',
};

const optionFieldStyle: React.CSSProperties = {
  marginBottom: '10px',
};

export default AiSettings;
