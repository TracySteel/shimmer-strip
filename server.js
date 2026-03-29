import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const item = req.body;
  data.items.push(item);
  writeData(data);
  res.json({ ok: true, item });
});

app.put('/api/items/:id', (req, res) => {
  const data = readData();
  const idx = data.items.findIndex(i => String(i.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  data.items[idx] = { ...data.items[idx], ...req.body };
  writeData(data);
  res.json({ ok: true, item: data.items[idx] });
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
  data.outfits.push(req.body);
  writeData(data);
  res.json({ ok: true });
});

app.delete('/api/outfits/:id', (req, res) => {
  const data = readData();
  data.outfits = data.outfits.filter(o => String(o.id) !== req.params.id);
  writeData(data);
  res.json({ ok: true });
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

// SPA fallback — serve index.html for any non-API route
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🐌✨ The Shimmer Strip is running on port ${PORT}`);
  console.log(`  📂 Data stored in: ${DATA_FILE}`);
  console.log(`  🌐 Open http://localhost:${PORT}\n`);
});
