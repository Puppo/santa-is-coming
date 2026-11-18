let sfxCtx: AudioContext | null = null;
let sfxMuted = false;

export function setSfxMuted(muted: boolean) {
  sfxMuted = muted;
}

function getSfxContext(): AudioContext | null {
  if (sfxMuted || typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sfxCtx) {
    sfxCtx = new Ctx();
  }
  if (sfxCtx.state === 'suspended') {
    void sfxCtx.resume();
  }
  return sfxCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
  endFreq?: number,
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playSleighBells() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const shimmer = [2093, 2637, 3136, 2637, 3520, 4186];
  shimmer.forEach((freq, i) => {
    playTone(ctx, freq, i * 0.055, 0.24, 'triangle', 0.055);
  });
}

export function playMagicChime() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((freq, i) => {
    playTone(ctx, freq, i * 0.065, 0.36, 'sine', 0.07);
  });
}

export function playTrainWhistle() {
  const ctx = getSfxContext();
  if (!ctx) return;
  // Warm two-chord wooden steam whistle
  [587.33, 739.99].forEach((freq) => {
    playTone(ctx, freq, 0, 0.22, 'triangle', 0.065);
    playTone(ctx, freq * 1.01, 0.27, 0.34, 'triangle', 0.065);
  });
}

export function playWorkshopTinker() {
  const ctx = getSfxContext();
  if (!ctx) return;
  playTone(ctx, 440, 0, 0.09, 'triangle', 0.08, 220);
  playTone(ctx, 660, 0.11, 0.09, 'triangle', 0.075, 330);
  playTone(ctx, 880, 0.24, 0.22, 'sine', 0.065);
}

export function playGrumpSneak() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const pizz = [196, 207.65, 196, 233.08];
  pizz.forEach((f, i) => {
    playTone(ctx, f, i * 0.13, 0.1, 'triangle', 0.06, f * 0.9);
  });
}

export function playGrumpCaught() {
  const ctx = getSfxContext();
  if (!ctx) return;
  playTone(ctx, 620, 0, 0.18, 'sawtooth', 0.045, 220);
  playTone(ctx, 523.25, 0.16, 0.2, 'sine', 0.08);
  playTone(ctx, 783.99, 0.26, 0.24, 'sine', 0.08);
  playTone(ctx, 1046.5, 0.36, 0.35, 'triangle', 0.07);
}
