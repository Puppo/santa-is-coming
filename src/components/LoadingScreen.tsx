import { useProgress } from '@react-three/drei';
import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TranslationDict } from '../i18n/translations';

export function LoadingScreen({ t }: { t: TranslationDict }) {
  const { active, progress } = useProgress();
  const [dismissed, setDismissed] = useState(false);
  const hasActivatedRef = useRef(false);

  if (active) {
    hasActivatedRef.current = true;
  }

  useEffect(() => {
    if (!active && (progress >= 100 || hasActivatedRef.current)) {
      const id = window.setTimeout(() => setDismissed(true), 350);
      return () => window.clearTimeout(id);
    }
    if (!active && !hasActivatedRef.current) {
      const idleId = window.setTimeout(() => setDismissed(true), 900);
      return () => window.clearTimeout(idleId);
    }
    return undefined;
  }, [active, progress]);

  // Absolute failsafe so a stalled network request never traps the user permanently
  useEffect(() => {
    const maxWait = window.setTimeout(() => setDismissed(true), 14000);
    return () => window.clearTimeout(maxWait);
  }, []);

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
