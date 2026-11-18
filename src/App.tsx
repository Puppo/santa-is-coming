import { useState } from 'react';
import { CreditsDialog } from './components/CreditsDialog';
import { HeaderHud } from './components/HeaderHud';
import { InteractiveToast } from './components/InteractiveToast';
import { LoadingScreen } from './components/LoadingScreen';
import { MusicPlayerBar } from './components/MusicPlayerBar';
import { ZoneDock } from './components/ZoneDock';
import { useCompactViewport } from './hooks/useCompactViewport';
import { useLocale } from './i18n/useLocale';
import { VillageCanvas } from './scene/VillageCanvas';
import { VillageProvider } from './state/villageStore';

export function AppContent() {
  const { locale, toggleLocale, t } = useLocale();
  const isCompact = useCompactViewport();
  const [creditsOpen, setCreditsOpen] = useState(false);

  return (
    <div className="app-shell">
      <a href="#village-controls" className="skip-link visually-hidden">
        {t.skipToControls}
      </a>

      <HeaderHud
        t={t}
        locale={locale}
        isCompact={isCompact}
        onToggleLocale={toggleLocale}
        onOpenCredits={() => setCreditsOpen(true)}
      />

      <main id="village-main" className="village-main">
        <VillageCanvas />
        <InteractiveToast t={t} />
      </main>

      <div id="village-controls" className="hud-bottom-dock" tabIndex={-1}>
        <ZoneDock t={t} isCompact={isCompact} />
        {!isCompact && <MusicPlayerBar t={t} />}
      </div>

      <CreditsDialog open={creditsOpen} onClose={() => setCreditsOpen(false)} t={t} />

      <LoadingScreen t={t} />
    </div>
  );
}

export function App() {
  return (
    <VillageProvider>
      <AppContent />
    </VillageProvider>
  );
}

export default App;
