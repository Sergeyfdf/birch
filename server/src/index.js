import express from 'express';
import { search, resolve } from './ytdlp.js';
import { getAudioFile, startCacheJanitor } from './download.js';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.BIRCH_TOKEN || '';

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'birch', auth: Boolean(TOKEN) });
});

app.use((req, res, next) => {
  if (!TOKEN) return next();
  const given = req.get('x-birch-token') || req.query.token;
  if (given !== TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
});

const isUrl = (s) => /^https?:\/\//i.test(s);
const allowedHost = (u) => {
  try {
    const h = new URL(u).hostname.replace(/^www\.|^m\.|^music\./, '');
    return ['youtube.com', 'youtu.be', 'soundcloud.com', 'on.soundcloud.com'].includes(h);
  } catch {
    return false;
  }
};

app.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const source = req.query.source === 'soundcloud' ? 'soundcloud' : 'youtube';
  const limit = Math.min(Number(req.query.limit) || (source === 'soundcloud' ? 12 : 20), 40);
  if (!q) return res.status(400).json({ error: 'q is required' });
  try {
    if (isUrl(q)) {
      if (!allowedHost(q)) return res.status(400).json({ error: 'unsupported url' });
      const data = await resolve(q);
      return res.json({ query: q, source, ...data });
    }
    const tracks = await search(q, source, limit);
    res.json({ query: q, source, title: null, tracks });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: e.message });
  }
});

app.get('/resolve', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!isUrl(url) || !allowedHost(url)) return res.status(400).json({ error: 'unsupported url' });
  try {
    res.json(await resolve(url));
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: e.message });
  }
});

app.get('/download', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!isUrl(url) || !allowedHost(url)) return res.status(400).json({ error: 'unsupported url' });
  try {
    const file = await getAudioFile(url);
    res.setHeader('Content-Type', 'audio/mp4');
    res.sendFile(file, { dotfiles: 'allow' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(502).json({ error: e.message });
  }
});

startCacheJanitor();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`birch server on :${PORT}${TOKEN ? ' (token required)' : ''}`);
});
