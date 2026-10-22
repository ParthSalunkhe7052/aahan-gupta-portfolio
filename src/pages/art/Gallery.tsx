import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLink } from '@/components/ArrowLink';
import { EscLink } from '@/components/EscLink';
import { Footer } from '@/components/Footer';
import { useEntrance } from '@/components/useEntrance';
import { usePageTitle } from '@/components/usePageTitle';
import { useArtworks } from '@/content/store';
import { hasWebGL, onReducedMotionChange, prefersReducedMotion } from '@/core/motion';
import { useBurnNavigate } from '@/core/transition';
import { ArtGrid } from './ArtGrid';
import styles from './Gallery.module.css';

// three.js stays out of every other chunk: only this page loads the sphere.
const ArtSphere = lazy(() => import('@/scenes/sphere/ArtSphere'));

/** The sphere needs WebGL and motion; without either the artworks show as a plain grid. */
function usePlainGrid() {
  const [plain, setPlain] = useState(() => !hasWebGL() || prefersReducedMotion());
  useEffect(() => onReducedMotionChange((reduced) => setPlain(reduced || !hasWebGL())), []);
  return plain;
}

export default function Gallery() {
  const artworks = useArtworks();
  const go = useBurnNavigate();
  const plain = usePlainGrid();
  const main = useRef<HTMLElement>(null);
  useEntrance(main);
  usePageTitle('Gallery');
  const first = artworks[0];

  return (
    <>
      <main id="main" ref={main} className={styles.page}>
        <header className={styles.head}>
          <EscLink to="/" label="Back to home" />
          <h1 className={styles.title}>Gallery</h1>
        </header>

        {artworks.length === 0 ? (
          <p className={styles.empty}>The first paintings are on their way.</p>
        ) : plain ? (
          <div className={styles.gridWrap} data-enter>
            <ArtGrid artworks={artworks} />
          </div>
        ) : (
          <div className={styles.stage}>
            <Suspense fallback={null}>
              <ArtSphere artworks={artworks} onOpen={(slug) => go(`/art/${slug}`)} className={styles.sphere} />
            </Suspense>
            {first && (
              <div className={styles.explore} data-enter>
                <ArrowLink to={`/art/${first.slug}`}>Explore artworks</ArrowLink>
              </div>
            )}
          </div>
        )}
        {plain && first && (
          <div className={styles.exploreStatic} data-enter>
            <ArrowLink to={`/art/${first.slug}`}>Explore artworks</ArrowLink>
          </div>
        )}
      </main>
      <Footer world="art" />
    </>
  );
}
