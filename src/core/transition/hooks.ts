import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { worldOf } from '@shared/model';
import { fireAudio } from '@/core/audio/fire';
import { prefersReducedMotion } from '@/core/motion';
import { useTransitionStore, type TransitionKind } from './store';

export type LinkKind = TransitionKind | 'auto';

/** `auto` burns when the world changes (Home ↔ Design ↔ Art) and veils otherwise. */
export function resolveKind(kind: LinkKind, from: string, to: string): TransitionKind {
  if (prefersReducedMotion()) return kind === 'none' ? 'none' : 'veil';
  if (kind !== 'auto') return kind;
  const target = to.split(/[?#]/)[0];
  if (target === from) return 'none';
  return worldOf(from) === worldOf(target) ? 'veil' : 'burn';
}

/** Navigate behind a burn/veil cover. Returns `(to, kind = 'auto') => void`. */
export function useBurnNavigate() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const start = useTransitionStore((s) => s.start);
  return useCallback(
    (to: string, kind: LinkKind = 'auto') => {
      // Called from a click, so this counts as the gesture that allows audio.
      void fireAudio.unlock();
      start(resolveKind(kind, pathname, to), () => navigate(to));
    },
    [navigate, pathname, start],
  );
}

/** True once the current page is visible (no cover over it). Start entrance timelines on this. */
export function useRevealed() {
  return useTransitionStore((s) => s.revealed);
}

/**
 * Start a transition whose cover is already in place: the caller has left the
 * screen black itself (the Home poster burn) and only needs the reveal.
 */
export function useHandoffNavigate() {
  const navigate = useNavigate();
  const start = useTransitionStore((s) => s.start);
  return useCallback(
    (to: string) => start(prefersReducedMotion() ? 'veil' : 'burn', () => navigate(to), { instant: true }),
    [navigate, start],
  );
}
