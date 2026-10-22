import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { RefObject } from 'react';
import { prefersReducedMotion } from '@/core/motion';
import { useRevealed } from '@/core/transition';

/**
 * One orchestrated entrance per page: elements marked `data-enter` inside
 * `scope` rise a few pixels and fade in, staggered, once the page is revealed
 * (no cover over it). Nothing moves for prefers-reduced-motion.
 */
export function useEntrance(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const revealed = useRevealed();
  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;
      const targets = gsap.utils.toArray<HTMLElement>('[data-enter]', scope.current);
      if (!targets.length) return;
      if (!revealed) {
        gsap.set(targets, { autoAlpha: 0, y: 14 });
        return;
      }
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.075,
          clearProps: 'opacity,visibility,transform',
        },
      );
    },
    { scope, dependencies: [revealed, ...deps] },
  );
}
