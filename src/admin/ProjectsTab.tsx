import { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { CATEGORY_LABELS, type Category, type Project } from '@shared/schema';
import { useContentStore } from '@/content/store';
import { uniqueSlug } from '@/content/validate';
import { newBlock, emptySlot } from './blocks';
import { ProjectForm } from './ProjectForm';
import { SortableList } from './SortableList';
import s from './admin.module.css';

/** Stable empty list: a fresh [] in a selector would re-render forever. */
const NONE: never[] = [];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

/** Reorders the projects of one category inside the single projects array, leaving the others where they are. */
function reorderWithin(projects: Project[], category: Category, from: number, to: number): Project[] {
  const slots: number[] = [];
  projects.forEach((p, i) => {
    if (p.category === category) slots.push(i);
  });
  const subset = slots.map((i) => projects[i]);
  const [moved] = subset.splice(from, 1);
  subset.splice(to, 0, moved);
  const next = projects.slice();
  slots.forEach((pos, k) => {
    next[pos] = subset[k];
  });
  return next;
}

export function ProjectsTab() {
  const projects = useContentStore((st) => st.draft?.projects ?? NONE);
  const edit = useContentStore((st) => st.edit);
  const intent = useContentStore((st) => st.editorIntent);
  const clearIntent = useContentStore((st) => st.clearIntent);
  const [selected, setSelected] = useState<string | null>(null);
  const [expand, setExpand] = useState(false);
  const handled = useRef<unknown>(null);

  const create = (category: Category) => {
    const id = `prj-${nanoid(8)}`;
    edit((d) => {
      const taken = d.projects.filter((p) => p.category === category).map((p) => p.slug);
      d.projects.push({
        id,
        slug: uniqueSlug('untitled-project', taken),
        title: 'Untitled project',
        category,
        tagline: '',
        summary: '',
        studio: '',
        cover: emptySlot(),
        blocks: [newBlock('full')],
        // Not public until it has been filled in and switched on.
        published: false,
      });
    });
    setSelected(id);
  };

  // "Add a packaging project" and "Edit this project" on the pages arrive here as an intent.
  useEffect(() => {
    if (!intent || handled.current === intent) return;
    handled.current = intent;
    if (intent.kind === 'new-project') create(intent.category);
    else if (intent.kind === 'edit-project') {
      setSelected(intent.id);
      setExpand(!!intent.expand);
    }
    clearIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  const current = selected ? projects.find((p) => p.id === selected) : undefined;
  if (current) {
    return (
      <ProjectForm
        key={current.id}
        project={current}
        expandRows={expand}
        onBack={() => setSelected(null)}
        onDeleted={() => setSelected(null)}
      />
    );
  }

  return (
    <div>
      {CATEGORIES.map((category) => {
        const items = projects.filter((p) => p.category === category);
        return (
          <section key={category} aria-labelledby={`grp-${category}`}>
            <div className={s.groupHead}>
              <h3 className={s.sectionTitle} id={`grp-${category}`}>
                {CATEGORY_LABELS[category]}
              </h3>
              <button
                type="button"
                className={`${s.btn} ${s.btnSmall}`}
                onClick={() => create(category)}
                aria-label={`New project in ${CATEGORY_LABELS[category]}`}
              >
                New project
              </button>
            </div>
            {items.length === 0 ? (
              <p className={s.empty}>No {CATEGORY_LABELS[category].toLowerCase()} projects yet.</p>
            ) : (
              <ul className={s.list}>
                <SortableList
                  items={items}
                  onMove={(from, to) =>
                    edit((d) => {
                      d.projects = reorderWithin(d.projects, category, from, to);
                    })
                  }
                  render={(p, i, handle) => (
                    <div className={s.row}>
                      {handle}
                      {p.cover.media ? (
                        <img className={s.thumb} src={p.cover.media.webp[0].url} alt="" loading="lazy" />
                      ) : (
                        <span className={`${s.thumb} ${s.thumbEmpty}`} aria-hidden="true">
                          none
                        </span>
                      )}
                      <button type="button" className={s.rowMain} onClick={() => setSelected(p.id)}>
                        <span className={s.rowTitle}>{p.title || 'Untitled'}</span>
                        <span className={s.rowMeta}>{p.tagline || p.summary || '/' + p.slug}</span>
                      </button>
                      {!p.published && <span className={s.tag}>Unpublished</span>}
                      <button
                        type="button"
                        className={s.iconBtn}
                        aria-label={`Move ${p.title} up`}
                        disabled={i === 0}
                        onClick={() =>
                          edit((d) => {
                            d.projects = reorderWithin(d.projects, category, i, i - 1);
                          })
                        }
                      >
                        <i className={s.chev} data-dir="up" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={s.iconBtn}
                        aria-label={`Move ${p.title} down`}
                        disabled={i === items.length - 1}
                        onClick={() =>
                          edit((d) => {
                            d.projects = reorderWithin(d.projects, category, i, i + 1);
                          })
                        }
                      >
                        <i className={s.chev} data-dir="down" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                />
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
