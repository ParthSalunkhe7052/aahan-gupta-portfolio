import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { requireAdmin } from '../auth.ts';
import { UPLOADS } from '../store.ts';

const PDF_MAX = 15 * 1024 * 1024;
const AUDIO_MAX = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PDF_MAX, files: 1, fields: 4 },
});

/** Detects the audio container from its first bytes (not from the file name). */
function audioExtension(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'mp3';
  if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WAVE') return 'wav';
  if (b.subarray(0, 4).toString('latin1') === 'OggS') return 'ogg';
  if (b.subarray(4, 8).toString('latin1') === 'ftyp') return 'm4a';
  return null;
}

export const filesRouter = express.Router();

/**
 * Multipart `file`: a PDF (the CV, up to 15 MB) or, with `?kind=audio`, a
 * recorded fire sound (mp3, wav, ogg or m4a, up to 10 MB). Returns `{ url }`.
 */
filesRouter.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Choose a file to upload.' });
    return;
  }
  const kind = req.query.kind === 'audio' ? 'audio' : 'pdf';
  let ext: string | null;
  if (kind === 'pdf') {
    ext = file.buffer.subarray(0, 5).toString('latin1') === '%PDF-' ? 'pdf' : null;
    if (!ext) {
      res.status(415).json({ error: 'That file is not a PDF.' });
      return;
    }
  } else {
    if (file.size > AUDIO_MAX) {
      res.status(413).json({ error: 'That sound file is larger than 10 MB.' });
      return;
    }
    ext = audioExtension(file.buffer);
    if (!ext) {
      res.status(415).json({ error: 'That file is not a supported sound. Use MP3, WAV, OGG or M4A.' });
      return;
    }
  }
  const name = `${nanoid(12)}.${ext}`;
  await writeFile(path.join(UPLOADS, 'files', name), file.buffer);
  res.status(201).json({ url: `/uploads/files/${name}` });
});
