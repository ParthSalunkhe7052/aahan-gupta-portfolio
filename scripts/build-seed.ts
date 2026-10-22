/**
 * Builds seed/content.json (the first-run content document) from the copy in
 * docs/SPEC.md section 6 and the pre-built media in src/content/seed-media.json.
 *
 *   npm run seed
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Content, type Artwork, type Category, type MediaAsset, type Project, type Site } from '../shared/schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const media = JSON.parse(await readFile(path.join(ROOT, 'src', 'content', 'seed-media.json'), 'utf8')) as Record<
  string,
  MediaAsset
>;

function asset(key: string): MediaAsset {
  const m = media[key];
  if (!m) throw new Error(`seed-media.json has no "${key}"`);
  return m;
}

/* ---------- design projects ---------- */

const STUDIO = 'VOLUME';
const CAMPAIGN = 'Brand communication and campaign design across digital and retail touchpoints.';

interface ProjectSeed {
  slug: string;
  title: string;
  category: Category;
  tagline: string;
  summary: string;
  media: string;
  /** Where the image is cropped from when it is fitted into a wide or square frame. */
  focalY: number;
  alt: string;
}

const projectSeeds: ProjectSeed[] = [
  {
    slug: 'cubic',
    title: 'Cubic',
    category: 'branding',
    tagline: '',
    summary: 'Brand identity and visual system for a real estate business.',
    media: 'cubic',
    focalY: 0.43,
    alt: 'The Cubic wordmark in cream letters on a deep blue slab',
  },
  {
    slug: 'speaking-of-summer',
    title: 'Coffee Bean & Tea Leaf',
    category: 'branding',
    tagline: 'Speaking of Summer',
    summary: CAMPAIGN,
    media: 'speaking-of-summer',
    focalY: 0.55,
    alt: 'Speaking of Summer campaign artwork in pastel lilac and yellow',
  },
  {
    slug: 'bharatiyam',
    title: 'Bharatiyam',
    category: 'branding',
    tagline: '',
    summary: 'Art direction, identity, and visual communication system, for a bottle manufacturing business.',
    media: 'bharatiyam',
    focalY: 0.45,
    alt: 'The Bharatiyam enamel pin on a dark suit lapel',
  },
  {
    slug: 'love-of-latte',
    title: 'Coffee Bean & Tea Leaf',
    category: 'branding',
    tagline: 'Love of Latte',
    summary: CAMPAIGN,
    media: 'love-of-latte',
    focalY: 0.5,
    alt: 'Love of Latte campaign artwork in purple and white',
  },
  {
    slug: 'sipgel',
    title: 'SipGel',
    category: 'illustrations',
    tagline: '',
    summary: "Bespoke illustration system to support the brand's visual language across communication.",
    media: 'sipgel',
    focalY: 0.45,
    alt: 'SipGel illustration of a woman stretching in soft peach, lilac and grey',
  },
  {
    slug: 'kouyou',
    title: 'Kouyou',
    category: 'illustrations',
    tagline: '',
    summary: "Illustration set to support the brand's visual language across communications and brand video.",
    media: 'kouyou',
    focalY: 0.6,
    alt: 'Kouyou illustration of tall green grass against a warm, hazy background',
  },
];

const projects: Project[] = projectSeeds.map((p) => ({
  id: `prj-${p.slug}`,
  slug: p.slug,
  title: p.title,
  category: p.category,
  tagline: p.tagline,
  summary: p.summary,
  studio: STUDIO,
  cover: { media: asset(p.media), focal: { x: 0.5, y: p.focalY }, alt: p.alt },
  // The whole case-study page as one uncropped image.
  blocks: [
    {
      id: `blk-${p.slug}-1`,
      type: 'long',
      slots: [{ media: asset(`${p.slug}-full`), focal: { x: 0.5, y: 0.5 }, alt: `${p.title}${p.tagline ? `, ${p.tagline}` : ''}: the full case study` }],
    },
  ],
  published: true,
}));

/* ---------- artworks ---------- */

const OIL = 'Oil on canvas';
const DIGITAL = 'Digital painting, Autodesk Sketchbook';

const lostIdentity =
  `A woman draped in ceremonial red holds wheat stalks framing a face that has been pixelated into absence. The adornments remain: bangles, rings, the careful dress of a woman prepared to be seen. But her face has been redacted.\n\nLost Identity asks who performs this erasure, and in whose name. When a woman's face is deemed the cause of another's behavior, the answer is always the same: hide her. The painting refuses that logic. Her hands, unhidden and undeniable, remain as testimony.`;
const aDutyNow =
  'She lies inverted, draped in red, a tear caught mid-fall from the corner of her eye. The composition itself is disorienting, because it should be.\n\nA Duty Now confronts what Indian law has for too long refused to name: marital rape. The red sweeping across the canvas is the color of sindoor, of auspicious beginnings. Here it billows like something never asked for. She is in her own home. She is not safe. And the law, for too long, has agreed with her silence.';

interface ArtworkSeed {
  slug: string;
  title: string;
  medium?: string;
  series?: string;
  media: string;
  description?: string;
}

const artworkSeeds: ArtworkSeed[] = [
  { slug: 'lost-identity', title: 'Lost Identity', medium: OIL, media: 'p-01', description: lostIdentity },
  { slug: 'a-duty-now', title: 'A Duty Now', medium: OIL, media: 'p-02', description: aDutyNow },
  {
    slug: 'the-mother',
    title: 'The Mother',
    medium: DIGITAL,
    series: 'Expressions',
    media: 'p-09',
    description:
      'Expression: disgust and disappointment.\n\n“You saw something you did not wish for, feeling disgusted and disappointed as you had no control over it.”',
  },
  {
    slug: 'the-sister',
    title: 'The Sister',
    medium: DIGITAL,
    series: 'Expressions',
    media: 'b-03',
    description:
      'Expression: betrayal and heartbreak.\n\n“Everyone blames you and no one believes you. You look up to one person you trust and you realise that the person was never worthy of your trust.”',
  },
  {
    slug: 'the-father',
    title: 'The Father',
    medium: DIGITAL,
    series: 'Expressions',
    media: 'p-08',
    description:
      `Expression: toxic masculinity.\n\n“You know you cannot handle it anymore but you put on a happy face because ‘men don't cry’.”`,
  },
  {
    slug: 'the-brother',
    title: 'The Brother',
    medium: DIGITAL,
    series: 'Expressions',
    media: 'p-07',
    description:
      'Expression: guilt and realisation.\n\n“When you realise that you might have done something really wrong, and now you cannot undo it.”',
  },
  { slug: 'wrath', title: 'Wrath', media: 'p-05' },
  { slug: 'untitled-03', title: 'Untitled III', media: 'p-03' },
  { slug: 'untitled-04', title: 'Untitled IV', media: 'p-04' },
  { slug: 'untitled-06', title: 'Untitled VI', media: 'p-06' },
  { slug: 'untitled-10', title: 'Untitled X', media: 'p-10' },
  { slug: 'untitled-11', title: 'Untitled XI', media: 'p-11' },
  { slug: 'untitled-embrace', title: 'Untitled', medium: OIL, media: 'untitled-1' },
  // Later additions: titles are placeholders until the painter names them in the editor.
  { slug: 'untitled-12', title: 'Untitled XII', media: 'n-01' },
  { slug: 'untitled-13', title: 'Untitled XIII', media: 'n-02' },
  { slug: 'untitled-14', title: 'Untitled XIV', media: 'n-03' },
  { slug: 'untitled-15', title: 'Untitled XV', media: 'n-04' },
  { slug: 'untitled-16', title: 'Untitled XVI', media: 'n-05' },
  { slug: 'untitled-17', title: 'Untitled XVII', media: 'n-06' },
  { slug: 'untitled-18', title: 'Untitled XVIII', media: 'n-07' },
];

const artworks: Artwork[] = artworkSeeds.map((a) => ({
  id: `art-${a.slug}`,
  slug: a.slug,
  title: a.title,
  medium: a.medium ?? '',
  year: '',
  size: '',
  series: a.series ?? '',
  description: a.description ?? '',
  image: asset(a.media),
  published: true,
}));

/* ---------- site ---------- */

const site: Site = {
  name: 'Aahan Gupta',
  role: 'Brand designer and painter',
  location: 'Delhi, India',
  statement:
    "I don't think of art and design as separate practices. One teaches me to ask questions without expecting answers; the other asks me to answer them with intention. Somewhere, between the two is where I feel most at home.",
  practice:
    'I see design as an act of translation, transforming thoughts, cultures, and intentions into forms that people can understand and connect with. My practice continues to evolve through that dialogue between expression and structure.',
  collection: 'This is a collection of work exploring the space between artistic expression and purposeful design.',
  contact: {
    instagram: 'https://www.instagram.com/aahan.gupta',
    behance: 'https://www.behance.net/aahangupta1',
    linkedin: 'https://www.linkedin.com/in/aahan-gupta-1b5495119/',
    email: 'guptaaahan022@gmail.com',
    phone: '+91 96253 94349',
  },
  cv: {
    intro:
      'Working in branding and visual communication since 2021, with experience across identity systems, editorial design, and campaign development.',
    education: [{ title: 'Bachelor of Design', org: 'Delhi Technological University', period: '2022–2026', body: '' }],
    experience: [
      {
        title: 'Creative Lead',
        org: 'VOLUME',
        period: 'March 2026 – present',
        body: 'Worked alongside the Creative Director to develop brand identity systems across hospitality, healthcare, retail, and technology, and more, contributing from concept development through final execution.',
      },
      {
        title: 'Sr. Creative Associate',
        org: 'VOLUME',
        period: 'January 2025 – March 2026',
        body: 'Designed brand identities and communication systems across print and digital mediums while collaborating with strategy, account management, and production teams to deliver cohesive visual experiences for a diverse range of clients.',
      },
      {
        title: 'Branding Associate',
        org: 'Access Health International (AHI)',
        period: 'March 2022 – January 2025',
        body: 'Developed visual identities and communication systems for healthcare initiatives, conferences, and publications, translating complex information into clear, accessible, and consistent visual communication.',
      },
      {
        title: 'Jr. Graphic Designer (began as Art Intern)',
        org: 'VOLUME',
        period: 'February 2021 – February 2022',
        body: 'Contributed to branding and communication projects through identity development, editorial design, presentation design, and production, supporting projects from early exploration through final execution while developing a strong foundation in agency practice.',
      },
    ],
    capabilities: [
      'Brand identity',
      'Visual systems',
      'Art direction',
      'Typography',
      'Editorial design',
      'Presentation design',
      'Packaging',
      'Creative collaboration',
      'Adobe Illustrator',
      'Adobe Photoshop',
      'Figma',
    ],
    pdf: '',
  },
  fireAudio: '',
};

const content = Content.parse({
  rev: 1,
  updatedAt: new Date().toISOString(),
  site,
  projects,
  artworks,
});

const out = path.join(ROOT, 'seed', 'content.json');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
console.log(`Wrote seed/content.json: ${content.projects.length} projects, ${content.artworks.length} artworks.`);
