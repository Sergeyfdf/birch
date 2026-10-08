import { importFiles, isAudioFileUrl } from '@/lib/import';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (isAudioFileUrl(path)) {
      importFiles([{ uri: path }]);
      return '/';
    }
  } catch {}
  return path;
}
