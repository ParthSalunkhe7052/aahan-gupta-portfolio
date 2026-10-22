import { Component, type ReactNode } from 'react';
import { RouteMounted } from '@/core/transition';
import styles from './ErrorBoundary.module.css';

interface Props {
  /** What to render instead of the children once one of them has thrown. */
  fallback: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error) => void;
  children: ReactNode;
}

/**
 * Catches render errors (and failed lazy imports or texture loads, which React
 * rethrows) below it, so one broken part cannot unmount the whole app.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
    this.props.onError?.(error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === 'function' ? fallback(error) : fallback;
  }
}

/**
 * Shown in place of a page that failed to load or render. It also signals the
 * transition overlay, so a cover never waits on a page that will not mount.
 */
export function RouteFailed() {
  return (
    <>
      <main id="main" className={styles.failed}>
        <p role="alert">This page could not load.</p>
        <a href="/">Back to Home</a>
      </main>
      <RouteMounted />
    </>
  );
}
