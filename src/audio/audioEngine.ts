export interface AudioBands {
  bass: number;
  mid: number;
  treble: number;
  energy: number;
}

class ChristmasAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private bins: Uint8Array<ArrayBuffer> | null = null;
  private currentUrl = '';
  public readonly bands: AudioBands = { bass: 0, mid: 0, treble: 0, energy: 0 };

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.audio) {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.preload = 'metadata';
      el.loop = true;
      this.audio = el;
    }
    return this.audio;
  }

  private ensureAnalyser(el: HTMLAudioElement) {
    if (this.analyser || typeof window === 'undefined') return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;

      // Hint iOS Safari to mix/play through media channel even with mute switch
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) {
        nav.audioSession.type = 'playback';
      }

      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      this.ctx = ctx;
      this.analyser = analyser;
      this.bins = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Fallback: audio still plays through <audio> even if Web Audio graph cannot attach
    }
  }

  async playTrack(url: string): Promise<boolean> {
    const el = this.ensureAudio();
    if (!el) return false;
    this.ensureAnalyser(el);

    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => undefined);
    }

    if (this.currentUrl !== url) {
      this.currentUrl = url;
      el.src = url;
    }

    try {
      await el.play();
      return true;
    } catch {
      return false;
    }
  }

  pause() {
    this.audio?.pause();
  }

  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  onEnded(cb: () => void): () => void {
    const el = this.ensureAudio();
    if (!el) return () => undefined;
    el.addEventListener('ended', cb);
    return () => el.removeEventListener('ended', cb);
  }

  /** Called inside R3F useFrame; updates mutable bands object with zero React allocations. */
  sampleBands(isPlaying: boolean, partyMode: boolean, elapsedTime: number): AudioBands {
    if (this.analyser && this.bins && isPlaying) {
      this.analyser.getByteFrequencyData(this.bins);
      const len = this.bins.length;
      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;

      const bassEnd = Math.max(4, Math.floor(len * 0.14));
      const midEnd = Math.max(bassEnd + 4, Math.floor(len * 0.48));

      for (let i = 0; i < bassEnd; i++) bassSum += this.bins[i];
      for (let i = bassEnd; i < midEnd; i++) midSum += this.bins[i];
      for (let i = midEnd; i < len; i++) trebleSum += this.bins[i];

      const bass = bassSum / (bassEnd * 255);
      const mid = midSum / ((midEnd - bassEnd) * 255);
      const treble = trebleSum / ((len - midEnd) * 255);
      const energy = bass * 0.5 + mid * 0.35 + treble * 0.15;

      // Smoothly lerp so lights pulse organically (< 3Hz threshold)
      this.bands.bass += (bass - this.bands.bass) * 0.25;
      this.bands.mid += (mid - this.bands.mid) * 0.25;
      this.bands.treble += (treble - this.bands.treble) * 0.25;
      this.bands.energy += (energy - this.bands.energy) * 0.25;
      return this.bands;
    }

    // Gentle rhythmic fallback if user turns on Party Mode before pressing Play
    if (partyMode) {
      const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * 3.4);
      this.bands.bass = 0.35 + pulse * 0.35;
      this.bands.mid = 0.3 + 0.3 * Math.cos(elapsedTime * 2.2);
      this.bands.treble = 0.25 + pulse * 0.25;
      this.bands.energy = 0.35 + pulse * 0.35;
      return this.bands;
    }

    this.bands.bass *= 0.9;
    this.bands.mid *= 0.9;
    this.bands.treble *= 0.9;
    this.bands.energy *= 0.9;
    return this.bands;
  }
}

export const christmasAudioEngine = new ChristmasAudioEngine();
