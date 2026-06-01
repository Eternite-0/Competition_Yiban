import { create } from 'zustand';
import type { User } from '../types';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
  // Auth
  currentUser: User | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ currentUser: user });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ currentUser: null });
  },

  theme: (localStorage.getItem('theme') as Theme) || 'system',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    applyThemeClass(theme);
    set({ theme });
  },
}));

// Apply theme on initial load
applyThemeClass(useStore.getState().theme);

// Listen for system theme changes when theme is 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useStore.getState().theme === 'system') {
    applyThemeClass('system');
  }
});
