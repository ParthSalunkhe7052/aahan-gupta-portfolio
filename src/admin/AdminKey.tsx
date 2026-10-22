import { useAdmin } from '@/content/store';
import styles from './AdminKey.module.css';

/**
 * The admin key: a small ring with a centre dot. Signed out it opens the
 * sign-in dialog; signed in (filled dot) it shows or hides the admin bar.
 */
export function AdminKey({ className }: { className?: string }) {
  const { signedIn, pressKey } = useAdmin();
  const cls = [styles.key, signedIn ? styles.on : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={pressKey}
      aria-label={signedIn ? 'Admin tools' : 'Admin sign in'}
      data-noprint
    >
      <span className={styles.ring} aria-hidden="true" />
      <span className={styles.label} aria-hidden="true">
        Admin
      </span>
    </button>
  );
}
