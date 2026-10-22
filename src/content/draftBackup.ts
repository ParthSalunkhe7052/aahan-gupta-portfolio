/**
 * A copy of the admin's unpublished draft in sessionStorage, so a reload, a crash
 * or an expired session does not lose edits. It lives only as long as the tab and
 * is removed on publish, discard and sign out. Storage can be blocked or full:
 * every access is allowed to fail.
 */
import type { Content } from '@shared/schema';

const KEY = 'ag-draft-v1';

export interface SavedDraft {
  savedAt: number;
  draft: Content;
}

/** Cheap structural check; the server still validates everything on publish. */
function looksLikeContent(v: unknown): v is Content {
  const c = v as Partial<Content> | null;
  return (
    !!c &&
    typeof c === 'object' &&
    typeof c.rev === 'number' &&
    !!c.site &&
    typeof c.site === 'object' &&
    Array.isArray(c.projects) &&
    Array.isArray(c.artworks)
  );
}

export function readDraftBackup(): SavedDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedDraft> | null;
    if (saved && typeof saved.savedAt === 'number' && looksLikeContent(saved.draft)) {
      return { savedAt: saved.savedAt, draft: saved.draft };
    }
  } catch {
    /* unreadable or blocked */
  }
  return null;
}

export function writeDraftBackup(draft: Content) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), draft } satisfies SavedDraft));
  } catch {
    /* blocked or over quota: the in-memory draft and the unload warning still protect the edits */
  }
}

export function clearDraftBackup() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* blocked */
  }
}
