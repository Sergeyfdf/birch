import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deleteTrackFiles } from '@/lib/files';
import { fileStorage } from '@/lib/storage';
import type { Playlist, Track } from '@/lib/types';

type LibraryState = {
  tracks: Record<string, Track>;
  order: string[];
  playlists: Record<string, Playlist>;
  playlistOrder: string[];
  hydrated: boolean;
  addTrack: (t: Track) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  removeTrack: (id: string) => void;
  createPlaylist: (name: string, trackIds?: string[]) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, trackIds: string[]) => void;
  removeFromPlaylist: (id: string, index: number) => void;
  setPlaylistTracks: (id: string, trackIds: string[]) => void;
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      tracks: {},
      order: [],
      playlists: {},
      playlistOrder: [],
      hydrated: false,
      addTrack: (t) =>
        set((s) => ({
          tracks: { ...s.tracks, [t.id]: t },
          order: s.tracks[t.id] ? s.order : [t.id, ...s.order],
        })),
      updateTrack: (id, patch) =>
        set((s) => (s.tracks[id] ? { tracks: { ...s.tracks, [id]: { ...s.tracks[id], ...patch } } } : s)),
      removeTrack: (id) => {
        const t = get().tracks[id];
        if (t) deleteTrackFiles(t);
        set((s) => {
          const tracks = { ...s.tracks };
          delete tracks[id];
          const playlists: Record<string, Playlist> = {};
          for (const [pid, p] of Object.entries(s.playlists)) {
            playlists[pid] = p.trackIds.includes(id)
              ? { ...p, trackIds: p.trackIds.filter((x) => x !== id), updatedAt: Date.now() }
              : p;
          }
          return { tracks, order: s.order.filter((x) => x !== id), playlists };
        });
      },
      createPlaylist: (name, trackIds = []) => {
        const id = uid();
        const now = Date.now();
        set((s) => ({
          playlists: { ...s.playlists, [id]: { id, name: name.trim() || 'Новый плейлист', trackIds, createdAt: now, updatedAt: now } },
          playlistOrder: [id, ...s.playlistOrder],
        }));
        return id;
      },
      renamePlaylist: (id, name) =>
        set((s) => ({ playlists: { ...s.playlists, [id]: { ...s.playlists[id], name: name.trim() || s.playlists[id].name, updatedAt: Date.now() } } })),
      deletePlaylist: (id) =>
        set((s) => {
          const playlists = { ...s.playlists };
          delete playlists[id];
          return { playlists, playlistOrder: s.playlistOrder.filter((x) => x !== id) };
        }),
      addToPlaylist: (id, trackIds) =>
        set((s) => {
          const p = s.playlists[id];
          if (!p) return s;
          const fresh = trackIds.filter((t) => !p.trackIds.includes(t));
          return { playlists: { ...s.playlists, [id]: { ...p, trackIds: [...p.trackIds, ...fresh], updatedAt: Date.now() } } };
        }),
      removeFromPlaylist: (id, index) =>
        set((s) => {
          const p = s.playlists[id];
          if (!p) return s;
          const trackIds = p.trackIds.slice();
          trackIds.splice(index, 1);
          return { playlists: { ...s.playlists, [id]: { ...p, trackIds, updatedAt: Date.now() } } };
        }),
      setPlaylistTracks: (id, trackIds) =>
        set((s) => (s.playlists[id] ? { playlists: { ...s.playlists, [id]: { ...s.playlists[id], trackIds, updatedAt: Date.now() } } } : s)),
    }),
    {
      name: 'birch-library',
      version: 1,
      storage: createJSONStorage(() => fileStorage),
      partialize: (s) => ({ tracks: s.tracks, order: s.order, playlists: s.playlists, playlistOrder: s.playlistOrder }),
      onRehydrateStorage: () => () => {
        useLibrary.setState({ hydrated: true });
      },
    }
  )
);
