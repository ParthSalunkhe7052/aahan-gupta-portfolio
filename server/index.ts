/**
 * API + production server.
 *   dev:   tsx watch server/index.ts          (Vite serves the app and proxies /api and /uploads here)
 *   prod:  tsx server/index.ts --production   (also serves dist/ with an SPA fallback)
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { MulterError } from 'multer';
import { authRouter, initAuth } from './auth.ts';
import { HOST, PRODUCTION } from './config.ts';
import { contentRouter } from './routes/content.ts';
import { filesRouter } from './routes/files.ts';
import { mediaRouter } from './routes/media.ts';
import { UPLOADS, initStore } from './store.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
// `--port` wins over PORT: in development PORT may belong to the Vite server that launched us.
const portFlag = process.argv.indexOf('--port');
const PORT = Number(portFlag > -1 ? process.argv[portFlag + 1] : process.env.PORT) || 8787;
const YEAR = 365 * 24 * 60 * 60;

await initStore();
await initAuth();

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        // The Vite build has no inline scripts. wasm-unsafe-eval only allows WebAssembly (3D decoders).
        scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
        // The inline SVG icons carry their own <style> elements.
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());

/* ---------- API ---------- */
app.use('/api/auth', authRouter);
app.use('/api/content', contentRouter);
app.use('/api/media', mediaRouter);
app.use('/api/files', filesRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

/* ---------- static ---------- */
app.use(
  '/uploads',
  express.static(UPLOADS, { immutable: true, maxAge: YEAR * 1000, index: false, fallthrough: true }),
  (_req, res) => {
    res.status(404).end();
  },
);

if (PRODUCTION) {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error('dist/index.html is missing. Run "npm run build" first.');
    process.exit(1);
  }
  const immutable = { immutable: true, maxAge: YEAR * 1000, index: false } as const;
  app.use('/assets', express.static(path.join(DIST, 'assets'), immutable), (_req, res) => {
    res.status(404).end();
  });
  app.use('/media', express.static(path.join(DIST, 'media'), immutable), (_req, res) => {
    res.status(404).end();
  });
  // Everything else in dist (favicon, og image): revalidate.
  app.use(express.static(DIST, { index: false, maxAge: 60 * 60 * 1000 }));
  app.get('/{*splat}', (_req, res) => {
    res.set('Cache-Control', 'no-cache').sendFile(path.join(DIST, 'index.html'));
  });
}

/* ---------- errors: JSON, never a stack trace ---------- */
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const e = err as { status?: number; statusCode?: number; type?: string };
  if (err instanceof MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooBig ? 413 : 400).json({ error: tooBig ? 'That file is too large.' : 'The upload could not be read.' });
    return;
  }
  if (e.type === 'entity.too.large') {
    res.status(413).json({ error: 'That request is too large.' });
    return;
  }
  if (e.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'The request body is not valid JSON.' });
    return;
  }
  const status = e.status ?? e.statusCode ?? 500;
  if (status >= 500) console.error(err);
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status >= 500 ? 'Something went wrong on the server.' : 'The request could not be completed.',
  });
});

app.listen(PORT, HOST, () => {
  console.log(`  ${PRODUCTION ? 'Site and API' : 'API'} listening on http://${HOST.includes(':') ? `[${HOST}]` : HOST}:${PORT}`);
});
