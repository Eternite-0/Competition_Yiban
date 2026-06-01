import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Toaster } from 'sonner';
import { useStore } from './store/useStore';
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas-parchment)' }}>
        <span className="material-symbols-outlined animate-spin text-[32px]" style={{ color: 'var(--color-primary)' }}>progress_activity</span>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <AppShell />
    </>
  );
}
