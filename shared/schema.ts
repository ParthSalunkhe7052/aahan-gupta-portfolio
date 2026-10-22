/**
 * Content contract shared by the client, the API and the media scripts.
 * The whole site is one JSON document (`Content`), validated with these schemas
 * on every write. Array order is display order.
 */
import { z } from 'zod';
import { CATEGORIES } from './model.ts';

export * from './model.ts';

/* ---------- limits ---------- */

// Generous for real content, small enough that a bad or hostile document stays cheap to store and render.
const ID = z.string().min(1).max(64);
const SLUG = z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const short = (max = 200) => z.string().max(max);
const long = (max = 20_000) => z.string().max(max);
const MAX_PROJECTS = 200;
const MAX_ARTWORKS = 500;
const MAX_BLOCKS = 100;

/* ---------- media ---------- */

/** Same-site media only: an upload or a bundled image, never an external address or a path walk. */
const SiteUrl = z
  .string()
  .max(300)
  .regex(/^\/(uploads|media)\/[\w.\-/]+$/, 'Must be an uploaded or bundled file.')
  .refine((v) => !v.includes('..'), 'Must be an uploaded or bundled file.');

export const Variant = z.object({
  w: z.number().int().positive().max(20_000),
  url: SiteUrl,
});

/** A processed image: responsive AVIF + WebP widths, a blurred placeholder and its dominant colour. */
export const MediaAsset = z.object({
  id: ID,
  width: z.number().int().positive().max(100_000),
  height: z.number().int().positive().max(100_000),
  /** Lands in a CSS value, so only a plain hex colour is accepted. */
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  /** A 24px-wide WebP data URI: about 0.2-1.5 KB for the seed; even a 1:100 strip of pure noise is under 30 KB. */
  lqip: z.string().max(40_000).regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/),
  avif: z.array(Variant).min(1).max(8),
  webp: z.array(Variant).min(1).max(8),
});

/** Where the image should be cropped from when it is fitted into a fixed-ratio slot (0..1 each). */
export const Focal = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const Slot = z.object({
  media: MediaAsset.nullable(),
  focal: Focal.default({ x: 0.5, y: 0.5 }),
  alt: short(500).default(''),
});

/* ---------- case-study templates ---------- */

const blockBase = { id: ID };

export const Block = z.discriminatedUnion('type', [
  z.object({ ...blockBase, type: z.literal('full'), slots: z.tuple([Slot]) }),
  z.object({ ...blockBase, type: z.literal('long'), slots: z.tuple([Slot]) }),
  z.object({ ...blockBase, type: z.literal('split'), slots: z.tuple([Slot, Slot]) }),
  z.object({ ...blockBase, type: z.literal('trio'), slots: z.tuple([Slot, Slot, Slot]) }),
  z.object({
    ...blockBase,
    type: z.literal('feature'),
    slots: z.tuple([Slot]),
    side: z.enum(['left', 'right']).default('left'),
    heading: short(300).default(''),
    body: long().default(''),
  }),
  z.object({
    ...blockBase,
    type: z.literal('text'),
    heading: short(300).default(''),
    body: long().default(''),
  }),
]);

/* ---------- design projects ---------- */

export const Category = z.enum(CATEGORIES);
/** Same union as the model's Category; declared here because the value above shadows the re-export. */
export type Category = z.infer<typeof Category>;

export const Project = z.object({
  id: ID,
  slug: SLUG,
  title: short().min(1),
  category: Category,
  /** Campaign or sub-project name, shown in quotes on the index, e.g. Speaking of Summer. */
  tagline: short().default(''),
  summary: long(2_000).default(''),
  /** Rendered as "Work completed while at {studio}". Empty hides the line. */
  studio: short().default(''),
  /** Image used on the index pages. */
  cover: Slot,
  blocks: z.array(Block).max(MAX_BLOCKS),
  published: z.boolean().default(true),
});

/* ---------- artworks ---------- */

export const Artwork = z.object({
  id: ID,
  slug: SLUG,
  title: short().min(1),
  medium: short().default(''),
  year: short(50).default(''),
  size: short(100).default(''),
  series: short().default(''),
  /** Paragraphs separated by a blank line. */
  description: long().default(''),
  image: MediaAsset,
  published: z.boolean().default(true),
});

/* ---------- site ---------- */

export const CvEntry = z.object({
  title: short(300),
  org: short(300).default(''),
  period: short(100).default(''),
  body: long(8_000).default(''),
});

export const Site = z.object({
  name: short(),
  role: short(),
  location: short(),
  /** Home, right column: the italic statement. */
  statement: long(2_000),
  /** Home, right column: the paragraph under the statement. */
  practice: long(4_000),
  /** Home, right column: the orange line above the signature. */
  collection: short(300),
  contact: z.object({
    instagram: short(300),
    behance: short(300),
    linkedin: short(300),
    email: short(),
    phone: short(50),
  }),
  cv: z.object({
    intro: long(4_000),
    education: z.array(CvEntry).max(100),
    experience: z.array(CvEntry).max(100),
    capabilities: z.array(short()).max(100),
    /** Uploaded PDF url; when set, the CV icon downloads it instead of opening /cv. */
    pdf: short(300).default(''),
  }),
  /** Optional recorded fire sound (url). Empty uses the built-in synthesised fire. */
  fireAudio: short(300).default(''),
});

export const Content = z.object({
  /** Incremented on every save; the API rejects writes based on a stale rev (409). */
  rev: z.number().int().nonnegative(),
  updatedAt: z.string(),
  site: Site,
  projects: z.array(Project).max(MAX_PROJECTS),
  artworks: z.array(Artwork).max(MAX_ARTWORKS),
});

export type MediaAsset = z.infer<typeof MediaAsset>;
export type Focal = z.infer<typeof Focal>;
export type Slot = z.infer<typeof Slot>;
export type Block = z.infer<typeof Block>;
export type Project = z.infer<typeof Project>;
export type Artwork = z.infer<typeof Artwork>;
export type CvEntry = z.infer<typeof CvEntry>;
export type Site = z.infer<typeof Site>;
export type Content = z.infer<typeof Content>;
