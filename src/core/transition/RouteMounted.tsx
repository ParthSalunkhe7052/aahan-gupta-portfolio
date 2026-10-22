import { useLayoutEffect } from 'react';
import { useTransitionStore } from './store';

/**
 * Rendered next to each lazy route element inside <Suspense>: its layout effect
 * only runs once the route's code has loaded and mounted, which tells the
 * overlay it can lift.
 */
export function RouteMounted() {
  useLayoutEffect(() => {
    useTransitionStore.getState().routeMounted();
  }, []);
  return null;
}
