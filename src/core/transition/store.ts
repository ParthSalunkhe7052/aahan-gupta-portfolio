/**
 * Page transition state machine.
 *
 *   idle ─start()─▶ cover ─covered()─▶ (route changes, page mounts) ─beginReveal()─▶ reveal ─done()─▶ idle
 *
 * `cover` hides the outgoing page (the burn sweeps up and leaves char behind).
 * The route changes under the cover; once the incoming route has mounted the
 * overlay lifts (`reveal`). `instant` starts already covered: used when the
 * outgoing page has burned itself away (the Home poster video).
 */
import { create } from 'zustand';

export type TransitionKind = 'burn' | 'veil' | 'none';
export type TransitionPhase = 'idle' | 'cover' | 'reveal';

interface StartOptions {
  instant?: boolean;
}

interface TransitionState {
  phase: TransitionPhase;
  kind: TransitionKind;
  instant: boolean;
  /** Bumped for every transition so listeners can tell runs apart. */
  run: number;
  /** True once the pending navigation has been applied. */
  navigated: boolean;
  /** Bumped each time a route element mounts (see `RouteMounted`). */
  mounts: number;
  /** False while the current page is hidden under a cover. */
  revealed: boolean;
  pending: (() => void) | null;
  start: (kind: TransitionKind, navigate: () => void, opts?: StartOptions) => void;
  covered: () => void;
  beginReveal: () => void;
  done: () => void;
  routeMounted: () => void;
}

export const useTransitionStore = create<TransitionState>((set, get) => ({
  phase: 'idle',
  kind: 'none',
  instant: false,
  run: 0,
  navigated: false,
  mounts: 0,
  revealed: true,
  pending: null,
  start: (kind, navigate, opts) => {
    if (get().phase !== 'idle') return;
    if (kind === 'none') {
      navigate();
      return;
    }
    set((s) => ({
      phase: 'cover',
      kind,
      instant: !!opts?.instant,
      run: s.run + 1,
      navigated: false,
      revealed: false,
      pending: navigate,
    }));
  },
  covered: () => {
    const { pending } = get();
    set({ pending: null });
    pending?.();
    set({ navigated: true });
  },
  beginReveal: () => set({ phase: 'reveal', revealed: true }),
  done: () => set({ phase: 'idle', kind: 'none', instant: false, navigated: false }),
  routeMounted: () => set((s) => ({ mounts: s.mounts + 1 })),
}));
