import { useEffect, useMemo } from 'react';
import { clearDraftBackup, writeDraftBackup } from '@/content/draftBackup';
import { useContentStore } from '@/content/store';
import { changeCount } from '@/content/validate';

/**
 * Keeps unpublished edits from disappearing. Mounted in AdminRoot, which is always
 * on the page, so it holds whether or not the admin bar is shown or the session
 * is still valid (the draft stays in memory after a session ends).
 *  - leaving the page with unpublished edits asks first;
 *  - the draft is mirrored into this tab's sessionStorage (debounced) so a reload
 *    can offer to restore it.
 */
export function useDraftSafety() {
  const published = useContentStore((s) => s.published);
  const draft = useContentStore((s) => s.draft);
  const restorable = useContentStore((s) => s.restorable);
  const dirty = useMemo(() => !!published && !!draft && changeCount(published, draft) > 0, [published, draft]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!draft) return;
    if (!dirty) {
      // Nothing to protect; but keep an older copy while the admin is still deciding whether to restore it.
      if (!restorable) clearDraftBackup();
      return;
    }
    const save = () => writeDraftBackup(draft);
    const timer = setTimeout(save, 400);
    // A reload right after typing would otherwise beat the debounce.
    window.addEventListener('pagehide', save);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', save);
    };
  }, [draft, dirty, restorable]);
}
