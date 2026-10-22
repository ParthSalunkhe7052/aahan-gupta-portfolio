/**
 * Content constants with no runtime dependencies. Public pages import these
 * (not shared/schema.ts) so zod only loads with the admin editor and the server.
 * shared/schema.ts re-exports everything here.
 */

export type BlockType = 'full' | 'long' | 'split' | 'trio' | 'feature' | 'text';

/**
 * Template catalogue. Slot sizes are the design sizes from the Figma template
 * (a 1920px-wide page); rows render edge to edge with no gutters, keeping these ratios.
 */
export const BLOCK_TEMPLATES: Record<BlockType, { label: string; hint: string; slots: { w: number; h: number }[] }> = {
  full: { label: 'Full width', hint: 'One image, 1920 × 850', slots: [{ w: 1920, h: 850 }] },
  // Shown whole at its own proportions, never cropped; the size here only draws the empty slot.
  long: { label: 'Whole image', hint: 'One image of any height, shown uncropped', slots: [{ w: 1920, h: 850 }] },
  split: {
    label: 'Two up',
    hint: 'Two images, 960 × 850 each',
    slots: [
      { w: 960, h: 850 },
      { w: 960, h: 850 },
    ],
  },
  trio: {
    label: 'Three up',
    hint: 'Three images, 640 × 850 each',
    slots: [
      { w: 640, h: 850 },
      { w: 640, h: 850 },
      { w: 640, h: 850 },
    ],
  },
  feature: {
    label: 'Image and text',
    hint: 'Image 1280 × 850 beside a text column',
    slots: [{ w: 1280, h: 850 }],
  },
  text: { label: 'Text', hint: 'A heading and a paragraph', slots: [] },
};

export const CATEGORIES = ['branding', 'illustrations', 'packaging'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  branding: 'Branding',
  illustrations: 'Illustrations',
  packaging: 'Packaging',
};

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

/** World a route belongs to; drives theme tokens and which transition plays. */
export type World = 'home' | 'design' | 'art';

export function worldOf(pathname: string): World {
  if (pathname.startsWith('/design')) return 'design';
  if (pathname.startsWith('/art')) return 'art';
  if (pathname.startsWith('/cv')) return 'design';
  return 'home';
}
