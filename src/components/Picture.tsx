import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Focal, MediaAsset } from '@shared/schema';
import styles from './Picture.module.css';

export interface PictureProps {
  media: MediaAsset;
  /** `sizes` attribute: how wide the image is laid out at each viewport. Defaults to the full viewport. */
  sizes?: string;
  alt?: string;
  /** Point of the image kept in view when it is cropped (0..1). */
  focal?: Focal;
  fit?: 'cover' | 'contain';
  /** Above-the-fold image: loaded eagerly with high priority. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /**
   * Shape of the frame as a CSS aspect-ratio (`"1920 / 850"` or a number). Defaults to
   * the image's own shape. `"fill"` leaves sizing to the parent (the frame is 100% x 100%).
   */
  ratio?: string | number | 'fill';
  style?: CSSProperties;
}

const srcSet = (list: { w: number; url: string }[]) => list.map((v) => `${v.url} ${v.w}w`).join(', ');

/**
 * Responsive image from a MediaAsset: AVIF then WebP candidates, intrinsic
 * width/height, lazy by default. While the file loads, the blurred LQIP sits
 * on the dominant colour and fades out.
 */
export function Picture({
  media,
  sizes = '100vw',
  alt = '',
  focal,
  fit = 'cover',
  priority = false,
  className,
  imgClassName,
  ratio,
  style,
}: PictureProps) {
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // A cached image can finish before React attaches onLoad; a new asset starts unloaded.
  useEffect(() => {
    setLoaded(!!(img.current?.complete && img.current.naturalWidth > 0));
  }, [media.id]);

  const fallback = media.webp[media.webp.length - 1];
  const frame: CSSProperties = {
    backgroundColor: media.color,
    aspectRatio: ratio === 'fill' ? undefined : ratio === undefined ? `${media.width} / ${media.height}` : String(ratio),
    ...style,
  };

  return (
    <span
      className={[styles.frame, ratio === 'fill' ? styles.fill : '', className ?? ''].filter(Boolean).join(' ')}
      style={frame}
      data-loaded={loaded ? '' : undefined}
    >
      <span className={styles.lqip} style={{ backgroundImage: `url("${media.lqip}")` }} aria-hidden="true" />
      <picture>
        <source type="image/avif" srcSet={srcSet(media.avif)} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet(media.webp)} sizes={sizes} />
        <img
          ref={img}
          className={imgClassName ? `${styles.img} ${imgClassName}` : styles.img}
          src={fallback.url}
          alt={alt}
          width={media.width}
          height={media.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          style={{
            objectFit: fit,
            objectPosition: focal ? `${focal.x * 100}% ${focal.y * 100}%` : undefined,
          }}
        />
      </picture>
    </span>
  );
}
