import { Info, Languages, MoonStar, Pause, Play, Sparkles, Sun, Sunset, Trees } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AtmosphereMode, Locale, TranslationDict } from '../i18n/translations';
import { useVillage } from '../state/villageStore';

interface HeaderHudProps {
  t: TranslationDict;
  locale: Locale;
  onToggleLocale: () => void;
  onOpenCredits: () => void;
}

interface CountdownParts {
  isChristmasDay: boolean;
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
}

function getChristmasCountdown(now = new Date()): CountdownParts {
  const year = now.getFullYear();
  const isDec25 = now.getMonth() === 11 && now.getDate() === 25;
  if (isDec25) {
    return { isChristmasDay: true, days: 0, hours: '00', minutes: '00', seconds: '00' };
  }
  let target = new Date(year, 11, 25, 0, 0, 0, 0);
  if (now.getTime() > target.getTime()) {
    target = new Date(year + 1, 11, 25, 0, 0, 0, 0);
  }
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  return { isChristmasDay: false, days, hours, minutes, seconds };
}

function AtmosphereIcon({ mode }: { mode: AtmosphereMode }) {
  if (mode === 'night') return <MoonStar size={16} aria-hidden="true" />;
  if (mode === 'twilight') return <Sunset size={16} aria-hidden="true" />;
  return <Sun size={16} aria-hidden="true" />;
}

export function HeaderHud({ t, locale, onToggleLocale, onOpenCredits }: HeaderHudProps) {
  const {
    atmosphere,
    cycleAtmosphere,
    motionPaused,
    toggleMotionPaused,
    grumpState,
    pranksFoiled,
    summonGrump,
    catchGrump,
  } = useVillage();

  const [countdown, setCountdown] = useState<CountdownParts>(() => getChristmasCountdown());

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(getChristmasCountdown());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const grumpActive = grumpState === 'peeking' || grumpState === 'sneaking';

  return (
    <header className="hud-header">
      <div className="brand-card">
        <div className="brand-emblem" aria-hidden="true">
          <Trees size={18} />
        </div>
        <div>
          <h1 className="brand-title">{t.appTitle}</h1>
          <p className="brand-sub">{t.appSubtitle}</p>
        </div>
      </div>

      <div className="countdown-pill">
        <Sparkles size={15} aria-hidden="true" />
        {countdown.isChristmasDay ? (
          <span>{t.countdownChristmasDay}</span>
        ) : (
          <span>
            {t.countdownLabel}: {countdown.days}
            {t.countdownDays} {countdown.hours}:{countdown.minutes}:{countdown.seconds}
          </span>
        )}
      </div>

      <div className="header-actions">
        {grumpActive ? (
          <button type="button" className="hud-btn hud-btn-danger" onClick={catchGrump}>
            <span>{t.grumpShoo}</span>
          </button>
        ) : (
          <button
            type="button"
            className="hud-btn"
            onClick={summonGrump}
            disabled={grumpState !== 'idle'}
            aria-label={`${t.grumpSummon}${pranksFoiled > 0 ? ` (${t.grumpPranksLabel}: ${pranksFoiled})` : ''}`}
          >
            <span className="btn-label-desktop">{t.grumpName}</span>
            <span aria-hidden="true">{pranksFoiled > 0 ? `(${pranksFoiled})` : '👀'}</span>
          </button>
        )}

        <button
          type="button"
          className="hud-btn"
          onClick={cycleAtmosphere}
          aria-label={`${t.atmosphereLabel}: ${t.atmosphereModes[atmosphere]}`}
        >
          <AtmosphereIcon mode={atmosphere} />
          <span className="btn-label-desktop">{t.atmosphereModes[atmosphere]}</span>
        </button>

        {/* Label toggles Pause/Play, so aria-pressed is intentionally omitted (WCAG 2.2.2) */}
        <button
          type="button"
          className="hud-btn"
          onClick={toggleMotionPaused}
          aria-label={motionPaused ? t.motionResume : t.motionPause}
        >
          {motionPaused ? (
            <Play size={16} aria-hidden="true" />
          ) : (
            <Pause size={16} aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          className="hud-btn"
          onClick={onToggleLocale}
          aria-label={t.languageSwitchLabel}
        >
          <Languages size={16} aria-hidden="true" />
          <span>{locale.toUpperCase()}</span>
        </button>

        <button
          type="button"
          className="hud-btn"
          onClick={onOpenCredits}
          aria-label={t.creditsOpen}
        >
          <Info size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
