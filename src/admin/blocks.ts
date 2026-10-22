import { nanoid } from 'nanoid';
import { BLOCK_TEMPLATES, type Block, type BlockType, type Slot } from '@shared/schema';

export const emptySlot = (): Slot => ({ media: null, focal: { x: 0.5, y: 0.5 }, alt: '' });

export const BLOCK_ORDER: BlockType[] = ['full', 'long', 'split', 'trio', 'feature', 'text'];

export function newBlock(type: BlockType): Block {
  const id = `blk-${nanoid(8)}`;
  switch (type) {
    case 'full':
      return { id, type, slots: [emptySlot()] };
    case 'long':
      return { id, type, slots: [emptySlot()] };
    case 'split':
      return { id, type, slots: [emptySlot(), emptySlot()] };
    case 'trio':
      return { id, type, slots: [emptySlot(), emptySlot(), emptySlot()] };
    case 'feature':
      return { id, type, slots: [emptySlot()], side: 'left', heading: '', body: '' };
    case 'text':
      return { id, type, heading: '', body: '' };
  }
}

export function slotsOf(block: Block): Slot[] {
  return block.type === 'text' ? [] : [...block.slots];
}

/** How many images a switch to `type` would drop (slots that hold an image but have no place in the new layout). */
export function imagesLostByChange(block: Block, type: BlockType): number {
  const keep = BLOCK_TEMPLATES[type].slots.length;
  return slotsOf(block)
    .slice(keep)
    .filter((s) => s.media).length;
}

/** Same row, another template: images stay in their slots where the new layout has them; text carries over. */
export function changeBlockType(block: Block, type: BlockType): Block {
  if (block.type === type) return block;
  const old = slotsOf(block);
  const slot = (i: number) => old[i] ?? emptySlot();
  const heading = block.type === 'feature' || block.type === 'text' ? block.heading : '';
  const body = block.type === 'feature' || block.type === 'text' ? block.body : '';
  const id = block.id;
  switch (type) {
    case 'full':
      return { id, type, slots: [slot(0)] };
    case 'long':
      return { id, type, slots: [slot(0)] };
    case 'split':
      return { id, type, slots: [slot(0), slot(1)] };
    case 'trio':
      return { id, type, slots: [slot(0), slot(1), slot(2)] };
    case 'feature':
      return { id, type, slots: [slot(0)], side: 'left', heading, body };
    case 'text':
      return { id, type, heading, body };
  }
}

/**
 * Whole-page layouts for a new case study: a list of rows to start from. The first is the Figma case-study
 * template (a 1920 x 850 row, then a pair of 960 x 850 images, repeated).
 */
export const PAGE_TEMPLATES: { id: string; name: string; description: string; rows: BlockType[] }[] = [
  {
    id: 'case-study',
    name: 'Case study',
    description: 'The standard layout: a wide image, then a pair, then a wide image and another pair.',
    rows: ['full', 'split', 'full', 'split'],
  },
  {
    id: 'whole-image',
    name: 'Whole page image',
    description: 'One tall image shown whole, for a finished page exported from Figma.',
    rows: ['long'],
  },
  {
    id: 'story',
    name: 'Story',
    description: 'A wide image, an image beside text, a pair, and a row of three.',
    rows: ['full', 'feature', 'split', 'trio'],
  },
];
