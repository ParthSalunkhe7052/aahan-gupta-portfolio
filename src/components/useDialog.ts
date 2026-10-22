import { useEffect, useRef, type RefObject } from 'react';
import { lockScroll, unlockScroll } from '@/core/scroll/SmoothScroll';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, topmost last: only the topmost one reacts to Escape and Tab. */
const stack: symbol[] = [];

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

interface Options {
  onClose: () => void;
  /** Pause page scrolling while open (default true). */
  lock?: boolean;
}

/**
 * Dialog behaviour for a mounted element: moves focus in (to `[data-autofocus]`
 * or the first control), traps Tab, closes on Escape, locks page scroll, and
 * gives focus back to whatever had it before when it unmounts.
 */
export function useDialog(ref: RefObject<HTMLElement | null>, { onClose, lock = true }: Options) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const id = Symbol('dialog');
    stack.push(id);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (lock) lockScroll();

    const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(root)[0] ?? root;
    if (first === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
    first.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        e.preventDefault();
        head.focus();
      } else if (e.shiftKey && active === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && active === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      document.removeEventListener('keydown', onKey, true);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (lock) unlockScroll();
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [ref, lock]);
}
