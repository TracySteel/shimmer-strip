// Server-first storage with localStorage as cache.
//
// Architecture:
// - Server (JSON file on Mac Mini via Express) is the source of truth
// - localStorage is a fast local cache for first paint on repeat visits
// - On mount: fetchAllData() → set React state from server, overwriting cache
// - On mutation: optimistic React state update + server write, cache updated from React state

const API_BASE = '/api';

// ─── API helpers ───
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (res.ok) return await res.json();
  } catch { /* server not reachable */ }
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

async function apiPut(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
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

// ─── localStorage cache keys ───
const LS_ITEMS = 'shimmer-strip-items';
const LS_OUTFITS = 'shimmer-strip-outfits';
const LS_CUSTOM_COLOURS = 'shimmer-strip-custom-colours';
const LS_SETTINGS = 'shimmer-strip-settings';

function lsRead(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // localStorage can fail (full, disabled, private mode) — not fatal
    console.warn('localStorage write failed:', err.message);
  }
}

// ─── Initial load (for useState initializers) ───
// Reads cache only — server fetch happens in useEffect via fetchAllData().
// If cache is empty, returns []. That's fine — server will populate on mount.
export function loadItems()         { return lsRead(LS_ITEMS) || []; }
export function loadOutfits()       { return lsRead(LS_OUTFITS) || []; }
export function loadCustomColours() { return lsRead(LS_CUSTOM_COLOURS) || []; }

// ─── Cache writers (source of truth is React state) ───
export function saveItems(items)              { lsWrite(LS_ITEMS, items); }
export function saveOutfits(outfits)          { lsWrite(LS_OUTFITS, outfits); }
export function saveCustomColoursCache(list)  { lsWrite(LS_CUSTOM_COLOURS, list); }

// ─── Server sync on mount ───
// Returns { items, outfits, customColours, fromServer } — fromServer:true means
// we got real data from the API; false means we fell back to cache (offline).
export async function fetchAllData() {
  const data = await apiGet('/data');
  if (data) {
    // Server is source of truth. Update cache.
    lsWrite(LS_ITEMS, data.items || []);
    lsWrite(LS_OUTFITS, data.outfits || []);
    lsWrite(LS_CUSTOM_COLOURS, data.customColours || []);
    return {
      items: data.items || [],
      outfits: data.outfits || [],
      customColours: data.customColours || [],
      weeklyPicks: data.weeklyPicks || [],
      fromServer: true,
    };
  }
  // Server unreachable — use cache
  return {
    items: loadItems(),
    outfits: loadOutfits(),
    customColours: loadCustomColours(),
    weeklyPicks: [],
    fromServer: false,
  };
}

// ─── Mutations ──────────────────────────────────────────────────────
// Each mutation awaits the server. Returns true on success, false on failure.
// The caller (App.jsx) is responsible for updating React state and rolling
// back if we return false.

// Items
export async function addItemToServer(item) {
  return await apiPost('/items', item);
}
export async function updateItemOnServer(item) {
  return await apiPut(`/items/${item.id}`, item);
}
export async function removeItemFromServer(id) {
  return await apiDelete(`/items/${id}`);
}

// Outfits
export async function addOutfitToServer(outfit) {
  return await apiPost('/outfits', outfit);
}
export async function updateOutfitOnServer(outfit) {
  return await apiPut(`/outfits/${outfit.id}`, outfit);
}
export async function removeOutfitFromServer(id) {
  return await apiDelete(`/outfits/${id}`);
}

// Weekly Picks
export async function getWeeklyPicks() {
  return await apiGet('/weekly-picks') || [];
}
export async function createWeeklyCategory(cat) {
  const res = await apiPost('/weekly-picks/categories', cat);
  return res;
}
export async function deleteWeeklyCategory(id) {
  return await apiDelete(`/weekly-picks/categories/${id}`);
}
export async function addWeeklyItem(catId, item) {
  const res = await apiPost(`/weekly-picks/categories/${catId}/items`, item);
  return res;
}
export async function updateWeeklyItem(catId, item) {
  return await apiPut(`/weekly-picks/categories/${catId}/items/${item.id}`, item);
}
export async function deleteWeeklyItem(catId, itemId) {
  return await apiDelete(`/weekly-picks/categories/${catId}/items/${itemId}`);
}
export async function toggleWeeklyItem(catId, itemId) {
  return await apiPost(`/weekly-picks/categories/${catId}/items/${itemId}/toggle`, {});
}

// Laundry
export async function toggleLaundryOnServer(id) {
  return await apiPost(`/items/${id}/laundry`, {});
}
export async function laundryDoneOnServer() {
  return await apiPost('/laundry/done', {});
}

// Custom colours
export async function addColourToServer(colour) {
  return await apiPost('/colours', colour);
}
export async function removeColourFromServer(name) {
  return await apiDelete(`/colours/${encodeURIComponent(name)}`);
}

// ─── Settings (localStorage only, device-specific) ───
export function loadSettings() {
  return lsRead(LS_SETTINGS) || {};
}
export function saveSettings(settings) {
  lsWrite(LS_SETTINGS, settings);
}
