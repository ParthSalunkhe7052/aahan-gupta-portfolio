import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/content/api';
import { TextField } from './ui';
import s from './admin.module.css';

/** Change the admin password (current, new, confirm; at least 10 characters). */
export function SecurityTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    if (next.length < 10) return setError('Use at least 10 characters for the new password.');
    if (next !== again) return setError('The new passwords do not match.');
    setError('');
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setAgain('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The password could not be changed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <h3 className={s.sectionTitle} style={{ marginBottom: '0.5rem' }}>
        Change password
      </h3>
      <p className={s.notice}>Changing it signs out every other device.</p>
      <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={setCurrent} />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        value={next}
        onChange={setNext}
      />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={again} onChange={setAgain} />
      <div aria-live="polite">
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        {done && <p className={s.success}>Password changed.</p>}
      </div>
      <div className={s.formActions} style={{ borderTop: 0, paddingTop: 0 }}>
        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !current || !next || !again}>
          {busy ? 'Saving' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
