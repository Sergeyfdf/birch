import { File } from 'expo-file-system';
import { create } from 'zustand';
import { authHeaders, downloadUrl } from '@/lib/api';
import { artDir, isWeb, safeName, tracksDir } from '@/lib/files';
import type { RemoteTrack } from '@/lib/types';
import { useLibrary } from './library';

export type DownloadStatus = 'queued' | 'preparing' | 'downloading' | 'error';

export type DownloadTask = {
  track: RemoteTrack;
  status: DownloadStatus;
  progress: number;
  error?: string;
  playlistId?: string;
};

type DownloadsState = {
  tasks: Record<string, DownloadTask>;
  order: string[];
  enqueue: (tracks: RemoteTrack[], playlistId?: string) => number;
  retry: (id: string) => void;
  cancel: (id: string) => void;
  clearErrors: () => void;
};

const MAX_PARALLEL = 2;
const running = new Set<string>();
const aborts = new Map<string, AbortController>();

function patch(id: string, p: Partial<DownloadTask>) {
  useDownloads.setState((s) => (s.tasks[id] ? { tasks: { ...s.tasks, [id]: { ...s.tasks[id], ...p } } } : s));
}

function finish(id: string) {
  running.delete(id);
  aborts.delete(id);
  useDownloads.setState((s) => {
    const tasks = { ...s.tasks };
    delete tasks[id];
    return { tasks, order: s.order.filter((x) => x !== id) };
  });
  pump();
}

async function fetchArtwork(track: RemoteTrack, name: string) {
  if (!track.artwork) return null;
  if (isWeb) return track.artwork;
  try {
    const dest = new File(artDir(), `${name}.jpg`);
    await File.downloadFileAsync(track.artwork, dest, { idempotent: true });
    return dest.name;
  } catch {
    return track.artwork;
  }
}

async function run(id: string) {
  const task = useDownloads.getState().tasks[id];
  if (!task) return;
  const { track } = task;
  running.add(id);
  const ctrl = new AbortController();
  aborts.set(id, ctrl);
  patch(id, { status: 'preparing', progress: 0, error: undefined });
  const name = safeName(track.id);
  try {
    const url = downloadUrl(track.url);
    let file: string;
    let size: number | undefined;
    if (isWeb) {
      const token = authHeaders()['x-birch-token'];
      const res = await fetch(url, { headers: authHeaders(), signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      size = blob.size;
      file = token ? `${url}&token=${encodeURIComponent(token)}` : url;
    } else {
      const dest = new File(tracksDir(), `${name}.m4a`);
      const out = await File.downloadFileAsync(url, dest, {
        headers: authHeaders(),
        idempotent: true,
        signal: ctrl.signal,
        onProgress: ({ bytesWritten, totalBytes }) => {
          if (totalBytes > 0) patch(id, { status: 'downloading', progress: bytesWritten / totalBytes });
        },
      });
      if (!out.exists || out.size < 1024) {
        if (out.exists) out.delete();
        throw new Error('Пустой файл');
      }
      file = out.name;
      size = out.size;
    }
    const artwork = await fetchArtwork(track, name);
    useLibrary.getState().addTrack({
      id: track.id,
      source: track.source,
      url: track.url,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      file,
      artwork,
      size,
      addedAt: Date.now(),
    });
    const pid = useDownloads.getState().tasks[id]?.playlistId;
    if (pid) useLibrary.getState().addToPlaylist(pid, [track.id]);
    finish(id);
  } catch (e: any) {
    running.delete(id);
    aborts.delete(id);
    if (ctrl.signal.aborted) return;
    patch(id, { status: 'error', error: e?.message || 'Не скачалось' });
    pump();
  }
}

function pump() {
  const { order, tasks } = useDownloads.getState();
  for (const id of order) {
    if (running.size >= MAX_PARALLEL) break;
    if (tasks[id]?.status === 'queued' && !running.has(id)) run(id);
  }
}

export const useDownloads = create<DownloadsState>()((set, get) => ({
  tasks: {},
  order: [],
  enqueue: (tracks, playlistId) => {
    const lib = useLibrary.getState();
    const { tasks } = get();
    const fresh: RemoteTrack[] = [];
    const existing: string[] = [];
    for (const t of tracks) {
      if (lib.tracks[t.id]) existing.push(t.id);
      else if (!tasks[t.id]) fresh.push(t);
    }
    if (playlistId && existing.length) lib.addToPlaylist(playlistId, existing);
    if (!fresh.length) return 0;
    set((s) => {
      const next = { ...s.tasks };
      for (const t of fresh) next[t.id] = { track: t, status: 'queued', progress: 0, playlistId };
      return { tasks: next, order: [...s.order, ...fresh.map((t) => t.id)] };
    });
    pump();
    return fresh.length;
  },
  retry: (id) => {
    patch(id, { status: 'queued', error: undefined, progress: 0 });
    pump();
  },
  cancel: (id) => {
    aborts.get(id)?.abort();
    finish(id);
  },
  clearErrors: () =>
    set((s) => {
      const tasks = { ...s.tasks };
      const order = s.order.filter((id) => {
        if (tasks[id]?.status === 'error') {
          delete tasks[id];
          return false;
        }
        return true;
      });
      return { tasks, order };
    }),
}));
