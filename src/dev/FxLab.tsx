/**
 * Development-only lab for tuning the fire effects (route /__lab, never in production builds).
 * Triggers page transitions over sample content and drives the hero scene directly.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { gsap } from 'gsap';
import { useTransitionStore } from '@/core/transition/store';
import { fireAudio } from '@/core/audio/fire';
import { useHero } from '@/scenes/hero/heroStore';
import { pickVideoSrc } from '@/scenes/hero/frame';
import type { Content } from '@shared/schema';
import seed from '../../seed/content.json';

const HeroCanvas = lazy(() => import('@/scenes/hero/HeroCanvas'));
const ArtSphere = lazy(() => import('@/scenes/sphere/ArtSphere'));

function fakeTransition(kind: 'burn' | 'veil', instant = false) {
  void fireAudio.unlock();
  useTransitionStore.getState().start(
    kind,
    () => setTimeout(() => useTransitionStore.getState().routeMounted(), 60),
    { instant },
  );
}

export default function FxLab() {
  const [world, setWorld] = useState<'art' | 'design'>('art');
  const phase = useHero((s) => s.phase);
  const video = useMemo(() => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = pickVideoSrc(v, true);
    return v;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.world = world;
  }, [world]);

  useEffect(() => {
    useHero.getState().reset(2.4);
    // Same as the app (SmoothScroll): keep GSAP on real time when frames are sparse.
    gsap.ticker.lagSmoothing(0);
    (window as unknown as { __fx: unknown }).__fx = { transition: useTransitionStore, hero: useHero };
  }, []);

  const playBurn = async () => {
    void fireAudio.unlock();
    fireAudio.ignite();
    useHero.getState().setPhase('handoff');
    await new Promise((r) => setTimeout(r, 520));
    useHero.setState({ snap: true });
    video.currentTime = 0;
    await video.play();
    await new Promise<void>((r) => video.requestVideoFrameCallback(() => r()));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    useHero.setState({ showVideo: true });
    useHero.getState().setPhase('burning');
    setTimeout(() => fireAudio.burn(5.4, 0.42), 650);
  };

  const btn: React.CSSProperties = { padding: '6px 12px', border: '1px solid currentColor', marginRight: 8, marginBottom: 8 };

  if (new URLSearchParams(location.search).has('sphere')) {
    return (
      <main style={{ height: '100vh', background: '#000', padding: '6vh 8vw' }}>
        <Suspense fallback={null}>
          <ArtSphere artworks={(seed as unknown as Content).artworks} onOpen={(slug) => console.log('open', slug)} />
        </Suspense>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <div style={{ position: 'relative', zIndex: 5 }}>
        <button style={btn} onClick={() => fakeTransition('burn')}>Burn transition</button>
        <button style={btn} onClick={() => fakeTransition('burn', true)}>Instant + reveal</button>
        <button style={btn} onClick={() => fakeTransition('veil')}>Veil transition</button>
        <button style={btn} onClick={() => setWorld(world === 'art' ? 'design' : 'art')}>World: {world}</button>
        <button style={btn} onClick={() => { useHero.getState().reset(2.4); setTimeout(() => useHero.getState().setPhase('intro'), 50); }}>Hero intro</button>
        <button style={btn} onClick={() => void playBurn()}>Hero burn</button>
        <button style={btn} onClick={() => useHero.getState().setTint('art')}>Tint art</button>
        <button style={btn} onClick={() => useHero.getState().setTint('design')}>Tint design</button>
        <span data-testid="phase">phase: {phase}</span>
      </div>
      <div style={{ position: 'relative', width: 'min(100%, 1280px)', aspectRatio: '16 / 9', marginTop: 12 }}>
        <Suspense fallback={null}>
          <HeroCanvas video={video} />
        </Suspense>
      </div>
      <section style={{ marginTop: 24, maxWidth: 720 }}>
        <h2 style={{ fontStyle: 'italic', fontSize: 'var(--step-3)', color: 'var(--title)' }}>Lost Identity</h2>
        <p>
          A woman draped in ceremonial red holds wheat stalks framing a face that has been pixelated into absence. The
          adornments remain: bangles, rings, the careful dress of a woman prepared to be seen.
        </p>
        <img src="/media/art/p-01/960.webp" alt="" style={{ width: 360, marginTop: 16 }} />
      </section>
    </main>
  );
}
