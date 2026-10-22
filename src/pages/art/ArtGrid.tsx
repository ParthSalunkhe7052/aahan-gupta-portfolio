import type { Artwork } from '@shared/schema';
import { Picture } from '@/components/Picture';
import { BurnLink } from '@/core/transition';
import styles from './ArtGrid.module.css';

/**
 * Plain grid of the artworks: the Gallery uses it when WebGL is unavailable or
 * the visitor prefers reduced motion. Every card is an ordinary link.
 */
export function ArtGrid({ artworks }: { artworks: Artwork[] }) {
  return (
    <ul className={styles.grid}>
      {artworks.map((a, i) => (
        <li key={a.id}>
          <BurnLink to={`/art/${a.slug}`} className={styles.card} aria-label={a.title}>
            <Picture
              media={a.image}
              alt=""
              fit="contain"
              ratio="4 / 5"
              sizes="(max-width: 759px) 46vw, 20vw"
              priority={i < 4}
              className={styles.picture}
            />
            <span className={styles.caption}>{a.title}</span>
          </BurnLink>
        </li>
      ))}
    </ul>
  );
}
