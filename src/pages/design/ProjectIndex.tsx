import { useRef } from 'react';
import { useParams } from 'react-router';
import { CATEGORY_LABELS, isCategory, type Category } from '@shared/model';
import type { Project } from '@shared/schema';
import { ArrowLink } from '@/components/ArrowLink';
import { DesignHeader } from '@/components/DesignHeader';
import { Footer } from '@/components/Footer';
import { Picture } from '@/components/Picture';
import { Svg } from '@/components/Svg';
import { useEntrance } from '@/components/useEntrance';
import { usePageTitle } from '@/components/usePageTitle';
import { useAdmin, useProjects } from '@/content/store';
import { BurnLink } from '@/core/transition';
import NotFound from '../NotFound';
import styles from './ProjectIndex.module.css';

/** Branding and packaging read as wide rows; illustrations as two-up square cards. */
const VARIANT: Record<Category, 'rows' | 'cards'> = {
  branding: 'rows',
  illustrations: 'cards',
  packaging: 'rows',
};

export default function ProjectIndex() {
  const { category } = useParams();
  if (!isCategory(category)) return <NotFound />;
  return <Index category={category} />;
}

function Credit({ studio }: { studio: string }) {
  if (!studio) return null;
  return (
    <span className={styles.credit}>
      Work completed while at <em>{studio}</em>
    </span>
  );
}

function ViewProject() {
  return (
    <span className={styles.view}>
      <span className={styles.viewText}>View project</span>
      <Svg name="arrow" className={styles.arrow} />
    </span>
  );
}

function linkLabel(p: Project) {
  return p.tagline ? `${p.title}, ${p.tagline}. View project` : `${p.title}. View project`;
}

function Row({ project, category }: { project: Project; category: Category }) {
  const { signedIn } = useAdmin();
  return (
    <li className={styles.item} data-enter>
      <BurnLink to={`/design/${category}/${project.slug}`} className={styles.row} aria-label={linkLabel(project)}>
        <span className={styles.text}>
          <span className={styles.title}>
            {project.title}
            {signedIn && !project.published && <span className={styles.draftTag}>Unpublished</span>}
          </span>
          <span className={styles.summary}>{project.summary}</span>
          <span className={styles.meta}>
            {project.tagline && <span className={styles.tagline}>{`“${project.tagline}”`}</span>}
            <Credit studio={project.studio} />
          </span>
          <ViewProject />
        </span>
        <span className={styles.cover}>
          {project.cover.media && (
            <span className={styles.slide}>
              <Picture
                media={project.cover.media}
                focal={project.cover.focal}
                alt=""
                ratio="fill"
                sizes="(max-width: 759px) 90vw, 33vw"
              />
            </span>
          )}
        </span>
      </BurnLink>
    </li>
  );
}

function Card({ project, category }: { project: Project; category: Category }) {
  const { signedIn } = useAdmin();
  return (
    <li className={styles.cardItem} data-enter>
      <BurnLink to={`/design/${category}/${project.slug}`} className={styles.card} aria-label={linkLabel(project)}>
        <span className={styles.thumb}>
          {project.cover.media && (
            <span className={styles.thumbInner}>
              <Picture
                media={project.cover.media}
                focal={project.cover.focal}
                alt=""
                ratio="fill"
                sizes="(max-width: 759px) 90vw, 26vw"
              />
            </span>
          )}
        </span>
        <span className={styles.cardTitle}>
          {project.title}
          {signedIn && !project.published && <span className={styles.draftTag}>Unpublished</span>}
        </span>
        <span className={styles.cardMeta}>
          <span className={styles.summary}>{project.summary}</span>
          <span className={styles.meta}>
            {project.tagline && <span className={styles.tagline}>{`“${project.tagline}”`}</span>}
            <Credit studio={project.studio} />
          </span>
        </span>
        <ViewProject />
      </BurnLink>
    </li>
  );
}

function Empty({ category }: { category: Category }) {
  const { signedIn, openEditor } = useAdmin();
  const others = (Object.keys(CATEGORY_LABELS) as Category[]).filter((c) => c !== category);
  return (
    <div className={styles.empty} data-enter>
      <p>{CATEGORY_LABELS[category]} case studies are on their way.</p>
      <div className={styles.emptyLinks}>
        {others.map((c) => (
          <ArrowLink key={c} to={`/design/${c}`}>
            {CATEGORY_LABELS[c]}
          </ArrowLink>
        ))}
      </div>
      {signedIn && (
        <button
          type="button"
          className={styles.add}
          onClick={() => openEditor('projects', { kind: 'new-project', category })}
        >
          {`Add a ${category === 'illustrations' ? 'illustration' : category} project`}
        </button>
      )}
    </div>
  );
}

function Index({ category }: { category: Category }) {
  const projects = useProjects(category);
  const { signedIn, openEditor } = useAdmin();
  const main = useRef<HTMLElement>(null);
  useEntrance(main, [projects.length]);
  usePageTitle(CATEGORY_LABELS[category]);
  const variant = VARIANT[category];

  return (
    <>
      <DesignHeader back="/" backLabel="Back to home" active={category} />
      <main id="main" ref={main} className={styles.main}>
        <h1 className="visually-hidden">{CATEGORY_LABELS[category]}</h1>
        {projects.length === 0 ? (
          <Empty category={category} />
        ) : (
          <>
            <ul className={variant === 'rows' ? styles.rows : styles.cards}>
              {projects.map((p) =>
                variant === 'rows' ? (
                  <Row key={p.id} project={p} category={category} />
                ) : (
                  <Card key={p.id} project={p} category={category} />
                ),
              )}
            </ul>
            {signedIn && (
              <button
                type="button"
                className={styles.add}
                onClick={() => openEditor('projects', { kind: 'new-project', category })}
              >
                New project in {CATEGORY_LABELS[category].toLowerCase()}
              </button>
            )}
          </>
        )}
      </main>
      <Footer world="design" />
    </>
  );
}
