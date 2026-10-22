# Aahan Gupta — portfolio build spec

Source of truth for the build. Designs come from the FigJam board "Aahan portfolio"
(file `fCfzE6UyZC0qLBwHwPWzkE`); exported page mockups are in
`source-assets/figma-reference/` and described below. Where this spec and a
mockup disagree, follow the mockup and note it.

## 1. Concept

Aahan Gupta is a painter and brand designer (Delhi; Creative Lead at VOLUME).
The site has two worlds that share one serif voice:

- **Art**: black stage, ash text, turmeric titles, red signature. Paintings about
  women, family and rage, in chiaroscuro.
- **Design**: paper `#efefef`, oxblood serif text, turmeric rules and arrows,
  yellow signature. Branding, illustration and packaging case studies.

The memorable moment is **fire**: the Home poster burns (the designer's own
video), and moving between worlds burns the page. Everything else stays quiet
and disciplined so the work is the content. Avoid generic motion (fade-up on
every section, hover lifts on every card). Motion should answer an action.

Principles:
1. Fire is the only light. Glows are warm and come from below; no neon, no
   decorative gradients, no glassmorphism, no drop shadows on cards.
2. Burn is the verb for world changes; smaller moves (filters, next artwork,
   opening a project) are calm cross-fades or shared-image moves.
3. Paper, not glass: crisp edges, no rounded cards, hairline rules only where
   the mockups have them.
4. Copy is plain and sentence case. No all-caps eyebrows, no "→" typed in
   text (the client's arrow SVG is the only arrow), no middle-dot meta strings.

## 2. Tokens (already in `src/styles/tokens.css`)

| token | value | use |
|---|---|---|
| `--black` | #000 | Home + Art background (must stay pure black: the video composites on it) |
| `--paper` | #efefef | Design background |
| `--oxblood` | #932424 | Design titles/links, red signature |
| `--turmeric` | #d18028 | Art titles/links, arrows, ESC/zoom icons, yellow signature, rules |
| `--ash` | #a59f9b | Body text on black, footer text, hand-drawn icons |
| `--graphite` | #514c48 | Body text on paper |
| `--char` | #0a0504 | Footer texture fallback colour |

Theme variables per world (`--bg --fg --fg-strong --title --link --rule --logo
--arrow-tip --focus`) are set on `<html data-world="home|design|art">`. Always
use the semantic variables in components, never raw hexes.

Type: **Merriweather Variable** only (`@fontsource-variable/merriweather`, wght
300–900, roman + italic). Roles seen in the mockups:
- Statement / titles: light italic (wght 300).
- Body: light roman (300), `--leading-body`.
- Nav, artwork titles: bold (700) roman; sub-nav items italic 300.
- Links: regular (400), with the arrow SVG after them.
Sizes come from `--step-*`. Keep measure under ~70ch.

Layout grid (GRID.svg): left margin `--margin-l` (15.8vw), content columns to
70vw, right rail `--rail` starting ~74vw, right margin `--margin-r` (9vw).
Mobile (< 760px): single column, 20px side padding.

## 3. Information architecture

| route | page | world | mockup |
|---|---|---|---|
| `/` | Home: burning poster stage | home | Artboard 4 copy 2/3, 9 copy |
| `/design` | Design landing | design | Artboard 8 / 17 |
| `/design/branding` | Branding index (rows) | design | Artboard 9 / 17 copy |
| `/design/illustrations` | Illustrations index (cards) | design | Artboard 10 / 17 copy 2 |
| `/design/packaging` | Packaging index | design | (TBD in Figma) |
| `/design/:category/:slug` | Case study (template rows) | design | Artboard 18 / 19 |
| `/art` | Gallery: 3D sphere of artworks | art | Artboard 3 copy 8 / 9 copy 2 |
| `/art/:slug` | Artwork | art | Artboard 3 copy 7 / 3 copy 9 / 8 / 9 |
| `/cv` | CV (print friendly) | design | CV text on the board |
| `*` | Not found | home | — |

Flow (from the board): Home → Design | Art. Design → Branding | Illustrations |
Packaging → Project index → Case study → Footer. Art → Gallery → Artwork → Footer.

## 4. Pages

### Home (OWNER: lead) — `src/pages/Home/`
Black stage, contain-fitted 16:9 composition. Poster at the exact rectangle it
occupies in the fire video; left column of six social icons; right rail with
statement, practice paragraph, turmeric collection line with a rule and the red
signature; "Design" and "Art" links under the poster. Clicking either plays the
poster-burning video in place with synthesised fire sound, then navigates.
Mobile: poster on top, links, collection line + signature, icon row.

### Design landing — `src/pages/design/DesignLanding.tsx`
Paper. Top block: three big links "Branding  Illustrations  Packaging" (oxblood,
`--step-2`, regular) on one line on desktop, separated by space, a turmeric 1px
rule under them across the content width, then small links "Home" and "Art"
with arrows. Mobile: stacked links each followed by a turmeric rule. Footer
(design variant) follows. Generous empty space as in the mockup (the block sits
in the upper third; footer starts around 55% of the first viewport).

### Header (design world) — `src/components/DesignHeader.tsx`
Row: ESC icon (turmeric, 22px) at the left margin, then category tabs
"Branding / Illustrations / Packaging" (active tab bold, others regular,
oxblood), then the yellow signature logo at the right margin (~64px wide).
ESC goes one level up: case study → its category index → `/design` → `/`.
Not sticky; on scroll up after 200px it may slide back in (keep subtle).

### Branding index — `src/pages/design/ProjectIndex.tsx` (variant `rows`)
One row per project (category = branding), mockup Artboard 9:
- col 1 (from the left margin, ~25%): title in light italic `--step-3`
  oxblood, then summary in graphite body.
- col 2 (~25%): tagline in bold with typographic quotes if present
  (“Speaking of Summer”), then "Work completed while at" + newline + studio in
  oxblood italic caps-as-written ("VOLUME").
- col 3: "View project" italic underlined link, then the arrow SVG.
- col 4 (to the right edge, bleeding off the page): cover image cropped to a
  wide band (aspect ~2.9:1) using the slot focal point.
Interaction: hovering a row (or focusing its link) slides the cover band left
by ~6% and brightens it slightly; the whole row is one link. Mobile: title,
summary/credit pair, "View project", then the cover full-width at 1920:850.

### Illustrations index — same file, variant `cards`
Two-up cards (mockup Artboard 10): image ~square (use cover slot, aspect 1:1),
title light italic oxblood, summary + credit in two columns, "View project" +
arrow. Grid aligned to the GRID columns; wraps to one column on mobile.

### Packaging index
Same as branding rows. With no projects show an empty state in the content
column: "Packaging case studies are on their way." plus links to Branding and
Illustrations. In admin mode show "Add a packaging project".

### Case study — `src/pages/design/CaseStudy.tsx`
Header block on paper (mockup Artboard 18 top): DesignHeader, then title
(light italic `--step-3`, oxblood) at the left margin; to the right, summary and
the tagline/studio credit in two small columns. Then the blocks, edge to edge
(100vw), no gaps, keeping the template ratios from `BLOCK_TEMPLATES`
(`full` 1920:850, `split` 2×960:850, `trio` 3×640:850, `feature` 1280:850
image + text column, `text` heading + paragraph on paper within the grid).
Images use `object-fit: cover` with `object-position` from the slot focal
point; empty slots render nothing publicly (a row with every slot empty is
skipped). On mobile `split`/`trio` stack vertically at 960:850 / 640:850 →
use the slot ratio for each stacked image (as in the mobile template frame).
Below the blocks: "Next project" link to the next project in the same
category (wraps), then the footer. Unknown slug → NotFound.

Scroll motion here is limited to a subtle parallax inside each image frame
(image moves 6% slower than the frame; disabled for reduced motion).

### Gallery (OWNER: lead for the 3D sphere) — `src/pages/art/Gallery.tsx`
Black. Top-left ESC (to `/`) and the title "Gallery" in turmeric `--step-2`.
Centre: `<ArtSphere>` (lead builds it in `src/scenes/sphere/`): a 3D cloud of
artwork cards; drag to rotate, click a card to open it. Lower right:
"Explore artworks" link + arrow to the first artwork. Footer (art variant).
The page renders `<ArtSphere artworks={published} onOpen={(slug) => ...} />`
inside a box of `min(78vh, 900px)` height; provide a plain grid fallback
(`<ArtGrid>`) used when WebGL is unavailable or the user prefers reduced motion.

### Artwork — `src/pages/art/Artwork.tsx`
Mockup Artboard 3 copy 7: ESC icon top-left (back to `/art`). Painting
contained in the content columns (max height ~78vh), aligned to the left
margin. Right rail: description paragraphs (ash, body light, small), then the
title in turmeric bold and medium in turmeric light italic, right-aligned
block as in the mockup. Lower in the rail: zoom icon; then "Next" + arrow and
"Gallery" + arrow. Zoom opens a full-screen viewer on black: the largest
variant, wheel/pinch to zoom (1×–4×), drag to pan, double-click toggles 2×,
ESC icon or Escape closes, focus is trapped and returned. Left/right arrow keys
go to previous/next artwork. Mobile: image full width, title + Next/Gallery,
description, footer. Missing description → hide the block, keep title.

### CV — `src/pages/CvPage.tsx`
Paper, print stylesheet (A4, no header/footer chrome when printing). Layout
from the board: name/role and location/phone/email at the top right, intro,
then section labels in a narrow left column (Education, Experience,
Capabilities, Selected work) with entries to the right. Selected work lists
the design projects with links. "Download PDF" appears if `site.cv.pdf` is set;
always offer "Print or save as PDF" (window.print()).

### Not found
Black. "This page has burned away." + links Home / Design / Art.

## 5. Shared components (`src/components/`)

- `Picture.tsx` — `<picture>` with AVIF + WebP `srcset` from a `MediaAsset`,
  `sizes` prop, `width/height` attributes, lazy by default, `fetchpriority`
  prop, LQIP: the `lqip` data URL as a blurred background (`filter: blur(20px)`
  on a pseudo layer, `background-color: media.color`) that fades out on load.
  Props: `media`, `sizes`, `alt`, `focal?`, `fit?: 'cover'|'contain'`,
  `priority?`, `className?`.
- `Svg.tsx` — inline SVG from `src/assets/svg/*.svg?raw`; `name` prop:
  `arrow | arrow-light | esc | zoom | logo | behance | contact | cv | instagram |
  linkedin | mail`. Colour via `currentColor`; arrow tip via `--arrow-tip`.
  `aria-hidden` unless `title` is given.
- `ArrowLink.tsx` — text + arrow SVG (arrow ~40px wide, turmeric), used for
  "Design", "Art", "Next", "Gallery", "View project", "Explore artworks".
  Hover: arrow moves 6px right with `--ease-out`.
- `Logo.tsx` — signature SVG coloured by `--logo` (or a `tone` prop).
- `SocialLinks.tsx` — six icons in order: Instagram, Behance, LinkedIn, Mail,
  Contact (tel:), CV (→ `/cv` or the PDF). Hand-drawn icons in ash; hover →
  `--fg-strong`. Each link has an accessible name.
- `Footer.tsx` — dark textured footer used on every Design and Art page
  (mockups F_A_D / F_D_D desktop, F_A_M / F_D_M mobile). Background: the
  `footer-texture` media, cover, with `--char` behind it. Desktop: nav block at
  the left margin ("Design" bold + "Branding / Illustration / Packaging"
  italic stacked, "Art" bold + "Gallery" italic, "Home" bold), signature logo
  (red in Art, yellow in Design) mid-left, and the six icons in a row below
  aligned to the right half. Mobile: logo left, nav centre, icons as a 2×3 grid.
  Height ~360px desktop. Also hosts the **admin key** (see §7).
- `BurnLink.tsx` — exported by lead from `src/core/transition` (see §8). Use it
  for every navigation that changes world (Home ↔ Design ↔ Art, footer nav).

Spelling: the mockups say "Galery"; use **"Gallery"** everywhere.

## 6. Content and API

Schemas: `shared/schema.ts` (zod). The whole site is one `Content` document.
Media for the seed is pre-built into `public/media/**`; its MediaAssets are in
`src/content/seed-media.json` (keys: `p-01`…`p-11`, `b-03`, `untitled-1`,
`bharatiyam`, `speaking-of-summer`, `cubic`, `kouyou`, `sipgel`,
`love-of-latte`, `footer-texture`).

### Seed content — `seed/content.json` (build it with `scripts/build-seed.ts`)
Projects (all `studio: "VOLUME"`, one `full` block with the hero image):
| slug | title | category | tagline | summary | media |
|---|---|---|---|---|---|
| cubic | Cubic | branding | — | Brand identity and visual system for a real estate business. | cubic |
| speaking-of-summer | Coffee Bean & Tea Leaf | branding | Speaking of Summer | Brand communication and campaign design across digital and retail touchpoints. | speaking-of-summer |
| bharatiyam | Bharatiyam | branding | — | Art direction, identity, and visual communication system, for a bottle manufacturing business. | bharatiyam |
| love-of-latte | Coffee Bean & Tea Leaf | branding | Love of Latte | Brand communication and campaign design across digital and retail touchpoints. | love-of-latte |
| sipgel | SipGel | illustrations | — | Bespoke illustration system to support the brand's visual language across communication. | sipgel |
| kouyou | Kouyou | illustrations | — | Illustration set to support the brand's visual language across communications and brand video. | kouyou |

Artworks (order as listed; `published: true`):
| slug | title | medium | series | media | description |
|---|---|---|---|---|---|
| lost-identity | Lost Identity | Oil on canvas | | p-01 | (A) |
| a-duty-now | A Duty Now | Oil on canvas | | p-02 | (B) |
| the-mother | The Mother | Digital painting, Autodesk Sketchbook | Expressions | p-09 | "Disgust and disappointment." + quote (C) |
| the-sister | The Sister | Digital painting, Autodesk Sketchbook | Expressions | b-03 | "Betrayal and heartbreak." + quote (D) |
| the-father | The Father | Digital painting, Autodesk Sketchbook | Expressions | p-08 | "Toxic masculinity." + quote (E) |
| the-brother | The Brother | Digital painting, Autodesk Sketchbook | Expressions | p-07 | "Guilt and realisation." + quote (F) |
| wrath | Wrath | | | p-05 | |
| untitled-03 | Untitled III | | | p-03 | |
| untitled-04 | Untitled IV | | | p-04 | |
| untitled-06 | Untitled VI | | | p-06 | |
| untitled-10 | Untitled X | | | p-10 | |
| untitled-11 | Untitled XI | | | p-11 | |
| untitled-embrace | Untitled | Oil on canvas | | untitled-1 | |

(A) "A woman draped in ceremonial red holds wheat stalks framing a face that has been pixelated into absence. The adornments remain: bangles, rings, the careful dress of a woman prepared to be seen. But her face has been redacted.\n\nLost Identity asks who performs this erasure, and in whose name. When a woman's face is deemed the cause of another's behavior, the answer is always the same: hide her. The painting refuses that logic. Her hands, unhidden and undeniable, remain as testimony."

(B) "She lies inverted, draped in red, a tear caught mid-fall from the corner of her eye. The composition itself is disorienting, because it should be.\n\nA Duty Now confronts what Indian law has for too long refused to name: marital rape. The red sweeping across the canvas is the color of sindoor, of auspicious beginnings. Here it billows like something never asked for. She is in her own home. She is not safe. And the law, for too long, has agreed with her silence."

(C) Expression: disgust and disappointment.\n\n“You saw something you did not wish for, feeling disgusted and disappointed as you had no control over it.”
(D) Expression: betrayal and heartbreak.\n\n“Everyone blames you and no one believes you. You look up to one person you trust and you realise that the person was never worthy of your trust.”
(E) Expression: toxic masculinity.\n\n“You know you cannot handle it anymore but you put on a happy face because ‘men don't cry’.”
(F) Expression: guilt and realisation.\n\n“When you realise that you might have done something really wrong, and now you cannot undo it.”

Site:
- name "Aahan Gupta", role "Brand designer and painter", location "Delhi, India"
- statement: "I don't think of art and design as separate practices. One teaches me to ask questions without expecting answers; the other asks me to answer them with intention. Somewhere, between the two is where I feel most at home."
- practice: "I see design as an act of translation, transforming thoughts, cultures, and intentions into forms that people can understand and connect with. My practice continues to evolve through that dialogue between expression and structure."
- collection: "This is a collection of work exploring the space between artistic expression and purposeful design."
- contact: instagram `https://www.instagram.com/aahan.gupta`, behance `https://www.behance.net/aahangupta1`, linkedin `https://www.linkedin.com/in/aahan-gupta-1b5495119/`, email `guptaaahan022@gmail.com`, phone `+91 96253 94349`
- cv.intro: "Working in branding and visual communication since 2021, with experience across identity systems, editorial design, and campaign development."
- cv.education: [{ title: "Bachelor of Design", org: "Delhi Technological University", period: "2022–2026" }]
- cv.experience:
  1. Creative Lead, VOLUME, March 2026 – present: "Worked alongside the Creative Director to develop brand identity systems across hospitality, healthcare, retail, and technology, and more, contributing from concept development through final execution."
  2. Sr. Creative Associate, VOLUME, January 2025 – March 2026: "Designed brand identities and communication systems across print and digital mediums while collaborating with strategy, account management, and production teams to deliver cohesive visual experiences for a diverse range of clients."
  3. Branding Associate, Access Health International (AHI), March 2022 – January 2025: "Developed visual identities and communication systems for healthcare initiatives, conferences, and publications, translating complex information into clear, accessible, and consistent visual communication."
  4. Jr. Graphic Designer (began as Art Intern), VOLUME, February 2021 – February 2022: "Contributed to branding and communication projects through identity development, editorial design, presentation design, and production, supporting projects from early exploration through final execution while developing a strong foundation in agency practice."
- cv.capabilities: Brand identity, Visual systems, Art direction, Typography, Editorial design, Presentation design, Packaging, Creative collaboration, Adobe Illustrator, Adobe Photoshop, Figma

### API (Express 5, `server/`, port 8787; Vite proxies `/api` and `/uploads`)
| method | path | auth | body / result |
|---|---|---|---|
| GET | `/api/content` | – | `Content` (published + unpublished; client filters) |
| PUT | `/api/content` | admin | `Content` with the `rev` it was based on → 200 new `Content` (rev+1) / 409 `{ error, current }` / 400 zod issues |
| POST | `/api/media` | admin | multipart `file` (jpeg/png/webp/avif/tiff, ≤ 60 MB) → `MediaAsset` (variants via `server/lib/variants.ts`, stored in `storage/uploads/<id>/`, url base `/uploads/<id>`) |
| POST | `/api/files` | admin | multipart `file` (pdf ≤ 15 MB) → `{ url }` in `/uploads/files/` |
| POST | `/api/auth/login` | – | `{ password }` → 204 + cookie / 401 / 429 `{ retryAfter }` |
| POST | `/api/auth/logout` | – | 204 |
| GET | `/api/auth/session` | – | `{ admin: boolean }` |
| POST | `/api/auth/password` | admin | `{ current, next }` → 204 / 400 / 401 |

Auth lives in `server/auth.ts` (OWNER: lead): `requireAdmin` middleware,
`authRouter`. Mount it as `app.use('/api/auth', authRouter)` and put
`requireAdmin` before every admin route. State-changing admin requests must
send header `X-Requested-With: aahan` (the middleware checks it and Origin).

Storage: `storage/content.json` (created from `seed/content.json` on first
run), `storage/backups/content-<iso>.json` (keep last 30), `storage/uploads/`,
`storage/auth.json` (lead). Writes are atomic (temp file + rename). Unused
upload files are not deleted automatically.

Production: `npm run build` then `npm start` serves `dist/`, `public/media`
(long cache), `/uploads` and the API from one process; SPA fallback via
`app.get('/{*splat}')`. Helmet with a CSP allowing self, `data:` and `blob:`
images/media, Google-free (fonts are bundled).

## 7. Admin

- **Key**: a small button (14px turmeric/ash ring with a centre dot, low
  opacity 0.45, full on hover/focus) at the bottom-right corner of the footer,
  and fixed at the bottom-right of the Home stage. `aria-label="Admin sign in"`.
  When signed in it shows a filled dot and opens the admin bar instead.
- **Sign-in dialog**: title "Admin access", password field (autocomplete
  `current-password`), button "Unlock". Errors: "That password didn't work."
  / "Too many attempts. Try again in N minutes." Escape closes.
- **Admin bar** (bottom-left floating, black on any world, ash text,
  turmeric accents): "Edit content" (opens the editor drawer), unsaved count,
  "Publish changes" (primary), "Discard", "Sign out".
- **Editor drawer** (right, 520px, full height, scrollable, keyboard
  accessible) with tabs:
  - *Projects*: grouped by category, drag to reorder (dnd-kit) + up/down
    buttons, "New project". Project form: title, slug (auto from title,
    editable), category, tagline, summary, studio, published, cover slot.
    **Blocks**: list of rows showing a mini diagram of the template and
    thumbnails; "Add row" opens the template picker (visual cards drawn from
    `BLOCK_TEMPLATES`: Full width 1920 × 850, Two up 960 × 850, Three up
    640 × 850, Image and text, Text); reorder rows, delete row (confirm),
    change a row's template keeping images where slots allow.
  - *Artworks*: list with thumbnails, reorder, "Add artwork" (upload first,
    then title/medium/year/size/series/description/published), delete.
  - *Home and contact*: statement, practice, collection, contact fields,
    CV fields (intro, entries, capabilities), CV PDF upload.
  - *Security*: change password (current, new, confirm; min 10 chars).
- **Slot editor** (used everywhere an image goes): drop zone with
  "Drop an image or browse" + the target size ("1920 × 850"), upload
  progress, preview cropped exactly like the live slot, click on the preview
  to set the focal point (crosshair marker), alt text field, "Replace" and
  "Remove". Warn (not block) when the image is narrower than the slot width.
- **Draft model**: the editor edits a draft copy in the client store; the live
  page renders the draft while signed in (live preview). "Publish changes"
  PUTs the draft with its base `rev`; on 409 show "Someone else published
  changes. Reload to get them." with a Reload button. Warn before leaving with
  unsaved changes (beforeunload).
- Admin UI uses the site's serif at small sizes, black panels with ash text
  and turmeric focus rings; it must be fully keyboard accessible.

## 8. Lead-owned modules (do not edit; import and use)

- `src/core/transition/` — `BurnLink` (props of `Link` + `kind?: 'auto' |
  'burn' | 'veil' | 'none'`), `useBurnNavigate()` returning
  `(to, kind?) => void`, `useRevealed()` (true once the incoming page is
  revealed; use it to start page entrance timelines), `<FxOverlay />`.
- `src/core/scroll/` — `<SmoothScroll />` (Lenis + GSAP ScrollTrigger),
  `useLenis()`.
- `src/core/audio/` — `fireAudio` and `useSound()` (muted toggle).
- `src/scenes/hero/`, `src/scenes/sphere/`, `src/fx/` — WebGL.
- `src/pages/Home/` — Home page.
- `server/auth.ts`, `server/lib/variants.ts`, `scripts/build-media.ts`.

## 9. Engineering rules

- React 19 + TypeScript strict, React Router 8 (declarative `BrowserRouter`,
  `Routes`, `Route` from `react-router`), zustand for client state, GSAP
  (`@gsap/react` `useGSAP` with `scope`, `SplitText.create` with `autoSplit`
  and returning the tween from `onSplit`), CSS modules (`*.module.css`) for
  component styles plus `src/styles/*.css` for globals.
- Lazy-load routes (`React.lazy`) so three.js only loads on Home and Gallery.
- Images: always `Picture` with correct `sizes`; above-the-fold images get
  `priority`.
- Accessibility: visible focus (`outline: 2px solid var(--focus)`), skip link,
  landmarks, `prefers-reduced-motion` respected (no parallax, no burn: quick
  cross-fades), alt text from the slot or artwork title.
- No new dependencies without a reason noted in the final report.
- `npm run typecheck` and `npm run build` must pass.
