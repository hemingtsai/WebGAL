/**
 * AI Settings Panel
 *
 * In-game settings for AI model configuration:
 * - Select which model to use for each task
 * - Adjust temperature, max tokens
 * - Configure scheduling strategy
 * - Memory/context management settings
 */

import React, { useState, useEffect } from 'react';
import { getScheduler } from '@/Core/ai/scheduler';
import { getAIGameController, AIGameState } from '@/Core/ai/gameController';
import type { SchedulerConfig, TaskType, SchedulingStrategy } from '@/Core/ai/types';

const panelStyle: React.CSSProperties = {
  background: 'rgba(20, 20, 40, 0.95)',
  color: '#e0e0e0',
  borderRadius: '12px',
  padding: '20px',
  fontSize: '13px',
  fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  maxHeight: '80vh',
  overflow: 'auto',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '12px',
  color: '#999',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  fontSize: '13px',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
  background: 'linear-gradient(135deg, #c44dff, #ff6b9d)',
  color: '#fff',
  marginTop: '8px',
};

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

export function AISettingsPanel() {
  const scheduler = getScheduler();
  const aiController = getAIGameController();
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

  const handleSave = () => {
    scheduler.updateConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateTaskModel = (task: TaskType, modelId: string) => {
    setConfig((prev) => ({
      ...prev,
      taskModelMapping: { ...prev.taskModelMapping, [task]: modelId },
    }));
  };

  return (
    <div style={panelStyle}>
      <h3 style={{ color: '#ff8fb3', marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>
        ⚙️ AI 引擎设置
      </h3>

      {/* Status */}
      <div style={{ marginBottom: '16px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
        <span style={{ color: '#999' }}>引擎状态: </span>
        <span style={{ color: aiState === AIGameState.ERROR ? '#ff4444' : '#44cc44' }}>
          {aiState}
        </span>
        <span style={{ color: '#999', marginLeft: '12px' }}>已注册模型: {allModels.length}</span>
      </div>

      {/* Scheduling Strategy */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>调度策略</label>
        <select
          style={selectStyle}
          value={config.strategy}
          onChange={(e) => setConfig({ ...config, strategy: e.target.value as SchedulingStrategy })}
        >
          {Object.entries(STRATEGY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Default Model */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>默认模型</label>
        <select
          style={selectStyle}
          value={config.defaultModel}
          onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
        >
          <option value="">-- 选择默认模型 --</option>
          {allModels.map((m) => (
            <option key={m.id} value={m.id}>
              [{m.provider}] {m.name} ({m.maxTokens.toLocaleString()} tokens)
            </option>
          ))}
        </select>
      </div>

      {/* Task Model Mapping */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ ...labelStyle, marginBottom: '8px', fontWeight: 'bold', color: '#ccc' }}>
          任务模型分配
        </label>
        {(Object.keys(TASK_LABELS) as TaskType[]).map((task) => (
          <div key={task} style={{ marginBottom: '8px' }}>
            <label style={{ ...labelStyle, fontSize: '11px' }}>{TASK_LABELS[task]}</label>
            <select
              style={selectStyle}
              value={config.taskModelMapping[task] || ''}
              onChange={(e) => updateTaskModel(task, e.target.value)}
            >
              <option value="">使用默认模型</option>
              {allModels.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.provider}] {m.name} — {m.capabilities.join(', ')}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Retry & Timeout */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>最大重试次数</label>
          <input
            type="number"
            style={inputStyle}
            value={config.maxRetries}
            min={0}
            max={5}
            onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>超时 (ms)</label>
          <input
            type="number"
            style={inputStyle}
            value={config.timeoutMs}
            min={5000}
            max={300000}
            step={5000}
            onChange={(e) => setConfig({ ...config, timeoutMs: parseInt(e.target.value) || 60000 })}
          />
        </div>
      </div>

      {/* Scheduler Model (for ai_dispatch strategy) */}
      {config.strategy === 'ai_dispatch' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>调度器模型 (用于决定任务分配)</label>
          <select
            style={selectStyle}
            value={config.schedulerModel || ''}
            onChange={(e) => setConfig({ ...config, schedulerModel: e.target.value || undefined })}
          >
            <option value="">使用默认模型</option>
            {allModels
              .filter((m) => m.capabilities.includes('scheduling'))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.provider}] {m.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <button style={buttonStyle} onClick={handleSave}>
        {saved ? '✅ 已保存' : '💾 保存设置'}
      </button>
    </div>
  );
}

export default AISettingsPanel;
