import { useEffect } from 'react';

const DEFAULT_TITLE = typeof document === 'undefined' ? '' : document.title;

/** Sets the tab title for the page's lifetime and restores the default when it unmounts. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} | Aahan Gupta`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
