import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { fileStorage } from '@/lib/storage';

type SettingsState = {
  serverUrl: string;
  token: string;
  defaultSource: 'youtube' | 'soundcloud';
  setServer: (url: string, token: string) => void;
  setDefaultSource: (s: 'youtube' | 'soundcloud') => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: '',
      token: '',
      defaultSource: 'youtube',
      setServer: (url, token) =>
        set({ serverUrl: url.trim().replace(/\/+$/, ''), token: token.trim() }),
      setDefaultSource: (s) => set({ defaultSource: s }),
    }),
    { name: 'birch-settings', storage: createJSONStorage(() => fileStorage) }
  )
);
