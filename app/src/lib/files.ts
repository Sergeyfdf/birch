import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { Track } from './types';

export const isWeb = Platform.OS === 'web';

let tracksDirCache: Directory | null = null;
let artDirCache: Directory | null = null;

export function tracksDir() {
  if (!tracksDirCache) {
    tracksDirCache = new Directory(Paths.document, 'tracks');
    if (!tracksDirCache.exists) tracksDirCache.create({ intermediates: true, idempotent: true });
  }
  return tracksDirCache;
}

export function artDir() {
  if (!artDirCache) {
    artDirCache = new Directory(Paths.document, 'artwork');
    if (!artDirCache.exists) artDirCache.create({ intermediates: true, idempotent: true });
  }
  return artDirCache;
}

const isRemote = (s: string) => /^(https?|blob|data):/i.test(s);

export function audioUri(track: Track) {
  if (isWeb || isRemote(track.file)) return track.file;
  return new File(tracksDir(), track.file).uri;
}

export function artworkUri(track: Pick<Track, 'artwork'> | null | undefined) {
  const a = track?.artwork;
  if (!a) return null;
  if (isWeb || isRemote(a)) return a;
  return new File(artDir(), a).uri;
}

export function safeName(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function deleteTrackFiles(track: Track) {
  if (isWeb) return;
  try {
    if (!isRemote(track.file)) {
      const f = new File(tracksDir(), track.file);
      if (f.exists) f.delete();
    }
    if (track.artwork && !isRemote(track.artwork)) {
      const a = new File(artDir(), track.artwork);
      if (a.exists) a.delete();
    }
  } catch {}
}

export function storageStats() {
  if (isWeb) return { used: 0, free: 0 };
  let used = 0;
  try {
    used = (tracksDir().size ?? 0) + (artDir().size ?? 0);
  } catch {}
  let free = 0;
  try {
    free = Paths.availableDiskSpace;
  } catch {}
  return { used, free };
}

export function formatBytes(n: number) {
  if (!n) return '0 МБ';
  const gb = n / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} ГБ`;
  return `${Math.max(1, Math.round(n / 1024 ** 2))} МБ`;
}

export function formatTime(sec?: number | null) {
  if (sec == null || !isFinite(sec) || sec < 0) return '–:––';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function parseFileName(name: string) {
  const base = decodeURIComponent(name)
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const m = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  return { artist: 'Неизвестен', title: base || 'Без названия' };
}
