import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router';
import type { Artwork as ArtworkItem } from '@shared/schema';
import { ArrowLink } from '@/components/ArrowLink';
import { EscLink } from '@/components/EscLink';
import { Footer } from '@/components/Footer';
import { Picture } from '@/components/Picture';
import { Svg } from '@/components/Svg';
import { useEntrance } from '@/components/useEntrance';
import { usePageTitle } from '@/components/usePageTitle';
import { useAdmin, useArtworks } from '@/content/store';
import { useBurnNavigate } from '@/core/transition';
import NotFound from '../NotFound';
import { ZoomViewer } from './ZoomViewer';
import styles from './Artwork.module.css';

export default function Artwork() {
  const { slug } = useParams();
  const artworks = useArtworks();
  const index = artworks.findIndex((a) => a.slug === slug);
  if (index < 0) return <NotFound />;
  return <Piece art={artworks[index]} prev={artworks[(index - 1 + artworks.length) % artworks.length]} next={artworks[(index + 1) % artworks.length]} />;
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

function Piece({ art, prev, next }: { art: ArtworkItem; prev: ArtworkItem; next: ArtworkItem }) {
  const main = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState(false);
  const { signedIn, openEditor } = useAdmin();
  const go = useBurnNavigate();
  useEntrance(main, [art.id]);
  usePageTitle(art.title);

  // Left and right arrow keys step through the collection (not while the viewer or a field has focus).
  const only = prev.id === art.id;
  useEffect(() => {
    if (only) return;
    const onKey = (e: KeyboardEvent) => {
      if (zoom || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(e.target)) return;
      if (e.key === 'ArrowLeft') go(`/art/${prev.slug}`);
      else if (e.key === 'ArrowRight') go(`/art/${next.slug}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, only, go, prev.slug, next.slug]);

  const paragraphs = art.description.split(/\n{2,}/).filter((p) => p.trim());
  const facts = [art.year, art.size].filter(Boolean).join(', ');

  return (
    <>
      <main id="main" ref={main} className={styles.page} style={{ '--ar': art.image.width / art.image.height } as CSSProperties}>
        <div className={styles.esc}>
          <EscLink to="/art" label="Back to the gallery" />
        </div>

        <button
          type="button"
          className={styles.zoom}
          onClick={() => setZoom(true)}
          aria-label={`Enlarge ${art.title}`}
          aria-haspopup="dialog"
        >
          <Svg name="zoom" />
        </button>

        <div className={styles.stage} data-enter>
          <div className={styles.frame}>
            <Picture
              media={art.image}
              alt={art.title}
              fit="contain"
              ratio="fill"
              priority
              sizes="(max-width: 759px) 100vw, 54vw"
            />
          </div>
        </div>

        <div className={styles.rail}>
          {paragraphs.length > 0 && (
            <div className={styles.desc} data-enter>
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          <div className={styles.titleBlock} data-enter>
            <h1 className={styles.title}>{art.title}</h1>
            {art.medium && <p className={styles.medium}>{art.medium}</p>}
            {(art.series || facts) && (
              <p className={styles.facts}>{[art.series, facts].filter(Boolean).join(', ')}</p>
            )}
            {signedIn && (
              <div className={styles.adminLine}>
                {!art.published && <span>Unpublished</span>}
                <button type="button" onClick={() => openEditor('artworks', { kind: 'edit-artwork', id: art.id })}>
                  Edit this artwork
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.zoomRail}
            onClick={() => setZoom(true)}
            aria-label={`Enlarge ${art.title}`}
            aria-haspopup="dialog"
            data-enter
          >
            <Svg name="zoom" />
          </button>

          <nav className={styles.nav} aria-label="Artwork navigation" data-enter>
            {!only && (
              <ArrowLink to={`/art/${next.slug}`} aria-label={`Next artwork: ${next.title}`}>
                Next
              </ArrowLink>
            )}
            <ArrowLink to="/art">Gallery</ArrowLink>
          </nav>
        </div>
      </main>
      <Footer world="art" />
      {zoom && (
        <ZoomViewer
          media={art.image}
          alt={art.title}
          onClose={() => {
            setZoom(false);
          }}
        />
      )}
    </>
  );
}
