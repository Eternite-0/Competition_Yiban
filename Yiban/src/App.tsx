import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Toaster } from 'sonner';
import { resolveTheme, useStore } from './store/useStore';
import apiClient from './api/client';

function AppShell() {
  const { currentUser, setAuth, logout } = useStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || currentUser) {
      setHydrated(true);
      return;
    }
    apiClient.get('/auth/me')
      .then((user: any) => {
        const normalized = {
          ...user,
          id: String(user.id),
          name: user.realName || user.username || '用户',
        };
        setAuth(normalized, token);
      })
      .catch(() => {
        logout();
      })
      .finally(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-parchment text-ink">
        <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

function ThemedToaster() {
  const theme = useStore((s) => s.theme);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(theme));

  useEffect(() => {
    setResolved(resolveTheme(theme));
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return <Toaster position="top-center" richColors theme={resolved} />;
}

export default function App() {
  return (
    <>
      <ThemedToaster />
      <AppShell />
    </>
  );
}
