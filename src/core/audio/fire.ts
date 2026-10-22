/**
 * Fire sound. The supplied burn video has a silent audio track, so the sound
 * is synthesised: buffers of crackle (sparse filtered impulses) and roar
 * (leaky-integrated noise) are generated once and played through envelopes.
 * If `site.fireAudio` is set, `burn()` plays that recording instead.
 *
 * Audio can only start after a user gesture: call `fireAudio.unlock()` inside
 * the click handler that triggers the sound.
 */
import { create } from 'zustand';

const STORAGE_KEY = 'ag-sound';

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

export const useSound = create<{ muted: boolean; toggle: () => void; setMuted: (m: boolean) => void }>(
  (set, get) => ({
    muted: readMuted(),
    toggle: () => get().setMuted(!get().muted),
    setMuted: (muted) => {
      try {
        localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on');
      } catch {
        /* storage unavailable: keep the in-memory value */
      }
      fireAudio.applyMute(muted);
      set({ muted });
    },
  }),
);

/** Deterministic PRNG so the generated buffers are identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCrackle(ctx: BaseAudioContext, seconds: number, perSecond: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(2, Math.floor(seconds * rate), rate);
  const rand = mulberry32(7);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const count = Math.floor(seconds * perSecond);
    for (let i = 0; i < count; i++) {
      const start = Math.floor(rand() * (d.length - rate * 0.02));
      // Power-law loudness: mostly faint ticks, a few sharp pops.
      const amp = Math.pow(rand(), 3.2) * 0.9 + 0.02;
      const len = Math.floor(rate * (0.0015 + rand() * (amp > 0.4 ? 0.012 : 0.004)));
      const decay = 4 / len;
      for (let j = 0; j < len; j++) d[start + j] += (rand() * 2 - 1) * amp * Math.exp(-j * decay);
    }
    // One-pole high-pass: crackle lives above the roar.
    let prevIn = 0;
    let prevOut = 0;
    for (let k = 0; k < d.length; k++) {
      const x = d[k];
      prevOut = 0.96 * (prevOut + x - prevIn);
      prevIn = x;
      d[k] = prevOut;
    }
  }
  return buf;
}

function makeRoar(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(seconds * rate);
  const buf = ctx.createBuffer(2, len, rate);
  const rand = mulberry32(19);
  const fade = Math.floor(rate * 0.25);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      brown = (brown + 0.02 * (rand() * 2 - 1)) / 1.02;
      // Slow, irregular breathing of the flame body.
      const breath = 0.75 + 0.25 * Math.sin(i / rate * 2.3 + ch) * Math.sin(i / rate * 0.7 + 1.3);
      d[i] = brown * 3.2 * breath;
    }
    // Crossfade the tail into the head so the buffer loops without a click.
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      d[i] = d[i] * t + d[len - fade + i] * (1 - t);
    }
  }
  return buf;
}

class FireAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private crackle: AudioBuffer | null = null;
  private roar: AudioBuffer | null = null;
  private recording: HTMLAudioElement | null = null;
  private recordingSrc = '';

  /** Must be called from a user gesture before any sound plays. */
  async unlock(): Promise<void> {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = useSound.getState().muted ? 0 : 0.9;
      this.master.connect(comp).connect(this.ctx.destination);
      this.crackle = makeCrackle(this.ctx, 4, 38);
      this.roar = makeRoar(this.ctx, 4);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  applyMute(muted: boolean) {
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    if (this.recording) this.recording.muted = muted;
  }

  /** Use a recorded fire sound for `burn()` (empty string returns to the synth). */
  setRecording(src: string) {
    if (src === this.recordingSrc) return;
    this.recordingSrc = src;
    this.recording = src ? new Audio(src) : null;
    if (this.recording) this.recording.preload = 'auto';
  }

  private ready() {
    return !!(this.ctx && this.master && this.crackle && this.roar && !useSound.getState().muted);
  }

  /** The catch of a match: a filtered whoosh and a burst of crackle. */
  ignite() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.roar;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.9;
    band.frequency.setValueAtTime(260, t);
    band.frequency.exponentialRampToValueAtTime(2600, t + 0.45);
    band.frequency.exponentialRampToValueAtTime(700, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.1, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    src.connect(band).connect(g).connect(this.master!);
    src.start(t, Math.random() * 2);
    src.stop(t + 1.4);
    this.crackleFor(t, 1.4, 0.8);
  }

  /**
   * A fire that grows, peaks and dies over `seconds`. `peakAt` (0..1) places
   * the loudest moment. Returns a handle that fades the sound out early.
   */
  burn(seconds: number, peakAt = 0.45): { stop: () => void } {
    if (this.recording && !useSound.getState().muted) {
      const a = this.recording;
      a.currentTime = 0;
      void a.play().catch(() => {});
      return { stop: () => a.pause() };
    }
    if (!this.ready()) return { stop: () => {} };
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const end = t + seconds;

    const roar = ctx.createBufferSource();
    roar.buffer = this.roar;
    roar.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.setValueAtTime(380, t);
    low.frequency.linearRampToValueAtTime(1300, t + seconds * peakAt);
    low.frequency.linearRampToValueAtTime(420, end);
    const roarGain = ctx.createGain();
    roarGain.gain.setValueAtTime(0.0001, t);
    roarGain.gain.exponentialRampToValueAtTime(0.85, t + seconds * peakAt);
    roarGain.gain.exponentialRampToValueAtTime(0.0001, end);
    roar.connect(low).connect(roarGain).connect(this.master!);
    roar.start(t);
    roar.stop(end + 0.1);

    const crack = this.crackleFor(t, seconds, 1, peakAt);
    return {
      stop: () => {
        const now = ctx.currentTime;
        roarGain.gain.cancelScheduledValues(now);
        roarGain.gain.setTargetAtTime(0.0001, now, 0.15);
        crack.gain.cancelScheduledValues(now);
        crack.gain.setTargetAtTime(0.0001, now, 0.1);
      },
    };
  }

  private crackleFor(t: number, seconds: number, level: number, peakAt = 0.3): GainNode {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.crackle;
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + Math.max(0.05, seconds * peakAt));
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 0.4 - 0.2;
    src.connect(g).connect(pan).connect(this.master!);
    src.start(t, Math.random() * 3);
    src.stop(t + seconds + 0.1);
    return g;
  }
}

export const fireAudio = new FireAudio();
