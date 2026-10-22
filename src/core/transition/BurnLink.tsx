import type { MouseEvent } from 'react';
import { Link, type LinkProps } from 'react-router';
import { useBurnNavigate, type LinkKind } from './hooks';

type Props = Omit<LinkProps, 'to'> & { to: string; kind?: LinkKind };

/**
 * `<Link>` that navigates behind the page transition. Modified clicks
 * (new tab, etc.) fall through to the browser.
 */
export function BurnLink({ to, kind = 'auto', onClick, target, ...rest }: Props) {
  const go = useBurnNavigate();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (target && target !== '_self') return;
    e.preventDefault();
    go(to, kind);
  };
  return <Link to={to} target={target} onClick={handle} {...rest} />;
}
