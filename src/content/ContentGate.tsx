import { useEffect, type ReactNode } from 'react';
import { fireAudio } from '@/core/audio/fire';
import { useContentStore } from './store';
import styles from './ContentGate.module.css';

/**
 * Loads the site document before any route renders. While loading it renders
 * nothing; if the API cannot be reached it shows a quiet message with a retry.
 */
export function ContentGate({ children }: { children: ReactNode }) {
  const load = useContentStore((s) => s.load);
  const init = useContentStore((s) => s.init);
  const recording = useContentStore((s) => (s.signedIn && s.draft ? s.draft : s.published)?.site.fireAudio ?? '');

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (load === 'ready') fireAudio.setRecording(recording);
  }, [load, recording]);

  if (load === 'loading') return null;
  if (load === 'error') {
    return (
      <main id="main" className={styles.failed}>
        <p role="alert">The site could not load.</p>
        <button type="button" onClick={() => void init()}>
          Reload
        </button>
      </main>
    );
  }
  return <>{children}</>;
}
