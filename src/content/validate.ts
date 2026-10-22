import type { Content } from '@shared/schema';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text: string): string {
  const s = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'untitled';
}

/** Returns `base`, or `base-2`, `base-3`... until `taken` no longer contains it. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Plain-language problems that would make a publish fail. Empty when the draft is fine. */
export function problemsIn(doc: Content): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of doc.projects) {
    const name = p.title.trim() || 'A project';
    if (!p.title.trim()) out.push('A project has no title.');
    if (!SLUG.test(p.slug)) out.push(`${name} needs a web address made of lowercase letters, numbers and hyphens.`);
    const key = `${p.category}/${p.slug}`;
    if (seen.has(key)) out.push(`${name} shares its web address with another ${p.category} project.`);
    seen.add(key);
  }
  const art = new Set<string>();
  for (const a of doc.artworks) {
    const name = a.title.trim() || 'An artwork';
    if (!a.title.trim()) out.push('An artwork has no title.');
    if (!SLUG.test(a.slug)) out.push(`${name} needs a web address made of lowercase letters, numbers and hyphens.`);
    if (art.has(a.slug)) out.push(`${name} shares its web address with another artwork.`);
    art.add(a.slug);
  }
  for (const key of ['instagram', 'behance', 'linkedin'] as const) {
    const v = doc.site.contact[key];
    if (v && !/^https?:\/\//i.test(v)) out.push(`The ${key} link must start with https://.`);
  }
  return out;
}

/** How many separate things differ between the published document and the draft. */
export function changeCount(published: Content, draft: Content): number {
  let n = 0;
  if (JSON.stringify(published.site) !== JSON.stringify(draft.site)) n++;
  const countList = <T extends { id: string }>(a: T[], b: T[]) => {
    const before = new Map(a.map((x) => [x.id, JSON.stringify(x)]));
    let changed = 0;
    for (const x of b) {
      const prev = before.get(x.id);
      if (prev === undefined || prev !== JSON.stringify(x)) changed++;
      before.delete(x.id);
    }
    changed += before.size; // removed
    const inB = new Set(b.map((x) => x.id));
    const inA = new Set(a.map((x) => x.id));
    const orderA = a.filter((x) => inB.has(x.id)).map((x) => x.id).join();
    const orderB = b.filter((x) => inA.has(x.id)).map((x) => x.id).join();
    if (orderA !== orderB) changed++; // reordered
    return changed;
  };
  n += countList(published.projects, draft.projects);
  n += countList(published.artworks, draft.artworks);
  return n;
}
