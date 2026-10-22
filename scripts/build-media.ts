/**
 * Turns the designer's handover files (source-assets/, extracted from the zips)
 * into web-ready media under public/media, and writes src/content/seed-media.json
 * (one MediaAsset per id) for the seed content.
 *
 *   npm run media            build what is missing
 *   npm run media -- --force rebuild everything
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Region } from 'sharp';
import type { MediaAsset } from '../shared/schema.ts';
import { buildVariants } from '../server/lib/variants.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'source-assets');
const WA = path.join(SRC, 'website-assets', 'website assets');
const PUB = path.join(ROOT, 'public');
const MEDIA = path.join(PUB, 'media');
const MANIFEST = path.join(ROOT, 'src', 'content', 'seed-media.json');
const SVG_OUT = path.join(ROOT, 'src', 'assets', 'svg');
const FORCE = process.argv.includes('--force');

/** Poster rectangle inside the 1920×1080 fire video (measured from frame 0). */
export const POSTER_RECT = { x: 303, y: 194, w: 1063, h: 688 };

type ImageJob = { id: string; group: string; file: string; widths?: number[]; crop?: Region };

const images: ImageJob[] = [
  // Art: paintings (ART_IMAGES duplicates these; b3 and Untitled-1 exist only there)
  ...Array.from({ length: 11 }, (_, i) => ({
    id: `p-${String(i + 1).padStart(2, '0')}`,
    group: 'art',
    file: path.join(WA, 'ARTWORKS', `P_${i + 1}.png`),
  })),
  { id: 'b-03', group: 'art', file: path.join(SRC, 'art-images', 'Links', 'b3.png') },
  { id: 'untitled-1', group: 'art', file: path.join(SRC, 'art-images', 'Links', 'Untitled-1.png') },
  // Art: later high-resolution additions (source-assets/art-images/new)
  ...[
    'girls.png',
    'lady.png',
    'women.png',
    'IMG_20200801_214956-01.jpeg',
    'IMG_20200801_215020-01.jpeg',
    'IMG_20200801_215038-01.jpeg',
    'WhatsApp Image 2026-10-22 at 9.11.08 AM.jpeg',
  ].map((file, i) => ({
    id: `n-${String(i + 1).padStart(2, '0')}`,
    group: 'art',
    file: path.join(SRC, 'art-images', 'new', file),
  })),
  // Design: one hero image per project
  { id: 'bharatiyam', group: 'design', file: path.join(WA, 'DEGITAL', 'BHARATIYAM.png') },
  {
    id: 'speaking-of-summer',
    group: 'design',
    file: path.join(WA, 'DEGITAL', 'COFFEE BEAN AND TEA LEAF SPEAKING OF SUMMER.png'),
  },
  { id: 'cubic', group: 'design', file: path.join(WA, 'DEGITAL', 'CUBIC.png') },
  { id: 'kouyou', group: 'design', file: path.join(WA, 'DEGITAL', 'KOUYOU.png') },
  { id: 'sipgel', group: 'design', file: path.join(WA, 'DEGITAL', 'SIPGEL.png') },
  // Only source for Love of Latte is the 4096px-capped Figma board export (low resolution).
  {
    id: 'love-of-latte',
    group: 'design',
    file: path.join(SRC, 'figma-reference', 'love-of-latte-casestudy.jpg'),
    crop: { left: 0, top: 250, width: 868, height: 384 },
  },
  // Design: the whole case-study pages, cropped from the Figma board (source-assets/case-studies, from
  // Aahan portfolio.jam, header bar removed). The board export is capped at 4096px tall, so these are
  // the best resolution available until the designer supplies larger exports.
  ...['cubic', 'speaking-of-summer', 'bharatiyam', 'love-of-latte', 'sipgel', 'kouyou'].map((slug) => ({
    id: `${slug}-full`,
    group: 'design',
    file: path.join(SRC, 'case-studies', `${slug}.png`),
  })),
  // Footer texture (dark paper with gold embers)
  {
    id: 'footer-texture',
    group: 'footer',
    file: path.join(SRC, 'footers', 'FOOTERS', 'FOOTER IMAGE', 'Artboard 20@4x-100.jpg'),
    widths: [960, 1920, 2880],
  },
];

const VIDEO = path.join(WA, 'PAINTING ON FIRE ANIMATION.mp4');

function ffmpeg(args: string[]) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
}

async function buildImages(manifest: Record<string, MediaAsset>) {
  for (const job of images) {
    if (!existsSync(job.file)) {
      console.warn(`skip ${job.id}: missing ${path.relative(ROOT, job.file)}`);
      continue;
    }
    const outDir = path.join(MEDIA, job.group, job.id);
    if (!FORCE && manifest[job.id] && existsSync(outDir)) {
      console.log(`ok   ${job.id}`);
      continue;
    }
    const t = Date.now();
    const input = job.crop ? await sharp(job.file).extract(job.crop).toBuffer() : job.file;
    manifest[job.id] = await buildVariants({
      id: job.id,
      input,
      outDir,
      urlBase: `/media/${job.group}/${job.id}`,
      widths: job.widths,
    });
    console.log(`made ${job.id} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  }
}

async function buildHome() {
  const dir = path.join(MEDIA, 'home');
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(SRC, '.cache'), { recursive: true });
  const frame0 = path.join(SRC, '.cache', 'frame0.png');
  if (FORCE || !existsSync(frame0)) {
    ffmpeg(['-i', VIDEO, '-vf', 'select=eq(n\\,0)', '-frames:v', '1', frame0]);
  }
  // Still of the first frame, shown before WebGL is ready (pixel-identical to the video).
  await sharp(frame0).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(dir, 'frame0.jpg'));
  // The poster alone, used as the 3D poster texture.
  const { x, y, w, h } = POSTER_RECT;
  await sharp(frame0)
    .extract({ left: x, top: y, width: w, height: h })
    .webp({ quality: 92 })
    .toFile(path.join(dir, 'poster.webp'));
  // Social card
  await sharp(frame0)
    .extract({ left: 160, top: 120, width: 1600, height: 840 })
    .resize(1200, 630)
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(PUB, 'og.jpg'));
  console.log('made home stills');
}

async function buildVideo() {
  const dir = path.join(MEDIA, 'video');
  await mkdir(dir, { recursive: true });
  const common = ['-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an'];
  const v1080 = path.join(dir, 'painting-on-fire-1080.mp4');
  const v720 = path.join(dir, 'painting-on-fire-720.mp4');
  const webm = path.join(dir, 'painting-on-fire-1080.webm');
  if (FORCE || !existsSync(v1080)) ffmpeg(['-i', VIDEO, ...common, '-crf', '19', v1080]);
  if (FORCE || !existsSync(v720)) ffmpeg(['-i', VIDEO, ...common, '-crf', '22', '-vf', 'scale=1280:-2', v720]);
  // VP9 for browsers built without H.264 (some Chromium/Linux builds).
  if (FORCE || !existsSync(webm)) {
    ffmpeg(['-i', VIDEO, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-an', webm]);
  }
  console.log('made video');
}

/** Copies the SVGs into src/assets/svg, recolouring single-colour artwork to currentColor. */
async function buildSvgs() {
  await mkdir(SVG_OUT, { recursive: true });
  const sources = [
    path.join(WA, 'SVG ASSETS'),
    path.join(SRC, 'footers', 'FOOTERS', 'SVG'),
  ];
  const rename: Record<string, string> = {
    'ARROW 1 ART.svg': 'arrow.svg',
    'ARROW 2 DESIGN.svg': 'arrow-light.svg',
    'ESC.svg': 'esc.svg',
    'ZOOM.svg': 'zoom.svg',
    'RED LOGO.svg': 'logo.svg',
    'BEHANCE.svg': 'behance.svg',
    'CONTACT.svg': 'contact.svg',
    'CV.svg': 'cv.svg',
    'INSTAGRAM.svg': 'instagram.svg',
    'LINKEDIN.svg': 'linkedin.svg',
    'MAIL.svg': 'mail.svg',
  };
  for (const dir of sources) {
    for (const name of await readdir(dir)) {
      const target = rename[name];
      if (!target) continue;
      let svg = await readFile(path.join(dir, name), 'utf8');
      svg = svg.replace(/<\?xml[^>]*>\s*/, '');
      if (target.startsWith('arrow')) {
        // Shaft and outer head follow currentColor; the inner tip follows --arrow-tip.
        svg = svg
          .replace(/\.cls-2\s*\{\s*fill:\s*#d18028;\s*\}/, '.cls-2 { fill: currentColor; }')
          .replace(/\.cls-1\s*\{\s*fill:\s*#d18028;\s*\}/, '.cls-1 { fill: currentColor; }')
          .replace(/\.cls-1\s*\{\s*fill:\s*#fff;\s*\}/, '.cls-1 { fill: var(--arrow-tip, #fff); }')
          .replace(/<polygon points=/, '<polygon style="fill: var(--arrow-tip, #000)" points=');
      } else {
        svg = svg.replace(/fill:\s*#(?:d18028|932424|a59f9b);/gi, 'fill: currentColor;');
      }
      // Class names collide when several inline SVGs share a page; scope them per file.
      const scope = target.replace('.svg', '');
      svg = svg.replace(/cls-(\d)/g, `${scope}-$1`).replace(/id="Layer_[^"]*"/g, '');
      await writeFile(path.join(SVG_OUT, target), svg.trim() + '\n');
    }
  }
  await mkdir(PUB, { recursive: true });
  await copyFile(path.join(WA, 'SVG ASSETS', 'YELLOW LOGO.svg'), path.join(PUB, 'favicon.svg'));
  console.log('made svgs');
}

async function main() {
  const manifest: Record<string, MediaAsset> = existsSync(MANIFEST) && !FORCE
    ? JSON.parse(await readFile(MANIFEST, 'utf8'))
    : {};
  await buildSvgs();
  await buildHome();
  await buildVideo();
  await buildImages(manifest);
  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, MANIFEST)} (${Object.keys(manifest).length} assets)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
