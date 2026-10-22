import { useRef } from 'react';
import { ArrowLink } from '@/components/ArrowLink';
import { useEntrance } from '@/components/useEntrance';
import { usePageTitle } from '@/components/usePageTitle';
import styles from './NotFound.module.css';

/** Unknown address (or an unknown project or artwork). Colours follow the world it is shown in. */
export default function NotFound() {
  const main = useRef<HTMLElement>(null);
  useEntrance(main);
  usePageTitle('Page not found');

  return (
    <main id="main" ref={main} className={styles.main}>
      <h1 className={styles.title} data-enter>
        This page has burned away.
      </h1>
      <nav className={styles.links} aria-label="Where to next" data-enter>
        <ArrowLink to="/">Home</ArrowLink>
        <ArrowLink to="/design/branding">Design</ArrowLink>
        <ArrowLink to="/art">Art</ArrowLink>
      </nav>
    </main>
  );
}
