import { useState } from 'react';
import { CATEGORY_LABELS, type Category, type Project } from '@shared/schema';
import { useContentStore } from '@/content/store';
import { slugify, uniqueSlug } from '@/content/validate';
import { useBurnNavigate } from '@/core/transition';
import { BlockList } from './BlockList';
import { SlotEditor } from './SlotEditor';
import { AreaField, CheckField, Confirm, SelectField, TextField } from './ui';
import s from './admin.module.css';

/** Stable empty list: a fresh [] in a selector would re-render forever. */
const NONE: never[] = [];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Cover size by category: illustrations show a square, the others a wide band. */
const coverSize = (c: Category) => (c === 'illustrations' ? { w: 1200, h: 1200 } : { w: 1920, h: 457 });

export function ProjectForm({
  project,
  expandRows = false,
  onBack,
  onDeleted,
}: {
  project: Project;
  expandRows?: boolean;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const edit = useContentStore((st) => st.edit);
  const projects = useContentStore((st) => st.draft?.projects ?? NONE);
  const go = useBurnNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The address follows the title until it has been edited by hand.
  const [slugAuto, setSlugAuto] = useState(project.slug === slugify(project.title) || project.slug.startsWith('untitled-project'));

  const update = (fn: (p: Project) => void) =>
    edit((d) => {
      const p = d.projects.find((x) => x.id === project.id);
      if (p) fn(p);
    });

  const others = projects.filter((p) => p.id !== project.id && p.category === project.category).map((p) => p.slug);
  const slugError = !SLUG.test(project.slug)
    ? 'Use lowercase letters, numbers and single hyphens.'
    : others.includes(project.slug)
      ? 'Another project in this category already uses this address.'
      : '';

  const setTitle = (title: string) =>
    update((p) => {
      p.title = title;
      if (slugAuto) {
        const taken = projects.filter((x) => x.id !== p.id && x.category === p.category).map((x) => x.slug);
        p.slug = uniqueSlug(slugify(title), taken);
      }
    });

  const setCategory = (category: Category) =>
    update((p) => {
      const taken = projects.filter((x) => x.id !== p.id && x.category === category).map((x) => x.slug);
      p.category = category;
      p.slug = uniqueSlug(p.slug, taken);
    });

  return (
    <div>
      <div className={s.formTop}>
        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={onBack}>
          Back to projects
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnSmall} ${s.btnQuiet}`}
          onClick={() => go(`/design/${project.category}/${project.slug}`, 'veil')}
          disabled={!!slugError}
        >
          Open page
        </button>
      </div>
      <h3 className={s.formTitle} style={{ marginBottom: '1rem' }}>
        {project.title || 'Untitled project'}
      </h3>

      <TextField label="Title" value={project.title} onChange={setTitle} />
      <TextField
        label="Web address"
        hint={`/design/${project.category}/${project.slug}`}
        value={project.slug}
        error={slugError}
        onChange={(v) => {
          setSlugAuto(false);
          update((p) => {
            p.slug = v.toLowerCase().replace(/\s+/g, '-');
          });
        }}
      />
      <SelectField
        label="Category"
        value={project.category}
        onChange={setCategory}
        options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
      />
      <TextField
        label="Tagline"
        hint="A campaign name, shown in quotes on the index. Optional."
        value={project.tagline}
        onChange={(v) => update((p) => void (p.tagline = v))}
      />
      <AreaField label="Summary" rows={3} value={project.summary} onChange={(v) => update((p) => void (p.summary = v))} />
      <TextField
        label="Studio"
        hint='Shown as "Work completed while at ...". Leave empty to hide the line.'
        value={project.studio}
        onChange={(v) => update((p) => void (p.studio = v))}
      />
      <CheckField
        label="Published"
        hint="Unpublished projects are only visible while you are signed in."
        checked={project.published}
        onChange={(v) => update((p) => void (p.published = v))}
      />

      <div className={s.section}>
        <h4 className={s.sectionTitle} style={{ marginBottom: '0.7rem' }}>
          Cover image
        </h4>
        <SlotEditor
          label="Cover"
          size={coverSize(project.category)}
          slot={project.cover}
          onChange={(slot) => update((p) => void (p.cover = slot))}
        />
      </div>

      <div className={s.section}>
        <h4 className={s.sectionTitle} style={{ marginBottom: '0.7rem' }}>
          Case study rows
        </h4>
        <BlockList project={project} expandAll={expandRows} />
      </div>

      <div className={s.formActions}>
        <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setConfirmDelete(true)}>
          Delete project
        </button>
      </div>

      {confirmDelete && (
        <Confirm
          title="Delete this project?"
          message={`"${project.title}" and its rows are removed from the site once you publish. Discard brings it back until then.`}
          confirmLabel="Delete project"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            edit((d) => {
              d.projects = d.projects.filter((p) => p.id !== project.id);
            });
            onDeleted();
          }}
        />
      )}
    </div>
  );
}
