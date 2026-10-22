import { create } from 'zustand';

/**
 * loading  textures not ready
 * intro    poster burns into being
 * idle     poster breathes, follows the pointer
 * handoff  poster eases flat onto the video's first frame
 * burning  the video plays (poster hidden)
 * ended    frame is black; the page hands over to the transition overlay
 */
export type HeroPhase = 'loading' | 'intro' | 'idle' | 'handoff' | 'burning' | 'ended';
export type HeroTint = 'neutral' | 'art' | 'design';

interface HeroState {
  phase: HeroPhase;
  tint: HeroTint;
  /** Pointer in -1..1 across the viewport. */
  pointer: { x: number; y: number };
  /** Intro length in seconds (shorter when returning to Home). */
  introSeconds: number;
  /** Set once the first frame with the poster has rendered. */
  ready: boolean;
  /** Snap the poster exactly to rest (no residual tilt or light) before the video swap. */
  snap: boolean;
  showVideo: boolean;
  setPhase: (phase: HeroPhase) => void;
  setTint: (tint: HeroTint) => void;
  setPointer: (x: number, y: number) => void;
  reset: (introSeconds: number) => void;
}

export const useHero = create<HeroState>((set) => ({
  phase: 'loading',
  tint: 'neutral',
  pointer: { x: 0, y: 0 },
  introSeconds: 2.2,
  ready: false,
  snap: false,
  showVideo: false,
  setPhase: (phase) => set({ phase }),
  setTint: (tint) => set({ tint }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  reset: (introSeconds) =>
    set({ phase: 'loading', tint: 'neutral', pointer: { x: 0, y: 0 }, introSeconds, ready: false, snap: false, showVideo: false }),
}));
