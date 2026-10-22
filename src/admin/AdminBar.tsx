import { useState } from 'react';
import { useContentStore } from '@/content/store';
import { PublishControls, usePublishStatus } from './PublishControls';
import { Confirm } from './ui';
import s from './admin.module.css';

/** Floating bar, bottom left, on every world: Edit content, unsaved count, Publish, Discard, Sign out. */
export function AdminBar() {
  const openEditor = useContentStore((st) => st.openEditor);
  const signOut = useContentStore((st) => st.signOut);
  const { count } = usePublishStatus();
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <div className={`${s.scope} ${s.bar}`} role="region" aria-label="Admin" data-noprint>
      <button type="button" className={s.btn} onClick={() => openEditor()}>
        Edit content
      </button>
      <PublishControls />
      <button
        type="button"
        className={`${s.btn} ${s.btnQuiet}`}
        onClick={() => (count > 0 ? setConfirmOut(true) : void signOut())}
      >
        Sign out
      </button>
      {confirmOut && (
        <Confirm
          title="Sign out with unpublished changes?"
          message="Your edits are not saved anywhere yet. Signing out discards them."
          confirmLabel="Sign out"
          danger
          onCancel={() => setConfirmOut(false)}
          onConfirm={() => {
            setConfirmOut(false);
            void signOut();
          }}
        />
      )}
    </div>
  );
}
