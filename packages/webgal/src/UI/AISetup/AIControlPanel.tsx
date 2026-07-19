/**
 * AI Control Panel (Minimal)
 *
 * Small corner indicator showing AI engine status.
 * Clicking opens WebGAL's native menu → AI tab for full settings.
 * Settings are now in the native menu system (UI/Menu/Ai/).
 */

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAIGameController, AIGameState } from '@/Core/ai/gameController';
import { getScheduler } from '@/Core/ai/scheduler';
import { getMemoryManager } from '@/Core/ai/memoryManager';
import { setMenuPanelTag, setVisibility } from '@/store/GUIReducer';
import { MenuPanelTag } from '@/store/guiInterface';

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
  const dispatch = useDispatch();
  const [gameState, setGameState] = useState<AIGameState>(AIGameState.UNINITIALIZED);

  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(getAIGameController().getState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const memStats = getMemoryManager().getStats();

  const handleClick = () => {
    dispatch(setVisibility({ component: 'showMenuPanel', visibility: true }));
    dispatch(setMenuPanelTag(MenuPanelTag.Ai));
  };

  return (
    <div
      onClick={handleClick}
      title="点击打开 AI 设置"
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '20px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '12px',
        fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
        border: '1px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'rgba(196,77,255,0.2)';
        e.currentTarget.style.borderColor = 'rgba(196,77,255,0.4)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
      }}
    >
      <span style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: stateColors[gameState] || '#888',
        display: 'inline-block',
        flexShrink: 0,
      }} />
      <span style={{ color: stateColors[gameState] }}>
        {stateLabels[gameState] || gameState}
      </span>
      {memStats.summaryCount > 0 && (
        <span style={{ color: '#666', fontSize: '10px' }}>
          📝{memStats.summaryCount}
        </span>
      )}
      <span style={{ color: '#555', fontSize: '10px' }}>
        🤖
      </span>
    </div>
  );
}

export default AIControlPanel;
