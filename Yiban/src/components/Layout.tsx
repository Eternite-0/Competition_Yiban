import { Component, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import ErrorState from './ErrorState';
import AIAssistantWidget, { type AssistantPanelMode } from './ai/AIAssistantWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { pageTransition, pageVariants } from '../lib/motion';

export default function Layout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebarOpen');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [aiWorkspace, setAiWorkspace] = useState<{ open: boolean; mode: AssistantPanelMode }>({
    open: false,
    mode: 'floating',
  });
  const aiExpanded = aiWorkspace.open && aiWorkspace.mode === 'sidebar';

  useEffect(() => {
    try {
      localStorage.setItem('sidebarOpen', String(desktopSidebarOpen));
    } catch {
      /* ignore */
    }
  }, [desktopSidebarOpen]);

  const handleAiWorkspaceChange = useCallback((next: { open: boolean; mode: AssistantPanelMode }) => {
    setAiWorkspace((prev) => (
      prev.open === next.open && prev.mode === next.mode ? prev : next
    ));
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className={`relative min-h-screen app-workspace text-ink antialiased selection:bg-primary/15 selection:text-primary ${aiExpanded ? 'ai-workspace-expanded' : ''}`}>
      <Sidebar
        mobileOpen={mobileNavOpen}
        desktopOpen={desktopSidebarOpen}
        onClose={() => setMobileNavOpen(false)}
        onToggleDesktop={() => setDesktopSidebarOpen(false)}
      />

      {/* 侧栏收起后：左侧固定展开按钮 */}
      {!desktopSidebarOpen && (
        <button
          type="button"
          onClick={() => setDesktopSidebarOpen(true)}
          className="fixed left-3 top-3 z-40 hidden h-10 w-10 place-items-center rounded-xl border border-hairline bg-canvas text-body-muted shadow-float transition-colors hover:border-primary/25 hover:bg-primary-soft hover:text-primary md:grid"
          aria-label="展开侧边栏"
          title="展开侧边栏"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m9.5 6 5 6-5 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] md:hidden"
            aria-label="关闭侧边导航"
          />
        )}
      </AnimatePresence>

      <div className={`app-content-shell relative flex min-h-screen flex-col ${desktopSidebarOpen ? 'md:ml-[var(--sidebar-width)]' : 'md:ml-0'}`}>
        <Header
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
          desktopSidebarOpen={desktopSidebarOpen}
        />
        <main className="flex-1 pt-[var(--header-height)]">
          <div className="app-main-frame">
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-8 sm:pb-10">
              <Breadcrumb />
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={pageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={pageTransition}
                >
                  <PageErrorBoundary>
                    <Outlet />
                  </PageErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
      <AIAssistantWidget onWorkspaceChange={handleAiWorkspaceChange} />
    </div>
  );
}

interface EBState {
  hasError: boolean;
}

class PageErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          variant="generic"
          title="页面加载出错"
          message="渲染页面时发生错误，请尝试刷新"
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
