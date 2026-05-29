import { Component, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { pageTransition, pageVariants } from '../lib/motion';

export default function Layout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen app-workspace text-ink antialiased selection:bg-primary/10 selection:text-primary">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-ink/10 backdrop-blur-sm md:hidden"
            aria-label="关闭侧边导航"
          />
        )}
      </AnimatePresence>

      <div className="relative flex min-h-screen flex-col md:ml-[200px]">
        <Header
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
        />
        <main className="flex-1 pt-[52px]">
          <div className="app-main-frame">
            <div className="mx-auto w-full max-w-[1100px] px-6 pt-8 pb-8">
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
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="text-[15px] text-ink-muted-80">页面加载出错</span>
          <button
            type="button"
            onClick={this.handleRetry}
            className="btn-primary"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
