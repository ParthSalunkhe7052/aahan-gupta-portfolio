import { useRef, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BLOCK_TEMPLATES, CATEGORY_LABELS, isCategory, type Category } from '@shared/model';
import type { Block, Project, Slot } from '@shared/schema';
import { ArrowLink } from '@/components/ArrowLink';
import { DesignHeader } from '@/components/DesignHeader';
import { Footer } from '@/components/Footer';
import { Picture } from '@/components/Picture';
import { useEntrance } from '@/components/useEntrance';
import { usePageTitle } from '@/components/usePageTitle';
import { useAdmin, useProjects } from '@/content/store';
import { prefersReducedMotion } from '@/core/motion';
import NotFound from '../NotFound';
import styles from './CaseStudy.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function CaseStudy() {
  const { category, slug } = useParams();
  const valid = isCategory(category);
  const projects = useProjects(valid ? category : undefined);
  const project = valid ? projects.find((p) => p.slug === slug) : undefined;
  if (!valid || !project) return <NotFound />;
  return <Study project={project} category={category} siblings={projects} />;
}

/* ---------- images ---------- */

/** Moves its content 6% slower than the frame it sits in while the page scrolls. */
function Shift({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      gsap.fromTo(
        el,
        { yPercent: -3 },
        {
          yPercent: 3,
          ease: 'none',
          scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={styles.shift}>
      {children}
    </div>
  );
}

function SlotFrame({
  slot,
  size,
  sizes,
  priority,
  label,
}: {
  slot: Slot;
  size: { w: number; h: number };
  sizes: string;
  priority?: boolean;
  label: string;
}) {
  const { signedIn } = useAdmin();
  const style = { aspectRatio: `${size.w} / ${size.h}` };
  if (!slot.media) {
    // Visitors get an empty cell; the signed-in admin sees what is missing.
    return (
      <div className={signedIn ? `${styles.frame} ${styles.placeholder}` : styles.frame} style={style}>
        {signedIn && <span>{label}: empty slot, {size.w} × {size.h}</span>}
      </div>
    );
  }
  return (
    <div className={styles.frame} style={style}>
      <Shift>
        <Picture media={slot.media} focal={slot.focal} alt={slot.alt} ratio="fill" sizes={sizes} priority={priority} />
      </Shift>
    </div>
  );
}

/**
 * A whole image at its own proportions, edge to edge. It is never laid out wider than twice its own
 * pixel width, so a small export is not stretched into a blur; beyond that it is centred.
 */
function LongImage({ slot, size, priority, label }: { slot: Slot; size: { w: number; h: number }; priority?: boolean; label: string }) {
  const { signedIn } = useAdmin();
  const media = slot.media;
  if (!media) {
    return (
      <div className={signedIn ? `${styles.frame} ${styles.placeholder}` : styles.frame} style={{ aspectRatio: `${size.w} / ${size.h}` }}>
        {signedIn && <span>{label}: empty slot, any height</span>}
      </div>
    );
  }
  return (
    <div className={styles.long} style={{ maxWidth: `${media.width * 2}px` }}>
      <Picture media={media} alt={slot.alt} sizes="(max-width: 2400px) 100vw, 2400px" priority={priority} />
    </div>
  );
}

/* ---------- text ---------- */

function Paragraphs({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <>
      {parts.map((p, i) => (
        <p key={i} className={className}>
          {p}
        </p>
      ))}
    </>
  );
}

/* ---------- blocks ---------- */

function BlockRow({ block, first }: { block: Block; first: boolean }) {
  const sizes = BLOCK_TEMPLATES[block.type].slots;
  switch (block.type) {
    case 'full':
      return (
        <section className={styles.full}>
          <SlotFrame slot={block.slots[0]} size={sizes[0]} sizes="100vw" priority={first} label="Image" />
        </section>
      );
    case 'long':
      return (
        <section className={styles.longRow}>
          <LongImage slot={block.slots[0]} size={sizes[0]} priority={first} label="Image" />
        </section>
      );
    case 'split':
      return (
        <section className={styles.split}>
          {block.slots.map((s, i) => (
            <SlotFrame key={i} slot={s} size={sizes[i]} sizes="(max-width: 759px) 100vw, 50vw" priority={first} label={`Image ${i + 1}`} />
          ))}
        </section>
      );
    case 'trio':
      return (
        <section className={styles.trio}>
          {block.slots.map((s, i) => (
            <SlotFrame key={i} slot={s} size={sizes[i]} sizes="(max-width: 759px) 100vw, 34vw" priority={first} label={`Image ${i + 1}`} />
          ))}
        </section>
      );
    case 'feature':
      return (
        <section className={block.side === 'right' ? `${styles.feature} ${styles.featureRight}` : styles.feature}>
          <div className={styles.featureImage}>
            <SlotFrame slot={block.slots[0]} size={sizes[0]} sizes="(max-width: 759px) 100vw, 67vw" priority={first} label="Image" />
          </div>
          <div className={styles.featureText}>
            {block.heading && <h2 className={styles.heading}>{block.heading}</h2>}
            <Paragraphs text={block.body} className={styles.body} />
          </div>
        </section>
      );
    case 'text':
      return (
        <section className={styles.text}>
          {block.heading && <h2 className={styles.heading}>{block.heading}</h2>}
          <Paragraphs text={block.body} className={styles.body} />
        </section>
      );
  }
}

/** A row is skipped for visitors when it has image slots and none holds an image. */
function isEmptyRow(block: Block): boolean {
  if (block.type === 'text') return !block.heading.trim() && !block.body.trim();
  if (block.type === 'feature') return !block.slots[0].media && !block.heading.trim() && !block.body.trim();
  return block.slots.every((s) => !s.media);
}

/* ---------- page ---------- */

function Study({ project, category, siblings }: { project: Project; category: Category; siblings: Project[] }) {
  const main = useRef<HTMLElement>(null);
  const { signedIn, openEditor } = useAdmin();
  useEntrance(main, [project.id]);
  usePageTitle(project.tagline ? `${project.title}, ${project.tagline}` : project.title);

  const blocks = signedIn ? project.blocks : project.blocks.filter((b) => !isEmptyRow(b));
  const index = siblings.findIndex((p) => p.id === project.id);
  const next = siblings.length > 1 ? siblings[(index + 1) % siblings.length] : null;

  return (
    <>
      <DesignHeader back={`/design/${category}`} backLabel={`Back to ${CATEGORY_LABELS[category]}`} active={category} />
      <main id="main" ref={main}>
        <div className={styles.head}>
          <h1 className={styles.title} data-enter>
            {project.title}
            {signedIn && !project.published && <span className={styles.draftTag}>Unpublished</span>}
          </h1>
          {project.summary && (
            <p className={styles.summary} data-enter>
              {project.summary}
            </p>
          )}
          {(project.tagline || project.studio) && (
            <p className={styles.credit} data-enter>
              {project.tagline && <span className={styles.tagline}>{`“${project.tagline}”`}</span>}
              {project.studio && (
                <span className={styles.studio}>
                  Work completed while at <em>{project.studio}</em>
                </span>
              )}
            </p>
          )}
          {signedIn && (
            <button
              type="button"
              className={styles.edit}
              onClick={() => openEditor('projects', { kind: 'edit-project', id: project.id })}
            >
              Edit this project
            </button>
          )}
        </div>

        <div className={styles.blocks}>
          {blocks.map((b, i) => (
            <BlockRow key={b.id} block={b} first={i === 0} />
          ))}
        </div>

        <nav className={styles.after} aria-label="More work">
          {next ? (
            <ArrowLink to={`/design/${next.category}/${next.slug}`} aria-label={`Next project: ${next.title}`}>
              Next project
            </ArrowLink>
          ) : (
            <ArrowLink to={`/design/${category}`}>All {CATEGORY_LABELS[category].toLowerCase()}</ArrowLink>
          )}
        </nav>
      </main>
      <Footer world="design" />
    </>
  );
}
