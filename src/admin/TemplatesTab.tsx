import { useState } from 'react';
import { nanoid } from 'nanoid';
import { BLOCK_TEMPLATES, CATEGORY_LABELS, type BlockType, type Category } from '@shared/schema';
import { useContentStore } from '@/content/store';
import { uniqueSlug } from '@/content/validate';
import { PAGE_TEMPLATES, emptySlot, newBlock } from './blocks';
import { SelectField } from './ui';
import s from './admin.module.css';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

/** A page layout drawn row by row, each cell labelled with its image size like the Figma template. */
function TemplatePreview({ rows }: { rows: BlockType[] }) {
  return (
    <div className={s.tplPage} aria-hidden="true">
      {rows.map((type, i) => {
        const slots = BLOCK_TEMPLATES[type].slots;
        if (type === 'text') {
          return (
            <div key={i} className={`${s.tplRow} ${s.tplText}`}>
              <span>Heading and text</span>
            </div>
          );
        }
        const text = type === 'feature';
        return (
          <div key={i} className={`${s.tplRow} ${type === 'long' ? s.tplLong : ''}`} style={type === 'feature' ? { gridTemplateColumns: '2fr 1fr' } : undefined}>
            {slots.map((sl, k) => (
              <span key={k} className={`${s.tplCell} ${k % 2 ? s.tplCellAlt : ''}`}>
                {type === 'long' ? 'Whole image, any height' : `${sl.w} X ${sl.h}`}
              </span>
            ))}
            {text && <span className={`${s.tplCell} ${s.tplCellText}`}>Text</span>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Starting layouts for a new case study. Picking one adds a new, unpublished project with empty image
 * slots and opens it in the Projects tab with every row expanded, ready for the images; Publish makes it live.
 */
export function TemplatesTab() {
  const edit = useContentStore((st) => st.edit);
  const openEditor = useContentStore((st) => st.openEditor);
  const [category, setCategory] = useState<Category>('branding');

  const use = (rows: BlockType[]) => {
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
        blocks: rows.map((type) => newBlock(type)),
        // Not public until it has been filled in and switched on.
        published: false,
      });
    });
    openEditor('projects', { kind: 'edit-project', id, expand: true });
  };

  return (
    <div>
      <p className={s.fieldHint} style={{ marginTop: 0, marginBottom: "1rem" }}>
        Pick a layout to start a new case study. You fill in the images, then press Publish when it is ready. It stays
        hidden from visitors until you tick "Published" in the project.
      </p>
      <SelectField
        label="Add it to"
        value={category}
        onChange={setCategory}
        options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
      />
      <ul className={s.tplList}>
        {PAGE_TEMPLATES.map((t) => (
          <li key={t.id} className={s.tplCard}>
            <TemplatePreview rows={t.rows} />
            <div className={s.tplInfo}>
              <h3 className={s.sectionTitle}>{t.name}</h3>
              <p className={s.fieldHint}>{t.description}</p>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => use(t.rows)}>
                Use this template
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
