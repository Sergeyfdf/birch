import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { artworkUri, audioUri } from '@/lib/files';
import { bindRemote, setRemoteEnabled } from '@/lib/remote';
import { fileStorage } from '@/lib/storage';
import type { RepeatMode, Track } from '@/lib/types';
import { useLibrary } from './library';

type PlayerState = {
  queue: string[];
  baseQueue: string[];
  index: number;
  shuffle: boolean;
  repeat: RepeatMode;
  context: string | null;
  lastPosition: number;
};

type PlaybackState = {
  playing: boolean;
  position: number;
  duration: number;
  buffering: boolean;
};

export const usePlayer = create<PlayerState>()(
  persist(
    () => ({
      queue: [] as string[],
      baseQueue: [] as string[],
      index: 0,
      shuffle: false,
      repeat: 'off' as RepeatMode,
      context: null as string | null,
      lastPosition: 0,
    }),
    { name: 'birch-player', storage: createJSONStorage(() => fileStorage) }
  )
);

export const usePlayback = create<PlaybackState>()(() => ({
  playing: false,
  position: 0,
  duration: 0,
  buffering: false,
}));

let player: AudioPlayer | null = null;
let loadedId: string | null = null;
let lockScreenActive = false;
let pendingSeek: number | null = null;
let lastSavedAt = 0;
let finishing = false;

function shuffled<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trackById(id: string | undefined): Track | undefined {
  return id ? useLibrary.getState().tracks[id] : undefined;
}

export function currentTrack(state?: PlayerState) {
  const { queue, index } = state || usePlayer.getState();
  return trackById(queue[index]);
}

function metadata(t: Track) {
  return {
    title: t.title,
    artist: t.artist,
    albumTitle: t.album ?? undefined,
    artworkUrl: artworkUri(t) ?? undefined,
  };
}

function onStatus(st: AudioStatus) {
  const t = trackById(loadedId ?? undefined);
  const duration = st.duration && isFinite(st.duration) && st.duration > 0 ? st.duration : t?.duration ?? 0;
  usePlayback.setState({
    playing: st.playing,
    position: st.currentTime,
    duration,
    buffering: st.isBuffering,
  });
  if (st.isLoaded && pendingSeek != null && player) {
    const at = pendingSeek;
    pendingSeek = null;
    player.seekTo(at).catch(() => {});
  }
  if (t && st.isLoaded && st.duration > 0 && !t.duration) {
    useLibrary.getState().updateTrack(t.id, { duration: Math.round(st.duration) });
  }
  const now = Date.now();
  if (now - lastSavedAt > 5000) {
    lastSavedAt = now;
    usePlayer.setState({ lastPosition: st.currentTime });
  }
  if (st.didJustFinish && !finishing) {
    finishing = true;
    setTimeout(() => (finishing = false), 300);
    handleEnded();
  }
}

function ensurePlayer() {
  if (player) return player;
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  }).catch(() => {});
  player = createAudioPlayer(null, { updateInterval: 500 });
  player.addListener('playbackStatusUpdate', onStatus);
  bindRemote({ next: () => next(), previous: () => previous() });
  return player;
}

function updateRemote() {
  const { queue, index, repeat } = usePlayer.getState();
  setRemoteEnabled(index < queue.length - 1 || repeat === 'all', true);
}

function load(index: number, autoplay: boolean, startAt = 0) {
  const { queue } = usePlayer.getState();
  let i = index;
  while (i < queue.length && !trackById(queue[i])) i++;
  const t = trackById(queue[i]);
  if (!t) {
    stop();
    return;
  }
  const p = ensurePlayer();
  usePlayer.setState({ index: i, lastPosition: startAt });
  usePlayback.setState({ position: startAt, duration: t.duration ?? 0, buffering: true });
  loadedId = t.id;
  pendingSeek = startAt > 1 ? startAt : null;
  p.replace({ uri: audioUri(t) });
  if (autoplay) {
    p.play();
    if (!lockScreenActive) {
      p.setActiveForLockScreen(true, metadata(t), { showSeekForward: false, showSeekBackward: false });
      lockScreenActive = true;
    } else {
      p.updateLockScreenMetadata(metadata(t));
    }
  } else if (lockScreenActive) {
    p.updateLockScreenMetadata(metadata(t));
  }
  updateRemote();
}

function stop() {
  player?.pause();
  usePlayback.setState({ playing: false });
}

function handleEnded() {
  const { repeat } = usePlayer.getState();
  if (repeat === 'one' && player) {
    player.seekTo(0).then(() => player?.play());
    return;
  }
  next(true);
}

export function playTracks(ids: string[], startIndex = 0, opts: { shuffle?: boolean; context?: string } = {}) {
  if (!ids.length) return;
  const shuffle = opts.shuffle ?? usePlayer.getState().shuffle;
  const start = Math.max(0, Math.min(startIndex, ids.length - 1));
  let queue = ids.slice();
  let index = start;
  if (shuffle) {
    const first = opts.shuffle && startIndex === 0 ? ids[Math.floor(Math.random() * ids.length)] : ids[start];
    queue = [first, ...shuffled(ids.filter((x) => x !== first))];
    index = 0;
  }
  usePlayer.setState({ queue, baseQueue: ids.slice(), index, shuffle, context: opts.context ?? null });
  load(index, true);
}

export function togglePlay() {
  const p = ensurePlayer();
  const { queue, index, lastPosition } = usePlayer.getState();
  if (!loadedId) {
    if (queue.length) load(index, true, lastPosition);
    return;
  }
  if (usePlayback.getState().playing) p.pause();
  else {
    p.play();
    if (!lockScreenActive) {
      const t = trackById(loadedId);
      if (t) p.setActiveForLockScreen(true, metadata(t), { showSeekForward: false, showSeekBackward: false });
      lockScreenActive = true;
    }
  }
}

export function next(auto = false) {
  const { queue, index, repeat } = usePlayer.getState();
  if (!queue.length) return;
  if (index < queue.length - 1) load(index + 1, true);
  else if (repeat === 'all') load(0, true);
  else if (auto) {
    stop();
    player?.seekTo(0).catch(() => {});
  }
}

export function previous() {
  const { queue, index, repeat } = usePlayer.getState();
  if (!queue.length) return;
  if (usePlayback.getState().position > 3 || (index === 0 && repeat !== 'all')) {
    player?.seekTo(0).catch(() => {});
    return;
  }
  load(index > 0 ? index - 1 : queue.length - 1, true);
}

export function seek(seconds: number) {
  usePlayback.setState({ position: seconds });
  if (!loadedId) {
    usePlayer.setState({ lastPosition: seconds });
    return;
  }
  player?.seekTo(seconds).catch(() => {});
}

export function skipTo(index: number) {
  load(index, true);
}

export function toggleShuffle() {
  const { shuffle, queue, index, baseQueue } = usePlayer.getState();
  const cur = queue[index];
  if (!shuffle) {
    const rest = shuffled(queue.filter((x) => x !== cur));
    const nq = cur ? [cur, ...rest] : rest;
    usePlayer.setState({ shuffle: true, queue: nq, index: 0, baseQueue: queue.slice() });
  } else {
    const base = baseQueue.length ? baseQueue.filter((x) => queue.includes(x)) : queue;
    const missing = queue.filter((x) => !base.includes(x));
    const nq = [...base, ...missing];
    usePlayer.setState({ shuffle: false, queue: nq, index: Math.max(0, nq.indexOf(cur)) });
  }
  updateRemote();
}

export function cycleRepeat() {
  const order: RepeatMode[] = ['off', 'all', 'one'];
  const { repeat } = usePlayer.getState();
  usePlayer.setState({ repeat: order[(order.indexOf(repeat) + 1) % order.length] });
  updateRemote();
}

export function playNext(id: string) {
  const { queue, index, baseQueue } = usePlayer.getState();
  if (!queue.length) {
    playTracks([id], 0, { shuffle: false });
    return;
  }
  const cur = queue[index];
  if (id === cur) return;
  const q = queue.filter((x) => x !== id);
  const ci = q.indexOf(cur);
  q.splice(ci + 1, 0, id);
  const b = baseQueue.filter((x) => x !== id);
  const bi = b.indexOf(cur);
  b.splice(bi + 1, 0, id);
  usePlayer.setState({ queue: q, baseQueue: b, index: ci });
  updateRemote();
}

export function addToQueue(ids: string[]) {
  const { queue, index, baseQueue } = usePlayer.getState();
  if (!queue.length) {
    playTracks(ids, 0, { shuffle: false });
    return;
  }
  const cur = queue[index];
  const fresh = ids.filter((x) => x !== cur);
  const q = [...queue.filter((x) => !fresh.includes(x)), ...fresh];
  const b = [...baseQueue.filter((x) => !fresh.includes(x)), ...fresh];
  usePlayer.setState({ queue: q, baseQueue: b, index: q.indexOf(cur) });
  updateRemote();
}

export function setUpcoming(upcoming: string[]) {
  const { queue, index } = usePlayer.getState();
  const head = queue.slice(0, index + 1);
  usePlayer.setState({ queue: [...head, ...upcoming] });
  updateRemote();
}

export function removeFromQueue(position: number) {
  const { queue, index, baseQueue } = usePlayer.getState();
  if (position === index) return;
  const id = queue[position];
  const q = queue.slice();
  q.splice(position, 1);
  usePlayer.setState({
    queue: q,
    baseQueue: baseQueue.filter((x) => x !== id),
    index: position < index ? index - 1 : index,
  });
  updateRemote();
}

export function clearUpcoming() {
  const { queue, index } = usePlayer.getState();
  usePlayer.setState({ queue: queue.slice(0, index + 1), baseQueue: queue.slice(0, index + 1) });
  updateRemote();
}

export function purgeMissing() {
  const { tracks } = useLibrary.getState();
  const { queue, index, baseQueue } = usePlayer.getState();
  if (queue.every((x) => tracks[x])) return;
  const cur = queue[index];
  const q = queue.filter((x) => tracks[x]);
  const b = baseQueue.filter((x) => tracks[x]);
  if (cur && !tracks[cur]) {
    const ni = Math.min(queue.slice(0, index).filter((x) => tracks[x]).length, Math.max(0, q.length - 1));
    usePlayer.setState({ queue: q, baseQueue: b, index: ni });
    if (q.length) load(ni, usePlayback.getState().playing);
    else {
      stop();
      loadedId = null;
    }
  } else {
    usePlayer.setState({ queue: q, baseQueue: b, index: Math.max(0, q.indexOf(cur)) });
  }
}
