import { useId, useRef, useState } from 'react';
import type { CvEntry, Site } from '@shared/schema';
import { api, ApiError } from '@/content/api';
import { useContentStore } from '@/content/store';
import { move } from './SortableList';
import { AreaField, TextField } from './ui';
import s from './admin.module.css';

/** Upload a PDF or a sound; the stored value is the URL the server returns. */
function FileField({
  label,
  hint,
  value,
  kind,
  accept,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  kind: 'pdf' | 'audio';
  accept: string;
  onChange: (url: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      const { url } = await api.uploadFile(file, kind, setProgress);
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The upload failed.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className={s.field}>
      <span className={s.fieldLabel} id={`${id}-l`}>
        {label}
      </span>
      <span className={s.fieldHint}>{hint}</span>
      {value && (
        <p>
          <a href={value} target="_blank" rel="noopener noreferrer" className={s.linkBtn}>
            {value.split('/').pop()}
          </a>
        </p>
      )}
      <div className={s.slotActions} style={{ margin: 0 }}>
        <button
          type="button"
          className={`${s.btn} ${s.btnSmall}`}
          aria-describedby={`${id}-l`}
          disabled={progress !== null}
          onClick={() => input.current?.click()}
        >
          {progress !== null ? `Uploading ${Math.round(progress * 100)}%` : value ? 'Replace file' : 'Upload file'}
        </button>
        {value && (
          <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnQuiet}`} onClick={() => onChange('')}>
            Remove
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <span className={s.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function EntryList({
  title,
  addLabel,
  entries,
  onChange,
}: {
  title: string;
  addLabel: string;
  entries: CvEntry[];
  onChange: (next: CvEntry[]) => void;
}) {
  const set = (i: number, patch: Partial<CvEntry>) => onChange(entries.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  return (
    <div className={s.section}>
      <h4 className={s.sectionTitle} style={{ marginBottom: '0.7rem' }}>
        {title}
      </h4>
      {entries.map((e, i) => (
        <div className={s.entry} key={i} role="group" aria-label={`${title} ${i + 1}`}>
          <div className={s.entryHead}>
            <span className={s.slotLabel}>
              {title} {i + 1}
            </span>
            <span>
              <button
                type="button"
                className={s.iconBtn}
                aria-label={`Move ${title.toLowerCase()} ${i + 1} up`}
                disabled={i === 0}
                onClick={() => onChange(move(entries, i, i - 1))}
              >
                <i className={s.chev} data-dir="up" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={s.iconBtn}
                aria-label={`Move ${title.toLowerCase()} ${i + 1} down`}
                disabled={i === entries.length - 1}
                onClick={() => onChange(move(entries, i, i + 1))}
              >
                <i className={s.chev} data-dir="down" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`}
                onClick={() => onChange(entries.filter((_, k) => k !== i))}
              >
                Remove
              </button>
            </span>
          </div>
          <TextField label="Title" value={e.title} onChange={(v) => set(i, { title: v })} />
          <div className={s.pair}>
            <TextField label="Organisation" value={e.org} onChange={(v) => set(i, { org: v })} />
            <TextField label="Period" value={e.period} onChange={(v) => set(i, { period: v })} />
          </div>
          <AreaField label="Description" rows={4} value={e.body} onChange={(v) => set(i, { body: v })} />
        </div>
      ))}
      <button
        type="button"
        className={`${s.btn} ${s.btnSmall}`}
        onClick={() => onChange([...entries, { title: '', org: '', period: '', body: '' }])}
      >
        {addLabel}
      </button>
    </div>
  );
}

export function SiteTab() {
  const site = useContentStore((st) => st.draft?.site);
  const edit = useContentStore((st) => st.edit);
  // Capabilities are edited as text, one per line; the raw text is kept so typing a newline is not undone.
  const [caps, setCaps] = useState(() => site?.cv.capabilities.join('\n') ?? '');
  if (!site) return null;

  const update = (fn: (site: Site) => void) =>
    edit((d) => {
      fn(d.site);
    });
  const urlError = (v: string) => (v && !/^https?:\/\//i.test(v) ? 'Start the link with https://' : '');

  return (
    <div>
      <h3 className={s.sectionTitle} style={{ marginBottom: '0.8rem' }}>
        Home
      </h3>
      <TextField label="Name" value={site.name} onChange={(v) => update((x) => void (x.name = v))} />
      <div className={s.pair}>
        <TextField label="Role" value={site.role} onChange={(v) => update((x) => void (x.role = v))} />
        <TextField label="Location" value={site.location} onChange={(v) => update((x) => void (x.location = v))} />
      </div>
      <AreaField
        label="Statement"
        hint="The italic text at the top of the right column."
        rows={5}
        value={site.statement}
        onChange={(v) => update((x) => void (x.statement = v))}
      />
      <AreaField
        label="Practice"
        hint="The paragraph under the statement."
        rows={4}
        value={site.practice}
        onChange={(v) => update((x) => void (x.practice = v))}
      />
      <AreaField
        label="Collection line"
        hint="The orange line above the signature."
        rows={2}
        value={site.collection}
        onChange={(v) => update((x) => void (x.collection = v))}
      />
      <FileField
        label="Fire sound"
        hint="Optional recording played when a page burns. Without one, the built-in synthesised fire is used. MP3, WAV, OGG or M4A, up to 10 MB."
        value={site.fireAudio}
        kind="audio"
        accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a"
        onChange={(url) => update((x) => void (x.fireAudio = url))}
      />

      <div className={s.section}>
        <h3 className={s.sectionTitle} style={{ marginBottom: '0.8rem' }}>
          Contact
        </h3>
        <TextField
          label="Instagram link"
          type="url"
          inputMode="url"
          error={urlError(site.contact.instagram)}
          value={site.contact.instagram}
          onChange={(v) => update((x) => void (x.contact.instagram = v))}
        />
        <TextField
          label="Behance link"
          type="url"
          inputMode="url"
          error={urlError(site.contact.behance)}
          value={site.contact.behance}
          onChange={(v) => update((x) => void (x.contact.behance = v))}
        />
        <TextField
          label="LinkedIn link"
          type="url"
          inputMode="url"
          error={urlError(site.contact.linkedin)}
          value={site.contact.linkedin}
          onChange={(v) => update((x) => void (x.contact.linkedin = v))}
        />
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          value={site.contact.email}
          onChange={(v) => update((x) => void (x.contact.email = v))}
        />
        <TextField
          label="Phone"
          type="tel"
          inputMode="tel"
          value={site.contact.phone}
          onChange={(v) => update((x) => void (x.contact.phone = v))}
        />
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle} style={{ marginBottom: '0.8rem' }}>
          CV
        </h3>
        <AreaField label="Introduction" rows={3} value={site.cv.intro} onChange={(v) => update((x) => void (x.cv.intro = v))} />
        <FileField
          label="CV as a PDF"
          hint="When set, the CV icon downloads this file instead of opening the CV page. PDF, up to 15 MB."
          value={site.cv.pdf}
          kind="pdf"
          accept="application/pdf,.pdf"
          onChange={(url) => update((x) => void (x.cv.pdf = url))}
        />
      </div>

      <EntryList
        title="Education"
        addLabel="Add education"
        entries={site.cv.education}
        onChange={(next) => update((x) => void (x.cv.education = next))}
      />
      <EntryList
        title="Experience"
        addLabel="Add experience"
        entries={site.cv.experience}
        onChange={(next) => update((x) => void (x.cv.experience = next))}
      />

      <div className={s.section}>
        <AreaField
          label="Capabilities"
          hint="One per line."
          rows={6}
          value={caps}
          onChange={(v) => {
            setCaps(v);
            update((x) => {
              x.cv.capabilities = v
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);
            });
          }}
        />
      </div>
    </div>
  );
}
