/**
 * AI Choice UI Component
 *
 * Renders AI-generated choices in WebGAL's choose container.
 * Integrates with the AIGameController to handle user selection.
 * Uses the same visual style as WebGAL's built-in choose component.
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { webgalStore } from '@/store/store';
import { ChoicePoint, ChoiceOption } from '@/Core/ai/types';
import { useSEByWebgalStore } from '@/hooks/useSoundEffect';
import { WebGAL } from '@/Core/WebGAL';
import { handleAIChoice } from '@/Core/ai/aiInitialize';
import useApplyStyle from '@/hooks/useApplyStyle';
import { useFontFamily } from '@/hooks/useFontFamily';

interface AIChoiceProps {
  choicePoint: ChoicePoint;
  onSelect?: (index: number) => void;
}

export function AIChoiceComponent({ choicePoint, onSelect }: AIChoiceProps) {
  const font = useFontFamily();
  const { playSeEnter, playSeClick } = useSEByWebgalStore();
  const applyStyle = useApplyStyle('choose');

  const handleSelect = (index: number) => {
    playSeClick();
    // Remove the choice UI
    const container = document.getElementById('chooseContainer');
    if (container) {
      ReactDOM.render(<div />, container);
    }
    // Handle the choice
    if (onSelect) {
      onSelect(index);
    } else {
      handleAIChoice(index);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '30%',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 20,
      minWidth: '300px',
      maxWidth: '600px',
      width: '80%',
    }}>
      {/* Choice prompt */}
      {choicePoint.prompt && (
        <div style={{
          textAlign: 'center',
          color: '#ff8fb3',
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '8px',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          fontFamily: font,
        }}>
          {choicePoint.prompt}
        </div>
      )}

      {/* Choice buttons */}
      {choicePoint.options.map((option, i) => (
        <div
          key={i}
          onClick={() => handleSelect(i)}
          onMouseEnter={playSeEnter}
          style={{
            padding: '14px 24px',
            background: 'linear-gradient(135deg, rgba(196, 77, 255, 0.3), rgba(255, 107, 157, 0.3))',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
            fontFamily: font,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(196, 77, 255, 0.5), rgba(255, 107, 157, 0.5))';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(196, 77, 255, 0.3), rgba(255, 107, 157, 0.3))';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {option.text}
          {option.consequence && (
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
              {option.consequence}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Show AI choices in WebGAL's choose container.
 * Call this from the game controller when a choice point is reached.
 */
export function showAIChoices(choicePoint: ChoicePoint, onSelect?: (index: number) => void): void {
  const container = document.getElementById('chooseContainer');
  if (!container) return;

  ReactDOM.render(
    <Provider store={webgalStore}>
      <AIChoiceComponent choicePoint={choicePoint} onSelect={onSelect} />
    </Provider>,
    container,
  );
}

/**
 * Hide AI choices from the container.
 */
export function hideAIChoices(): void {
  const container = document.getElementById('chooseContainer');
  if (container) {
    ReactDOM.render(<div />, container);
  }
}

export default AIChoiceComponent;
