import arrow from '@/assets/svg/arrow.svg?raw';
import arrowLight from '@/assets/svg/arrow-light.svg?raw';
import behance from '@/assets/svg/behance.svg?raw';
import contact from '@/assets/svg/contact.svg?raw';
import cv from '@/assets/svg/cv.svg?raw';
import esc from '@/assets/svg/esc.svg?raw';
import instagram from '@/assets/svg/instagram.svg?raw';
import linkedin from '@/assets/svg/linkedin.svg?raw';
import logo from '@/assets/svg/logo.svg?raw';
import mail from '@/assets/svg/mail.svg?raw';
import zoom from '@/assets/svg/zoom.svg?raw';
import styles from './Svg.module.css';

export type SvgName =
  | 'arrow'
  | 'arrow-light'
  | 'esc'
  | 'zoom'
  | 'logo'
  | 'behance'
  | 'contact'
  | 'cv'
  | 'instagram'
  | 'linkedin'
  | 'mail';

const SOURCES: Record<SvgName, string> = {
  arrow,
  'arrow-light': arrowLight,
  esc,
  zoom,
  logo,
  behance,
  contact,
  cv,
  instagram,
  linkedin,
  mail,
};

/**
 * The client's own SVG artwork, inlined so it can take `currentColor` (and the
 * arrow tip from `--arrow-tip`). The wrapper fills its container; size it with
 * `className`. Decorative (aria-hidden) unless `title` is given.
 */
export function Svg({ name, className, title }: { name: SvgName; className?: string; title?: string }) {
  return (
    <span
      className={className ? `${styles.svg} ${className}` : styles.svg}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: SOURCES[name] }}
    />
  );
}
