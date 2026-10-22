import { useId, useRef, type ChangeEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '@/components/useDialog';
import s from './admin.module.css';

/* ---------- modal ---------- */

/** Centered dialog: focus trapped, Escape closes, page scroll paused, focus returned on close. */
export function Modal({
  label,
  onClose,
  wide,
  children,
}: {
  label: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, { onClose });
  return createPortal(
    <div
      className={`${s.scope} ${s.backdrop}`}
      data-lenis-prevent
      data-noprint
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={wide ? `${s.modal} ${s.modalWide}` : s.modal}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal label={title} onClose={onCancel}>
      <h2 className={s.modalTitle}>{title}</h2>
      <p className={s.modalText}>{message}</p>
      <div className={s.modalActions}>
        <button type="button" className={s.btn} onClick={onCancel} data-autofocus>
          Cancel
        </button>
        <button
          type="button"
          className={danger ? `${s.btn} ${s.btnDanger}` : `${s.btn} ${s.btnPrimary}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- fields ---------- */

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
}

function Wrap({ id, label, hint, error, children }: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.fieldLabel}>
        {label}
      </label>
      {children}
      {hint && (
        <span id={`${id}-hint`} className={s.fieldHint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className={s.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;

export function TextField({
  label,
  hint,
  error,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  inputMode,
  autoFocus,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'password' | 'url' | 'email' | 'tel';
  autoComplete?: string;
  placeholder?: string;
  inputMode?: 'text' | 'url' | 'email' | 'tel';
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={s.input}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        data-autofocus={autoFocus ? '' : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </Wrap>
  );
}

export function AreaField({
  label,
  hint,
  error,
  value,
  onChange,
  rows = 4,
}: BaseProps & { value: string; onChange: (v: string) => void; rows?: number }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={s.textarea}
        rows={rows}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </Wrap>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
}: BaseProps & { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint}>
      <select
        id={id}
        className={s.select}
        value={value}
        aria-describedby={describedBy(id, hint)}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function CheckField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={s.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className={s.fieldLabel}>{label}</span>
        {hint && (
          <>
            <br />
            <span className={s.fieldHint}>{hint}</span>
          </>
        )}
      </span>
    </label>
  );
}
