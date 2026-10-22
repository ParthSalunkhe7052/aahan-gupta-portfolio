/**
 * Client content state. Visitors see the published document. A signed-in admin
 * edits a draft copy; every page renders the draft while signed in, which is the
 * live preview. "Publish" PUTs the draft with the rev it was based on.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import type { Artwork, Category, Content, Project, Site } from '@shared/schema';
import { ApiError, api } from './api';
import { clearDraftBackup, readDraftBackup, type SavedDraft } from './draftBackup';
import { changeCount, problemsIn } from './validate';

export type EditorTab = 'projects' | 'templates' | 'artworks' | 'site' | 'security';

export type EditorIntent =
  | { kind: 'new-project'; category: Category }
  | { kind: 'edit-project'; id: string; /** Open every row's image slots straight away (a project just made from a template). */ expand?: boolean }
  | { kind: 'edit-artwork'; id: string }
  | null;

type LoadState = 'loading' | 'ready' | 'error';
type PublishState = 'idle' | 'publishing' | 'published' | 'conflict' | 'failed';

interface State {
  load: LoadState;
  published: Content | null;
  draft: Content | null;
  signedIn: boolean;

  signInOpen: boolean;
  signInNotice: string;
  editorOpen: boolean;
  editorTab: EditorTab;
  editorIntent: EditorIntent;
  barHidden: boolean;

  publish: PublishState;
  publishMessage: string;
  /** After a 409: the document the server holds now (what "take theirs" adopts). */
  theirs: Content | null;
  /** An unpublished draft found in this tab's storage, waiting for the admin to restore or drop it. */
  restorable: SavedDraft | null;

  init: () => Promise<void>;
  /** Mutate a clone of the draft. No-op when nobody is signed in. */
  edit: (fn: (draft: Content) => void) => void;
  discard: () => void;
  publishDraft: () => Promise<void>;
  /** After a 409: keep the draft as it is and rebase it onto the server's revision. */
  keepMine: () => void;
  /** After a 409: drop the draft and adopt the server's document. */
  takeTheirs: () => void;
  restoreDraft: () => void;
  dismissRestore: () => void;
  signIn: (password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => Promise<void>;
  openSignIn: (notice?: string) => void;
  closeSignIn: () => void;
  openEditor: (tab?: EditorTab, intent?: EditorIntent) => void;
  closeEditor: () => void;
  setEditorTab: (tab: EditorTab) => void;
  clearIntent: () => void;
  toggleBar: () => void;
}

const clone = <T,>(v: T): T => structuredClone(v);

/** The stored draft, if it holds edits that the given published document does not already contain. */
function backupFor(published: Content): SavedDraft | null {
  const saved = readDraftBackup();
  return saved && changeCount(published, saved.draft) > 0 ? saved : null;
}

export const useContentStore = create<State>((set, get) => ({
  load: 'loading',
  published: null,
  draft: null,
  signedIn: false,

  signInOpen: false,
  signInNotice: '',
  editorOpen: false,
  editorTab: 'projects',
  editorIntent: null,
  barHidden: false,

  publish: 'idle',
  publishMessage: '',
  theirs: null,
  restorable: null,

  init: async () => {
    set({ load: 'loading' });
    try {
      const [content, session] = await Promise.all([api.content(), api.session().catch(() => ({ admin: false }))]);
      set({
        published: content,
        load: 'ready',
        signedIn: session.admin,
        draft: session.admin ? clone(content) : null,
        restorable: session.admin ? backupFor(content) : null,
      });
    } catch {
      set({ load: 'error' });
    }
  },

  edit: (fn) => {
    const { draft, signedIn } = get();
    if (!draft || !signedIn) return;
    const next = clone(draft);
    fn(next);
    // A pending 409 choice survives further edits; anything else resets to idle.
    set((st) => (st.publish === 'conflict' ? { draft: next } : { draft: next, publish: 'idle', publishMessage: '' }));
  },

  discard: () => {
    const { published } = get();
    clearDraftBackup();
    if (published) set({ draft: clone(published), publish: 'idle', publishMessage: '', theirs: null });
  },

  publishDraft: async () => {
    const { draft } = get();
    if (!draft || get().publish === 'publishing') return;
    const problems = problemsIn(draft);
    if (problems.length) {
      set({ publish: 'failed', publishMessage: problems[0] });
      return;
    }
    set({ publish: 'publishing', publishMessage: '' });
    try {
      const saved = await api.saveContent(draft);
      clearDraftBackup();
      set({ published: saved, draft: clone(saved), publish: 'published', publishMessage: 'Changes published.', theirs: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // The 409 body carries the server's current document; older servers may not, so ask for it.
        let theirs = (err.body as { current?: Content } | null)?.current ?? null;
        if (!theirs) theirs = await api.content().catch(() => null);
        set({
          publish: 'conflict',
          publishMessage: 'Someone else published changes. Keep your version or take theirs?',
          theirs,
        });
      } else if (err instanceof ApiError && err.status === 401) {
        set({ signedIn: false, publish: 'failed', publishMessage: 'Your session has ended.' });
        get().openSignIn('Your session has ended. Unlock again to publish; your edits are kept.');
      } else if (err instanceof ApiError && err.status === 400) {
        const issues = (err.body as { issues?: { path: string; message: string }[] } | null)?.issues;
        set({
          publish: 'failed',
          publishMessage: issues?.length ? `${issues[0].message} (${issues[0].path})` : 'The server did not accept these changes.',
        });
      } else {
        set({ publish: 'failed', publishMessage: err instanceof ApiError ? err.message : 'Publishing failed.' });
      }
    }
  },

  keepMine: () => {
    const { draft, theirs } = get();
    if (!draft || !theirs) return;
    // Their document becomes the base; the draft is untouched, so publishing overwrites their changes.
    set({ published: theirs, draft: { ...clone(draft), rev: theirs.rev }, publish: 'idle', publishMessage: '', theirs: null });
  },

  takeTheirs: () => {
    const { theirs } = get();
    if (!theirs) return;
    clearDraftBackup();
    set({ published: theirs, draft: clone(theirs), publish: 'idle', publishMessage: '', theirs: null });
  },

  restoreDraft: () => {
    const { restorable } = get();
    if (restorable) set({ draft: clone(restorable.draft), restorable: null, publish: 'idle', publishMessage: '' });
  },

  dismissRestore: () => {
    clearDraftBackup();
    set({ restorable: null });
  },

  signIn: async (password) => {
    try {
      await api.login(password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const retry = (err.body as { retryAfter?: number } | null)?.retryAfter ?? 900;
        const minutes = Math.max(1, Math.ceil(retry / 60));
        return { ok: false, message: `Too many attempts. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.` };
      }
      if (err instanceof ApiError && err.status === 401) return { ok: false, message: "That password didn't work." };
      return { ok: false, message: err instanceof ApiError ? err.message : 'Could not sign in.' };
    }
    // Visitors are served only published items; the admin needs the full document
    // (drafts included), otherwise publishing would drop the drafts.
    let { published } = get();
    try {
      published = await api.content();
    } catch {
      /* keep the copy already loaded */
    }
    const { draft } = get();
    set({
      signedIn: true,
      barHidden: false,
      signInOpen: false,
      signInNotice: '',
      published,
      draft: draft ?? (published ? clone(published) : null),
      // Edits still in memory (the session ended mid-edit) win; otherwise offer what this tab saved.
      restorable: !draft && published ? backupFor(published) : null,
    });
    return { ok: true };
  },

  signOut: async () => {
    try {
      await api.logout();
    } catch {
      /* the cookie is cleared server side on the next call; sign out locally regardless */
    }
    clearDraftBackup();
    set({
      signedIn: false,
      draft: null,
      editorOpen: false,
      editorIntent: null,
      publish: 'idle',
      publishMessage: '',
      theirs: null,
      restorable: null,
    });
  },

  openSignIn: (notice = '') => set({ signInOpen: true, signInNotice: notice }),
  closeSignIn: () => set({ signInOpen: false, signInNotice: '' }),
  openEditor: (tab, intent = null) =>
    set((s) => ({ editorOpen: true, editorTab: tab ?? s.editorTab, editorIntent: intent, barHidden: false })),
  closeEditor: () => set({ editorOpen: false, editorIntent: null }),
  setEditorTab: (tab) => set({ editorTab: tab }),
  clearIntent: () => set({ editorIntent: null }),
  toggleBar: () => set((s) => ({ barHidden: !s.barHidden })),
}));

/**
 * The document to render: the admin draft while signed in (live preview),
 * otherwise the published one. ContentGate guarantees it is loaded.
 */
export function useContent(): Content {
  return useContentStore((s) => (s.signedIn && s.draft ? s.draft : (s.published as Content)));
}

export function useSite(): Site {
  return useContent().site;
}

/** Published projects for visitors, all of them for a signed-in admin. */
export function useProjects(category?: Category): Project[] {
  const content = useContent();
  const signedIn = useContentStore((s) => s.signedIn);
  return useMemo(
    () =>
      content.projects.filter((p) => (category ? p.category === category : true) && (signedIn || p.published)),
    [content.projects, category, signedIn],
  );
}

export function useArtworks(): Artwork[] {
  const content = useContent();
  const signedIn = useContentStore((s) => s.signedIn);
  return useMemo(() => content.artworks.filter((a) => signedIn || a.published), [content.artworks, signedIn]);
}

/** Admin state and actions for the key, sign-in dialog, admin bar and editor. */
export function useAdmin() {
  const signedIn = useContentStore((s) => s.signedIn);
  const openSignIn = useContentStore((s) => s.openSignIn);
  const toggleBar = useContentStore((s) => s.toggleBar);
  const openEditor = useContentStore((s) => s.openEditor);
  const closeEditor = useContentStore((s) => s.closeEditor);
  const editorOpen = useContentStore((s) => s.editorOpen);
  return useMemo(
    () => ({
      signedIn,
      editorOpen,
      openEditor,
      closeEditor,
      /** The admin key: asks for the password, or shows/hides the admin bar when already signed in. */
      pressKey: () => (signedIn ? toggleBar() : openSignIn()),
    }),
    [signedIn, editorOpen, openEditor, closeEditor, openSignIn, toggleBar],
  );
}
