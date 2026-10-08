import { spawn } from 'node:child_process';
import fs from 'node:fs';

const BIN = process.env.YTDLP_BIN || 'yt-dlp';
const COOKIES = process.env.YTDLP_COOKIES;
const JS_RUNTIME = process.env.YTDLP_JS_RUNTIME || 'node';

function baseArgs() {
  const args = ['--no-warnings', '--ignore-config', '--js-runtimes', JS_RUNTIME];
  if (COOKIES && fs.existsSync(COOKIES)) args.push('--cookies', COOKIES);
  return args;
}

export function run(args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(BIN, [...baseArgs(), ...args], { windowsHide: true });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('yt-dlp timeout'));
    }, timeoutMs);
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (err += d));
    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(err.trim().split('\n').pop() || `yt-dlp exited with ${code}`));
    });
  });
}

export async function runJson(args, opts) {
  const out = await run(['-J', ...args], opts);
  return JSON.parse(out);
}

function cleanArtist(name) {
  if (!name) return '';
  return name.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
}

function cleanTitle(title) {
  return title
    .replace(/\s*[\(\[](official\s*)?(music\s*)?(video|audio|lyrics?|lyric video|visualizer|hd|4k|mv)[\)\]]/gi, '')
    .replace(/\s*\|\s*.*$/, '')
    .trim();
}

function splitArtistTitle(rawTitle, fallbackArtist) {
  const title = cleanTitle(rawTitle || '');
  const m = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  return { artist: cleanArtist(fallbackArtist), title };
}

function pickThumb(e) {
  if (e.ie_key === 'Youtube' || e.extractor_key === 'Youtube' || /youtube\.com|youtu\.be/.test(e.url || e.webpage_url || '')) {
    if (e.id) return `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
  }
  let t = e.thumbnail;
  if (!t && Array.isArray(e.thumbnails) && e.thumbnails.length) {
    t = e.thumbnails[e.thumbnails.length - 1].url;
  }
  if (t && t.includes('sndcdn.com')) t = t.replace(/-(large|t\d+x\d+|crop|original)\./, '-t500x500.');
  return t || null;
}

function detectSource(e) {
  const key = (e.ie_key || e.extractor_key || e.extractor || '').toLowerCase();
  const url = e.webpage_url || e.url || '';
  if (key.includes('soundcloud') || url.includes('soundcloud.com')) return 'soundcloud';
  return 'youtube';
}

export function normalize(e) {
  const source = detectSource(e);
  let url = e.webpage_url || e.url;
  if (source === 'youtube' && e.id && (!url || !url.startsWith('http'))) {
    url = `https://www.youtube.com/watch?v=${e.id}`;
  }
  const meta =
    source === 'youtube'
      ? e.track && e.artist
        ? { artist: e.artist, title: e.track }
        : splitArtistTitle(e.title, e.channel || e.uploader)
      : { artist: e.artist || e.uploader || '', title: e.title || '' };
  return {
    id: `${source}:${e.id}`,
    sourceId: String(e.id),
    source,
    url,
    title: meta.title || e.title || 'Unknown',
    artist: meta.artist || 'Unknown',
    album: e.album || null,
    duration: typeof e.duration === 'number' ? Math.round(e.duration) : null,
    artwork: pickThumb(e),
  };
}

export async function search(query, source, limit) {
  if (source === 'soundcloud') {
    const data = await runJson(['--skip-download', `scsearch${limit}:${query}`], { timeoutMs: 60000 });
    return (data.entries || []).filter(Boolean).map(normalize);
  }
  const data = await runJson(['--flat-playlist', `ytsearch${limit}:${query}`], { timeoutMs: 30000 });
  return (data.entries || [])
    .filter((e) => e && e.id && e.duration !== null && e.live_status !== 'is_live')
    .map(normalize);
}

export async function resolve(url) {
  const isSc = url.includes('soundcloud.com');
  const args = isSc ? ['--skip-download', url] : ['--flat-playlist', url];
  const data = await runJson(args, { timeoutMs: 120000 });
  if (Array.isArray(data.entries)) {
    return {
      title: data.title || null,
      tracks: data.entries.filter((e) => e && e.id).map(normalize),
    };
  }
  return { title: null, tracks: [normalize(data)] };
}
