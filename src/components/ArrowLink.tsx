import type { ReactNode } from 'react';
import { BurnLink, type LinkKind } from '@/core/transition';
import { Svg } from './Svg';
import styles from './ArrowLink.module.css';

type Props = {
  children: ReactNode;
  className?: string;
  /** Page transition for `to` (default: burn between worlds, veil within one). */
  kind?: LinkKind;
  'aria-label'?: string;
} & (
  | { to: string; href?: never; onClick?: never }
  | { href: string; to?: never; onClick?: never }
  | { onClick: () => void; to?: never; href?: never }
);

/** Text followed by the client's arrow. The arrow slides 6px on hover or focus. */
export function ArrowLink({ children, className, kind, 'aria-label': label, ...target }: Props) {
  const cls = className ? `${styles.link} ${className}` : styles.link;
  const inner = (
    <>
      <span>{children}</span>
      <Svg name="arrow" className={styles.arrow} />
    </>
  );
  if (target.to !== undefined) {
    return (
      <BurnLink to={target.to} kind={kind} className={cls} aria-label={label}>
        {inner}
      </BurnLink>
    );
  }
  if (target.href !== undefined) {
    return (
      <a href={target.href} className={cls} aria-label={label} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={target.onClick} className={cls} aria-label={label}>
      {inner}
    </button>
  );
}
