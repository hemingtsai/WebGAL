/**
 * AI Settings Panel (Native WebGAL Style)
 *
 * Uses NormalOption, NormalButton, OptionSlider — same components
 * as the built-in System/Display/Sound settings pages.
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
import { NormalOption } from '@/UI/Menu/Options/NormalOption';
import { NormalButton } from '@/UI/Menu/Options/NormalButton';
import { OptionSlider } from '@/UI/Menu/Options/OptionSlider';
import { setStorage } from '@/Core/controller/storage/storageController';
import styles from '../Options/options.module.scss';

const TASK_LABELS: Record<TaskType, string> = {
  generate_story: '故事生成',
  generate_choices: '选项生成',
  select_image: '图片选择',
  initialize_world: '世界观初始化',
};

const STRATEGY_NAMES: SchedulingStrategy[] = ['fixed', 'ai_dispatch', 'cost_optimized', 'round_robin'];
const STRATEGY_LABELS: Record<SchedulingStrategy, string> = {
  fixed: '固定映射',
  ai_dispatch: 'AI调度',
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
  const [bgmOn, setBgmOn] = useState(true);
  const [allModels, setAllModels] = useState(scheduler.getAllModels());

  const refreshModels = async () => {
    const provs = scheduler.getAllProviders();
    for (const p of provs) {
      await p.fetchModels();
    }
    setAllModels(scheduler.getAllModels());
  };

  useEffect(() => {
    const interval = setInterval(() => setAiState(aiController.getState()), 1000);
    return () => clearInterval(interval);
  }, []);

  const memStats = memory.getStats();
  const providers = getConfiguredProviders();

  const applyAndSave = (updates: Partial<SchedulerConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    scheduler.updateConfig(newConfig);
    setStorage();
  };

  const stateColors: Record<string, string> = {
    uninitialized: '#888', configuring: '#ffaa00', ready: '#44cc44',
    generating: '#4488ff', playing: '#44cc44', choosing: '#ff6b9d', error: '#ff4444',
  };

  // Model list for NormalButton
  const modelIds = allModels.map((m: AIModel) => m.id);
  const modelLabels = allModels.map((m: AIModel) => `[${m.provider}] ${m.name}`);

  // Strategy index for NormalButton
  const strategyIndex = STRATEGY_NAMES.indexOf(config.strategy);

  return (
    <div className={styles.Options_main_content}>
      <div className={styles.Options_main_content_half}>
        {/* Status indicator */}
        <NormalOption key="status" title="引擎状态">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', fontSize: '150%', color: '#aaa' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stateColors[aiState] || '#888', display: 'inline-block' }} />
            <span>{aiState}</span>
            <span style={{ marginLeft: '12px', fontSize: '80%' }}>
              {allModels.length}模型 | {providers.join(',') || '无'} | 记忆摘要{memStats.summaryCount}
            </span>
            <NormalButton
              textList={['🔄 刷新模型列表']}
              functionList={[refreshModels]}
              currentChecked={-1}
            />
          </div>
        </NormalOption>

        {/* Scheduling Strategy */}
        <NormalOption key="strategy" title="调度策略">
          <NormalButton
            textList={STRATEGY_NAMES.map((s) => STRATEGY_LABELS[s])}
            functionList={STRATEGY_NAMES.map((s) => () => applyAndSave({ strategy: s }))}
            currentChecked={strategyIndex}
          />
        </NormalOption>

        {/* Default Model */}
        {allModels.length > 0 && (
          <NormalOption key="defaultModel" title="默认模型">
            <NormalButton
              textList={modelLabels}
              functionList={modelIds.map((id) => () => applyAndSave({ defaultModel: id }))}
              currentChecked={modelIds.indexOf(config.defaultModel)}
            />
          </NormalOption>
        )}

        {/* Task Model Assignments */}
        {(Object.keys(TASK_LABELS) as TaskType[]).map((task) => {
          const currentModel = config.taskModelMapping[task] || config.defaultModel;
          const idx = modelIds.indexOf(currentModel);
          const capableModels = allModels.filter((m) => m.capabilities.includes(task as any));
          const capableIds = capableModels.map((m) => m.id);
          const capableLabels = capableModels.map((m) => `[${m.provider}] ${m.name}`);
          // Add "default" option at the start
          const allLabels = ['默认', ...capableLabels];
          const allIds = ['', ...capableIds];

          return (
            <NormalOption key={`task_${task}`} title={`任务: ${TASK_LABELS[task]}`}>
              <NormalButton
                textList={allLabels}
                functionList={allIds.map((id) => () => {
                  const newMapping = { ...config.taskModelMapping };
                  if (id) {
                    newMapping[task] = id;
                  } else {
                    delete newMapping[task];
                  }
                  applyAndSave({ taskModelMapping: newMapping });
                })}
                currentChecked={allIds.indexOf(currentModel)}
              />
            </NormalOption>
          );
        })}

        {/* AI Dispatch Scheduler Model */}
        {config.strategy === 'ai_dispatch' && (
          <NormalOption key="schedulerModel" title="调度器模型">
            <NormalButton
              textList={['默认', ...allModels.filter((m) => m.capabilities.includes('scheduling')).map((m) => `[${m.provider}] ${m.name}`)]}
              functionList={['', ...allModels.filter((m) => m.capabilities.includes('scheduling')).map((m) => m.id)].map((id) => () => {
                applyAndSave({ schedulerModel: id || undefined });
              })}
              currentChecked={['', ...allModels.filter((m) => m.capabilities.includes('scheduling')).map((m) => m.id)].indexOf(config.schedulerModel || '')}
            />
          </NormalOption>
        )}

        {/* Max Retries */}
        <NormalOption key="retries" title="最大重试次数">
          <OptionSlider
            initValue={config.maxRetries}
            uniqueID="ai-retries"
            min={0}
            max={5}
            onChange={(e) => applyAndSave({ maxRetries: Number(e.target.value) })}
          />
        </NormalOption>

        {/* Timeout */}
        <NormalOption key="timeout" title="API 超时 (秒)">
          <OptionSlider
            initValue={Math.round(config.timeoutMs / 1000)}
            uniqueID="ai-timeout"
            min={5}
            max={120}
            onChange={(e) => applyAndSave({ timeoutMs: Number(e.target.value) * 1000 })}
          />
        </NormalOption>

        {/* Memory: max recent events */}
        <NormalOption key="memEvents" title="记忆: 保留最近事件数">
          <OptionSlider
            initValue={memory.getConfig().maxRecentEvents}
            uniqueID="ai-mem-events"
            min={5}
            max={100}
            onChange={(e) => {
              memory.updateConfig({ maxRecentEvents: Number(e.target.value) });
              setStorage();
            }}
          />
        </NormalOption>

        {/* Memory: max context tokens */}
        <NormalOption key="memTokens" title="记忆: 最大上下文 tokens">
          <OptionSlider
            initValue={Math.round(memory.getConfig().maxContextTokens / 1000)}
            uniqueID="ai-mem-tokens"
            min={1}
            max={64}
            onChange={(e) => {
              memory.updateConfig({ maxContextTokens: Number(e.target.value) * 1000 });
              setStorage();
            }}
          />
        </NormalOption>

        {/* BGM Mood Toggle */}
        <NormalOption key="bgm" title="AI 情绪 BGM">
          <NormalButton
            textList={['开启', '关闭']}
            functionList={[
              () => { bgm.setEnabled(true); setBgmOn(true); },
              () => { bgm.setEnabled(false); setBgmOn(false); },
            ]}
            currentChecked={bgmOn ? 0 : 1}
          />
        </NormalOption>
      </div>
    </div>
  );
}

export default AiSettings;
