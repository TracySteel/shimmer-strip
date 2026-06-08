import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './src/mcp.js';
import { getWeather } from './src/weather-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;

// Data lives in a simple JSON file on disk
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'wardrobe.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default data structure
const DEFAULT_DATA = {
  items: [],
  outfits: [],
  customColours: [],
  weeklyPicks: [],
  settings: {},
};

// ─── Read/write helpers ───
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { ...DEFAULT_DATA };
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error reading data file:', err.message);
    return { ...DEFAULT_DATA };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing data file:', err.message);
    return false;
  }
}

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 photos

// Serve the built React app
app.use(express.static(path.join(__dirname, 'dist')));

// Serve extracted photos with caching
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
app.use('/photos', express.static(PHOTOS_DIR, { maxAge: '7d' }));

// ─── Photo helpers ───
function isBase64Photo(val) {
  return typeof val === 'string' && val.startsWith('data:image/');
}

function saveBase64Photo(base64Data, filename) {
  const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!match) return null;
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const fullFilename = `${filename}.${ext}`;
  fs.writeFileSync(path.join(PHOTOS_DIR, fullFilename), buffer);
  return `/photos/${fullFilename}`;
}

function extractItemPhoto(item) {
  if (isBase64Photo(item.photo)) {
    const url = saveBase64Photo(item.photo, `item-${item.id}`);
    if (url) item.photo = url;
  }
  return item;
}

function extractSelfiePhoto(outfit) {
  if (isBase64Photo(outfit.selfie)) {
    const url = saveBase64Photo(outfit.selfie, `selfie-${outfit.id}`);
    if (url) outfit.selfie = url;
  }
  return outfit;
}

// ─── Shimmer Cookie Auth ───
// Visit the secret auth page once per device → permanent cookie → full access.
// Without cookie: read-only (GET only on /api). MCP at /mcp is unaffected.
// Auth path — reads from config.js, overridable via env var.
// IMPORTANT: change this in src/config.js to your own secret path!
import { AUTH_PATH as CONFIG_AUTH_PATH } from './src/config.js';
const AUTH_PATH = process.env.SHIMMER_AUTH_PATH || CONFIG_AUTH_PATH || '/wardrobe-auth';
const AUTH_TOKEN = 'sparklebutt';

app.get(AUTH_PATH, (req, res) => {
  res.setHeader('Set-Cookie', `shimmer-auth=${AUTH_TOKEN}; Max-Age=${10 * 365 * 24 * 60 * 60}; Path=/; SameSite=Lax`);
  res.send(`<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#1a1410;color:#c4956a;font-family:'Quicksand',Georgia,serif;text-align:center;padding:80px 20px;margin:0;min-height:100vh">
<div style="font-size:64px;margin-bottom:20px">🐌</div>
<h1 style="font-size:24px;letter-spacing:4px;margin-bottom:12px;font-weight:400">ACCESS GRANTED</h1>
<p style="color:#8a7a6a;font-size:14px;margin-bottom:4px">The snail recognises you.</p>
<p style="color:#6a5a4a;font-size:12px">This device is shimmer-authenticated forever.</p>
<a href="/" style="display:inline-block;margin-top:24px;padding:12px 28px;background:rgba(196,149,106,0.2);border:1px solid rgba(196,149,106,0.3);border-radius:24px;color:#c4956a;text-decoration:none;font-size:14px;letter-spacing:2px">ENTER THE WARDROBE →</a>
</body></html>`);
});

// Auth check endpoint — so the React app can ask "am I authenticated?"
app.get('/api/auth', (req, res) => {
  const authed = (req.headers.cookie || '').includes(`shimmer-auth=${AUTH_TOKEN}`);
  res.json({ authenticated: authed });
});

// Write protection: block POST/PUT/DELETE on /api without the cookie
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  const cookies = req.headers.cookie || '';
  if (cookies.includes(`shimmer-auth=${AUTH_TOKEN}`)) return next();
  res.status(403).json({ error: 'Read-only access. The snail does not recognise this device.' });
});

// ─── API Routes ───

// Get all data
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

// ── Items ──
app.get('/api/items', (req, res) => {
  const data = readData();
  res.json(data.items);
});

app.post('/api/items', (req, res) => {
  const data = readData();
  const item = extractItemPhoto(req.body);
  data.items.push(item);
  writeData(data);
  res.json({ ok: true, item });
});

app.put('/api/items/:id', (req, res) => {
  const data = readData();
  const idx = data.items.findIndex(i => String(i.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  const updated = extractItemPhoto({ ...data.items[idx], ...req.body });
  data.items[idx] = updated;
  writeData(data);
  res.json({ ok: true, item: updated });
});

// Toggle laundry status
app.post('/api/items/:id/laundry', (req, res) => {
  const data = readData();
  const item = data.items.find(i => String(i.id) === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.inLaundry = !item.inLaundry;
  writeData(data);
  res.json({ ok: true, inLaundry: item.inLaundry });
});

// Toggle favourite on item
app.post('/api/items/:id/favourite', (req, res) => {
  const data = readData();
  const item = data.items.find(i => String(i.id) === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.isFavourite = !item.isFavourite;
  writeData(data);
  res.json({ ok: true, isFavourite: item.isFavourite });
});

// Clear all laundry (laundry done!)
app.post('/api/laundry/done', (req, res) => {
  const data = readData();
  let count = 0;
  data.items.forEach(i => { if (i.inLaundry) { i.inLaundry = false; count++; } });
  writeData(data);
  res.json({ ok: true, cleared: count });
});

app.delete('/api/items/:id', (req, res) => {
  const data = readData();
  data.items = data.items.filter(i => String(i.id) !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

// ── Outfits ──
app.get('/api/outfits', (req, res) => {
  const data = readData();
  res.json(data.outfits);
});

app.post('/api/outfits', (req, res) => {
  const data = readData();
  const outfit = extractSelfiePhoto(req.body);
  // Strip base64 photos from outfit item snapshots (use URLs from main items)
  if (outfit.items) {
    outfit.items = outfit.items.map(item => {
      if (isBase64Photo(item.photo)) {
        const mainItem = data.items.find(i => i.id === item.id);
        return { ...item, photo: mainItem?.photo || undefined };
      }
      return item;
    });
  }
  data.outfits.push(outfit);
  writeData(data);
  res.json({ ok: true });
});

app.put('/api/outfits/:id', (req, res) => {
  const data = readData();
  const idx = data.outfits.findIndex(o => String(o.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Outfit not found' });
  const updated = extractSelfiePhoto({ ...data.outfits[idx], ...req.body });
  // Strip base64 from outfit item snapshots
  if (updated.items) {
    updated.items = updated.items.map(item => {
      if (isBase64Photo(item.photo)) {
        const mainItem = data.items.find(i => i.id === item.id);
        return { ...item, photo: mainItem?.photo || undefined };
      }
      return item;
    });
  }
  data.outfits[idx] = updated;
  writeData(data);
  res.json({ ok: true, outfit: updated });
});

app.delete('/api/outfits/:id', (req, res) => {
  const data = readData();
  data.outfits = data.outfits.filter(o => String(o.id) !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

// Toggle "wearing today" — mutual exclusion + wear count tracking
app.post('/api/outfits/:id/wear-today', (req, res) => {
  const data = readData();
  const outfit = data.outfits.find(o => String(o.id) === req.params.id);
  if (!outfit) return res.status(404).json({ error: 'Outfit not found' });

  const today = new Date().toISOString().split('T')[0];
  const wasWearing = outfit.wearingToday;

  if (wasWearing) {
    // Toggle OFF — don't decrement counters
    outfit.wearingToday = false;
  } else {
    // Toggle ON — clear all others first (mutual exclusion)
    data.outfits.forEach(o => { o.wearingToday = false; });
    outfit.wearingToday = true;

    // Only increment counters if not already worn today (idempotent)
    if (outfit.lastWorn !== today) {
      outfit.timesWorn = (outfit.timesWorn || 0) + 1;
      outfit.lastWorn = today;

      // Increment wear count on each item in the outfit
      const outfitItemIds = new Set(outfit.items.map(i => String(i.id)));
      data.items.forEach(item => {
        if (outfitItemIds.has(String(item.id))) {
          item.wearCount = (item.wearCount || 0) + 1;
          item.lastWorn = today;
        }
      });
    }
  }

  writeData(data);
  res.json({ ok: true, wearingToday: outfit.wearingToday });
});

// Toggle favourite on outfit
app.post('/api/outfits/:id/favourite', (req, res) => {
  const data = readData();
  const outfit = data.outfits.find(o => String(o.id) === req.params.id);
  if (!outfit) return res.status(404).json({ error: 'Outfit not found' });
  outfit.isFavourite = !outfit.isFavourite;
  writeData(data);
  res.json({ ok: true, isFavourite: outfit.isFavourite });
});

// ── Custom Colours ──
app.get('/api/colours', (req, res) => {
  const data = readData();
  res.json(data.customColours);
});

app.post('/api/colours', (req, res) => {
  const data = readData();
  data.customColours.push(req.body);
  writeData(data);
  res.json({ ok: true });
});

app.delete('/api/colours/:name', (req, res) => {
  const data = readData();
  data.customColours = data.customColours.filter(c => c.name !== req.params.name);
  writeData(data);
  res.json({ ok: true });
});

// ── Weekly Picks ──
app.get('/api/weekly-picks', (req, res) => {
  const data = readData();
  res.json(data.weeklyPicks || []);
});

app.post('/api/weekly-picks/categories', (req, res) => {
  const data = readData();
  if (!data.weeklyPicks) data.weeklyPicks = [];
  const cat = { id: Date.now(), name: req.body.name, overlaySupport: req.body.overlaySupport || false, items: [] };
  data.weeklyPicks.push(cat);
  writeData(data);
  res.json({ ok: true, category: cat });
});

app.delete('/api/weekly-picks/categories/:id', (req, res) => {
  const data = readData();
  data.weeklyPicks = (data.weeklyPicks || []).filter(c => String(c.id) !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

app.post('/api/weekly-picks/categories/:catId/items', (req, res) => {
  const data = readData();
  const cat = (data.weeklyPicks || []).find(c => String(c.id) === req.params.catId);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const item = extractItemPhoto({ ...req.body, id: Date.now(), active: false });
  cat.items.push(item);
  writeData(data);
  res.json({ ok: true, item });
});

app.put('/api/weekly-picks/categories/:catId/items/:itemId', (req, res) => {
  const data = readData();
  const cat = (data.weeklyPicks || []).find(c => String(c.id) === req.params.catId);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const idx = cat.items.findIndex(i => String(i.id) === req.params.itemId);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  cat.items[idx] = extractItemPhoto({ ...cat.items[idx], ...req.body });
  writeData(data);
  res.json({ ok: true, item: cat.items[idx] });
});

app.delete('/api/weekly-picks/categories/:catId/items/:itemId', (req, res) => {
  const data = readData();
  const cat = (data.weeklyPicks || []).find(c => String(c.id) === req.params.catId);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  cat.items = cat.items.filter(i => String(i.id) !== req.params.itemId);
  writeData(data);
  res.json({ ok: true });
});

// Toggle favourite on weekly pick item
app.post('/api/weekly-picks/categories/:catId/items/:itemId/favourite', (req, res) => {
  const data = readData();
  const cat = (data.weeklyPicks || []).find(c => String(c.id) === req.params.catId);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const item = cat.items.find(i => String(i.id) === req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.isFavourite = !item.isFavourite;
  writeData(data);
  res.json({ ok: true, isFavourite: item.isFavourite });
});

// Toggle active — deactivates others (unless overlay)
app.post('/api/weekly-picks/categories/:catId/items/:itemId/toggle', (req, res) => {
  const data = readData();
  const cat = (data.weeklyPicks || []).find(c => String(c.id) === req.params.catId);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const item = cat.items.find(i => String(i.id) === req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const isOverlay = item.type === 'Overlay';
  const wasActive = item.active;

  if (wasActive) {
    item.active = false;
  } else {
    // Deactivate others (unless this is an overlay or the other is an overlay)
    if (!isOverlay) {
      cat.items.forEach(i => { if (i.type !== 'Overlay') i.active = false; });
    } else {
      // Overlay: deactivate other overlays only
      cat.items.forEach(i => { if (i.type === 'Overlay') i.active = false; });
    }
    item.active = true;
  }

  writeData(data);
  res.json({ ok: true, active: item.active });
});

// ── Weather API (also used by MCP) ──
app.get('/api/weather', async (req, res) => {
  const weather = await getWeather(req.query.day || "today");
  if (weather) {
    res.json(weather);
  } else {
    res.status(503).json({ error: 'Weather data unavailable' });
  }
});

// ── MCP Server (Streamable HTTP — stateless) ──
// Lets Claude query the wardrobe, check weather, and suggest outfits.
app.post('/mcp', async (req, res) => {
  try {
    const server = createMcpServer(readData, writeData, getWeather);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP error:', err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
    }
  }
});

// MCP: GET and DELETE not needed in stateless mode
app.get('/mcp', (req, res) => {
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed in stateless mode' }, id: null });
});
app.delete('/mcp', (req, res) => {
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed in stateless mode' }, id: null });
});

// SPA fallback — serve index.html for any non-API route
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🐌✨ The Shimmer Strip is running on port ${PORT}`);
  console.log(`  📂 Data stored in: ${DATA_FILE}`);
  console.log(`  🩵 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`  🌐 Open http://localhost:${PORT}\n`);
});
