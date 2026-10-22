import { useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '@/components/useDialog';
import { useContentStore, type EditorTab } from '@/content/store';
import { ArtworksTab } from './ArtworksTab';
import { PublishControls } from './PublishControls';
import { ProjectsTab } from './ProjectsTab';
import { SecurityTab } from './SecurityTab';
import { TemplatesTab } from './TemplatesTab';
import { SiteTab } from './SiteTab';
import s from './admin.module.css';

const TABS: { id: EditorTab; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'templates', label: 'Templates' },
  { id: 'artworks', label: 'Artworks' },
  { id: 'site', label: 'Home and contact' },
  { id: 'security', label: 'Security' },
];

/**
 * Right-hand drawer (520px, full height) with the four editing tabs. It does not
 * lock the page, so the live preview behind it can still be scrolled; focus is
 * trapped inside while it is open, and Escape closes it.
 */
export default function EditorDrawer() {
  const tab = useContentStore((st) => st.editorTab);
  const setTab = useContentStore((st) => st.setEditorTab);
  const close = useContentStore((st) => st.closeEditor);
  const root = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useDialog(root, { onClose: close, lock: false });

  const onTabKey = (e: KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabs.current[next]?.focus();
  };

  return createPortal(
    <aside
      ref={root}
      className={`${s.scope} ${s.drawer}`}
      role="dialog"
      aria-modal="false"
      aria-label="Edit content"
      data-lenis-prevent
      data-noprint
    >
      <div className={s.drawerHead}>
        <h2 className={s.drawerTitle}>Edit content</h2>
        <button type="button" className={s.btn} onClick={close} data-autofocus>
          Close
        </button>
      </div>
      <div className={s.tabs} role="tablist" aria-label="Sections">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="editor-panel"
            tabIndex={tab === t.id ? 0 : -1}
            className={tab === t.id ? `${s.tab} ${s.tabActive}` : s.tab}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={s.panel} id="editor-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} data-lenis-prevent>
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'artworks' && <ArtworksTab />}
        {tab === 'site' && <SiteTab />}
        {tab === 'security' && <SecurityTab />}
      </div>
      <div className={s.drawerFoot}>
        <PublishControls compact />
      </div>
    </aside>,
    document.body,
  );
}
