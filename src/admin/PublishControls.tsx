import { useMemo, useState } from 'react';
import { useContentStore } from '@/content/store';
import { changeCount, problemsIn } from '@/content/validate';
import { Confirm } from './ui';
import s from './admin.module.css';

/** Unsaved count, problems and publish state, shared by the admin bar and the drawer footer. */
export function usePublishStatus() {
  const published = useContentStore((st) => st.published);
  const draft = useContentStore((st) => st.draft);
  const publish = useContentStore((st) => st.publish);
  const message = useContentStore((st) => st.publishMessage);
  const count = useMemo(() => (published && draft ? changeCount(published, draft) : 0), [published, draft]);
  const problems = useMemo(() => (draft ? problemsIn(draft) : []), [draft]);
  return { count, problems, publish, message, canPublish: count > 0 && problems.length === 0 && publish !== 'publishing' };
}

export function statusText(st: ReturnType<typeof usePublishStatus>): { text: string; tone: 'ok' | 'warn' | 'plain' } {
  if (st.publish === 'publishing') return { text: 'Publishing', tone: 'plain' };
  if (st.publish === 'conflict' || (st.publish === 'failed' && st.message)) return { text: st.message, tone: 'warn' };
  if (st.publish === 'published') return { text: st.message, tone: 'ok' };
  if (st.count > 0 && st.problems.length > 0) return { text: st.problems[0], tone: 'warn' };
  if (st.count > 0) return { text: `${st.count} unsaved ${st.count === 1 ? 'change' : 'changes'}`, tone: 'plain' };
  return { text: 'No unsaved changes', tone: 'plain' };
}

/**
 * "Publish changes" (primary) and "Discard". Discard asks first when there is something to lose.
 * A conflict (someone else published) offers a choice instead: keep this draft on top of
 * their version, or take theirs and drop the draft.
 */
export function PublishControls({ compact }: { compact?: boolean }) {
  const st = usePublishStatus();
  const publishDraft = useContentStore((x) => x.publishDraft);
  const discard = useContentStore((x) => x.discard);
  const keepMine = useContentStore((x) => x.keepMine);
  const takeTheirs = useContentStore((x) => x.takeTheirs);
  const [confirm, setConfirm] = useState(false);
  const [confirmTheirs, setConfirmTheirs] = useState(false);
  const status = statusText(st);

  return (
    <>
      <span className={s.barStatus} data-tone={status.tone} role="status" aria-live="polite">
        {st.count > 0 && status.tone === 'plain' && <span className={s.barDot} aria-hidden="true" />}
        {status.text}
      </span>
      {st.publish === 'conflict' && (
        <>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={keepMine}>
            Keep my version
          </button>
          <button type="button" className={s.btn} onClick={() => setConfirmTheirs(true)}>
            Take theirs
          </button>
        </>
      )}
      <button
        type="button"
        className={`${s.btn} ${s.btnPrimary}`}
        disabled={!st.canPublish || st.publish === 'conflict'}
        onClick={() => void publishDraft()}
      >
        Publish changes
      </button>
      <button
        type="button"
        className={compact ? `${s.btn} ${s.btnQuiet}` : s.btn}
        disabled={st.count === 0}
        onClick={() => setConfirm(true)}
      >
        Discard
      </button>
      {confirmTheirs && (
        <Confirm
          title="Take their version?"
          message="Your unpublished edits are replaced by what the other person published. This cannot be undone."
          confirmLabel="Take theirs"
          danger
          onCancel={() => setConfirmTheirs(false)}
          onConfirm={() => {
            setConfirmTheirs(false);
            takeTheirs();
          }}
        />
      )}
      {confirm && (
        <Confirm
          title="Discard your changes?"
          message="Everything you changed since the last publish is lost."
          confirmLabel="Discard changes"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            discard();
          }}
        />
      )}
    </>
  );
}
