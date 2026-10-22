import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { requireAdmin } from '../auth.ts';
import { buildVariants } from '../lib/variants.ts';
import { UPLOADS } from '../store.ts';

const MAX_IMAGE = 60 * 1024 * 1024;
const FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'tiff', 'heif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE, files: 1, fields: 4 },
});

export const mediaRouter = express.Router();

/** Multipart `file` (jpeg/png/webp/avif/tiff, up to 60 MB) -> MediaAsset with responsive variants. */
mediaRouter.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Choose an image to upload.' });
    return;
  }
  // Trust the decoder, not the mimetype or the file name.
  let format: string | undefined;
  try {
    const meta = await sharp(file.buffer, { failOn: 'error', limitInputPixels: 400_000_000 }).metadata();
    // sharp reports AVIF as "heif" with AV1 compression; plain HEIC is not accepted.
    format = meta.format === 'heif' && meta.compression !== 'av1' ? undefined : meta.format;
  } catch {
    format = undefined;
  }
  if (!format || !FORMATS.has(format)) {
    res.status(415).json({ error: 'That file is not a supported image. Use JPEG, PNG, WebP, AVIF or TIFF.' });
    return;
  }
  const id = `up-${nanoid(10)}`;
  const media = await buildVariants({
    id,
    input: file.buffer,
    outDir: path.join(UPLOADS, id),
    urlBase: `/uploads/${id}`,
  });
  res.status(201).json(media);
});
