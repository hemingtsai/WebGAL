/**
 * AI Control Panel (Updated)
 *
 * Compact overlay panel for in-game AI monitoring and control:
 * - AI state indicator
 * - Quick API key entry
 * - Access to full settings
 * - Debug info (token usage, memory stats)
 */

import React, { useState, useEffect } from 'react';
import { getAIGameController, AIGameState } from '@/Core/ai/gameController';
import { getScheduler } from '@/Core/ai/scheduler';
import { getMemoryManager, estimateTokens } from '@/Core/ai/memoryManager';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { setProviderApiKey } from '@/Core/ai/aiInitialize';
import { AISettingsPanel } from './AISettingsPanel';
import { StoryGenerationOutput } from '@/Core/ai/types';

const stateColors: Record<string, string> = {
  uninitialized: '#888',
  configuring: '#ffaa00',
  ready: '#44cc44',
  generating: '#4488ff',
  playing: '#44cc44',
  choosing: '#ff6b9d',
  error: '#ff4444',
};

const stateLabels: Record<string, string> = {
  uninitialized: '未初始化',
  configuring: '配置中',
  ready: '就绪',
  generating: 'AI生成中...',
  playing: '播放中',
  choosing: '等待选择',
  error: '错误',
};

export function AIControlPanel() {
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gameState, setGameState] = useState<AIGameState>(AIGameState.UNINITIALIZED);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  const [lastOutput, setLastOutput] = useState<StoryGenerationOutput | null>(null);

  useEffect(() => {
    const controller = getAIGameController();
    controller.onGenerationComplete((output) => setLastOutput(output));

    const interval = setInterval(() => {
      setGameState(controller.getState());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSetApiKey = () => {
    if (apiKeyInput.trim()) {
      setProviderApiKey('deepseek', apiKeyInput.trim());
      setApiKeyInput('');
      setShowApiInput(false);
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置所有故事设定吗？')) {
      getConfigManager().reset();
      getMemoryManager().reset();
      window.location.reload();
    }
  };

  const memStats = getMemoryManager().getStats();
  const scheduler = getScheduler();

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '13px',
        fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        maxWidth: expanded ? '360px' : 'auto',
      }}>
        {/* Header */}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '12px' }}
          onClick={() => !showSettings && setExpanded(!expanded)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: stateColors[gameState] || '#888',
              display: 'inline-block',
            }} />
            <span style={{ fontWeight: 'bold' }}>AI</span>
            <span style={{ fontSize: '11px', color: stateColors[gameState] || '#888' }}>
              {stateLabels[gameState] || gameState}
            </span>
          </span>
          <span style={{ fontSize: '10px', color: '#888' }}>
            {expanded ? '▲ 收起' : '▼ 展开'}
          </span>
        </div>

        {expanded && !showSettings && (
          <div style={{ marginTop: '10px' }}>
            {/* Quick stats */}
            <div style={{
              padding: '8px', background: 'rgba(255,255,255,0.05)',
              borderRadius: '6px', marginBottom: '10px', fontSize: '11px',
            }}>
              <div>模型: <span style={{ color: '#ff8fb3' }}>{scheduler.getConfig().defaultModel}</span></div>
              <div>策略: <span style={{ color: '#ff8fb3' }}>{scheduler.getConfig().strategy}</span></div>
              <div>记忆: <span style={{ color: '#ff8fb3' }}>{memStats.summaryCount} 摘要 / {memStats.totalSummarizedEvents} 事件已压缩</span></div>
              {lastOutput && (
                <div>最后生成: <span style={{ color: '#888' }}>{new Date().toLocaleTimeString()}</span></div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button style={btnStyle} onClick={() => setShowApiInput(!showApiInput)}>
                🔑 密钥
              </button>
              <button style={btnStyle} onClick={() => setShowSettings(true)}>
                ⚙️ 设置
              </button>
              <button style={btnStyle} onClick={handleReset}>
                🔄 重置
              </button>
            </div>

            {/* API Key Input */}
            {showApiInput && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="DeepSeek API Key..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
                  style={{
                    width: '100%', padding: '6px 10px', borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div style={{ marginTop: '8px' }}>
            <button style={btnStyle} onClick={() => setShowSettings(false)}>
              ← 返回
            </button>
            <div style={{ marginTop: '8px' }}>
              <AISettingsPanel />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: '12px',
};

export default AIControlPanel;
