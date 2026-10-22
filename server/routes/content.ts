import express from 'express';
import { isAdmin, requireAdmin } from '../auth.ts';
import { ConflictError, ValidationError, getContent, saveContent } from '../store.ts';

export const contentRouter = express.Router();

/**
 * The whole site as one document. Unpublished projects and artworks are drafts:
 * only a signed-in admin receives them.
 */
contentRouter.get('/', (req, res) => {
  const doc = getContent();
  const body = isAdmin(req)
    ? doc
    : { ...doc, projects: doc.projects.filter((p) => p.published), artworks: doc.artworks.filter((a) => a.published) };
  res.set('Cache-Control', 'no-cache, private').set('Vary', 'Cookie').json(body);
});

contentRouter.put('/', requireAdmin, express.json({ limit: '8mb' }), async (req, res) => {
  try {
    const saved = await saveContent(req.body);
    res.json(saved);
  } catch (err) {
    if (err instanceof ConflictError) {
      res.status(409).json({ error: 'Someone else published changes. Reload to get them.', current: err.doc });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: 'The content is not valid.', issues: err.issues });
      return;
    }
    throw err;
  }
});
