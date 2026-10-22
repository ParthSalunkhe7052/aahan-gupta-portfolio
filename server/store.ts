/**
 * Content store: one JSON document on disk (storage/content.json), created from
 * seed/content.json on first run. Writes are validated, revision-checked,
 * serialised, backed up (last 30) and atomic (temp file + rename).
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Content, type Content as ContentDoc } from '../shared/schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
export const STORAGE = path.join(ROOT, 'storage');
export const UPLOADS = path.join(STORAGE, 'uploads');
const CONTENT_FILE = path.join(STORAGE, 'content.json');
const BACKUPS = path.join(STORAGE, 'backups');
const SEED_FILE = path.join(ROOT, 'seed', 'content.json');
const KEEP_BACKUPS = 30;

let current: ContentDoc | null = null;
/** Serialises writes so two simultaneous saves cannot interleave. */
let queue: Promise<unknown> = Promise.resolve();

export class ConflictError extends Error {
  constructor(public readonly doc: ContentDoc) {
    super('The content changed since it was loaded.');
  }
}

export class ValidationError extends Error {
  constructor(public readonly issues: { path: string; message: string }[]) {
    super('The content is not valid.');
  }
}

async function writeAtomic(file: string, data: string) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, data, 'utf8');
  // Windows can briefly refuse to replace a file another process is reading.
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(tmp, file);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt >= 5 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) {
        await rm(tmp, { force: true });
        throw err;
      }
      await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
    }
  }
}

export async function initStore(): Promise<void> {
  await mkdir(BACKUPS, { recursive: true });
  await mkdir(path.join(UPLOADS, 'files'), { recursive: true });
  if (!existsSync(CONTENT_FILE)) {
    if (!existsSync(SEED_FILE)) throw new Error('seed/content.json is missing. Run "npm run seed".');
    const seed = Content.parse(JSON.parse(await readFile(SEED_FILE, 'utf8')));
    await writeAtomic(CONTENT_FILE, JSON.stringify(seed, null, 2));
    console.log('  Created storage/content.json from the seed.');
  }
  current = Content.parse(JSON.parse(await readFile(CONTENT_FILE, 'utf8')));
}

export function getContent(): ContentDoc {
  if (!current) throw new Error('Store is not initialised.');
  return current;
}

/** Rules the schema cannot express: same-site file links, and ids and addresses that must be unique. */
export function semanticIssues(doc: ContentDoc): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  const upload = (v: string) => v === '' || (/^\/uploads\/[\w./-]+$/.test(v) && !v.includes('..'));
  if (!upload(doc.site.cv.pdf)) issues.push({ path: 'site.cv.pdf', message: 'Must be an uploaded file.' });
  if (!upload(doc.site.fireAudio)) issues.push({ path: 'site.fireAudio', message: 'Must be an uploaded file.' });
  for (const key of ['instagram', 'behance', 'linkedin'] as const) {
    const v = doc.site.contact[key];
    if (v !== '' && !/^https?:\/\//i.test(v)) issues.push({ path: `site.contact.${key}`, message: 'Must start with http:// or https://.' });
  }
  const seenProjects = new Set<string>();
  doc.projects.forEach((p, i) => {
    const key = `${p.category}/${p.slug}`;
    if (seenProjects.has(key)) issues.push({ path: `projects.${i}.slug`, message: `Another ${p.category} project already uses "${p.slug}".` });
    seenProjects.add(key);
  });
  const seenArt = new Set<string>();
  doc.artworks.forEach((a, i) => {
    if (seenArt.has(a.slug)) issues.push({ path: `artworks.${i}.slug`, message: `Another artwork already uses "${a.slug}".` });
    seenArt.add(a.slug);
  });
  const ids = new Set<string>();
  for (const [i, p] of doc.projects.entries()) {
    if (ids.has(p.id)) issues.push({ path: `projects.${i}.id`, message: 'Duplicate id.' });
    ids.add(p.id);
  }
  const artIds = new Set<string>();
  for (const [i, a] of doc.artworks.entries()) {
    if (artIds.has(a.id)) issues.push({ path: `artworks.${i}.id`, message: 'Duplicate id.' });
    artIds.add(a.id);
  }
  const blockIds = new Set<string>();
  for (const [i, p] of doc.projects.entries()) {
    for (const [j, b] of p.blocks.entries()) {
      if (blockIds.has(b.id)) issues.push({ path: `projects.${i}.blocks.${j}.id`, message: 'Duplicate id.' });
      blockIds.add(b.id);
    }
  }
  return issues;
}

async function pruneBackups() {
  const files = (await readdir(BACKUPS)).filter((f) => f.startsWith('content-') && f.endsWith('.json')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))) await rm(path.join(BACKUPS, f), { force: true });
}

/**
 * Validates and stores a new document. Throws ValidationError (400) or
 * ConflictError (409, carries the current document).
 */
export function saveContent(input: unknown): Promise<ContentDoc> {
  const run = async (): Promise<ContentDoc> => {
    const parsed = Content.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    }
    const doc = parsed.data;
    const issues = semanticIssues(doc);
    if (issues.length) throw new ValidationError(issues);

    const live = getContent();
    if (doc.rev !== live.rev) throw new ConflictError(live);

    const next: ContentDoc = { ...doc, rev: live.rev + 1, updatedAt: new Date().toISOString() };

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await copyFile(CONTENT_FILE, path.join(BACKUPS, `content-${stamp}.json`));
    await writeAtomic(CONTENT_FILE, JSON.stringify(next, null, 2));
    current = next;
    await pruneBackups();
    return next;
  };
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}
