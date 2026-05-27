import { create } from 'zustand';
import type { User } from '../types';

interface AppState {
  // Auth
  currentUser: User | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
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
}));
