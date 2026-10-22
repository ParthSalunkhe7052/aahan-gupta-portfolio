import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MediaAsset } from '@shared/schema';
import { EscButton } from '@/components/EscButton';
import { useDialog } from '@/components/useDialog';
import styles from './ZoomViewer.module.css';

const MIN = 1;
const MAX = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Full-screen viewer on black: the largest variant, wheel or pinch to zoom
 * (1x to 4x), drag to pan, double-click toggles 2x. Escape or the ESC mark closes
 * it; focus is trapped while it is open and returned afterwards.
 */
export function ZoomViewer({ media, alt, onClose }: { media: MediaAsset; alt: string; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const view = useRef({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinch = useRef(0);
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useDialog(root, { onClose });

  const largestAvif = media.avif[media.avif.length - 1];
  const largestWebp = media.webp[media.webp.length - 1];

  /** Lay the image out to fit the stage at 1x (its size is independent of the zoom transform). */
  const fit = useCallback(() => {
    const st = stage.current;
    const el = img.current;
    if (!st || !el) return;
    const k = Math.min(st.clientWidth / media.width, st.clientHeight / media.height);
    el.style.width = `${media.width * k}px`;
    el.style.height = `${media.height * k}px`;
  }, [media.width, media.height]);

  const apply = useCallback((animate = false) => {
    const el = img.current;
    const st = stage.current;
    if (!el || !st) return;
    const v = view.current;
    const maxX = Math.max(0, (el.offsetWidth * v.s - st.clientWidth) / 2);
    const maxY = Math.max(0, (el.offsetHeight * v.s - st.clientHeight) / 2);
    v.x = clamp(v.x, -maxX, maxX);
    v.y = clamp(v.y, -maxY, maxY);
    el.style.transition = animate ? 'transform 0.35s var(--ease-out)' : 'none';
    el.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.s})`;
    setZoomed(v.s > 1.001);
  }, []);

  /** Zoom to `next`, keeping the image point under (px, py) (relative to the stage centre) fixed. */
  const zoomAt = useCallback(
    (next: number, px: number, py: number, animate = false) => {
      const v = view.current;
      const s = clamp(next, MIN, MAX);
      const k = s / v.s;
      v.x = px - k * (px - v.x);
      v.y = py - k * (py - v.y);
      v.s = s;
      if (s === MIN) {
        v.x = 0;
        v.y = 0;
      }
      apply(animate);
    },
    [apply],
  );

  const centre = () => {
    const r = stage.current!.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };

  useEffect(() => {
    fit();
    const st = stage.current;
    if (!st) return;
    const ro = new ResizeObserver(() => {
      fit();
      apply();
    });
    ro.observe(st);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { cx, cy } = centre();
      zoomAt(view.current.s * Math.exp(-e.deltaY * 0.0016), e.clientX - cx, e.clientY - cy);
    };
    st.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      ro.disconnect();
      st.removeEventListener('wheel', onWheel);
    };
  }, [fit, apply, zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    stage.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      lastPinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      if (view.current.s > MIN) {
        view.current.x += e.clientX - prev.x;
        view.current.y += e.clientY - prev.y;
        apply();
      }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch.current > 0) {
        const { cx, cy } = centre();
        zoomAt(view.current.s * (dist / lastPinch.current), (a.x + b.x) / 2 - cx, (a.y + b.y) / 2 - cy);
      }
      lastPinch.current = dist;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    lastPinch.current = 0;
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const { cx, cy } = centre();
    if (view.current.s > 1.001) zoomAt(1, 0, 0, true);
    else zoomAt(2, e.clientX - cx, e.clientY - cy, true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const v = view.current;
    if (e.key === '+' || e.key === '=') zoomAt(v.s * 1.4, 0, 0, true);
    else if (e.key === '-' || e.key === '_') zoomAt(v.s / 1.4, 0, 0, true);
    else if (e.key === '0') zoomAt(1, 0, 0, true);
    else if (v.s > 1 && e.key.startsWith('Arrow')) {
      const step = 80;
      if (e.key === 'ArrowLeft') v.x += step;
      if (e.key === 'ArrowRight') v.x -= step;
      if (e.key === 'ArrowUp') v.y += step;
      if (e.key === 'ArrowDown') v.y -= step;
      apply(true);
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return createPortal(
    <div
      ref={root}
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label={`${alt}, enlarged`}
      data-lenis-prevent
      onKeyDown={onKeyDown}
    >
      <EscButton onClick={onClose} label="Close the enlarged view" className={styles.close} />
      <div
        ref={stage}
        className={styles.stage}
        data-zoomed={zoomed ? '' : undefined}
        tabIndex={0}
        aria-describedby="zoom-help"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <picture>
          <source type="image/avif" srcSet={largestAvif.url} />
          <img
            ref={img}
            className={styles.image}
            src={largestWebp.url}
            alt={alt}
            width={media.width}
            height={media.height}
            draggable={false}
            onLoad={() => setLoaded(true)}
            style={{ backgroundColor: media.color, opacity: loaded ? 1 : 0 }}
          />
        </picture>
      </div>
      <p id="zoom-help" className={styles.help}>
        Scroll or pinch to zoom, drag to move, double-click for 2×. Press Escape to close.
      </p>
    </div>,
    document.body,
  );
}
