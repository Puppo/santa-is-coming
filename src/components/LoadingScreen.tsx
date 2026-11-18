import { useProgress } from '@react-three/drei';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TranslationDict } from '../i18n/translations';

export function LoadingScreen({ t }: { t: TranslationDict }) {
  const { active, progress } = useProgress();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active && progress >= 100) {
      const id = window.setTimeout(() => setDismissed(true), 450);
      return () => window.clearTimeout(id);
    }
    // Failsafe in case cached assets resolve instantaneously or WebGL is mocked in tests
    const maxWait = window.setTimeout(() => setDismissed(true), 3200);
    return () => window.clearTimeout(maxWait);
  }, [active, progress]);

  if (dismissed) return null;

  return (
    <div
      className="loading-overlay"
      aria-hidden={!active && progress >= 100}
      style={{ opacity: !active && progress >= 100 ? 0 : 1 }}
    >
      <div className="loading-card" role="status" aria-live="polite">
        <Sparkles size={28} color="#ffd166" aria-hidden="true" />
        <h2>{t.loadingTitle}</h2>
        <p className="brand-sub">{t.loadingSubtitle}</p>
        <progress
          className="loading-progress"
          max={100}
          value={Math.min(100, Math.round(progress))}
          aria-label={t.loadingTitle}
        />
      </div>
    </div>
  );
}
