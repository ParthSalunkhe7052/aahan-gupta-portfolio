import { Svg } from './Svg';
import styles from './EscLink.module.css';

/** The ESC mark as a button (closes viewers and panels). */
export function EscButton({ onClick, label, className }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={className ? `${styles.esc} ${className}` : styles.esc}
    >
      <Svg name="esc" />
    </button>
  );
}
