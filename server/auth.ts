/**
 * Admin authentication: one password, stored only as a scrypt hash in
 * storage/auth.json. A successful sign-in sets an HttpOnly, SameSite=Strict
 * cookie holding `expiry.issuedAt.nonce.signature` (HMAC-SHA256 with a
 * per-install secret). Changing the password rotates the secret, which signs
 * out every other session; signing out stores a `validFrom` time, so a copied
 * cookie issued before it stops working too.
 *
 * Usage (server/index.ts):
 *   await initAuth();
 *   app.use('/api/auth', authRouter);
 *   app.put('/api/content', requireAdmin, ...);
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { PRODUCTION } from './config.ts';

const STORAGE = path.resolve(import.meta.dirname, '..', 'storage');
const AUTH_FILE = path.join(STORAGE, 'auth.json');

const COOKIE = 'ag_admin';
const SESSION_MS = 8 * 60 * 60 * 1000;
const KEYLEN = 32;
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
/** Failures allowed across all addresses per window: the brake on guessing from rotating addresses. */
const GLOBAL_MAX_FAILURES = 30;
/** Logins allowed to wait for the (serialised) password hash; more get 503. */
const MAX_WAITING = 8;
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'aahan';

interface AuthRecord {
  hash: string;
  salt: string;
  params: { N: number; r: number; p: number };
  secret: string;
  updatedAt: string;
  /** Sessions issued at or before this time (ms) are revoked. Set when the admin signs out. */
  validFrom?: number;
}

let record: AuthRecord | null = null;

/**
 * Hashes run one at a time: each needs 32 MB and a libuv thread, and a burst of
 * guesses must not starve static files and the API of threads.
 */
let hashChain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = hashChain.then(fn, fn);
  hashChain = run.catch(() => {});
  return run;
}

function scryptAsync(password: string, salt: Buffer, params: AuthRecord['params']): Promise<Buffer> {
  const opts: ScryptOptions = { ...params, maxmem: 128 * params.N * params.r * 2 };
  return serial(
    () =>
      new Promise<Buffer>((resolve, reject) =>
        scrypt(password.normalize('NFKC'), salt, KEYLEN, opts, (err, key) => (err ? reject(err) : resolve(key))),
      ),
  );
}

async function hashPassword(password: string): Promise<Pick<AuthRecord, 'hash' | 'salt' | 'params'>> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT_PARAMS);
  return { hash: key.toString('base64'), salt: salt.toString('base64'), params: SCRYPT_PARAMS };
}

async function verifyPassword(password: string): Promise<boolean> {
  if (!record) return false;
  const expected = Buffer.from(record.hash, 'base64');
  const key = await scryptAsync(password, Buffer.from(record.salt, 'base64'), record.params);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

async function save(next: AuthRecord) {
  await mkdir(STORAGE, { recursive: true });
  const tmp = `${AUTH_FILE}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  await rename(tmp, AUTH_FILE);
  record = next;
}

/** Loads storage/auth.json, creating it on first run from ADMIN_PASSWORD (or a generated password). */
export async function initAuth(): Promise<void> {
  if (existsSync(AUTH_FILE)) {
    record = JSON.parse(await readFile(AUTH_FILE, 'utf8')) as AuthRecord;
    return;
  }
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  const password = fromEnv || randomBytes(12).toString('base64url');
  await save({ ...(await hashPassword(password)), secret: randomBytes(32).toString('base64'), updatedAt: new Date().toISOString() });
  if (!fromEnv) {
    console.log('\n  Admin password created (shown once, change it in the admin panel):');
    console.log(`    ${password}\n`);
  }
}

/* ---------- session tokens ---------- */

function sign(payload: string): string {
  return createHmac('sha256', Buffer.from(record!.secret, 'base64')).update(payload).digest('base64url');
}

function issueToken(): string {
  const now = Date.now();
  const payload = `${now + SESSION_MS}.${now}.${randomBytes(12).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null; // malformed escape: treat as no cookie rather than failing the request
      }
    }
  }
  return null;
}

/** True when the request carries a valid, unexpired admin session cookie. */
export function isAdmin(req: Request): boolean {
  if (!record) return false;
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const parts = token.split('.');
  // Cookies from before the issued-at field had three parts: they are simply invalid now.
  if (parts.length !== 4) return false;
  const [exp, iat, nonce, sig] = parts;
  if (!(Number(exp) > Date.now())) return false;
  if (!(Number(iat) > (record.validFrom ?? 0))) return false;
  const expected = Buffer.from(sign(`${exp}.${iat}.${nonce}`));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * The session cookie is Secure when COOKIE_SECURE=1, when the request itself is
 * HTTPS (directly, or via a trusted proxy's X-Forwarded-Proto), and, in
 * production, by default for any host that is not localhost. COOKIE_SECURE=0
 * switches that default off (plain-HTTP staging or LAN use).
 */
function secureCookie(req: Request): boolean {
  const flag = process.env.COOKIE_SECURE?.trim();
  if (flag === '1' || req.secure) return true;
  if (flag === '0') return false;
  return PRODUCTION && !LOCAL_HOSTNAMES.has(req.hostname);
}

function cookieOptions(req: Request) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: secureCookie(req),
    path: '/',
  };
}

function setSession(req: Request, res: Response) {
  res.cookie(COOKIE, issueToken(), { ...cookieOptions(req), maxAge: SESSION_MS });
}

/* ---------- request guards ---------- */

/**
 * State-changing requests must come from this site: custom header plus matching Origin.
 * `req.host` is the Host header, or X-Forwarded-Host when `trust proxy` is set.
 */
function sameOrigin(req: Request): boolean {
  if (req.get(CSRF_HEADER) !== CSRF_VALUE) return false;
  const origin = req.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.host;
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'Sign in to make changes.' });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && !sameOrigin(req)) {
    res.status(403).json({ error: 'Request blocked: it did not come from this site.' });
    return;
  }
  next();
}

/* ---------- brute-force protection ---------- */

/**
 * An attempt is counted when it is accepted, before the slow hash, and handed
 * back if the password turns out right. Counting afterwards would let a
 * parallel burst all pass the check before the first failure was recorded.
 */
const failures = new Map<string, { count: number; first: number }>();
const everyone = { count: 0, first: 0 };
let waiting = 0;

function retryAfterMs(ip: string): number {
  const now = Date.now();
  if (now - everyone.first > WINDOW_MS) {
    everyone.count = 0;
    everyone.first = now;
  }
  const entry = failures.get(ip);
  if (entry && now - entry.first > WINDOW_MS) failures.delete(ip);
  const perIp = failures.get(ip);
  const perIpWait = perIp && perIp.count >= MAX_FAILURES ? WINDOW_MS - (now - perIp.first) : 0;
  const globalWait = everyone.count >= GLOBAL_MAX_FAILURES ? WINDOW_MS - (now - everyone.first) : 0;
  return Math.max(perIpWait, globalWait);
}

function reserveAttempt(ip: string) {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) failures.set(ip, { count: 1, first: now });
  else entry.count++;
  everyone.count++;
  // Addresses are free to invent (X-Forwarded-For behind a careless proxy): keep the table bounded.
  if (failures.size > 5000) {
    for (const [key, e] of failures) if (now - e.first > WINDOW_MS) failures.delete(key);
  }
}

function refundAttempt(ip: string) {
  failures.delete(ip);
  everyone.count = Math.max(0, everyone.count - 1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- routes ---------- */

export const authRouter = express.Router();
authRouter.use(express.json({ limit: '4kb' }));

authRouter.get('/session', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ admin: isAdmin(req) });
});

authRouter.post('/login', async (req, res) => {
  const ip = req.ip ?? 'unknown';
  const wait = retryAfterMs(ip);
  if (wait > 0) {
    const retryAfter = Math.ceil(wait / 1000);
    res.set('Retry-After', String(retryAfter)).status(429).json({ error: 'Too many attempts.', retryAfter });
    return;
  }
  if (!sameOrigin(req)) {
    res.status(403).json({ error: 'Request blocked: it did not come from this site.' });
    return;
  }
  if (waiting >= MAX_WAITING) {
    res.set('Retry-After', '5').status(503).json({ error: 'Busy. Try again in a few seconds.' });
    return;
  }

  reserveAttempt(ip);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  let ok = false;
  waiting++;
  try {
    ok = password.length > 0 && password.length <= 200 && (await verifyPassword(password));
  } finally {
    waiting--;
  }
  if (!ok) {
    await sleep(350 + Math.random() * 250);
    res.status(401).json({ error: "That password didn't work." });
    return;
  }
  refundAttempt(ip);
  setSession(req, res);
  res.status(204).end();
});

authRouter.post('/logout', async (req, res) => {
  const wasAdmin = isAdmin(req) && sameOrigin(req);
  res.clearCookie(COOKIE, cookieOptions(req));
  // Only a signed-in, same-site request may revoke: anyone else just loses their own cookie.
  if (wasAdmin) await save({ ...record!, validFrom: Date.now() });
  res.status(204).end();
});

authRouter.post('/password', requireAdmin, async (req, res) => {
  const current = typeof req.body?.current === 'string' ? req.body.current : '';
  const next = typeof req.body?.next === 'string' ? req.body.next : '';
  if (!(await verifyPassword(current))) {
    await sleep(350);
    res.status(401).json({ error: 'Your current password is not correct.' });
    return;
  }
  if (next.length < 10 || next.length > 200) {
    res.status(400).json({ error: 'Use between 10 and 200 characters for the new password.' });
    return;
  }
  await save({ ...(await hashPassword(next)), secret: randomBytes(32).toString('base64'), updatedAt: new Date().toISOString() });
  setSession(req, res);
  res.status(204).end();
});
