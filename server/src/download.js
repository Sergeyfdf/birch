import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { run } from './ytdlp.js';

const CACHE_DIR = path.resolve(process.env.CACHE_DIR || './cache');
const TTL_MS = Number(process.env.CACHE_TTL_HOURS || 24) * 3600 * 1000;
const MAX_PARALLEL = Number(process.env.MAX_PARALLEL_DOWNLOADS || 3);

fs.mkdirSync(CACHE_DIR, { recursive: true });

const inflight = new Map();
let active = 0;
const waiters = [];

function acquire() {
  if (active < MAX_PARALLEL) {
    active++;
    return Promise.resolve();
  }
  return new Promise((r) => waiters.push(r)).then(() => {
    active++;
  });
}

function release() {
  active--;
  const next = waiters.shift();
  if (next) next();
}

function keyFor(url) {
  return crypto.createHash('sha1').update(url).digest('hex');
}

function findCached(key) {
  const file = path.join(CACHE_DIR, `${key}.m4a`);
  return fs.existsSync(file) ? file : null;
}

async function fetchAudio(url, key) {
  await acquire();
  try {
    const out = await run(
      [
        '-f',
        'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio/best',
        '-x',
        '--audio-format',
        'm4a',
        '--audio-quality',
        '0',
        '--no-playlist',
        '--no-part',
        '-o',
        path.join(CACHE_DIR, `${key}.%(ext)s`),
        '--print',
        'after_move:filepath',
        url,
      ],
      { timeoutMs: 10 * 60 * 1000 }
    );
    const printed = out.trim().split('\n').pop();
    if (printed && fs.existsSync(printed)) return printed;
    const cached = findCached(key);
    if (cached) return cached;
    throw new Error('Downloaded file not found');
  } finally {
    release();
  }
}

export async function getAudioFile(url) {
  const key = keyFor(url);
  const cached = findCached(key);
  if (cached) {
    const now = new Date();
    fs.utimesSync(cached, now, now);
    return cached;
  }
  if (!inflight.has(key)) {
    const p = fetchAudio(url, key).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return inflight.get(key);
}

export function startCacheJanitor() {
  const sweep = () => {
    const now = Date.now();
    for (const name of fs.readdirSync(CACHE_DIR)) {
      const file = path.join(CACHE_DIR, name);
      try {
        const st = fs.statSync(file);
        if (now - st.mtimeMs > TTL_MS) fs.unlinkSync(file);
      } catch {}
    }
  };
  sweep();
  setInterval(sweep, 3600 * 1000).unref();
}
