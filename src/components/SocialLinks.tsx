import { BurnLink } from '@/core/transition';
import { useSite } from '@/content/store';
import { safeHttp, telHref } from './links';
import { Svg, type SvgName } from './Svg';
import styles from './SocialLinks.module.css';

/**
 * The six hand-drawn icons, always in this order: Instagram, Behance, LinkedIn,
 * Mail, Contact (phone), CV. `column` stacks them, `row` lines them up, `grid`
 * is two across by three down. Size with `--icon-size` on `className`.
 */
export function SocialLinks({ layout, className }: { layout: 'column' | 'row' | 'grid'; className?: string }) {
  const { contact, cv } = useSite();
  const items: { name: SvgName; label: string; href: string | null; internal?: boolean }[] = [
    { name: 'instagram', label: 'Instagram', href: safeHttp(contact.instagram) },
    { name: 'behance', label: 'Behance', href: safeHttp(contact.behance) },
    { name: 'linkedin', label: 'LinkedIn', href: safeHttp(contact.linkedin) },
    { name: 'mail', label: `Email ${contact.email}`, href: contact.email ? `mailto:${contact.email}` : null },
    { name: 'contact', label: `Call ${contact.phone}`, href: contact.phone ? telHref(contact.phone) : null },
    { name: 'cv', label: cv.pdf ? 'CV, download PDF' : 'CV', href: cv.pdf || '/cv', internal: !cv.pdf },
  ];
  const cls = [styles.list, styles[layout], className ?? ''].filter(Boolean).join(' ');
  return (
    <ul className={cls}>
      {items
        .filter((i) => i.href)
        .map((i) => (
          <li key={i.name}>
            {i.internal ? (
              <BurnLink to={i.href!} className={styles.icon} aria-label={i.label} data-label={i.label}>
                <Svg name={i.name} />
              </BurnLink>
            ) : (
              <a
                href={i.href!}
                className={styles.icon}
                aria-label={i.label}
                data-label={i.label}
                {...(/^https?:/i.test(i.href!) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                {...(i.name === 'cv' ? { download: '' } : {})}
              >
                <Svg name={i.name} />
              </a>
            )}
          </li>
        ))}
    </ul>
  );
}
