import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useSite } from '@/content/store';
import { ErrorBoundary } from '@/core/ErrorBoundary';
import { Logo } from '@/components/Logo';
import { Svg, type SvgName } from '@/components/Svg';
import { BurnLink, useBurnNavigate, useHandoffNavigate, useRevealed } from '@/core/transition';
import { fireAudio, useSound } from '@/core/audio/fire';
import { hasWebGL, prefersReducedMotion } from '@/core/motion';
import { useMediaQuery } from '@/core/useMediaQuery';
import { FRAME, MEDIA, POSTER, VIDEO_CUES, pickVideoSrc } from '@/scenes/hero/frame';
import { useHero } from '@/scenes/hero/heroStore';
import styles from './Home.module.css';

gsap.registerPlugin(SplitText, useGSAP);

const HeroCanvas = lazy(() => import('@/scenes/hero/HeroCanvas'));

/** The long intro plays on the first visit; returning to Home later is quicker. */
let firstVisit = true;

const DESKTOP = '(min-width: 1000px) and (min-aspect-ratio: 5/4)';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const nextFrames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });

function whenPlayable(video: HTMLVideoElement, timeout = 6000): Promise<boolean> {
  if (video.readyState >= 3) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      video.removeEventListener('canplay', yes);
      video.removeEventListener('error', no);
      clearTimeout(timer);
      resolve(ok);
    };
    const yes = () => done(true);
    const no = () => done(false);
    const timer = setTimeout(() => done(video.readyState >= 3), timeout);
    video.addEventListener('canplay', yes);
    video.addEventListener('error', no);
  });
}

/** Resolves once the decoder has presented a frame after play(). */
function firstFrame(video: HTMLVideoElement): Promise<void> {
  if (typeof video.requestVideoFrameCallback === 'function') {
    return new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
  }
  return new Promise((resolve) => {
    const check = () => (video.currentTime > 0 ? resolve() : requestAnimationFrame(check));
    check();
  });
}

/** Fire-lit text: it glows, then smoulders away. Used as the flames reach each element. */
const SMOULDER: gsap.TweenVars = {
  keyframes: [
    { color: '#ffb35c', textShadow: '0 0 14px rgba(255,120,30,0.85)', duration: 0.35, ease: 'power1.in' },
    { opacity: 0, y: -8, filter: 'blur(5px)', textShadow: '0 0 24px rgba(255,90,20,0)', duration: 0.7, ease: 'power2.in' },
  ],
};

export default function Home() {
  const site = useSite();
  const revealed = useRevealed();
  const go = useBurnNavigate();
  const handoff = useHandoffNavigate();
  const { muted, toggle } = useSound();
  const desktop = useMediaQuery(DESKTOP);
  // A canvas that throws (texture 404, lost chunk) or never gets ready drops the page to the no-WebGL path.
  const [glFailed, setGlFailed] = useState(false);
  const webgl = useMemo(hasWebGL, []) && !glFailed;

  const root = useRef<HTMLElement>(null);
  const posterWindow = useRef<HTMLDivElement>(null);
  const [canvasBox, setCanvasBox] = useState<React.CSSProperties | undefined>();
  const burning = useRef(false);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const stopSound = useRef<() => void>(() => {});

  /* ---------- video element (lives outside the DOM; WebGL draws it) ---------- */

  const video = useMemo(() => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'none';
    v.disablePictureInPicture = true;
    return v;
  }, []);

  const loadVideo = useCallback(() => {
    if (video.src) return;
    const wide = window.innerWidth * (window.devicePixelRatio || 1) > 1500;
    video.src = pickVideoSrc(video, wide);
    video.preload = 'auto';
    video.load();
  }, [video]);

  useEffect(
    () => () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    },
    [video],
  );

  /* ---------- hero lifecycle ---------- */

  useEffect(() => {
    useHero.getState().reset(1.4);
    return () => {
      timeline.current?.kill();
      stopSound.current();
      useHero.getState().reset(1.4);
    };
  }, []);

  const ready = useHero((s) => s.ready);
  const phase = useHero((s) => s.phase);

  // Never wait forever for the poster: after 8 s fall back to the still image.
  useEffect(() => {
    if (!webgl) return;
    const t = setTimeout(() => {
      if (!useHero.getState().ready) setGlFailed(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [webgl]);

  // The canvas drove the intro; without it, settle the page ourselves so the doors appear.
  useEffect(() => {
    if (glFailed && useHero.getState().phase === 'intro') useHero.getState().setPhase('idle');
  }, [glFailed]);

  // Once the intro has settled, fetch the next pages' code so the burn never waits on a download.
  useEffect(() => {
    if (phase !== 'idle') return;
    const prefetch = () => {
      void import('@/pages/design/ProjectIndex');
      void import('@/pages/art/Gallery');
      void import('@/scenes/sphere/ArtSphere');
    };
    const id = 'requestIdleCallback' in window ? window.requestIdleCallback(prefetch, { timeout: 3000 }) : setTimeout(prefetch, 1500);
    return () => ('cancelIdleCallback' in window ? window.cancelIdleCallback(id as number) : clearTimeout(id));
  }, [phase]);

  // Start the intro once the poster texture is on screen and the page is uncovered.
  useEffect(() => {
    if (!revealed) return;
    if (webgl && !ready) return;
    if (useHero.getState().phase !== 'loading') return;
    useHero.setState({ introSeconds: firstVisit ? 2.4 : 1.4 });
    firstVisit = false;
    useHero.getState().setPhase(webgl ? 'intro' : 'idle');
    fireAudio.ignite(); // silent until a gesture has unlocked audio (e.g. arriving from another page)
    const t = setTimeout(loadVideo, 900);
    return () => clearTimeout(t);
  }, [revealed, ready, webgl, loadVideo]);

  // Mobile: the canvas covers the whole video frame, scaled so its poster fills the poster window.
  useLayoutEffect(() => {
    if (desktop) {
      setCanvasBox(undefined);
      return;
    }
    const win = posterWindow.current;
    const host = root.current;
    if (!win || !host) return;
    const measure = () => {
      const s = win.offsetWidth / POSTER.w;
      setCanvasBox({
        left: win.offsetLeft - POSTER.x * s,
        top: win.offsetTop - POSTER.y * s,
        width: FRAME.w * s,
        height: FRAME.h * s,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(win);
    return () => ro.disconnect();
  }, [desktop]);

  // Pointer parallax for the poster.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      useHero.getState().setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  /* ---------- entrance ---------- */

  useGSAP(
    () => {
      if (phase !== 'intro' && !(phase === 'idle' && !webgl)) return;
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(q('[data-enter], [data-split]'), { autoAlpha: 1, clipPath: 'none' });
        return;
      }
      const tl = gsap.timeline({ delay: useHero.getState().introSeconds * 0.35 });
      tl.fromTo(q('[data-enter="icon"]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out' });
      // Lines rise out of masks; the split is undone afterwards so the burn's glow is not clipped.
      const split = SplitText.create(q('[data-split]'), { type: 'lines', mask: 'lines' });
      tl.set(q('[data-split]'), { autoAlpha: 1 }, 0);
      tl.from(split.lines, { yPercent: 105, duration: 0.9, stagger: 0.06, ease: 'power3.out', onComplete: () => split.revert() }, 0.1);
      tl.fromTo(q('[data-enter="fade"]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, stagger: 0.12 }, 0.45);
      tl.fromTo(q('[data-enter="rule"]'), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.9, ease: 'power3.inOut' }, 0.7);
      tl.fromTo(
        q('[data-enter="sign"]'),
        { clipPath: 'inset(0 100% 0 0)', autoAlpha: 1 },
        { clipPath: 'inset(0 0% 0 0)', duration: 1.3, ease: 'power2.inOut' },
        1.0,
      );
      tl.fromTo(q('[data-enter="door"]'), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, 0.9);
    },
    { scope: root, dependencies: [phase === 'intro' || (phase === 'idle' && !webgl)] },
  );

  /* ---------- the burn ---------- */

  const burnTo = useCallback(
    async (to: string) => {
      if (burning.current) return;
      burning.current = true;
      void fireAudio.unlock();

      if (prefersReducedMotion()) {
        go(to, 'veil');
        return;
      }
      if (!webgl) {
        go(to, 'burn');
        return;
      }

      const hero = useHero.getState();
      fireAudio.ignite();
      hero.setTint(to === '/art' ? 'art' : 'design');
      hero.setPhase('handoff');
      loadVideo();

      const settled = sleep(520);
      const playable = await whenPlayable(video);
      await settled;
      if (!playable) {
        // No video (network or codec): burn with the shader instead.
        go(to, 'burn');
        return;
      }

      useHero.setState({ snap: true });
      await nextFrames(2);
      video.currentTime = 0;
      video.playbackRate = 1;
      try {
        await video.play();
      } catch {
        go(to, 'burn');
        return;
      }
      await firstFrame(video);
      await nextFrames(2); // the texture upload lands on the next render
      useHero.setState({ showVideo: true });
      hero.setPhase('burning');

      const q = gsap.utils.selector(root);
      const tl = gsap.timeline();
      timeline.current = tl;
      tl.call(() => {
        stopSound.current = fireAudio.burn(5.4, 0.42).stop;
      }, [], VIDEO_CUES.ignite - 0.2);
      tl.to(q('[data-burn="door"]'), { ...SMOULDER, stagger: 0.12 }, 0.9);
      tl.to(q('[data-burn="icon"]'), { ...SMOULDER, stagger: { each: 0.14, from: 'end' } }, 1.9);
      tl.to(q('[data-burn="rail"]'), { ...SMOULDER, stagger: { each: 0.22, from: 'end' } }, 2.3);
      tl.to(q('[data-burn="chrome"]'), { autoAlpha: 0, duration: 0.6 }, 2.0);

      const finish = () => {
        if (useHero.getState().phase === 'ended') return;
        useHero.getState().setPhase('ended');
        handoff(to);
      };
      video.addEventListener('ended', finish, { once: true });
      tl.call(finish, [], VIDEO_CUES.end + 0.4); // safety net if `ended` never fires
    },
    [go, handoff, loadVideo, video, webgl],
  );

  // While burning, a click or Escape hurries the fire along.
  useEffect(() => {
    if (phase !== 'burning') return;
    const hurry = () => {
      video.playbackRate = 3;
      timeline.current?.timeScale(3);
      stopSound.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hurry();
    window.addEventListener('pointerdown', hurry);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', hurry);
      window.removeEventListener('keydown', onKey);
    };
  }, [phase, video]);

  /* ---------- render ---------- */

  const c = site.contact;
  const phoneHref = `tel:${c.phone.replace(/[^\d+]/g, '')}`;
  const icons: { name: SvgName; label: string; href: string; internal?: boolean }[] = [
    { name: 'instagram', label: 'Instagram', href: c.instagram },
    { name: 'behance', label: 'Behance', href: c.behance },
    { name: 'linkedin', label: 'LinkedIn', href: c.linkedin },
    { name: 'mail', label: `Email ${c.email}`, href: `mailto:${c.email}` },
    { name: 'contact', label: `Call ${c.phone}`, href: phoneHref },
    { name: 'cv', label: 'CV', href: site.cv.pdf || '/cv', internal: !site.cv.pdf },
  ];

  const doorProps = (to: '/design/branding' | '/art') => ({
    type: 'button' as const,
    'data-enter': 'door',
    'data-burn': 'door',
    className: styles.door,
    onClick: () => void burnTo(to),
    onPointerEnter: () => useHero.getState().setTint(to === '/art' ? 'art' : 'design'),
    onPointerLeave: () => !burning.current && useHero.getState().setTint('neutral'),
    onFocus: () => useHero.getState().setTint(to === '/art' ? 'art' : 'design'),
    onBlur: () => !burning.current && useHero.getState().setTint('neutral'),
  });

  const iconList = (
    <ul className={styles.icons}>
      {icons.map((i) => (
        <li key={i.name} data-enter="icon" data-burn="icon">
          {i.internal ? (
            <BurnLink to={i.href} aria-label={i.label} data-label={i.label} className={styles.icon}>
              <Svg name={i.name} />
            </BurnLink>
          ) : (
            <a
              href={i.href}
              aria-label={i.label}
              data-label={i.label}
              className={styles.icon}
              {...(i.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <Svg name={i.name} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );

  const doors = (
    <div className={styles.doors}>
      <button {...doorProps('/design/branding')}>
        Design <Svg name="arrow" className={styles.arrow} />
      </button>
      <button {...doorProps('/art')}>
        Art <Svg name="arrow" className={styles.arrow} />
      </button>
    </div>
  );

  const collection = (
    <div className={styles.collection}>
      <span className={styles.rule} data-enter="rule" data-burn="rail" aria-hidden="true" />
      <p data-enter="fade" data-burn="rail">
        {site.collection}
        <br />
        <em className={styles.byline}>by {site.name}</em>
      </p>
      <div className={styles.signature} data-enter="sign" data-burn="rail">
        <Logo tone="red" />
      </div>
    </div>
  );

  const canvas = webgl && (
    <div className={styles.canvasBox} style={canvasBox}>
      <ErrorBoundary fallback={null} onError={() => setGlFailed(true)}>
        <Suspense fallback={null}>
          <HeroCanvas video={video} compact={!desktop} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );

  const soundButton = (
    <button type="button" className={styles.sound} onClick={toggle} aria-pressed={!muted} data-burn="chrome">
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  );

  return (
    <main id="main" ref={root} className={styles.home} data-layout={desktop ? 'desktop' : 'mobile'} data-phase={phase}>
      <h1 className="visually-hidden">
        {site.name}: {site.role}
      </h1>
      {desktop ? (
        <>
          <div className={styles.stage}>
            {!webgl && <img className={styles.still} src={MEDIA.still} alt="" />}
            {canvas}
            <nav aria-label="Elsewhere" className={styles.iconCol}>
              {iconList}
            </nav>
            <div className={styles.rail}>
              <p className={styles.statement} data-split data-burn="rail">
                {site.statement}
              </p>
              <p className={styles.practice} data-enter="fade" data-burn="rail">
                {site.practice}
              </p>
            </div>
            {collection}
            <nav aria-label="Choose a body of work">{doors}</nav>
          </div>
          {soundButton}
        </>
      ) : (
        <>
          {canvas}
          <div ref={posterWindow} className={styles.posterWindow}>
            {!webgl && <img className={styles.still} src={MEDIA.still} alt="" />}
          </div>
          <div className={styles.mobileBody}>
            <nav aria-label="Choose a body of work">{doors}</nav>
            {collection}
            <nav aria-label="Elsewhere">{iconList}</nav>
            {soundButton}
          </div>
        </>
      )}
    </main>
  );
}
