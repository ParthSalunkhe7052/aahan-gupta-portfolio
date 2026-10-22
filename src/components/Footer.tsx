import { AdminKey } from '@/admin/AdminKey';
import { BurnLink } from '@/core/transition';
import { footerTexture } from '@/content/assets';
import { Logo } from './Logo';
import { Picture } from './Picture';
import { SocialLinks } from './SocialLinks';
import styles from './Footer.module.css';

/**
 * The dark textured footer closing every Design and Art page. The signature is
 * red on Art and yellow on Design. Hosts the admin key at its bottom right.
 */
export function Footer({ world }: { world: 'art' | 'design' }) {
  return (
    <footer className={styles.footer} data-noprint>
      <div className={styles.texture} aria-hidden="true">
        <Picture media={footerTexture} ratio="fill" sizes="100vw" />
      </div>
      <div className={styles.inner}>
        <nav className={styles.nav} aria-label="Footer">
          <div className={styles.group}>
            <BurnLink to="/design/branding" className={styles.head}>
              Design
            </BurnLink>
            <ul className={styles.sub}>
              <li>
                <BurnLink to="/design/branding">Branding</BurnLink>
              </li>
              <li>
                <BurnLink to="/design/illustrations">Illustration</BurnLink>
              </li>
              <li>
                <BurnLink to="/design/packaging">Packaging</BurnLink>
              </li>
            </ul>
          </div>
          <div className={styles.group}>
            <BurnLink to="/art" className={styles.head}>
              Art
            </BurnLink>
            <ul className={styles.sub}>
              <li>
                <BurnLink to="/art">Gallery</BurnLink>
              </li>
            </ul>
          </div>
          <div className={styles.group}>
            <BurnLink to="/" className={styles.head}>
              Home
            </BurnLink>
          </div>
        </nav>
        <Logo tone={world === 'art' ? 'red' : 'yellow'} className={styles.logo} />
        <SocialLinks layout="row" className={styles.icons} />
      </div>
      <AdminKey className={styles.key} />
    </footer>
  );
}
