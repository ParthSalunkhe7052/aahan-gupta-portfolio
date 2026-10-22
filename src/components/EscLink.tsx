import { BurnLink, type LinkKind } from '@/core/transition';
import { Svg } from './Svg';
import styles from './EscLink.module.css';

/** The ESC mark: one step up the site. Turmeric on both worlds. */
export function EscLink({
  to,
  label,
  kind,
  className,
}: {
  to: string;
  label: string;
  kind?: LinkKind;
  className?: string;
}) {
  return (
    <BurnLink to={to} kind={kind} aria-label={label} className={className ? `${styles.esc} ${className}` : styles.esc}>
      <Svg name="esc" />
    </BurnLink>
  );
}
