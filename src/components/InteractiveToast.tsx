import type { TranslationDict } from '../i18n/translations';
import { useVillage } from '../state/villageStore';

function resolveMessage(t: TranslationDict, key: string): string {
  if (key.startsWith('toasts.')) {
    const sub = key.slice('toasts.'.length) as keyof TranslationDict['toasts'];
    return t.toasts[sub] ?? key;
  }
  const direct = t[key as keyof TranslationDict];
  return typeof direct === 'string' ? direct : key;
}

export function InteractiveToast({ t }: { t: TranslationDict }) {
  const { toast, grumpState, catchGrump, dismissToast } = useVillage();
  const grumpActive = grumpState === 'peeking' || grumpState === 'sneaking';

  if (!toast && !grumpActive) {
    return <div className="visually-hidden" role="status" aria-live="polite" />;
  }

  const displayText = toast
    ? resolveMessage(t, toast.messageKey)
    : grumpState === 'peeking'
      ? t.grumpPeekingBanner
      : t.grumpSneakingBanner;

  const isGrumpStyle = Boolean(toast?.isGrump || grumpActive);

  return (
    <div
      className={`toast-banner${isGrumpStyle ? ' is-grump' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="toast-copy">{displayText}</span>
      {grumpActive ? (
        <button type="button" className="hud-btn hud-btn-danger" onClick={catchGrump}>
          {t.grumpShoo}
        </button>
      ) : (
        <button
          type="button"
          className="toast-close-btn"
          onClick={dismissToast}
          aria-label={t.creditsClose}
        >
          ×
        </button>
      )}
    </div>
  );
}
