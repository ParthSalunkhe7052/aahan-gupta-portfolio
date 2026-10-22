import { useMemo, useRef, type ReactNode } from 'react';
import { CATEGORY_LABELS } from '@shared/model';
import type { CvEntry, Project } from '@shared/schema';
import { DesignHeader } from '@/components/DesignHeader';
import { Footer } from '@/components/Footer';
import { telHref } from '@/components/links';
import { useEntrance } from '@/components/useEntrance';
import { usePageTitle } from '@/components/usePageTitle';
import { useProjects, useSite } from '@/content/store';
import { BurnLink } from '@/core/transition';
import styles from './CvPage.module.css';

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={styles.row} data-enter>
      <h2 className={styles.label}>{label}</h2>
      <div className={styles.entries}>{children}</div>
    </section>
  );
}

function Entry({ entry }: { entry: CvEntry }) {
  return (
    <article className={styles.entry}>
      <h3 className={styles.entryTitle}>
        {entry.title}
        {entry.org && <span className={styles.org}>, {entry.org}</span>}
      </h3>
      {entry.period && <p className={styles.period}>{entry.period}</p>}
      {entry.body && <p className={styles.body}>{entry.body}</p>}
    </article>
  );
}

/** Projects that share a title (the two Coffee Bean & Tea Leaf campaigns) read as one entry with two links. */
function groupByTitle(projects: Project[]) {
  const groups: { title: string; items: Project[] }[] = [];
  for (const p of projects) {
    const hit = groups.find((g) => g.title === p.title);
    if (hit) hit.items.push(p);
    else groups.push({ title: p.title, items: [p] });
  }
  return groups;
}

export default function CvPage() {
  const site = useSite();
  const projects = useProjects();
  const main = useRef<HTMLElement>(null);
  useEntrance(main);
  usePageTitle('CV');
  const groups = useMemo(() => groupByTitle(projects), [projects]);
  const { cv, contact } = site;

  return (
    <>
      <DesignHeader back="/" backLabel="Back to home" />
      <main id="main" ref={main} className={styles.page}>
        <header className={styles.top} data-enter>
          <div>
            <h1 className={styles.name}>{site.name}</h1>
            <p>{site.role}</p>
          </div>
          <div>
            <p className={styles.strong}>{site.location}</p>
            {contact.phone && (
              <p>
                <a href={telHref(contact.phone)} className={styles.plain}>
                  {contact.phone}
                </a>
              </p>
            )}
            {contact.email && (
              <p>
                <a href={`mailto:${contact.email}`} className={styles.mail}>
                  {contact.email}
                </a>
              </p>
            )}
          </div>
        </header>

        <p className={styles.intro} data-enter>
          {cv.intro}
        </p>

        {cv.education.length > 0 && (
          <Section label="Education">
            {cv.education.map((e, i) => (
              <Entry key={i} entry={e} />
            ))}
          </Section>
        )}

        {cv.experience.length > 0 && (
          <Section label="Experience">
            {cv.experience.map((e, i) => (
              <Entry key={i} entry={e} />
            ))}
          </Section>
        )}

        {cv.capabilities.length > 0 && (
          <Section label="Capabilities">
            <p className={styles.body}>{cv.capabilities.join(', ')}</p>
          </Section>
        )}

        {groups.length > 0 && (
          <Section label="Selected work">
            {groups.map((g) => (
              <article key={g.title} className={styles.entry}>
                <h3 className={styles.entryTitle}>{g.title}</h3>
                {g.items[0].summary && <p className={styles.body}>{g.items[0].summary}</p>}
                {g.items[0].studio && <p className={styles.period}>Work completed while at {g.items[0].studio}</p>}
                <ul className={styles.links}>
                  {g.items.map((p) => (
                    <li key={p.id}>
                      <BurnLink to={`/design/${p.category}/${p.slug}`}>
                        {p.tagline || `${CATEGORY_LABELS[p.category]} case study`}
                      </BurnLink>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </Section>
        )}

        <div className={styles.actions} data-noprint data-enter>
          {cv.pdf && (
            <a href={cv.pdf} download className={styles.action}>
              Download PDF
            </a>
          )}
          <button type="button" className={styles.action} onClick={() => window.print()}>
            Print or save as PDF
          </button>
        </div>
      </main>
      <Footer world="design" />
    </>
  );
}
