import { useContentStore } from '@/content/store';
import { Modal } from './ui';
import s from './admin.module.css';

/** Offered after sign-in when this tab still holds unpublished edits from before a reload or an expired session. */
export function RestoreDraft() {
  const saved = useContentStore((st) => st.restorable);
  const restore = useContentStore((st) => st.restoreDraft);
  const dismiss = useContentStore((st) => st.dismissRestore);
  if (!saved) return null;

  const time = new Date(saved.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <Modal label="Restore unsaved changes" onClose={dismiss}>
      <h2 className={s.modalTitle}>Restore unsaved changes?</h2>
      <p className={s.modalText}>
        This tab still has edits you had not published (saved at {time}). Restore them to carry on, or start again from the
        published site.
      </p>
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={dismiss}>
          Start fresh
        </button>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={restore} data-autofocus>
          Restore edits
        </button>
      </div>
    </Modal>
  );
}
