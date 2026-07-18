/**
 * AI Control Panel
 *
 * An overlay panel accessible during gameplay for:
 * - Viewing AI generation status
 * - Adjusting API keys and model settings
 * - Viewing generation logs
 * - Manually triggering regeneration
 * - Toggling between AI mode and UI setup
 */

import React, { useState, useEffect } from 'react';
import { getAIGameController, AIGameState } from '@/Core/ai/gameController';
import { getScheduler } from '@/Core/ai/scheduler';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { setProviderApiKey } from '@/Core/ai/aiInitialize';

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '10px',
  right: '10px',
  zIndex: 9999,
  background: 'rgba(0,0,0,0.85)',
  color: '#fff',
  borderRadius: '12px',
  padding: '16px',
  minWidth: '280px',
  maxWidth: '360px',
  fontSize: '13px',
  fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  border: '1px solid rgba(255,255,255,0.15)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '12px',
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

export function AIControlPanel() {
  const [expanded, setExpanded] = useState(false);
  const [gameState, setGameState] = useState<AIGameState>(AIGameState.UNINITIALIZED);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const controller = getAIGameController();
      setGameState(controller.getState());
    }, 1000);
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
    getConfigManager().reset();
    window.location.reload();
  };

  const stateLabel = (() => {
    switch (gameState) {
      case AIGameState.UNINITIALIZED: return '未初始化';
      case AIGameState.CONFIGURING: return '配置中';
      case AIGameState.READY: return '就绪';
      case AIGameState.GENERATING: return '生成中...';
      case AIGameState.PLAYING: return '播放中';
      case AIGameState.CHOOSING: return '等待选择';
      case AIGameState.ERROR: return '错误';
      default: return gameState;
    }
  })();

  return (
    <div style={panelStyle}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <span>
          🤖 AI引擎
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: stateColors[gameState] || '#888',
            marginLeft: '8px',
            marginRight: '4px',
          }} />
          <span style={{ color: stateColors[gameState] || '#888', fontSize: '12px' }}>{stateLabel}</span>
        </span>
        <span style={{ fontSize: '18px' }}>{expanded ? '▼' : '▲'}</span>
      </div>

      {expanded && (
        <div>
          <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: '#aaa' }}>
              调度策略: {getScheduler().getConfig().strategy}
            </div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>
              默认模型: {getScheduler().getConfig().defaultModel}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button style={buttonStyle} onClick={() => setShowApiInput(!showApiInput)}>
              🔑 API密钥
            </button>
            <button style={buttonStyle} onClick={handleReset}>
              🔄 重置设定
            </button>
          </div>

          {showApiInput && (
            <div style={{ marginTop: '10px' }}>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="输入 DeepSeek API Key..."
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
              <button style={{ ...buttonStyle, marginTop: '6px' }} onClick={handleSetApiKey}>
                保存
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AIControlPanel;
