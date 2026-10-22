import { CATEGORY_LABELS, type Category } from '@shared/model';
import { BurnLink } from '@/core/transition';
import { EscLink } from './EscLink';
import { Logo } from './Logo';
import styles from './DesignHeader.module.css';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

/**
 * Header of the Design world: ESC (one level up), the three category tabs and
 * the yellow signature. `active` is the current category, if any.
 */
export function DesignHeader({ back, backLabel, active }: { back: string; backLabel: string; active?: Category }) {
  return (
    <header className={styles.header} data-noprint>
      <EscLink to={back} label={backLabel} className={styles.esc} />
      <nav className={styles.tabs} aria-label="Design categories">
        {CATEGORIES.map((c) => (
          <BurnLink
            key={c}
            to={`/design/${c}`}
            className={c === active ? `${styles.tab} ${styles.current}` : styles.tab}
            aria-current={c === active ? 'page' : undefined}
          >
            {CATEGORY_LABELS[c]}
          </BurnLink>
        ))}
      </nav>
      <BurnLink to="/" className={styles.logo} aria-label="Aahan Gupta, home">
        <Logo tone="yellow" />
      </BurnLink>
    </header>
  );
}
