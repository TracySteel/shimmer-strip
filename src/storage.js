// API-backed storage with localStorage fallback
// When the server is available, data syncs to a JSON file on disk
// so it works across all devices (phone, laptop, etc.)

const API_BASE = '/api';

async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (res.ok) return await res.json();
  } catch { /* server not available, fall through */ }
  return null;
}

async function apiPost(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; }
}

async function apiDelete(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    return res.ok;
  } catch { return false; }
}

// ─── Fetch all data from server on startup ───
export async function fetchAllData() {
  const data = await apiGet('/data');
  if (data) return data;
  // Fallback to localStorage if server not available
  return {
    items: loadItemsLocal(),
    outfits: loadOutfitsLocal(),
    customColours: loadCustomColoursLocal(),
  };
}

// ─── Items ───
function loadItemsLocal() {
  try {
    const raw = localStorage.getItem('shimmer-strip-items');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function loadItems() {
  return loadItemsLocal();
}

export async function addItemToServer(item) {
  localStorage.setItem('shimmer-strip-items', JSON.stringify([
    ...loadItemsLocal(), item
  ]));
  await apiPost('/items', item);
}

export async function updateItemOnServer(item) {
  const items = loadItemsLocal().map(i => i.id === item.id ? item : i);
  localStorage.setItem('shimmer-strip-items', JSON.stringify(items));
  try {
    await fetch(`${API_BASE}/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch { /* server not available */ }
}

export async function removeItemFromServer(id) {
  const items = loadItemsLocal().filter(i => i.id !== id);
  localStorage.setItem('shimmer-strip-items', JSON.stringify(items));
  await apiDelete(`/items/${id}`);
}

export function saveItems(items) {
  localStorage.setItem('shimmer-strip-items', JSON.stringify(items));
}

// ─── Outfits ───
function loadOutfitsLocal() {
  try {
    const raw = localStorage.getItem('shimmer-strip-outfits');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function loadOutfits() {
  return loadOutfitsLocal();
}

export async function addOutfitToServer(outfit) {
  localStorage.setItem('shimmer-strip-outfits', JSON.stringify([
    ...loadOutfitsLocal(), outfit
  ]));
  await apiPost('/outfits', outfit);
}

export async function removeOutfitFromServer(id) {
  const outfits = loadOutfitsLocal().filter(o => o.id !== id);
  localStorage.setItem('shimmer-strip-outfits', JSON.stringify(outfits));
  await apiDelete(`/outfits/${id}`);
}

export function saveOutfits(outfits) {
  localStorage.setItem('shimmer-strip-outfits', JSON.stringify(outfits));
}

// ─── Custom Colours ───
function loadCustomColoursLocal() {
  try {
    const raw = localStorage.getItem('shimmer-strip-custom-colours');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function addColourToServer(colour) {
  const colours = [...loadCustomColoursLocal(), colour];
  localStorage.setItem('shimmer-strip-custom-colours', JSON.stringify(colours));
  await apiPost('/colours', colour);
}

export async function removeColourFromServer(name) {
  const colours = loadCustomColoursLocal().filter(c => c.name !== name);
  localStorage.setItem('shimmer-strip-custom-colours', JSON.stringify(colours));
  await apiDelete(`/colours/${encodeURIComponent(name)}`);
}

// ─── Settings (localStorage only, not shared) ───
export function loadSettings() {
  try {
    const raw = localStorage.getItem('shimmer-strip-settings');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveSettings(settings) {
  localStorage.setItem('shimmer-strip-settings', JSON.stringify(settings));
}
