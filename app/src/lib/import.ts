import { File } from 'expo-file-system';
import { isWeb, parseFileName, safeName, tracksDir } from './files';
import { useLibrary } from '@/store/library';

const AUDIO_EXT = /\.(mp3|m4a|aac|mp4|wav|aif|aiff|flac|caf|alac|ogg|opus)$/i;
const seen = new Set<string>();
const listeners = new Set<(n: number) => void>();

export function onImported(cb: (n: number) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function isAudioFileUrl(url: string) {
  return /^file:\/\//i.test(url) && AUDIO_EXT.test(decodeURIComponent(url.split('?')[0]));
}

export async function importFiles(items: { uri: string; name?: string | null }[]) {
  if (isWeb) return 0;
  let count = 0;
  for (const item of items) {
    if (seen.has(item.uri)) continue;
    seen.add(item.uri);
    try {
      const rawName = item.name || decodeURIComponent(item.uri.split('/').pop() || 'track.mp3');
      const ext = (rawName.match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'mp3').toLowerCase();
      const id = `local:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const fileName = `${safeName(id)}.${ext}`;
      const src = new File(item.uri);
      const dest = new File(tracksDir(), fileName);
      await src.copy(dest);
      if (/\/(Inbox|tmp)\//.test(item.uri)) {
        try {
          src.delete();
        } catch {}
      }
      const meta = parseFileName(rawName);
      useLibrary.getState().addTrack({
        id,
        source: 'local',
        title: meta.title,
        artist: meta.artist,
        file: fileName,
        size: dest.size,
        addedAt: Date.now(),
      });
      count++;
    } catch (e) {
      console.warn('import failed', item.uri, e);
    }
  }
  if (count) listeners.forEach((l) => l(count));
  return count;
}
