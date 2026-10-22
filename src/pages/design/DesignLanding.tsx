import { useRef } from 'react';
import { CATEGORY_LABELS, type Category } from '@shared/model';
import { ArrowLink } from '@/components/ArrowLink';
import { Footer } from '@/components/Footer';
import { useEntrance } from '@/components/useEntrance';
import { usePageTitle } from '@/components/usePageTitle';
import { BurnLink } from '@/core/transition';
import styles from './DesignLanding.module.css';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function DesignLanding() {
  const main = useRef<HTMLElement>(null);
  useEntrance(main);
  usePageTitle('Design');

  return (
    <>
      <main id="main" ref={main} className={styles.main}>
        <h1 className="visually-hidden">Design</h1>
        <nav className={styles.links} aria-label="Design categories">
          {CATEGORIES.map((c) => (
            <BurnLink key={c} to={`/design/${c}`} className={styles.link} data-enter>
              {CATEGORY_LABELS[c]}
            </BurnLink>
          ))}
        </nav>
        <span className={styles.rule} aria-hidden="true" data-enter />
        <div className={styles.more}>
          <span data-enter>
            <ArrowLink to="/">Home</ArrowLink>
          </span>
          <span data-enter>
            <ArrowLink to="/art">Art</ArrowLink>
          </span>
        </div>
      </main>
      <Footer world="design" />
    </>
  );
}
