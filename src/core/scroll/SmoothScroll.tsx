import { useEffect } from 'react';
import { useLocation } from 'react-router';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/core/motion';
import { useTransitionStore } from '@/core/transition/store';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** The active Lenis instance (null when reduced motion disables smooth scrolling). */
export function getLenis(): Lenis | null {
  return lenis;
}

export function useLenis(): Lenis | null {
  return lenis;
}

/** Pause/resume page scrolling (modals, the admin drawer, transitions). Reference-counted. */
let locks = 0;
export function lockScroll() {
  locks++;
  lenis?.stop();
  document.documentElement.classList.add('scroll-locked');
}
export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  lenis?.start();
  document.documentElement.classList.remove('scroll-locked');
}

/**
 * Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger and Lenis
 * share one clock. Scrollable panels inside the page need `data-lenis-prevent`.
 */
export function SmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const instance = new Lenis({ autoRaf: false, lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis = instance;
    instance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis = null;
    };
  }, []);

  // New route: start at the top (the change happens under the transition cover).
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [pathname]);

  // No scrolling while a cover is up.
  useEffect(
    () =>
      useTransitionStore.subscribe((s, prev) => {
        if (s.phase === 'cover' && prev.phase !== 'cover') lockScroll();
        if (prev.phase === 'cover' && s.phase !== 'cover') unlockScroll();
      }),
    [],
  );

  return null;
}
