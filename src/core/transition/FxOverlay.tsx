import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { createBurnRenderer, type BurnRenderer, type BurnUniforms } from '@/fx/burnRenderer';
import { fireAudio } from '@/core/audio/fire';
import { useTransitionStore, type TransitionKind } from './store';
import styles from './FxOverlay.module.css';

const TIMING = {
  burn: { cover: 1.05, reveal: 1.25 },
  veil: { cover: 0.42, reveal: 0.55 },
} as const;

const MODE = { burnCover: 0, burnReveal: 1, veilCover: 2, veilReveal: 3 } as const;

const CHAR: BurnUniforms['char'] = [0.022, 0.012, 0.008];

/** Waits until a route mounted after `since` (plus two painted frames), or the timeout passes. */
function waitForRoute(since: number, timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      unsub();
      clearTimeout(timer);
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };
    const unsub = useTransitionStore.subscribe((s) => {
      if (s.mounts > since) finish();
    });
    const timer = setTimeout(finish, timeout);
    if (useTransitionStore.getState().mounts > since) finish();
  });
}

/** Veils take the colour of the world being left: paper on Design, black elsewhere. */
function veilColour(): BurnUniforms['char'] {
  return document.documentElement.dataset.world === 'design' ? [0.937, 0.937, 0.937] : [0, 0, 0];
}

/**
 * The full-screen transition layer: one WebGL canvas, idle (not rendering)
 * between transitions. Without WebGL (or after the context is lost) it falls
 * back to a plain fade. It must never trap the visitor: whatever goes wrong, the
 * pending navigation still happens and the overlay and scroll lock are released.
 */
export function FxOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const fallback = fallbackRef.current!;
    // Dev keeps the drawing buffer so the tuning hook below can read frames back.
    // Reassigned when the GPU context is lost (null: plain fade) and restored (rebuilt).
    let gl: BurnRenderer | null = createBurnRenderer(canvas, import.meta.env.DEV);

    const u: BurnUniforms = { time: 0, progress: 0, mode: 0, seed: 0, origin: [0.5, 0.48], char: CHAR };

    const resize = () => {
      // The effect is soft; three-quarter resolution keeps it cheap on large screens.
      gl?.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 1) * 0.75);
    };
    resize();
    window.addEventListener('resize', resize);

    let startedAt = 0;
    let drawing = false;
    const draw = () => {
      u.time = (performance.now() - startedAt) / 1000;
      gl?.render(u);
    };
    const startDrawing = () => {
      if (drawing) return;
      drawing = true;
      startedAt = performance.now();
      gsap.ticker.add(draw);
    };
    const stopDrawing = () => {
      drawing = false;
      gsap.ticker.remove(draw);
      gl?.clear();
    };

    const setVisible = (on: boolean, blocking: boolean) => {
      const shown = gl ? canvas : fallback;
      for (const el of [canvas, fallback]) {
        const active = on && el === shown;
        el.style.visibility = active ? 'visible' : 'hidden';
        el.style.pointerEvents = active && blocking ? 'auto' : 'none';
      }
    };

    // Context loss: keep the page covered with the plain fade for what is left of this transition,
    // then use it for later ones until the context comes back.
    const onLost = (e: Event) => {
      e.preventDefault(); // allows webglcontextrestored
      gl = null;
      if (!drawing) return;
      fallback.style.backgroundColor = `rgb(${u.char.map((c) => Math.round(c * 255)).join(',')})`;
      gsap.set(fallback, { opacity: 1 });
      canvas.style.visibility = 'hidden';
      fallback.style.visibility = 'visible';
      fallback.style.pointerEvents = 'auto';
    };
    const onRestored = () => {
      gl = createBurnRenderer(canvas, import.meta.env.DEV);
      resize();
      if (gl && !drawing) setVisible(false, false);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    let tl: gsap.core.Timeline | null = null;
    const tween = (target: object, vars: gsap.TweenVars) =>
      new Promise<void>((resolve) => {
        tl = gsap.timeline({ onComplete: resolve });
        tl.to(target, vars);
      });

    const run = async (kind: TransitionKind, instant: boolean) => {
      try {
        await play(kind, instant);
      } catch (err) {
        console.error(err);
        tl?.kill();
        const s = useTransitionStore.getState();
        if (s.pending) s.covered(); // still go where the visitor asked to go
        s.beginReveal(); // lifts the scroll lock
        s.done();
        stopDrawing();
        setVisible(false, false);
        gsap.set(fallback, { opacity: 0 });
      }
    };

    const play = async (kind: TransitionKind, instant: boolean) => {
      const store = useTransitionStore.getState();
      const mountsAtStart = store.mounts;
      const timing = kind === 'burn' ? TIMING.burn : TIMING.veil;
      tl?.kill();
      setVisible(true, true);

      if (!gl) {
        const colour = kind === 'veil' ? veilColour() : CHAR;
        fallback.style.backgroundColor = `rgb(${colour.map((c) => Math.round(c * 255)).join(',')})`;
        if (instant) gsap.set(fallback, { opacity: 1 });
        else await tween(fallback, { opacity: 1, duration: 0.35 });
        store.covered();
        await waitForRoute(mountsAtStart);
        useTransitionStore.getState().beginReveal();
        await tween(fallback, { opacity: 0, duration: 0.45 });
        setVisible(false, false);
        useTransitionStore.getState().done();
        return;
      }

      u.seed = Math.random() * 100;
      u.char = kind === 'veil' ? veilColour() : CHAR;
      u.mode = kind === 'burn' ? MODE.burnCover : MODE.veilCover;
      u.progress = instant ? 1 : 0;
      startDrawing();

      if (instant) {
        draw();
      } else {
        if (kind === 'burn') fireAudio.burn(timing.cover + timing.reveal * 0.6, 0.35);
        await tween(u, { progress: 1, duration: timing.cover, ease: kind === 'burn' ? 'power1.in' : 'power2.inOut' });
      }

      useTransitionStore.getState().covered();
      await waitForRoute(mountsAtStart);

      u.mode = kind === 'burn' ? MODE.burnReveal : MODE.veilReveal;
      u.progress = 0;
      u.origin = [0.5, 0.48];
      useTransitionStore.getState().beginReveal();
      setVisible(true, false);
      // The hole smoulders open, then the fire races outward.
      await tween(u, { progress: 1, duration: timing.reveal, ease: kind === 'burn' ? 'power1.inOut' : 'power2.inOut' });

      stopDrawing();
      setVisible(false, false);
      useTransitionStore.getState().done();
    };

    const unsub = useTransitionStore.subscribe((s, prev) => {
      if (s.phase === 'cover' && s.run !== prev.run) void run(s.kind, s.instant);
    });

    // Back or Forward while covered: the router has already gone there, so drop the queued
    // navigation instead of letting it push the page the visitor just left on top of it.
    const onPop = () => {
      if (useTransitionStore.getState().phase === 'cover') useTransitionStore.setState({ pending: null });
    };
    window.addEventListener('popstate', onPop);

    if (import.meta.env.DEV && gl) {
      const live = gl;
      // Tuning hook for the effects lab: render one frame at an exact mode/progress/time and
      // mirror it into an <img>, because a hidden preview pane does not re-composite the canvas.
      (window as unknown as { __fxFrame: unknown }).__fxFrame = (mode: number | null, progress = 0, time = 1) => {
        let shot = document.getElementById('__fxShot') as HTMLImageElement | null;
        if (mode === null) {
          shot?.remove();
          return;
        }
        if (!shot) {
          shot = document.createElement('img');
          shot.id = '__fxShot';
          shot.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:101;pointer-events:none';
          document.body.appendChild(shot);
        }
        live.render({ ...u, mode, progress, time, char: mode >= 2 ? veilColour() : CHAR });
        shot.src = canvas.toDataURL('image/png');
      };
    }

    return () => {
      unsub();
      tl?.kill();
      stopDrawing();
      window.removeEventListener('resize', resize);
      window.removeEventListener('popstate', onPop);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      gl?.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div ref={fallbackRef} className={styles.fallback} aria-hidden="true" />
    </>
  );
}
