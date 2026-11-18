import {
  Music,
  PartyPopper,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CHRISTMAS_TRACKS } from '../audio/tracks';
import type { TranslationDict } from '../i18n/translations';
import { useVillage } from '../state/villageStore';

interface MusicPlayerBarProps {
  t: TranslationDict;
  inPopover?: boolean;
}

export function MusicPlayerBar({ t, inPopover = false }: MusicPlayerBarProps) {
  const {
    isMusicPlaying,
    trackIndex,
    currentTrack,
    toggleMusicPlay,
    selectTrack,
    partyMode,
    togglePartyMode,
    sfxEnabled,
    toggleSfx,
  } = useVillage();

  return (
    <section
      className={inPopover ? 'music-bar music-bar-popover' : 'music-bar'}
      aria-label={t.musicRegionLabel}
    >
      <div className="music-transport-row">
        <button
          type="button"
          className="icon-btn"
          onClick={() => void selectTrack(trackIndex - 1)}
          aria-label={t.musicPrev}
        >
          <SkipBack size={16} aria-hidden="true" />
        </button>

        {/* Label toggles Play/Pause, so aria-pressed is intentionally omitted */}
        <button
          type="button"
          className={`icon-btn${isMusicPlaying ? ' is-playing' : ''}`}
          onClick={() => void toggleMusicPlay()}
          aria-label={isMusicPlaying ? t.musicPause : t.musicPlay}
        >
          {isMusicPlaying ? (
            <Pause size={17} aria-hidden="true" />
          ) : (
            <Play size={17} aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={() => void selectTrack(trackIndex + 1)}
          aria-label={t.musicNext}
        >
          <SkipForward size={16} aria-hidden="true" />
        </button>

        <label
          className="visually-hidden"
          htmlFor={`christmas-track-select-${inPopover ? 'pop' : 'bar'}`}
        >
          {t.musicTrackSelect}
        </label>
        <select
          id={`christmas-track-select-${inPopover ? 'pop' : 'bar'}`}
          className="track-select"
          value={currentTrack.id}
          onChange={(e) => {
            const idx = CHRISTMAS_TRACKS.findIndex((tr) => tr.id === e.target.value);
            if (idx >= 0) void selectTrack(idx);
          }}
        >
          {CHRISTMAS_TRACKS.map((track) => (
            <option key={track.id} value={track.id}>
              ♪ {track.title}
            </option>
          ))}
        </select>
      </div>

      <div className="music-extras-row">
        <button
          type="button"
          className={`hud-btn${partyMode ? ' is-active party-pulse-ring' : ''}`}
          aria-pressed={partyMode}
          onClick={togglePartyMode}
        >
          <PartyPopper size={16} aria-hidden="true" />
          <span>{t.partyMode}</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={toggleSfx}
          aria-label={sfxEnabled ? t.sfxOn : t.sfxOff}
        >
          {sfxEnabled ? (
            <Volume2 size={16} aria-hidden="true" />
          ) : (
            <VolumeX size={16} aria-hidden="true" />
          )}
        </button>

        <Music
          size={14}
          className="btn-label-desktop"
          aria-hidden="true"
          style={{ opacity: 0.65 }}
        />
      </div>

      <span className="visually-hidden" aria-live="polite">
        {isMusicPlaying ? `${t.musicNowPlaying}: ${currentTrack.title}` : ''}
      </span>
    </section>
  );
}
