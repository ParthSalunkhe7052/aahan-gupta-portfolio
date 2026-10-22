import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router';
import { useContentStore } from '@/content/store';
import { AdminBar } from './AdminBar';
import { AdminKey } from './AdminKey';
import { RestoreDraft } from './RestoreDraft';
import { SignInDialog } from './SignInDialog';
import { useDraftSafety } from './useDraftSafety';
import styles from './AdminRoot.module.css';

// The editor (and dnd-kit with it) only loads when an admin opens it.
const EditorDrawer = lazy(() => import('./EditorDrawer'));

/**
 * Admin chrome, mounted once above the routes: the key (fixed at the bottom right of
 * Home, which has no footer; every other page carries it in its footer), the sign-in
 * dialog, the admin bar and the editor drawer. It also guards unpublished edits (see useDraftSafety).
 */
export function AdminRoot() {
  const { pathname } = useLocation();
  const signedIn = useContentStore((s) => s.signedIn);
  const signInOpen = useContentStore((s) => s.signInOpen);
  const barHidden = useContentStore((s) => s.barHidden);
  const editorOpen = useContentStore((s) => s.editorOpen);
  useDraftSafety();

  return (
    <>
      {pathname === '/' && <AdminKey className={styles.homeKey} />}
      {signInOpen && <SignInDialog />}
      {signedIn && <RestoreDraft />}
      {signedIn && !barHidden && <AdminBar />}
      {signedIn && editorOpen && (
        <Suspense fallback={null}>
          <EditorDrawer />
        </Suspense>
      )}
    </>
  );
}
