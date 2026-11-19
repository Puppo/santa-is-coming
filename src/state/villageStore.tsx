import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { christmasAudioEngine } from '../audio/audioEngine';
import {
  playGrumpCaught,
  playGrumpSneak,
  playMagicChime,
  playSleighBells,
  playTrainWhistle,
  playWorkshopTinker,
  setSfxMuted,
} from '../audio/soundEffects';
import { CHRISTMAS_TRACKS, type ChristmasTrack } from '../audio/tracks';
import type { AtmosphereMode, ZoneId } from '../i18n/translations';

export type GrumpState = 'idle' | 'peeking' | 'sneaking' | 'caught' | 'escaped';

export interface ToastNotice {
  id: number;
  messageKey: string;
  isGrump?: boolean;
}

interface VillageContextValue {
  activeZone: ZoneId;
  setActiveZone: (zone: ZoneId) => void;
  atmosphere: AtmosphereMode;
  cycleAtmosphere: () => void;
  partyMode: boolean;
  togglePartyMode: () => void;
  setPartyMode: (enabled: boolean) => void;
  isMusicPlaying: boolean;
  setIsMusicPlaying: (playing: boolean) => void;
  trackIndex: number;
  currentTrack: ChristmasTrack;
  toggleMusicPlay: () => Promise<void>;
  selectTrack: (nextIndex: number) => Promise<void>;
  motionPaused: boolean;
  toggleMotionPaused: () => void;
  sfxEnabled: boolean;
  toggleSfx: () => void;
  sleighFlightActive: boolean;
  triggerSleighFlight: () => void;
  workshopBoostActive: boolean;
  triggerWorkshopBoost: () => void;
  treeBurstActive: boolean;
  triggerTreeBurst: () => void;
  trainBoostActive: boolean;
  triggerTrainBoost: () => void;
  mailboxSwirlActive: boolean;
  triggerMailboxSwirl: () => void;
  grumpState: GrumpState;
  pranksFoiled: number;
  summonGrump: () => void;
  catchGrump: () => void;
  toast: ToastNotice | null;
  announceKey: (messageKey: string, isGrump?: boolean) => void;
  dismissToast: () => void;
}

const VillageContext = createContext<VillageContextValue | null>(null);

const ATMOSPHERE_ORDER: AtmosphereMode[] = ['night', 'twilight', 'day'];

function prefersReducedMotionInitial(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function VillageProvider({ children }: { children: ReactNode }) {
  const [activeZone, setActiveZone] = useState<ZoneId>('overview');
  const [atmosphere, setAtmosphere] = useState<AtmosphereMode>('night');
  const [partyMode, setPartyMode] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [motionPaused, setMotionPaused] = useState(prefersReducedMotionInitial);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const [sleighFlightActive, setSleighFlightActive] = useState(false);
  const [workshopBoostActive, setWorkshopBoostActive] = useState(false);
  const [treeBurstActive, setTreeBurstActive] = useState(false);
  const [trainBoostActive, setTrainBoostActive] = useState(false);
  const [mailboxSwirlActive, setMailboxSwirlActive] = useState(false);

  const [grumpState, setGrumpState] = useState<GrumpState>('idle');
  const [pranksFoiled, setPranksFoiled] = useState(0);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const toastCounter = useRef(0);
  const timersRef = useRef<number[]>([]);
  const sleighTimerRef = useRef<number | null>(null);
  const sleighActiveRef = useRef(false);
  const currentTrack = CHRISTMAS_TRACKS[trackIndex];

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) {
        window.clearTimeout(id);
      }
      timersRef.current = [];
    };
  }, []);

  const announceKey = useCallback(
    (messageKey: string, isGrump = false) => {
      toastCounter.current += 1;
      const currentId = toastCounter.current;
      setToast({ id: currentId, messageKey, isGrump });
      scheduleTimer(() => {
        setToast((prev) => (prev && prev.id === currentId ? null : prev));
      }, 3200);
    },
    [scheduleTimer],
  );

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const toggleMusicPlay = useCallback(async () => {
    if (isMusicPlaying) {
      christmasAudioEngine.pause();
      setIsMusicPlaying(false);
      return;
    }
    const ok = await christmasAudioEngine.playTrack(currentTrack.src);
    if (ok) {
      setIsMusicPlaying(true);
      setPartyMode(true);
    }
  }, [isMusicPlaying, currentTrack.src]);

  const selectTrack = useCallback(
    async (nextIndex: number) => {
      const normalized = (nextIndex + CHRISTMAS_TRACKS.length) % CHRISTMAS_TRACKS.length;
      setTrackIndex(normalized);
      if (isMusicPlaying) {
        const ok = await christmasAudioEngine.playTrack(CHRISTMAS_TRACKS[normalized].src);
        setIsMusicPlaying(ok);
      }
    },
    [isMusicPlaying],
  );

  const cycleAtmosphere = useCallback(() => {
    setAtmosphere((prev) => {
      const idx = ATMOSPHERE_ORDER.indexOf(prev);
      return ATMOSPHERE_ORDER[(idx + 1) % ATMOSPHERE_ORDER.length];
    });
  }, []);

  const togglePartyMode = useCallback(() => {
    setPartyMode((prev) => {
      const next = !prev;
      announceKey(next ? 'toasts.partyEnabled' : 'toasts.partyDisabled');
      return next;
    });
  }, [announceKey]);

  const toggleMotionPaused = useCallback(() => {
    setMotionPaused((prev) => !prev);
  }, []);

  const toggleSfx = useCallback(() => {
    setSfxEnabled((prev) => {
      const next = !prev;
      setSfxMuted(!next);
      return next;
    });
  }, []);

  const triggerSleighFlight = useCallback(() => {
    if (sleighActiveRef.current) return;
    if (sleighTimerRef.current !== null) {
      window.clearTimeout(sleighTimerRef.current);
    }
    sleighActiveRef.current = true;
    playSleighBells();
    setSleighFlightActive(true);
    announceKey('toasts.sleighFlight');
    sleighTimerRef.current = scheduleTimer(() => {
      sleighTimerRef.current = null;
      sleighActiveRef.current = false;
      setSleighFlightActive(false);
    }, 11000);
  }, [announceKey, scheduleTimer]);

  const triggerWorkshopBoost = useCallback(() => {
    playWorkshopTinker();
    setWorkshopBoostActive(true);
    announceKey('toasts.workshopBoost');
    scheduleTimer(() => setWorkshopBoostActive(false), 6000);
  }, [announceKey, scheduleTimer]);

  const triggerTreeBurst = useCallback(() => {
    playMagicChime();
    setTreeBurstActive(true);
    announceKey('toasts.treeBurst');
    scheduleTimer(() => setTreeBurstActive(false), 6000);
  }, [announceKey, scheduleTimer]);

  const triggerTrainBoost = useCallback(() => {
    playTrainWhistle();
    setTrainBoostActive(true);
    announceKey('toasts.trainWhistle');
    scheduleTimer(() => setTrainBoostActive(false), 6000);
  }, [announceKey, scheduleTimer]);

  const triggerMailboxSwirl = useCallback(() => {
    playMagicChime();
    setMailboxSwirlActive(true);
    announceKey('toasts.mailboxSwirl');
    scheduleTimer(() => setMailboxSwirlActive(false), 5500);
  }, [announceKey, scheduleTimer]);

  // Surprise Grump lifecycle timers
  const grumpSeqRef = useRef<number[]>([]);
  const clearGrumpTimers = useCallback(() => {
    for (const id of grumpSeqRef.current) {
      window.clearTimeout(id);
    }
    grumpSeqRef.current = [];
  }, []);

  const startGrumpAppearance = useCallback(() => {
    clearGrumpTimers();
    setGrumpState('peeking');
    playGrumpSneak();
    announceKey('grumpPeekingBanner', true);

    grumpSeqRef.current.push(
      window.setTimeout(() => {
        setGrumpState((cur) => {
          if (cur !== 'peeking') return cur;
          announceKey('grumpSneakingBanner', true);
          return 'sneaking';
        });
      }, 3600),
    );

    grumpSeqRef.current.push(
      window.setTimeout(() => {
        setGrumpState((cur) => {
          if (cur !== 'sneaking' && cur !== 'peeking') return cur;
          announceKey('grumpEscapedToast', true);
          return 'escaped';
        });
      }, 16000),
    );

    grumpSeqRef.current.push(
      window.setTimeout(() => {
        setGrumpState((cur) => (cur === 'escaped' ? 'idle' : cur));
      }, 19000),
    );
  }, [announceKey, clearGrumpTimers]);

  const summonGrump = useCallback(() => {
    if (grumpState === 'idle') {
      startGrumpAppearance();
    }
  }, [grumpState, startGrumpAppearance]);

  const catchGrump = useCallback(() => {
    if (grumpState !== 'peeking' && grumpState !== 'sneaking') return;
    clearGrumpTimers();
    playGrumpCaught();
    setGrumpState('caught');
    setPranksFoiled((n) => n + 1);
    announceKey('grumpCaughtToast', true);
    grumpSeqRef.current.push(
      window.setTimeout(() => {
        setGrumpState('idle');
      }, 3800),
    );
  }, [announceKey, clearGrumpTimers, grumpState]);

  // Automatic surprise visits from Il Guastafeste
  useEffect(() => {
    if (motionPaused) return undefined;
    const firstId = window.setTimeout(() => {
      setGrumpState((cur) => {
        if (cur === 'idle') {
          startGrumpAppearance();
        }
        return cur;
      });
    }, 18000);

    const intervalId = window.setInterval(() => {
      setGrumpState((cur) => {
        if (cur === 'idle') {
          startGrumpAppearance();
        }
        return cur;
      });
    }, 46000);

    return () => {
      window.clearTimeout(firstId);
      window.clearInterval(intervalId);
    };
  }, [motionPaused, startGrumpAppearance]);

  useEffect(() => clearGrumpTimers, [clearGrumpTimers]);

  const value = useMemo<VillageContextValue>(
    () => ({
      activeZone,
      setActiveZone,
      atmosphere,
      cycleAtmosphere,
      partyMode,
      togglePartyMode,
      setPartyMode,
      isMusicPlaying,
      setIsMusicPlaying,
      trackIndex,
      currentTrack,
      toggleMusicPlay,
      selectTrack,
      motionPaused,
      toggleMotionPaused,
      sfxEnabled,
      toggleSfx,
      sleighFlightActive,
      triggerSleighFlight,
      workshopBoostActive,
      triggerWorkshopBoost,
      treeBurstActive,
      triggerTreeBurst,
      trainBoostActive,
      triggerTrainBoost,
      mailboxSwirlActive,
      triggerMailboxSwirl,
      grumpState,
      pranksFoiled,
      summonGrump,
      catchGrump,
      toast,
      announceKey,
      dismissToast,
    }),
    [
      activeZone,
      atmosphere,
      cycleAtmosphere,
      partyMode,
      togglePartyMode,
      isMusicPlaying,
      trackIndex,
      currentTrack,
      toggleMusicPlay,
      selectTrack,
      motionPaused,
      toggleMotionPaused,
      sfxEnabled,
      toggleSfx,
      sleighFlightActive,
      triggerSleighFlight,
      workshopBoostActive,
      triggerWorkshopBoost,
      treeBurstActive,
      triggerTreeBurst,
      trainBoostActive,
      triggerTrainBoost,
      mailboxSwirlActive,
      triggerMailboxSwirl,
      grumpState,
      pranksFoiled,
      summonGrump,
      catchGrump,
      toast,
      announceKey,
      dismissToast,
    ],
  );

  return <VillageContext.Provider value={value}>{children}</VillageContext.Provider>;
}

export function useVillage() {
  const ctx = useContext(VillageContext);
  if (!ctx) {
    throw new Error('useVillage must be used inside VillageProvider');
  }
  return ctx;
}
