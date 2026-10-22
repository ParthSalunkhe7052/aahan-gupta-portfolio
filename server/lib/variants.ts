/**
 * Responsive image generation shared by the seed build (scripts/build-media.ts)
 * and admin uploads (server routes). One decode per source: the image is decoded
 * once to raw pixels at the largest needed width, then every AVIF/WebP width is
 * cut from that buffer.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { MediaAsset } from '../../shared/schema.ts';

export const DEFAULT_WIDTHS = [480, 960, 1440, 1920, 2560];

export interface VariantJob {
  id: string;
  input: string | Buffer;
  /** Directory that receives `<w>.avif` / `<w>.webp` for this asset. */
  outDir: string;
  /** Public URL prefix for `outDir`, e.g. `/media/art/p-01`. */
  urlBase: string;
  widths?: number[];
  avifQuality?: number;
  webpQuality?: number;
}

/** Widths below the source width, plus the source width itself when it is smaller than the largest requested width. */
export function pickWidths(sourceWidth: number, requested = DEFAULT_WIDTHS): number[] {
  const max = Math.max(...requested);
  const out = requested.filter((w) => w < sourceWidth);
  const top = Math.min(sourceWidth, max);
  if (!out.includes(top)) out.push(top);
  return out.sort((a, b) => a - b);
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

export async function buildVariants(job: VariantJob): Promise<MediaAsset> {
  const meta = await sharp(job.input, { failOn: 'error' }).metadata();
  if (!meta.width || !meta.height) throw new Error(`Cannot read image size for ${job.id}`);

  // EXIF orientations 5–8 swap the axes once `.rotate()` applies them.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;

  const widths = pickWidths(width, job.widths);
  const maxW = widths[widths.length - 1];

  const { data, info } = await sharp(job.input, { failOn: 'error' })
    .rotate()
    .resize({ width: maxW, withoutEnlargement: true })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const raw = { raw: { width: info.width, height: info.height, channels: info.channels } } as const;
  const fromRaw = () => sharp(data, raw);

  await mkdir(job.outDir, { recursive: true });

  const avif: MediaAsset['avif'] = [];
  const webp: MediaAsset['webp'] = [];
  for (const w of widths) {
    const resized = () => (w === info.width ? fromRaw() : fromRaw().resize({ width: w }));
    await resized()
      .avif({ quality: job.avifQuality ?? 52, effort: 4, chromaSubsampling: '4:2:0' })
      .toFile(path.join(job.outDir, `${w}.avif`));
    await resized()
      .webp({ quality: job.webpQuality ?? 80, effort: 4, smartSubsample: true })
      .toFile(path.join(job.outDir, `${w}.webp`));
    avif.push({ w, url: `${job.urlBase}/${w}.avif` });
    webp.push({ w, url: `${job.urlBase}/${w}.webp` });
  }

  const lqipBuf = await fromRaw().resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
  const { dominant } = await fromRaw().resize({ width: 64 }).stats();

  return {
    id: job.id,
    width,
    height,
    color: `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`,
    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
    avif,
    webp,
  };
}
