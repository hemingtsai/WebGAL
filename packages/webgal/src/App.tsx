import { useEffect, useState } from 'react';
import { initializeScript } from '@/Core/initializeScript';
import Translation from '@/UI/Translation/Translation';
import { Stage } from '@/Stage/Stage';
import { BottomControlPanel } from '@/UI/BottomControlPanel/BottomControlPanel';
import { BottomControlPanelFilm } from '@/UI/BottomControlPanel/BottomControlPanelFilm';
import { Backlog } from '@/UI/Backlog/Backlog';
import Title from '@/UI/Title/Title';
import Logo from '@/UI/Logo/Logo';
import { Extra } from '@/UI/Extra/Extra';
import Menu from '@/UI/Menu/Menu';
import GlobalDialog from '@/UI/GlobalDialog/GlobalDialog';
import PanicOverlay from '@/UI/PanicOverlay/PanicOverlay';
import DevPanel from '@/UI/DevPanel/DevPanel';
import { AISetup } from '@/UI/AISetup/AISetup';
import { AIControlPanel } from '@/UI/AISetup/AIControlPanel';
import { getConfigManager } from '@/Core/userConfig/configManager';
import { initializeAIGame } from '@/Core/ai/aiInitialize';
import { logger } from '@/Core/util/logger';

/** Whether to use AI-powered dynamic story mode */
const USE_AI_MODE = true;

export default function App() {
  const [showSetup, setShowSetup] = useState(false);
  const [isAIInitialized, setIsAIInitialized] = useState(false);

  useEffect(() => {
    if (USE_AI_MODE) {
      const configManager = getConfigManager();
      if (configManager.isReady()) {
        // Story is already configured, initialize AI game
        logger.info('[App] Story config found, initializing AI game...');
        initializeAIGame().then(() => {
          setIsAIInitialized(true);
        }).catch((err) => {
          logger.error('[App] AI init failed, showing setup:', err);
          setShowSetup(true);
        });
      } else {
        // No config — show setup UI
        logger.info('[App] No story config, showing setup UI');
        setShowSetup(true);
      }
    } else {
      // Legacy mode — use the original hardcoded script
      initializeScript();
    }
  }, []);

  // AI setup screen overlay
  if (USE_AI_MODE && showSetup) {
    return <AISetup />;
  }

  return (
    <div className="App">
      <Translation />
      <Stage />
      <BottomControlPanel />
      <BottomControlPanelFilm />
      <Backlog />
      <Title />
      <Logo />
      <Extra />
      <Menu />
      <GlobalDialog />
      <PanicOverlay />
      <DevPanel />
      {USE_AI_MODE && !showSetup && <AIControlPanel />}
    </div>
  );
}
