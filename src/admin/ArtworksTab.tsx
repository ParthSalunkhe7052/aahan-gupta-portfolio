import { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import type { Artwork } from '@shared/schema';
import { useContentStore } from '@/content/store';
import { slugify, uniqueSlug } from '@/content/validate';
import { useBurnNavigate } from '@/core/transition';
import { DropZone, SlotEditor, useImageUpload } from './SlotEditor';
import { SortableList, move } from './SortableList';
import { AreaField, CheckField, Confirm, TextField } from './ui';
import s from './admin.module.css';

/** Stable empty list: a fresh [] in a selector would re-render forever. */
const NONE: never[] = [];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function titleFromFile(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Untitled';
}

export function ArtworksTab() {
  const artworks = useContentStore((st) => st.draft?.artworks ?? NONE);
  const edit = useContentStore((st) => st.edit);
  const intent = useContentStore((st) => st.editorIntent);
  const clearIntent = useContentStore((st) => st.clearIntent);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (!intent || handled.current === intent) return;
    handled.current = intent;
    if (intent.kind === 'edit-artwork') setSelected(intent.id);
    clearIntent();
  }, [intent, clearIntent]);

  const current = selected ? artworks.find((a) => a.id === selected) : undefined;
  if (current) {
    return <ArtworkForm key={current.id} art={current} onBack={() => setSelected(null)} />;
  }
  if (adding) {
    return (
      <AddArtwork
        onCancel={() => setAdding(false)}
        onCreated={(id) => {
          setAdding(false);
          setSelected(id);
        }}
      />
    );
  }

  const swap = (from: number, to: number) =>
    edit((d) => {
      d.artworks = move(d.artworks, from, to);
    });

  return (
    <div>
      <div className={s.groupHead}>
        <h3 className={s.sectionTitle}>Artworks ({artworks.length})</h3>
        <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`} onClick={() => setAdding(true)}>
          Add artwork
        </button>
      </div>
      {artworks.length === 0 ? (
        <p className={s.empty}>No artworks yet.</p>
      ) : (
        <ul className={s.list}>
          <SortableList
            items={artworks}
            onMove={swap}
            render={(a, i, handle) => (
              <div className={s.row}>
                {handle}
                <img className={s.thumb} src={a.image.webp[0].url} alt="" loading="lazy" />
                <button type="button" className={s.rowMain} onClick={() => setSelected(a.id)}>
                  <span className={s.rowTitle}>{a.title || 'Untitled'}</span>
                  <span className={s.rowMeta}>{[a.series, a.medium].filter(Boolean).join(', ') || '/' + a.slug}</span>
                </button>
                {!a.published && <span className={s.tag}>Unpublished</span>}
                <button
                  type="button"
                  className={s.iconBtn}
                  aria-label={`Move ${a.title} up`}
                  disabled={i === 0}
                  onClick={() => swap(i, i - 1)}
                >
                  <i className={s.chev} data-dir="up" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={s.iconBtn}
                  aria-label={`Move ${a.title} down`}
                  disabled={i === artworks.length - 1}
                  onClick={() => swap(i, i + 1)}
                >
                  <i className={s.chev} data-dir="down" aria-hidden="true" />
                </button>
              </div>
            )}
          />
        </ul>
      )}
    </div>
  );
}

/** Step one of a new artwork: the image goes up first, then the details are filled in. */
function AddArtwork({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const edit = useContentStore((st) => st.edit);
  const fileName = useRef('');
  const { progress, error, start } = useImageUpload((media) => {
    const id = `art-${nanoid(8)}`;
    const title = titleFromFile(fileName.current);
    edit((d) => {
      d.artworks.push({
        id,
        slug: uniqueSlug(slugify(title), d.artworks.map((a) => a.slug)),
        title,
        medium: '',
        year: '',
        size: '',
        series: '',
        description: '',
        image: media,
        published: true,
      });
    });
    onCreated(id);
  });

  return (
    <div>
      <div className={s.formTop}>
        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={onCancel}>
          Back to artworks
        </button>
      </div>
      <h3 className={s.formTitle} style={{ marginBottom: '1rem' }}>
        Add artwork
      </h3>
      <p className={s.notice}>Upload the painting first. Its title, medium and description come next.</p>
      <DropZone
        big
        progress={progress}
        text="Drop a painting or browse"
        onFile={(file) => {
          if (!file) return;
          fileName.current = file.name;
          void start(file);
        }}
      />
      {error && (
        <p className={s.error} role="alert" style={{ marginTop: '0.6rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function ArtworkForm({ art, onBack }: { art: Artwork; onBack: () => void }) {
  const edit = useContentStore((st) => st.edit);
  const artworks = useContentStore((st) => st.draft?.artworks ?? NONE);
  const go = useBurnNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slugAuto, setSlugAuto] = useState(art.slug === slugify(art.title));

  const update = (fn: (a: Artwork) => void) =>
    edit((d) => {
      const a = d.artworks.find((x) => x.id === art.id);
      if (a) fn(a);
    });

  const others = artworks.filter((a) => a.id !== art.id).map((a) => a.slug);
  const slugError = !SLUG.test(art.slug)
    ? 'Use lowercase letters, numbers and single hyphens.'
    : others.includes(art.slug)
      ? 'Another artwork already uses this address.'
      : '';

  return (
    <div>
      <div className={s.formTop}>
        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={onBack}>
          Back to artworks
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnSmall} ${s.btnQuiet}`}
          onClick={() => go(`/art/${art.slug}`, 'veil')}
          disabled={!!slugError}
        >
          Open page
        </button>
      </div>
      <h3 className={s.formTitle} style={{ marginBottom: '1rem' }}>
        {art.title || 'Untitled'}
      </h3>

      <SlotEditor
        label="Painting"
        size={{ w: art.image.width, h: art.image.height }}
        slot={{ media: art.image, focal: { x: 0.5, y: 0.5 }, alt: art.title }}
        focal={false}
        alt={false}
        removable={false}
        onChange={(slot) => {
          if (slot.media) update((a) => void (a.image = slot.media!));
        }}
      />

      <TextField
        label="Title"
        value={art.title}
        onChange={(title) =>
          update((a) => {
            a.title = title;
            if (slugAuto) a.slug = uniqueSlug(slugify(title), others);
          })
        }
      />
      <TextField
        label="Web address"
        hint={`/art/${art.slug}`}
        value={art.slug}
        error={slugError}
        onChange={(v) => {
          setSlugAuto(false);
          update((a) => void (a.slug = v.toLowerCase().replace(/\s+/g, '-')));
        }}
      />
      <TextField label="Medium" value={art.medium} onChange={(v) => update((a) => void (a.medium = v))} />
      <div className={s.pair}>
        <TextField label="Year" value={art.year} onChange={(v) => update((a) => void (a.year = v))} />
        <TextField label="Size" hint="For example 60 × 80 cm" value={art.size} onChange={(v) => update((a) => void (a.size = v))} />
      </div>
      <TextField label="Series" value={art.series} onChange={(v) => update((a) => void (a.series = v))} />
      <AreaField
        label="Description"
        hint="Separate paragraphs with a blank line. Leave empty to show only the title."
        rows={8}
        value={art.description}
        onChange={(v) => update((a) => void (a.description = v))}
      />
      <CheckField
        label="Published"
        hint="Unpublished artworks are only visible while you are signed in."
        checked={art.published}
        onChange={(v) => update((a) => void (a.published = v))}
      />

      <div className={s.formActions}>
        <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setConfirmDelete(true)}>
          Delete artwork
        </button>
      </div>

      {confirmDelete && (
        <Confirm
          title="Delete this artwork?"
          message={`"${art.title}" is removed from the gallery once you publish. Discard brings it back until then.`}
          confirmLabel="Delete artwork"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            edit((d) => {
              d.artworks = d.artworks.filter((a) => a.id !== art.id);
            });
            onBack();
          }}
        />
      )}
    </div>
  );
}
