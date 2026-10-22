# Aahan Gupta: portfolio

Paintings and brand design, in two worlds that share one serif voice. Home is the
designer's burning poster: pick **Design** or **Art** and the poster burns (the
designer's own video, with a synthesised fire sound), then the page burns through
into the chosen world. Moving between worlds burns the page; moves inside a world
are quieter veils.

## Run it

Requirements: Node 22.22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5180 (Vite; port 5180 because 5173 is taken on this
machine). The API runs on http://localhost:8787 (loopback only, see `HOST` below) and
Vite proxies `/api` and `/uploads` to it.

Production (one Node process serves the site, media, uploads and API on `PORT`, default 8787,
on `127.0.0.1` unless `HOST` says otherwise):

```bash
npm run build
```

```bash
npm start
```

Other scripts:

| script | what it does |
|---|---|
| `npm run media` | Rebuilds `public/media` from `source-assets/` (AVIF + WebP at several widths, blur placeholders, video transcodes, SVG recolouring). Only needed when the designer's source files change. `-- --force` rebuilds everything. |
| `npm run seed` | Rebuilds `seed/content.json` (the starting content) from `src/content/seed-media.json`. |
| `npm run typecheck` | TypeScript check of client, server and scripts. |

## Admin

The admin key is the small ring at the bottom right of every footer (and of the
Home stage). It asks for the password, then shows the admin bar:

- **Edit content** opens the editor: Projects, Artworks, Home and contact, Security.
- While signed in, every page shows your draft (live preview). **Publish changes**
  saves it for everyone; **Discard** throws the draft away.
- Case studies are built from rows: Full width (1920 × 850), Two up (960 × 850
  each), Three up (640 × 850 each), Image and text, and Text. Upload into a slot,
  click the preview to set the focal point (where the crop centres), add alt text.
- Uploaded images are converted on the server to AVIF and WebP at 480–2560 px.

Password: on first start the server takes `ADMIN_PASSWORD` from `.env` (see
`.env.example`); if it is empty, it generates one and prints it once in the server
log. Change it later in the editor's Security tab (this signs out other sessions).
The hash lives in `storage/auth.json`; delete that file to fall back to `.env` again.

Sign out revokes the session on the server too (a copied cookie stops working, and
every other signed-in browser is signed out). Sign-in is rate limited: 5 wrong
passwords per address per 15 minutes, and 30 across all addresses; hashing is
serialised, and when more than 8 sign-ins are waiting the server answers 503. While
you edit, an unpublished draft is also kept in the tab's session storage; after a
reload and sign-in the editor offers to restore it. If someone else published in the
meantime, Publish asks whether to keep your version or take theirs.

## Where things live

```
docs/SPEC.md            build spec (design tokens, pages, API, admin)
shared/schema.ts        the content contract (zod), shared by client and server
server/                 Express 5 API: auth.ts, store.ts, routes/, lib/variants.ts
scripts/                build-media.ts, build-seed.ts
seed/content.json       starting content (copied to storage/ on first run)
storage/                runtime data, not in git: content.json, backups/, uploads/, auth.json
public/media/           web-ready images, the fire video, the footer texture
source-assets/          the designer's original files and Figma references (not in git)
src/
  core/transition/      page-burn overlay (raw WebGL), BurnLink, transition state
  core/scroll/          Lenis smooth scrolling on GSAP's ticker
  core/audio/           synthesised fire sound (Web Audio)
  fx/                   GLSL: noise, fire ramp, sparks, the burn shader
  scenes/hero/          Home: 3D folded poster, video handoff, embers (React Three Fiber)
  scenes/sphere/        Gallery: 3D sphere of artwork cards
  pages/                Home, design/, art/, CvPage, NotFound
  components/           Picture, Svg, Footer, DesignHeader, ...
  admin/                key, sign-in, admin bar, editor drawer
  content/              API client and content store
```

## Hosting

Needs a Node host with a persistent disk for `storage/` (uploads and edits are
written there): a VPS, Render, Railway or Fly.io with a volume. Static-only hosts
(Netlify, Vercel without a database or blob store) would lose uploads.

### Environment

| variable | default | meaning |
|---|---|---|
| `PORT` | `8787` | port to listen on (`--port` wins) |
| `HOST` | `127.0.0.1` | interface to bind. Loopback keeps the admin API off the network; set `0.0.0.0` only if the host's own firewall or platform proxy is the only way in (Render, Railway, Fly.io need it) |
| `TRUST_PROXY` | off | `1` when a reverse proxy sits in front: the server then believes `X-Forwarded-For`, `-Proto` and `-Host` |
| `COOKIE_SECURE` | automatic | `1` forces the `Secure` flag. Unset: in `--production` the session cookie is `Secure` for every host except `localhost`/`127.0.0.1`, and whenever the request is HTTPS. `0` switches the automatic rule off (plain-HTTP staging or LAN use) |
| `ADMIN_PASSWORD` | generated | first-run password, see Admin |

### Behind a reverse proxy (nginx, Caddy, a platform router)

The site must be reached over HTTPS for the `Secure` session cookie to be stored.
The proxy has to cooperate in four ways:

1. **Pass the original `Host`.** Sign-in and publishing compare the browser's `Origin`
   with the request host; a proxy that rewrites `Host` to the upstream name makes
   every sign-in and publish fail with 403. nginx: `proxy_set_header Host $host;`
   (the default sends `$proxy_host`). Caddy and most platform routers do this already.
2. **Send `X-Forwarded-Proto` and `X-Forwarded-For`**: `proxy_set_header X-Forwarded-Proto $scheme;`
   and `proxy_set_header X-Forwarded-For $remote_addr;` (use `$remote_addr`, not
   `$proxy_add_x_forwarded_for`, so a visitor cannot invent addresses).
3. **Set `TRUST_PROXY=1`.** Without it every visitor shares the proxy's address, so
   five wrong passwords from anyone lock the owner out for 15 minutes. With it, make
   sure the Node port is reachable only through the proxy (keep `HOST=127.0.0.1` and
   proxy to it, or firewall the port), otherwise a client can forge `X-Forwarded-For`
   to dodge the per-address limit. The 30-failures-per-15-minutes cap across all
   addresses still bounds guessing in that case, but it can also be used to hold the
   sign-in closed for up to 15 minutes; visitors and already signed-in sessions are not affected.
4. **Do not cache `/api`.** The content API answers differently for the admin.

Minimal nginx location:

```nginx
location / {
  proxy_pass http://127.0.0.1:8787;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $remote_addr;
}
```

The server sends HSTS with `includeSubDomains`: do not serve the site from a domain
whose other subdomains still need plain HTTP.

## Notes

- The fire video's audio track is silent, so the burn sound is synthesised. A
  recorded sound can be uploaded in the editor (Home and contact) and replaces it.
- Development only: http://localhost:5180/__lab is an effects lab for tuning the
  burn, the hero and the sphere. It is not part of production builds.
