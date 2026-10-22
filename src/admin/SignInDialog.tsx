import { useState, type FormEvent } from 'react';
import { useContentStore } from '@/content/store';
import { Modal, TextField } from './ui';
import s from './admin.module.css';

/** "Admin access": one password field and an Unlock button. Escape closes. */
export function SignInDialog() {
  const signIn = useContentStore((st) => st.signIn);
  const close = useContentStore((st) => st.closeSignIn);
  const notice = useContentStore((st) => st.signInNotice);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    const result = await signIn(password);
    if (!result.ok) {
      setError(result.message);
      setPassword('');
    }
    setBusy(false);
  };

  return (
    <Modal label="Admin access" onClose={close}>
      <form onSubmit={(e) => void submit(e)} noValidate>
        <h2 className={s.modalTitle}>Admin access</h2>
        {notice && <p className={s.notice}>{notice}</p>}
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          autoFocus
        />
        <div aria-live="polite">
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <div className={s.modalActions}>
          <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={close}>
            Cancel
          </button>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !password}>
            {busy ? 'Checking' : 'Unlock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
