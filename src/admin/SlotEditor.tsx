import { useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react';
import type { MediaAsset, Slot } from '@shared/schema';
import { api, ApiError } from '@/content/api';
import { TextField } from './ui';
import s from './admin.module.css';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/tiff';
const MAX_BYTES = 60 * 1024 * 1024;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Uploads one image file and reports progress; resolves with the processed asset. */
export function useImageUpload(onDone: (media: MediaAsset) => void) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const done = useRef(onDone);
  done.current = onDone; // the slot may change while a large file uploads
  const start = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is larger than 60 MB.');
      return;
    }
    setProgress(0);
    try {
      const media = await api.uploadMedia(file, setProgress);
      done.current(media);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The upload failed.');
    } finally {
      setProgress(null);
    }
  };
  return { progress, error, start };
}

/** Drop zone with a hidden (but focusable) file input; the whole box is the label. */
export function DropZone({
  progress,
  size,
  onFile,
  big,
  text = 'Drop an image or browse',
}: {
  progress: number | null;
  size?: { w: number; h: number };
  onFile: (file: File | undefined) => void;
  big?: boolean;
  text?: string;
}) {
  const [over, setOver] = useState(false);
  const busy = progress !== null;
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    onFile(e.dataTransfer.files[0]);
  };
  return (
    <label
      className={over ? `${s.drop} ${s.dropActive}` : s.drop}
      style={size && !big ? { aspectRatio: `${size.w} / ${size.h}` } : big ? { minHeight: '12rem' } : undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input type="file" accept={ACCEPT} disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
      {busy ? (
        <span>Uploading {Math.round((progress ?? 0) * 100)}%</span>
      ) : (
        <>
          <span>{text}</span>
          {size && (
            <span className={s.dropSize}>
              {size.w} × {size.h}
            </span>
          )}
        </>
      )}
      {busy && <progress className={s.progress} value={progress ?? 0} max={1} aria-label="Upload progress" />}
    </label>
  );
}

function previewUrl(media: MediaAsset) {
  return (media.webp.find((v) => v.w >= 960) ?? media.webp[media.webp.length - 1]).url;
}

/**
 * The editor for one image slot: upload by drop or browse, a preview cropped exactly
 * like the live slot, a focal point set by clicking the preview (or with the arrow
 * keys), alt text, Replace and Remove. Warns, but never blocks, on small images.
 */
export function SlotEditor({
  label,
  slot,
  onChange,
  size,
  focal = true,
  alt = true,
  removable = true,
  natural = false,
}: {
  label: string;
  slot: Slot;
  onChange: (slot: Slot) => void;
  /** Target size of the slot in design pixels (also its crop ratio). */
  size: { w: number; h: number };
  focal?: boolean;
  alt?: boolean;
  removable?: boolean;
  /** The image is shown whole at its own proportions: the preview shows its top, uncropped by any fixed ratio. */
  natural?: boolean;
}) {
  const replace = useRef<HTMLInputElement>(null);
  const { progress, error, start } = useImageUpload((media) => onChange({ ...slot, media }));
  const media = slot.media;

  // The focal point is also where the crop is anchored (object-position), so the marker sits at
  // exactly the clicked spot of the frame.
  const setFocalFromClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!focal || !media) return;
    const box = e.currentTarget.getBoundingClientRect();
    onChange({
      ...slot,
      focal: { x: clamp01((e.clientX - box.left) / box.width), y: clamp01((e.clientY - box.top) / box.height) },
    });
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 0.1 : 0.04;
    const f = { ...slot.focal };
    if (e.key === 'ArrowLeft') f.x -= step;
    else if (e.key === 'ArrowRight') f.x += step;
    else if (e.key === 'ArrowUp') f.y -= step;
    else if (e.key === 'ArrowDown') f.y += step;
    else return;
    e.preventDefault();
    onChange({ ...slot, focal: { x: clamp01(f.x), y: clamp01(f.y) } });
  };

  const marker = media ? { left: `${slot.focal.x * 100}%`, top: `${slot.focal.y * 100}%` } : null;

  return (
    <div className={s.slot}>
      <div className={s.slotHead}>
        <span className={s.slotLabel}>{label}</span>
        <span className={s.slotSize}>
          {natural ? 'any height' : `${size.w} × ${size.h}`}
        </span>
      </div>

      {media ? (
        <>
          <button
            type="button"
            className={s.preview}
            style={natural ? { aspectRatio: `${media.width} / ${media.height}`, maxHeight: '24rem' } : { aspectRatio: `${size.w} / ${size.h}` }}
            onClick={setFocalFromClick}
            onKeyDown={onKey}
            disabled={!focal}
            aria-label={
              focal
                ? `${label} preview. Click to choose which part of the image stays in view, or use the arrow keys.`
                : `${label} preview`
            }
          >
            <img
              src={previewUrl(media)}
              alt=""
              style={{ objectFit: 'cover', objectPosition: `${slot.focal.x * 100}% ${slot.focal.y * 100}%` }}
            />
            {focal && marker && <span className={s.marker} style={marker} aria-hidden="true" />}
          </button>
          {progress !== null && <progress className={s.progress} value={progress} max={1} aria-label="Upload progress" />}
          <div className={s.slotActions}>
            <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => replace.current?.click()} disabled={progress !== null}>
              Replace
            </button>
            {removable && (
              <button
                type="button"
                className={`${s.btn} ${s.btnSmall} ${s.btnQuiet}`}
                onClick={() => onChange({ ...slot, media: null })}
                disabled={progress !== null}
              >
                Remove
              </button>
            )}
            <input
              ref={replace}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                void start(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          {focal && <p className={s.fieldHint}>Click the preview to set the focal point.</p>}
          {!natural && media.width < size.w && (
            <p className={s.warn}>
              This image is {media.width} px wide and the slot is {size.w} px wide, so it may look soft on large screens.
            </p>
          )}
        </>
      ) : (
        <DropZone progress={progress} size={natural ? undefined : size} onFile={(f) => void start(f)} />
      )}

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      {alt && media && (
        <div style={{ marginTop: '0.7rem' }}>
          <TextField
            label="Alt text"
            hint="Describe the image for people who cannot see it. Leave empty if it is purely decorative."
            value={slot.alt}
            onChange={(v) => onChange({ ...slot, alt: v })}
          />
        </div>
      )}
    </div>
  );
}
