import { BLOCK_TEMPLATES, type BlockType } from '@shared/schema';
import { BLOCK_ORDER } from './blocks';
import { Modal } from './ui';
import s from './admin.module.css';

const DIAGRAM_CLASS: Record<BlockType, string> = {
  full: s.diagramFull,
  long: s.diagramLong,
  split: s.diagramSplit,
  trio: s.diagramTrio,
  feature: s.diagramFeature,
  text: s.diagramText,
};

/** A small drawing of a row template, in the template's own proportions (1920 × 850). */
export function TemplateDiagram({
  type,
  side = 'left',
  big,
}: {
  type: BlockType;
  side?: 'left' | 'right';
  big?: boolean;
}) {
  const lines = (
    <span className={s.lines} aria-hidden="true">
      <i />
      <i />
      <i />
      <i style={{ width: '70%' }} />
    </span>
  );
  const count = BLOCK_TEMPLATES[type].slots.length;
  return (
    <span
      className={`${s.diagram} ${DIAGRAM_CLASS[type]}${big ? ` ${s.diagramBig}` : ''}`}
      data-side={type === 'feature' ? side : undefined}
      aria-hidden="true"
    >
      {type === 'text' && lines}
      {type === 'feature' && side === 'right' && lines}
      {type !== 'text' &&
        Array.from({ length: count }, (_, i) => <span key={i} className={s.cell} />)}
      {type === 'feature' && side === 'left' && lines}
    </span>
  );
}

/** Visual choice of row template, drawn from BLOCK_TEMPLATES. */
export function TemplatePicker({
  title,
  current,
  onPick,
  onClose,
}: {
  title: string;
  current?: BlockType;
  onPick: (type: BlockType) => void;
  onClose: () => void;
}) {
  return (
    <Modal label={title} onClose={onClose} wide>
      <h2 className={s.modalTitle}>{title}</h2>
      <ul className={s.picker}>
        {BLOCK_ORDER.map((type, i) => (
          <li key={type}>
            <button
              type="button"
              className={s.pickCard}
              aria-current={type === current ? 'true' : undefined}
              onClick={() => onPick(type)}
              data-autofocus={i === 0 ? '' : undefined}
            >
              <TemplateDiagram type={type} big />
              <span className={s.pickName}>{BLOCK_TEMPLATES[type].label}</span>
              <span className={s.pickHint}>{BLOCK_TEMPLATES[type].hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={s.modalActions}>
        <button type="button" className={s.btn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
