import { useState } from 'react';
import { BLOCK_TEMPLATES, type Block, type BlockType, type MediaAsset, type Project } from '@shared/schema';
import { useContentStore } from '@/content/store';
import { changeBlockType, imagesLostByChange, newBlock, slotsOf } from './blocks';
import { SlotEditor } from './SlotEditor';
import { SortableList, move } from './SortableList';
import { TemplateDiagram, TemplatePicker } from './TemplatePicker';
import { AreaField, Confirm, SelectField, TextField } from './ui';
import s from './admin.module.css';

type Dialog =
  | { kind: 'add' }
  | { kind: 'change'; id: string }
  | { kind: 'delete'; id: string }
  | { kind: 'lose'; id: string; type: BlockType; count: number }
  | null;

function thumbUrl(media: MediaAsset) {
  return media.webp[0].url;
}

/** The rows of a case study: a mini diagram and thumbnails per row, reorder, add, change template, delete. */
export function BlockList({ project, expandAll = false }: { project: Project; expandAll?: boolean }) {
  const edit = useContentStore((st) => st.edit);
  // Rows whose editor is expanded; a freshly made template project starts with every row open.
  const [open, setOpen] = useState<Set<string>>(() => new Set(expandAll ? project.blocks.map((b) => b.id) : []));
  const toggle = (id: string, on: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const [dialog, setDialog] = useState<Dialog>(null);

  const mutate = (fn: (blocks: Block[]) => Block[]) =>
    edit((d) => {
      const p = d.projects.find((x) => x.id === project.id);
      if (p) p.blocks = fn(p.blocks);
    });

  const replace = (block: Block) => mutate((bs) => bs.map((b) => (b.id === block.id ? block : b)));

  const changeTo = (id: string, type: BlockType) => {
    const block = project.blocks.find((b) => b.id === id);
    if (!block) return;
    const lost = imagesLostByChange(block, type);
    if (lost > 0) setDialog({ kind: 'lose', id, type, count: lost });
    else {
      replace(changeBlockType(block, type));
      setDialog(null);
    }
  };

  return (
    <div>
      {project.blocks.length === 0 ? (
        <p className={s.empty}>No rows yet. Add the first row of the case study.</p>
      ) : (
        <ul className={s.list} style={{ gap: '0.55rem' }}>
          <SortableList
            items={project.blocks}
            onMove={(from, to) => mutate((bs) => move(bs, from, to))}
            render={(block, i, handle) => {
              const expanded = open.has(block.id);
              const slots = slotsOf(block);
              return (
                <div className={s.block}>
                  <div className={s.blockHead}>
                    {handle}
                    <TemplateDiagram type={block.type} side={block.type === 'feature' ? block.side : undefined} />
                    <span className={s.rowMain}>
                      <span className={s.rowTitle}>{BLOCK_TEMPLATES[block.type].label}</span>
                      <span className={s.miniThumbs}>
                        {slots.map((sl, k) =>
                          sl.media ? (
                            <img key={k} src={thumbUrl(sl.media)} alt="" loading="lazy" />
                          ) : (
                            <span key={k} />
                          ),
                        )}
                        {block.type === 'text' && <span className={s.rowMeta}>{block.heading || 'Text row'}</span>}
                      </span>
                    </span>
                    <span className={s.blockTools}>
                      <button
                        type="button"
                        className={s.iconBtn}
                        aria-label={`Move row ${i + 1} up`}
                        disabled={i === 0}
                        onClick={() => mutate((bs) => move(bs, i, i - 1))}
                      >
                        <i className={s.chev} data-dir="up" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={s.iconBtn}
                        aria-label={`Move row ${i + 1} down`}
                        disabled={i === project.blocks.length - 1}
                        onClick={() => mutate((bs) => move(bs, i, i + 1))}
                      >
                        <i className={s.chev} data-dir="down" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnSmall}`}
                        aria-expanded={expanded}
                        aria-controls={`row-${block.id}`}
                        onClick={() => toggle(block.id, !expanded)}
                      >
                        {expanded ? 'Done' : 'Edit'}
                      </button>
                    </span>
                  </div>

                  {expanded && (
                    <div className={s.blockBody} id={`row-${block.id}`}>
                      {block.type === 'feature' && (
                        <SelectField
                          label="Image side"
                          value={block.side}
                          onChange={(side) => replace({ ...block, side })}
                          options={[
                            { value: 'left', label: 'Image on the left' },
                            { value: 'right', label: 'Image on the right' },
                          ]}
                        />
                      )}
                      {block.type !== 'text' &&
                        block.slots.map((slot, k) => (
                          <SlotEditor
                            key={k}
                            label={block.slots.length > 1 ? `Image ${k + 1}` : 'Image'}
                            size={BLOCK_TEMPLATES[block.type].slots[k]}
                            natural={block.type === 'long'}
                            focal={block.type !== 'long'}
                            slot={slot}
                            onChange={(next) => {
                              const slotsNext = block.slots.map((x, idx) => (idx === k ? next : x));
                              replace({ ...block, slots: slotsNext } as Block);
                            }}
                          />
                        ))}
                      {(block.type === 'feature' || block.type === 'text') && (
                        <>
                          <TextField label="Heading" value={block.heading} onChange={(heading) => replace({ ...block, heading })} />
                          <AreaField
                            label="Text"
                            hint="Separate paragraphs with a blank line."
                            rows={6}
                            value={block.body}
                            onChange={(body) => replace({ ...block, body })}
                          />
                        </>
                      )}
                      <div className={s.slotActions} style={{ marginTop: 0, marginBottom: '0.9rem' }}>
                        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => setDialog({ kind: 'change', id: block.id })}>
                          Change layout
                        </button>
                        <button
                          type="button"
                          className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`}
                          onClick={() => setDialog({ kind: 'delete', id: block.id })}
                        >
                          Delete row
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }}
          />
        </ul>
      )}

      <div className={s.formActions} style={{ borderTop: 0, paddingTop: 0, marginTop: '0.9rem' }}>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setDialog({ kind: 'add' })}>
          Add row
        </button>
      </div>

      {dialog?.kind === 'add' && (
        <TemplatePicker
          title="Add row"
          onClose={() => setDialog(null)}
          onPick={(type) => {
            const block = newBlock(type);
            mutate((bs) => [...bs, block]);
            toggle(block.id, true);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'change' && (
        <TemplatePicker
          title="Change layout"
          current={project.blocks.find((b) => b.id === dialog.id)?.type}
          onClose={() => setDialog(null)}
          onPick={(type) => changeTo(dialog.id, type)}
        />
      )}
      {dialog?.kind === 'lose' && (
        <Confirm
          title="Remove some images?"
          message={`${BLOCK_TEMPLATES[dialog.type].label} has fewer image slots, so ${dialog.count === 1 ? 'one image' : `${dialog.count} images`} will be removed from this row.`}
          confirmLabel="Change layout"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            const block = project.blocks.find((b) => b.id === dialog.id);
            if (block) replace(changeBlockType(block, dialog.type));
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <Confirm
          title="Delete this row?"
          message="The row and its images are removed from the case study. Publish changes to make it final; Discard brings it back."
          confirmLabel="Delete row"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            mutate((bs) => bs.filter((b) => b.id !== dialog.id));
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
