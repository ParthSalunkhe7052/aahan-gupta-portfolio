import type { CSSProperties } from 'react';
import { Svg } from './Svg';
import styles from './Logo.module.css';

const TONES = { red: 'var(--oxblood)', yellow: 'var(--turmeric)', current: 'currentColor' } as const;

/**
 * The signature. Takes the world's `--logo` colour (red on Art, yellow on
 * Design) unless `tone` says otherwise. Fills its container; size it with
 * `className` or by wrapping it.
 */
export function Logo({ className, tone }: { className?: string; tone?: 'red' | 'yellow' | 'current' }) {
  const style: CSSProperties = { color: tone ? TONES[tone] : 'var(--logo)' };
  return (
    <span className={className ? `${styles.logo} ${className}` : styles.logo} style={style}>
      <Svg name="logo" />
    </span>
  );
}
