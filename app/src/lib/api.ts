import type { RemoteTrack } from './types';
import { useSettings } from '@/store/settings';

export class ApiError extends Error {}

function base() {
  const { serverUrl } = useSettings.getState();
  if (!serverUrl) throw new ApiError('Укажи адрес сервера в настройках');
  return /^https?:\/\//i.test(serverUrl) ? serverUrl : `http://${serverUrl}`;
}

export function authHeaders(): Record<string, string> {
  const { token } = useSettings.getState();
  return token ? { 'x-birch-token': token } : {};
}

async function getJson<T>(path: string, timeoutMs = 90000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base()}${path}`, { headers: authHeaders(), signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) throw new ApiError('Неверный токен');
      throw new ApiError(body?.error || `Ошибка сервера ${res.status}`);
    }
    return body as T;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    if (e?.name === 'AbortError') throw new ApiError('Сервер не ответил вовремя');
    throw new ApiError('Не достучался до сервера');
  } finally {
    clearTimeout(t);
  }
}

export type SearchResult = { title: string | null; tracks: RemoteTrack[] };

export function search(q: string, source: 'youtube' | 'soundcloud') {
  return getJson<SearchResult>(`/search?q=${encodeURIComponent(q)}&source=${source}`);
}

export function health() {
  return getJson<{ ok: boolean; auth: boolean }>('/health', 6000);
}

export function downloadUrl(remoteUrl: string) {
  return `${base()}/download?url=${encodeURIComponent(remoteUrl)}`;
}

export const isLink = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

export function extractLink(text: string) {
  const m = text.match(/https?:\/\/[^\s]+/i);
  if (!m) return null;
  return /youtu\.?be|soundcloud\.com/i.test(m[0]) ? m[0] : null;
}
