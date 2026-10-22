import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { worldOf } from '@shared/model';
import { ErrorBoundary, RouteFailed } from '@/core/ErrorBoundary';
import { SmoothScroll } from '@/core/scroll/SmoothScroll';
import { FxOverlay, RouteMounted } from '@/core/transition';
import { ContentGate } from '@/content/ContentGate';
import { AdminRoot } from '@/admin/AdminRoot';

const Home = lazy(() => import('@/pages/Home/Home'));
const ProjectIndex = lazy(() => import('@/pages/design/ProjectIndex'));
const CaseStudy = lazy(() => import('@/pages/design/CaseStudy'));
const Gallery = lazy(() => import('@/pages/art/Gallery'));
const Artwork = lazy(() => import('@/pages/art/Artwork'));
const CvPage = lazy(() => import('@/pages/CvPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
// Development-only effects lab; the dead branch is removed from production builds.
const FxLab = import.meta.env.DEV ? lazy(() => import('@/dev/FxLab')) : null;

/** Route element wrapper: signals the transition overlay once the page has mounted. */
function Page({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <RouteMounted />
    </>
  );
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.world = worldOf(location.pathname);
  }, [location.pathname]);

  if (FxLab && location.pathname === '/__lab') {
    return (
      <>
        <Suspense fallback={null}>
          <FxLab />
        </Suspense>
        <FxOverlay />
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SmoothScroll />
      <ContentGate>
        {/* Keyed by path so a failed page clears as soon as the visitor navigates away. */}
        <ErrorBoundary key={location.pathname} fallback={<RouteFailed />}>
          <Suspense fallback={null}>
            {/* Keyed by path so every navigation mounts a fresh page under the cover. */}
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Page><Home /></Page>} />
              <Route path="/design" element={<Navigate to="/design/branding" replace />} />
              <Route path="/design/:category" element={<Page><ProjectIndex /></Page>} />
              <Route path="/design/:category/:slug" element={<Page><CaseStudy /></Page>} />
              <Route path="/art" element={<Page><Gallery /></Page>} />
              <Route path="/art/:slug" element={<Page><Artwork /></Page>} />
              <Route path="/cv" element={<Page><CvPage /></Page>} />
              <Route path="*" element={<Page><NotFound /></Page>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <AdminRoot />
      </ContentGate>
      <FxOverlay />
    </>
  );
}
