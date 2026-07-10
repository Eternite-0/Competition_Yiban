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

function applyThemeClass(theme: Theme, animate = false) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const root = document.documentElement;

  if (animate) {
    root.classList.add('theme-transition');
    root.classList.toggle('dark', resolved === 'dark');
    window.setTimeout(() => root.classList.remove('theme-transition'), 220);
  } else {
    root.classList.toggle('dark', resolved === 'dark');
  }
  root.style.colorScheme = resolved;
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
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

  theme: (localStorage.getItem('theme') as Theme) || 'light',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    applyThemeClass(theme, true);
    set({ theme });
  },
}));

// Apply theme on initial load (html class may already be set by index.html FOUC script)
applyThemeClass(useStore.getState().theme);

// Listen for system theme changes when theme is 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useStore.getState().theme === 'system') {
    applyThemeClass('system');
  }
});
