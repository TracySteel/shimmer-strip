import { useState, useEffect, useCallback } from "react";
import {
  loadItems, saveItems, loadOutfits, saveOutfits,
  fetchAllData, addItemToServer, updateItemOnServer, removeItemFromServer,
  addOutfitToServer, updateOutfitOnServer, removeOutfitFromServer,
  addColourToServer, removeColourFromServer,
  toggleLaundryOnServer, laundryDoneOnServer, toggleWearToday,
  toggleItemFavourite, toggleOutfitFavourite, toggleWeeklyItemFavourite,
  getWeeklyPicks, createWeeklyCategory, addWeeklyItem, updateWeeklyItem, toggleWeeklyItem, deleteWeeklyItem,
} from "./storage.js";
import { COLOURS, getAllColours, getColourObj, outfitColourScore, loadCustomColours, saveCustomColours, guessWarmth } from "./colours.js";
import { generateBestOutfit, generateChaosOutfit } from "./outfitEngine.js";
import {
  APP_NAME, APP_SUBTITLE,
  CATEGORIES, VIBES, WEATHERS, WEATHER_EMOJI,
  SURPRISE_VIBES, SURPRISE_VIBE_MAP,
  LOCATIONS, BLOCKED_LOCATIONS,
  PICKERS, SYSTEM_PICKERS,
  SNAIL_NAMES, CHAOS_NAMES, CHAOS_MESSAGES,
  NAV_ICONS, COMFORT_MODE,
} from "./config.js";

function pickSnailName() {
  return SNAIL_NAMES[Math.floor(Math.random() * SNAIL_NAMES.length)];
}

function pickChaosName() {
  return CHAOS_NAMES[Math.floor(Math.random() * CHAOS_NAMES.length)] +
    (Math.random() > 0.5 ? ` #${Math.floor(Math.random() * 99) + 1}` : "");
}

const spiralPath = (cx, cy, r, turns) => {
  let d = "";
  for (let i = 0; i <= turns * 360; i += 2) {
    const angle = (i * Math.PI) / 180;
    const radius = r * (1 - i / (turns * 360));
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
};

const SpiralIcon = ({ size = 20, color = "#c4956a" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <path d={spiralPath(20, 20, 16, 3)} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
  </svg>
);

// ─── Toast ───
function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: "rgba(196,149,106,0.95)", color: "#1a1410",
      padding: "12px 24px", borderRadius: 30, fontSize: 14,
      fontWeight: 600, zIndex: 100, letterSpacing: "0.3px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      animation: "fadeIn 0.3s ease",
    }}>
      {message}
    </div>
  );
}

// ─── Confirm Modal ───
function ConfirmModal({ message, itemName, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, animation: "fadeIn 0.2s ease",
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#2a2018", border: "1px solid rgba(196,149,106,0.3)",
        borderRadius: 16, padding: "28px 24px", maxWidth: 320, width: "90%",
        textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>{"\uD83C\uDF00"}</div>
        <p style={{ fontSize: 14, color: "#d4c4b0", margin: "0 0 6px" }}>{message}</p>
        {itemName && <p style={{ fontSize: 13, color: "#c4956a", margin: "0 0 20px", fontWeight: 600 }}>{itemName}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            padding: "10px 24px", background: "rgba(196,149,106,0.08)",
            border: "1px solid rgba(196,149,106,0.15)", borderRadius: 20,
            color: "#8a7a6a", fontSize: 12, fontFamily: "inherit",
            cursor: "pointer", letterSpacing: 1,
          }}>Keep it</button>
          <button onClick={onConfirm} style={{
            padding: "10px 24px", background: "rgba(155,27,48,0.2)",
            border: "1px solid rgba(155,27,48,0.3)", borderRadius: 20,
            color: "#e86b6b", fontSize: 12, fontFamily: "inherit",
            cursor: "pointer", letterSpacing: 1,
          }}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─── Item Card ───
function ItemCard({ item, onRemove, onEdit, onSelect, onLaundry, onFavourite, selected, showSelect, idx }) {
  const col = getColourObj(item.colour);
  const inLaundry = item.inLaundry;
  return (
    <div
      onClick={showSelect ? () => onSelect(item) : undefined}
      style={{
        background: selected ? "rgba(196,149,106,0.18)" : inLaundry ? "rgba(196,149,106,0.03)" : "rgba(196,149,106,0.06)",
        border: `1px solid ${selected ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.12)"}`,
        borderRadius: 12, padding: 12, position: "relative",
        cursor: showSelect ? "pointer" : "default",
        transition: "all 0.3s ease",
        opacity: inLaundry && !showSelect ? 0.5 : 1,
        animation: `fadeSlideIn 0.4s ease ${(idx || 0) * 0.05}s both`,
      }}
    >
      {item.photo ? (
        <div style={{
          width: "100%", height: 120, borderRadius: 8,
          overflow: "hidden", marginBottom: 8,
        }}>
          <img src={item.photo} alt={item.name} loading="lazy" style={{
            width: "100%", height: "100%", objectFit: "cover",
          }} />
        </div>
      ) : (
        <div style={{
          width: "100%", height: 60, borderRadius: 8, marginBottom: 8,
          background: col.hex, opacity: 0.7,
          border: "1px solid rgba(255,255,255,0.05)",
        }} />
      )}
      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px", color: "#d4c4b0" }}>
        {selected ? "\u2713 " : ""}{item.name}
      </p>
      <p style={{
        fontSize: 10, color: "#8a7a6a", margin: "0 0 6px",
        textTransform: "uppercase", letterSpacing: 1,
      }}>
        {item.category} {"\u00B7"} {item.colour}
      </p>
      {item.vibes && item.vibes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {item.vibes.map(v => (
            <span key={v} style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 10,
              background: "rgba(196,149,106,0.15)", color: "#a08a70",
              letterSpacing: "0.5px",
            }}>{v}</span>
          ))}
        </div>
      )}
      {item.weatherTags && item.weatherTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
          {item.weatherTags.map(w => (
            <span key={w} style={{
              fontSize: 9, padding: "1px 5px", borderRadius: 8,
              background: "rgba(106,149,196,0.12)", color: "#7a9ab0",
              letterSpacing: "0.3px",
            }}>{WEATHER_EMOJI[w] || ""} {w}</span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 4, fontSize: 10, color: "#6a5a4a" }}>
        {"\u2622\uFE0F".repeat(item.apocalypseRating)}{"\u00B7".repeat(5 - item.apocalypseRating)}
      </div>
      {item.location && (
        <p style={{
          fontSize: 9, color: "#5a4a3a", margin: "3px 0 0",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{"\uD83D\uDCCD"} {item.location}</p>
      )}
      {(item.wearCount || 0) > 0 && (
        <p style={{
          fontSize: 9, color: "#8a7a6a", margin: "3px 0 0",
          letterSpacing: 0.3,
        }}>worn {item.wearCount}x</p>
      )}
      {onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit(item); }}
          style={{
            position: "absolute", top: 8, right: onRemove ? 32 : 8,
            background: "rgba(0,0,0,0.4)", border: "none",
            color: "#8a7a6a", width: 20, height: 20,
            borderRadius: "50%", fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >{"\u270E"}</button>
      )}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(item.id); }}
          style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(0,0,0,0.4)", border: "none",
            color: "#8a7a6a", width: 20, height: 20,
            borderRadius: "50%", fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >{"\u00D7"}</button>
      )}
      {onFavourite && (
        <button
          onClick={e => { e.stopPropagation(); onFavourite(item.id); }}
          title={item.isFavourite ? "Unfavourite" : "Favourite"}
          style={{
            position: "absolute", bottom: 8, left: 8,
            background: item.isFavourite ? "rgba(196,149,106,0.25)" : "rgba(0,0,0,0.3)",
            border: item.isFavourite ? "1px solid rgba(196,149,106,0.4)" : "none",
            color: item.isFavourite ? "#c4956a" : "#6a5a4a",
            width: 22, height: 22,
            borderRadius: "50%", fontSize: 11, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease",
          }}
        >{item.isFavourite ? "⭐" : "☆"}</button>
      )}
      {onLaundry && (
        <button
          onClick={e => { e.stopPropagation(); onLaundry(item.id); }}
          title={inLaundry ? "Back from laundry" : "Put in laundry"}
          style={{
            position: "absolute", bottom: 8, right: 8,
            background: inLaundry ? "rgba(106,149,196,0.25)" : "rgba(0,0,0,0.3)",
            border: inLaundry ? "1px solid rgba(106,149,196,0.4)" : "none",
            color: inLaundry ? "#7a9ab0" : "#6a5a4a",
            width: 22, height: 22,
            borderRadius: "50%", fontSize: 11, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >{"\uD83E\uDDFA"}</button>
      )}
      {inLaundry && (
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "rgba(106,149,196,0.3)",
          border: "1px solid rgba(106,149,196,0.4)",
          borderRadius: 10, padding: "2px 6px",
          fontSize: 9, color: "#7a9ab0", letterSpacing: 0.5,
        }}>{"\uD83E\uDDFA"} In wash</div>
      )}
    </div>
  );
}

// ─── Colour Score Bar ───
function ColourScoreBar({ score }) {
  const pct = Math.round(score * 10);
  const label = score >= 8 ? "\u2728 beautiful harmony"
    : score >= 6 ? "\uD83C\uDF1F nice match"
    : score >= 4 ? "\uD83E\uDD14 a bit clashing"
    : "\uD83D\uDD25 bold choice!";
  return (
    <div style={{ marginTop: 12, fontSize: 11, color: "#8a7a6a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span>Colour harmony:</span>
        <span style={{ color: "#c4956a" }}>{label}</span>
      </div>
      <div style={{
        width: "100%", height: 4, borderRadius: 2,
        background: "rgba(196,149,106,0.1)",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 2,
          background: score >= 7 ? "rgba(52,211,153,0.6)" :
            score >= 4 ? "rgba(196,149,106,0.5)" : "rgba(196,58,58,0.5)",
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [items, setItems] = useState(() => loadItems());
  const [isAuthed, setIsAuthed] = useState(() => document.cookie.includes("shimmer-auth="));
  const [view, setView] = useState("wardrobe");
  const [filter, setFilter] = useState({ category: "All", colour: "All", vibe: "All" });
  const [outfit, setOutfit] = useState([]);
  const [savedOutfits, setSavedOutfits] = useState(() => loadOutfits());
  const [toast, setToast] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

  // Surprise me state
  const [surpriseResult, setSurpriseResult] = useState(null);
  const [surpriseWeather, setSurpriseWeather] = useState("Mild");
  const [surpriseVibe, setSurpriseVibe] = useState(null);
  const [crimsonMoon, setCrimsonMoon] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);

  // Pagination
  const [wardrobePage, setWardrobePage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name, type: "item"|"outfit" }

  // Outfit save/edit form
  const [showOutfitSave, setShowOutfitSave] = useState(false);
  const [outfitForm, setOutfitForm] = useState({ name: "", vibes: [], weatherTags: [] });
  const [expandedOutfit, setExpandedOutfit] = useState(null);
  const [outfitFilter, setOutfitFilter] = useState({ vibe: "All", weather: "All" });
  const [editingOutfitId, setEditingOutfitId] = useState(null);
  const [outfitSourceFilter, setOutfitSourceFilter] = useState("All");

  // Weekly Picks
  const [weeklyPicks, setWeeklyPicks] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddWeeklyItem, setShowAddWeeklyItem] = useState(null); // catId or null
  const [weeklyColourFilter, setWeeklyColourFilter] = useState("All");
  const [weeklyPicksCatFilter, setWeeklyPicksCatFilter] = useState(null); // category id or null for all
  const [newWeeklyItem, setNewWeeklyItem] = useState({ name: "", colourFamily: "", type: "", description: "", photo: "" });
  const [editingWeeklyItem, setEditingWeeklyItem] = useState(null); // { catId, item } or null

  // Build outfit state
  const [editingBuildOutfit, setEditingBuildOutfit] = useState(null); // null or { id, name, vibes, weatherTags, source }
  const [buildFilter, setBuildFilter] = useState({ category: "All", colour: "All" });
  const [buildPage, setBuildPage] = useState(1);

  // Custom colours
  const [customColours, setCustomColours] = useState(() => loadCustomColours());
  const [showColourCreator, setShowColourCreator] = useState(false);
  const [newColour, setNewColour] = useState({ name: "", hex: "#c4956a", warmth: "warm" });
  const allColours = [...COLOURS, ...customColours];

  // Add/edit item form
  const [editingItem, setEditingItem] = useState(null); // null = adding, item id = editing
  const [newItem, setNewItem] = useState({
    name: "", category: "Top", colour: "Black", vibes: [], weatherTags: [], photo: null, apocalypseRating: 3, location: "",
  });

  // Load data from server on mount. Server is source of truth —
  // always sync React state to whatever the server returns (including
  // empty arrays, which are a legitimate state if you've deleted things).
  // Falls back to localStorage cache if the server is unreachable.
  useEffect(() => {
    setAnimateIn(true);
    fetchAllData().then(data => {
      setItems(data.items);
      setSavedOutfits(data.outfits);
      setCustomColours(data.customColours);
      if (data.weeklyPicks) setWeeklyPicks(data.weeklyPicks);
      if (!data.fromServer) {
        showToast("Offline — changes won't sync until reconnected \uD83C\uDF00");
      }
    });
    // Check auth + load weekly picks
    fetch("/api/auth").then(r => r.json()).then(d => setIsAuthed(d.authenticated)).catch(() => {});
    getWeeklyPicks().then(wp => setWeeklyPicks(wp || []));
  }, []);

  // Keep localStorage cache in sync with React state on every change.
  // This way the cache always matches the UI, and first paint on return
  // visits is fast + accurate (server fetch still overrides if different).
  useEffect(() => { saveItems(items); }, [items]);
  useEffect(() => { saveOutfits(savedOutfits); }, [savedOutfits]);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ─── Item CRUD ───
  const addItem = async () => {
    if (!newItem.name.trim()) { showToast("Give it a name, love! \uD83D\uDC96"); return; }
    const item = { ...newItem, id: Date.now(), dateAdded: new Date().toLocaleDateString() };
    setItems(prev => [...prev, item]); // optimistic
    setNewItem({ name: "", category: "Top", colour: "Black", vibes: [], weatherTags: [], photo: null, apocalypseRating: 3, location: "" });
    showToast(`${item.name} added to the wardrobe! \u2728`);
    setView("wardrobe");
    const ok = await addItemToServer(item);
    if (!ok) {
      setItems(prev => prev.filter(i => i.id !== item.id)); // rollback
      showToast(`Couldn't save ${item.name} \u2014 server didn't respond \uD83D\uDE3F`);
    }
  };

  const startEditItem = (item) => {
    setEditingItem(item.id);
    setNewItem({
      name: item.name,
      category: item.category,
      colour: item.colour,
      vibes: item.vibes || [],
      weatherTags: item.weatherTags || [],
      photo: item.photo || null,
      apocalypseRating: item.apocalypseRating || 3,
      location: item.location || "",
    });
    setView("add");
  };

  const saveEditItem = async () => {
    if (!newItem.name.trim()) { showToast("Give it a name, love! \uD83D\uDC96"); return; }
    const prevItem = items.find(i => i.id === editingItem);
    const updated = { ...newItem, id: editingItem, dateAdded: prevItem?.dateAdded };
    setItems(prev => prev.map(i => i.id === editingItem ? updated : i)); // optimistic
    setNewItem({ name: "", category: "Top", colour: "Black", vibes: [], weatherTags: [], photo: null, apocalypseRating: 3, location: "" });
    setEditingItem(null);
    showToast(`${updated.name} updated! \u2728`);
    setView("wardrobe");
    const ok = await updateItemOnServer(updated);
    if (!ok && prevItem) {
      setItems(prev => prev.map(i => i.id === updated.id ? prevItem : i)); // rollback
      showToast(`Couldn't save edit to ${updated.name} \uD83D\uDE3F`);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setNewItem({ name: "", category: "Top", colour: "Black", vibes: [], weatherTags: [], photo: null, apocalypseRating: 3, location: "" });
    setView("wardrobe");
  };

  const requestRemoveItem = (id) => {
    const item = items.find(i => i.id === id);
    setConfirmDelete({ id, name: item?.name || "this item", type: "item" });
  };

  const confirmRemoveItem = async () => {
    if (!confirmDelete) return;
    const { id, type } = confirmDelete;
    setConfirmDelete(null);
    if (type === "item") {
      const prev = items.find(i => i.id === id);
      setItems(cur => cur.filter(i => i.id !== id)); // optimistic
      setOutfit(cur => cur.filter(i => i.id !== id));
      showToast("Item removed \uD83C\uDF00");
      const ok = await removeItemFromServer(id);
      if (!ok && prev) {
        setItems(cur => [...cur, prev]); // rollback
        showToast(`Couldn't remove ${prev.name} \uD83D\uDE3F`);
      }
    } else {
      const prev = savedOutfits.find(o => o.id === id);
      setSavedOutfits(cur => cur.filter(o => o.id !== id)); // optimistic
      showToast("Outfit removed \uD83C\uDF00");
      const ok = await removeOutfitFromServer(id);
      if (!ok && prev) {
        setSavedOutfits(cur => [...cur, prev]); // rollback
        showToast(`Couldn't remove ${prev.name} \uD83D\uDE3F`);
      }
    }
  };

  // ─── Outfit building ───
  const toggleOutfitItem = item => {
    setOutfit(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, item];
    });
  };

  // ─── Duplicate outfit detection (core items: top/bottom/dress/shoes) ───
  const CORE_CATEGORIES = new Set(["Top", "Bottom", "Dress", "Jumpsuit", "Matching Set", "Shoes"]);
  const findDuplicateOutfit = (outfitItems) => {
    const newCoreIds = new Set(outfitItems.filter(i => CORE_CATEGORIES.has(i.category)).map(i => i.id));
    if (newCoreIds.size === 0) return null;
    return savedOutfits.find(existing => {
      const existingCoreIds = new Set(existing.items.filter(i => CORE_CATEGORIES.has(i.category)).map(i => i.id));
      return existingCoreIds.size === newCoreIds.size && [...newCoreIds].every(id => existingCoreIds.has(id));
    }) || null;
  };

  const startSaveOutfit = () => {
    if (outfit.length === 0) { showToast("Pick some pieces first! \uD83D\uDC0C"); return; }
    setOutfitForm({ name: "", vibes: [], weatherTags: [], pickedBy: "manual" });
    setShowOutfitSave(true);
  };

  const confirmSaveOutfit = async () => {
    // Check for duplicate core items
    const dupe = findDuplicateOutfit(outfit);
    if (dupe) {
      showToast(`You already have this outfit, love! It's called "${dupe.name}" \uD83D\uDC96`);
      return;
    }
    const name = outfitForm.name.trim() || `Outfit ${savedOutfits.length + 1}`;
    const newOutfit = {
      name, items: [...outfit], id: Date.now(),
      vibes: outfitForm.vibes, weatherTags: outfitForm.weatherTags,
      source: outfitForm.pickedBy || "manual",
    };
    setSavedOutfits(prev => [...prev, newOutfit]);
    showToast(`${name} saved! \uD83D\uDC96`);
    setOutfit([]);
    setShowOutfitSave(false);
    const ok = await addOutfitToServer(newOutfit);
    if (!ok) {
      setSavedOutfits(prev => prev.filter(o => o.id !== newOutfit.id));
      showToast(`Couldn't save ${name} \uD83D\uDE3F`);
    }
  };

  const startEditOutfit = (o) => {
    setEditingOutfitId(o.id);
    setOutfitForm({ name: o.name, vibes: o.vibes || [], weatherTags: o.weatherTags || [] });
  };

  const saveEditOutfit = async () => {
    const prev = savedOutfits.find(o => o.id === editingOutfitId);
    const updated = {
      ...prev,
      name: outfitForm.name.trim() || prev.name,
      vibes: outfitForm.vibes,
      weatherTags: outfitForm.weatherTags,
    };
    setSavedOutfits(cur => cur.map(o => o.id === editingOutfitId ? updated : o));
    setEditingOutfitId(null);
    setOutfitForm({ name: "", vibes: [], weatherTags: [], pickedBy: "manual" });
    showToast(`${updated.name} updated! \u2728`);
    const ok = await updateOutfitOnServer(updated);
    if (!ok && prev) {
      setSavedOutfits(cur => cur.map(o => o.id === updated.id ? prev : o));
      showToast(`Couldn't save ${updated.name} \uD83D\uDE3F`);
    }
  };

  const cancelEditOutfit = () => {
    setEditingOutfitId(null);
    setOutfitForm({ name: "", vibes: [], weatherTags: [], pickedBy: "manual" });
  };

  // ─── Build Outfit: Edit existing ───
  const startBuildEdit = (o) => {
    setEditingBuildOutfit({ id: o.id, name: o.name, vibes: o.vibes || [], weatherTags: o.weatherTags || [], source: o.source });
    setOutfit([...o.items]);
    setOutfitForm({ name: o.name, vibes: o.vibes || [], weatherTags: o.weatherTags || [], pickedBy: o.source || "manual" });
    setShowOutfitSave(false);
    setBuildFilter({ category: "All", colour: "All" });
    setBuildPage(1);
    setView("outfit");
  };

  const saveBuildEdit = async () => {
    const name = outfitForm.name.trim() || editingBuildOutfit.name;
    const prev = savedOutfits.find(o => o.id === editingBuildOutfit.id);
    const updated = {
      ...prev,
      name,
      items: [...outfit],
      vibes: outfitForm.vibes,
      weatherTags: outfitForm.weatherTags,
      source: outfitForm.pickedBy || prev.source || "manual",
    };
    setSavedOutfits(cur => cur.map(o => o.id === editingBuildOutfit.id ? updated : o));
    showToast(`${name} updated! ✨`);
    setEditingBuildOutfit(null);
    setOutfit([]);
    setOutfitForm({ name: "", vibes: [], weatherTags: [], pickedBy: "manual" });
    setShowOutfitSave(false);
    const ok = await updateOutfitOnServer(updated);
    if (!ok && prev) {
      setSavedOutfits(cur => cur.map(o => o.id === updated.id ? prev : o));
      showToast(`Couldn't save ${name} 😿`);
    }
  };

  const cancelBuildEdit = () => {
    setEditingBuildOutfit(null);
    setOutfit([]);
    setOutfitForm({ name: "", vibes: [], weatherTags: [], pickedBy: "manual" });
    setShowOutfitSave(false);
  };

  const handleOutfitSelfie = async (outfitId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const selfie = reader.result;
      const prev = savedOutfits.find(o => o.id === outfitId);
      const updated = { ...prev, selfie };
      setSavedOutfits(cur => cur.map(o => o.id === outfitId ? updated : o));
      showToast("Mirror selfie added! 🪞✨");
      const ok = await updateOutfitOnServer(updated);
      if (!ok && prev) {
        setSavedOutfits(cur => cur.map(o => o.id === outfitId ? prev : o));
        showToast("Couldn't save selfie 😿");
      }
    };
    reader.readAsDataURL(file);
  };

  const removeOutfitSelfie = async (outfitId) => {
    const prev = savedOutfits.find(o => o.id === outfitId);
    const updated = { ...prev, selfie: null };
    setSavedOutfits(cur => cur.map(o => o.id === outfitId ? updated : o));
    showToast("Selfie removed 🌀");
    const ok = await updateOutfitOnServer(updated);
    if (!ok && prev) {
      setSavedOutfits(cur => cur.map(o => o.id === outfitId ? prev : o));
      showToast("Couldn't update 😿");
    }
  };

  const saveSurpriseOutfit = async () => {
    if (!surpriseResult || !surpriseResult.items.length) return;
    // Check for duplicate core items
    const dupe = findDuplicateOutfit(surpriseResult.items);
    if (dupe) {
      showToast(`The snail tried to pick "${dupe.name}" again! Spin for a new one? 🐌`);
      return;
    }
    const isChaos = surpriseResult.structure === "chaos";
    const name = isChaos ? pickChaosName() : pickSnailName();
    const source = isChaos ? "chaos" : "snail";
    const newOutfit = {
      name, items: [...surpriseResult.items], id: Date.now(),
      vibes: [], weatherTags: surpriseWeather ? [surpriseWeather] : [],
      source,
    };
    setSavedOutfits(prev => [...prev, newOutfit]);
    showToast(`${isChaos ? "🌀" : "🐌"} "${name}" saved!`);
    const ok = await addOutfitToServer(newOutfit);
    if (!ok) {
      setSavedOutfits(prev => prev.filter(o => o.id !== newOutfit.id));
      showToast(`Couldn't save — server didn't respond 😿`);
    }
  };

  // ─── Laundry ───
  const toggleLaundry = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const wasInLaundry = item.inLaundry;
    setItems(prev => prev.map(i => i.id === id ? { ...i, inLaundry: !i.inLaundry } : i));
    showToast(wasInLaundry ? `${item.name} back from the wash! ✨` : `${item.name} → laundry 🧺`);
    const ok = await toggleLaundryOnServer(id);
    if (!ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, inLaundry: wasInLaundry } : i));
      showToast("Couldn't update laundry status 😿");
    }
  };

  const laundryDone = async () => {
    const count = items.filter(i => i.inLaundry).length;
    if (count === 0) { showToast("Nothing in the wash! 🐌"); return; }
    const prev = items.map(i => ({ ...i }));
    setItems(cur => cur.map(i => ({ ...i, inLaundry: false })));
    showToast(`${count} items back from the wash! ✨`);
    const ok = await laundryDoneOnServer();
    if (!ok) {
      setItems(prev);
      showToast("Couldn't clear laundry 😿");
    }
  };

  // ─── Favourites ───
  const toggleFavouriteItem = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const was = item.isFavourite;
    setItems(prev => prev.map(i => i.id === id ? { ...i, isFavourite: !i.isFavourite } : i));
    const ok = await toggleItemFavourite(id);
    if (!ok) setItems(prev => prev.map(i => i.id === id ? { ...i, isFavourite: was } : i));
  };

  const toggleFavouriteOutfit = async (id) => {
    const outfit = savedOutfits.find(o => o.id === id);
    if (!outfit) return;
    const was = outfit.isFavourite;
    setSavedOutfits(prev => prev.map(o => o.id === id ? { ...o, isFavourite: !o.isFavourite } : o));
    showToast(was ? "Unfavourited 💔" : "Favourited! ⭐");
    const ok = await toggleOutfitFavourite(id);
    if (!ok) setSavedOutfits(prev => prev.map(o => o.id === id ? { ...o, isFavourite: was } : o));
  };

  // ─── Wearing Today ───
  const handleWearToday = async (outfitId) => {
    const outfit = savedOutfits.find(o => o.id === outfitId);
    if (!outfit) return;

    const today = new Date().toISOString().split('T')[0];
    const wasWearing = outfit.wearingToday;
    const isNewWear = !wasWearing && outfit.lastWorn !== today;

    // Save previous state for rollback
    const prevOutfits = savedOutfits.map(o => ({ ...o }));
    const prevItems = items.map(i => ({ ...i }));

    // Optimistic update: outfits
    setSavedOutfits(cur => cur.map(o => {
      if (o.id === outfitId) {
        return {
          ...o,
          wearingToday: !wasWearing,
          ...(isNewWear ? { timesWorn: (o.timesWorn || 0) + 1, lastWorn: today } : {}),
        };
      }
      return { ...o, wearingToday: false };
    }));

    // Optimistic update: item wear counts (only if new wear)
    if (isNewWear) {
      const outfitItemIds = new Set(outfit.items.map(i => i.id));
      setItems(cur => cur.map(i => {
        if (outfitItemIds.has(i.id)) {
          return { ...i, wearCount: (i.wearCount || 0) + 1, lastWorn: today };
        }
        return i;
      }));
    }

    showToast(wasWearing ? `Outfit un-worn` : `Wearing "${outfit.name}" today! 👗`);

    const ok = await toggleWearToday(outfitId);
    if (!ok) {
      setSavedOutfits(prevOutfits);
      setItems(prevItems);
      showToast("Couldn't update — server didn't respond 😿");
    }
  };

  const requestDeleteOutfit = (id) => {
    const outfit = savedOutfits.find(o => o.id === id);
    setConfirmDelete({ id, name: outfit?.name || "this outfit", type: "outfit" });
  };

  // Custom colour management
  const addCustomColour = async () => {
    if (!newColour.name.trim()) { showToast("Give the colour a name! \uD83C\uDF08"); return; }
    if (allColours.find(c => c.name === newColour.name)) { showToast("That name's taken, love! \uD83D\uDC0C"); return; }
    const colour = {
      name: newColour.name.trim(),
      hex: newColour.hex,
      group: newColour.warmth === "neutral" ? "neutral" : newColour.warmth,
      warmth: newColour.warmth,
      custom: true,
    };
    const updated = [...customColours, colour];
    setCustomColours(updated); // optimistic
    saveCustomColours(updated); // cache
    setNewColour({ name: "", hex: "#c4956a", warmth: "warm" });
    setShowColourCreator(false);
    showToast(`${colour.name} added to the palette! \uD83C\uDF08`);
    const ok = await addColourToServer(colour);
    if (!ok) {
      setCustomColours(customColours); // rollback
      saveCustomColours(customColours);
      showToast(`Couldn't save ${colour.name} \uD83D\uDE3F`);
    }
  };

  const removeCustomColour = async (name) => {
    const prev = customColours;
    const updated = customColours.filter(c => c.name !== name);
    setCustomColours(updated); // optimistic
    saveCustomColours(updated); // cache
    showToast("Colour removed \uD83C\uDF00");
    const ok = await removeColourFromServer(name);
    if (!ok) {
      setCustomColours(prev); // rollback
      saveCustomColours(prev);
      showToast(`Couldn't remove ${name} \uD83D\uDE3F`);
    }
  };

  // ─── Surprise Me ───
  const generateSurprise = useCallback(() => {
    // Exclude laundry items from suggestions
    const available = items.filter(i => !i.inLaundry);
    if (available.length < 2) {
      showToast("Need more clothes to surprise you! (Check the laundry?) \uD83D\uDC0C");
      return;
    }

    let result;
    if (chaosMode) {
      result = generateChaosOutfit(available);
    } else {
      result = generateBestOutfit(available, {
        weather: surpriseWeather,
        vibe: surpriseVibe ? (SURPRISE_VIBE_MAP[surpriseVibe] || surpriseVibe) : null,
        crimsonMoon,
      });
    }

    if (result) {
      setSurpriseResult(result);
      setView("surprise");
    }
  }, [items, chaosMode, surpriseWeather, surpriseVibe, crimsonMoon]);

  // ─── Filters ───
  const filteredItems = items.filter(item => {
    if (filter.category !== "All" && item.category !== filter.category) return false;
    if (filter.colour !== "All" && item.colour !== filter.colour) return false;
    if (filter.vibe !== "All" && !(item.vibes && item.vibes.includes(filter.vibe))) return false;
    return true;
  });

  const filteredOutfits = savedOutfits.filter(o => {
    if (outfitFilter.vibe !== "All" && !(o.vibes && o.vibes.includes(outfitFilter.vibe))) return false;
    if (outfitFilter.weather !== "All" && !(o.weatherTags && o.weatherTags.includes(outfitFilter.weather))) return false;
    if (outfitSourceFilter !== "All") {
      const src = o.source || "manual";
      if (outfitSourceFilter === "snail") {
        if (src !== "snail" && src !== "surprise") return false;
      } else if (outfitSourceFilter !== src) return false;
    }
    return true;
  });

  // Build outfit filtered items
  const buildItems = items.filter(i => {
    if (i.inLaundry) return false;
    if (buildFilter.category !== "All" && i.category !== buildFilter.category) return false;
    if (buildFilter.colour !== "All" && i.colour !== buildFilter.colour) return false;
    return true;
  });

  // Outfit completeness
  const outfitCheck = {
    hasTop: outfit.some(i => ["Top", "Cardigan"].includes(i.category)),
    hasBottom: outfit.some(i => i.category === "Bottom"),
    hasFullBody: outfit.some(i => ["Dress", "Jumpsuit", "Matching Set"].includes(i.category)),
    hasShoes: outfit.some(i => i.category === "Shoes"),
  };
  const outfitHasBase = outfitCheck.hasFullBody || (outfitCheck.hasTop && outfitCheck.hasBottom);

  // ─── Photo upload ───
  const handlePhotoUpload = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewItem(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1a1410",
      fontFamily: "'Quicksand', 'Palatino Linotype', Georgia, serif",
      color: "#e8ddd0",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background texture */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 Q35 15 30 25 Q25 35 30 45 Q35 55 30 55' fill='none' stroke='%23c4956a' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: "60px 60px",
      }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 20% 0%, rgba(196,149,106,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(155,27,48,0.05) 0%, transparent 60%)",
      }} />

      <Toast message={toast} />
      {confirmDelete && (
        <ConfirmModal
          message="Are you sure you want to remove"
          itemName={confirmDelete.name + "?"}
          onConfirm={confirmRemoveItem}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Header */}
      <div style={{
        padding: "30px 24px 20px", textAlign: "center", position: "relative",
        opacity: animateIn ? 1 : 0,
        transform: animateIn ? "translateY(0)" : "translateY(-20px)",
        transition: "all 0.8s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          <SpiralIcon size={24} />
          <h1 style={{
            fontSize: 28, fontWeight: 700, letterSpacing: 4,
            textTransform: "uppercase", color: "#c4956a", margin: 0,
          }}>{APP_NAME}</h1>
          <SpiralIcon size={24} />
        </div>
        <p style={{
          fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
          color: "#8a7a6a", margin: "4px 0 0", fontStyle: "italic",
        }}>{APP_SUBTITLE}</p>
        <p style={{ fontSize: 11, color: "#6a5a4a", margin: "8px 0 0" }}>
          {items.length} pieces registered{items.length > 0 ? ` \u00B7 ${savedOutfits.length} outfits saved` : ""}
        </p>
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 4,
        padding: "0 16px 20px", flexWrap: "wrap",
      }}>
        {[
          { id: "wardrobe", label: "Wardrobe", icon: NAV_ICONS.wardrobe },
          ...(isAuthed ? [{ id: "add", label: "Add", icon: NAV_ICONS.add }] : []),
          { id: "outfit", label: "Build Outfit", icon: NAV_ICONS.outfit },
          { id: "savedOutfits", label: "Saved", icon: NAV_ICONS.saved },
          { id: "laundry", label: `Laundry${items.filter(i => i.inLaundry).length ? ` (${items.filter(i => i.inLaundry).length})` : ""}`, icon: NAV_ICONS.laundry },
          ...(weeklyPicks.length > 0 || isAuthed ? [{ id: "weeklyPicks", label: "Weekly", icon: "📆" }] : []),
          { id: "surpriseSetup", label: "Surprise Me", icon: NAV_ICONS.surprise },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "add" && editingItem) {
                setEditingItem(null);
                setNewItem({ name: "", category: "Top", colour: "Black", vibes: [], weatherTags: [], photo: null, apocalypseRating: 3, location: "" });
              }
              setView(tab.id);
            }}
            style={{
              background: view === tab.id || (tab.id === "surpriseSetup" && view === "surprise")
                ? "rgba(196,149,106,0.2)" : "rgba(196,149,106,0.05)",
              border: `1px solid ${view === tab.id || (tab.id === "surpriseSetup" && view === "surprise")
                ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)"}`,
              color: view === tab.id || (tab.id === "surpriseSetup" && view === "surprise")
                ? "#c4956a" : "#8a7a6a",
              padding: "8px 16px", borderRadius: 24, fontSize: 12,
              letterSpacing: 1, cursor: "pointer", transition: "all 0.3s ease",
              fontFamily: "inherit", textTransform: "uppercase",
            }}
          >{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "0 16px 100px", maxWidth: 600, margin: "0 auto" }}>

        {/* ═══ WARDROBE ═══ */}
        {view === "wardrobe" && (
          <div>
            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.6 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>{"\uD83C\uDF00"}</div>
                <p style={{ fontSize: 16, color: "#8a7a6a", marginBottom: 8 }}>
                  The wardrobe is empty, love
                </p>
                <p style={{ fontSize: 13, color: "#6a5a4a" }}>
                  Tap <strong style={{ color: "#c4956a" }}>{"\u2728"} Add</strong> to start building your collection
                </p>
                <p style={{ fontSize: 11, color: "#5a4a3a", marginTop: 16, fontStyle: "italic" }}>
                  "They're all my favourite" — and they will be {"\uD83D\uDC96"}
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <select value={filter.category} onChange={e => { setFilter(f => ({ ...f, category: e.target.value })); setWardrobePage(1); }} style={selectStyle}>
                    <option value="All">All Types</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={filter.colour} onChange={e => { setFilter(f => ({ ...f, colour: e.target.value })); setWardrobePage(1); }} style={selectStyle}>
                    <option value="All">All Colours</option>
                    {[...allColours].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={filter.vibe} onChange={e => { setFilter(f => ({ ...f, vibe: e.target.value })); setWardrobePage(1); }} style={selectStyle}>
                    <option value="All">All Vibes</option>
                    {VIBES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <p style={{ fontSize: 11, color: "#6a5a4a", marginBottom: 12 }}>
                  Showing {Math.min(wardrobePage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} pieces
                  {filteredItems.length !== items.length && ` (${items.length} total)`}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {filteredItems.slice(0, wardrobePage * ITEMS_PER_PAGE).map((item, idx) => (
                    <ItemCard key={item.id} item={item} onRemove={isAuthed ? requestRemoveItem : undefined} onEdit={isAuthed ? startEditItem : undefined} onLaundry={isAuthed ? toggleLaundry : undefined} onFavourite={isAuthed ? toggleFavouriteItem : undefined} idx={idx} />
                  ))}
                </div>
                {wardrobePage * ITEMS_PER_PAGE < filteredItems.length && (
                  <button onClick={() => setWardrobePage(p => p + 1)} style={{
                    width: "100%", padding: 14, marginTop: 16,
                    background: "rgba(196,149,106,0.08)",
                    border: "1px solid rgba(196,149,106,0.15)",
                    borderRadius: 12, color: "#c4956a", fontSize: 13,
                    fontFamily: "inherit", letterSpacing: 1, cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}>
                    Show more ({filteredItems.length - wardrobePage * ITEMS_PER_PAGE} remaining) {"🌀"}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ ADD ITEM ═══ */}
        {view === "add" && (
          <div style={{
            background: "rgba(196,149,106,0.04)",
            border: "1px solid rgba(196,149,106,0.1)",
            borderRadius: 16, padding: 24,
          }}>
            <h2 style={{
              fontSize: 16, letterSpacing: 2, textTransform: "uppercase",
              color: "#c4956a", margin: "0 0 24px", fontWeight: 400, textAlign: "center",
            }}>{editingItem ? "\u270E Edit Piece" : "\u2728 New Piece"}</h2>

            <label style={labelStyle}>What is it?</label>
            <input
              type="text" value={newItem.name}
              onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Peach knit cardigan, Favourite wellies..."
              style={inputStyle}
            />

            <label style={labelStyle}>Category</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setNewItem(prev => ({ ...prev, category: cat }))}
                  style={{
                    ...chipStyle,
                    background: newItem.category === cat ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                    borderColor: newItem.category === cat ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                    color: newItem.category === cat ? "#c4956a" : "#8a7a6a",
                  }}
                >{cat}</button>
              ))}
            </div>

            <label style={labelStyle}>Colour</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {allColours.map(col => (
                <button key={col.name}
                  onClick={() => setNewItem(prev => ({ ...prev, colour: col.name }))}
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: col.hex, cursor: "pointer", transition: "all 0.2s ease",
                    border: newItem.colour === col.name ? "2px solid #c4956a" : "2px solid rgba(196,149,106,0.1)",
                    boxShadow: newItem.colour === col.name ? "0 0 12px rgba(196,149,106,0.3)" : "none",
                    position: "relative",
                  }}
                  title={col.name}
                >
                  {newItem.colour === col.name && (
                    <span style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: ["White", "Cream", "Yellow", "Peach", "Gold", "Silver"].includes(col.name) ? "#1a1410" : "#fff",
                      fontSize: 14, fontWeight: "bold",
                    }}>{"\u2713"}</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => setShowColourCreator(!showColourCreator)}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(196,149,106,0.06)",
                  border: "2px dashed rgba(196,149,106,0.25)",
                  color: "#8a7a6a", cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                title="Add custom colour"
              >+</button>
            </div>
            {showColourCreator && (
              <div style={{
                background: "rgba(196,149,106,0.06)",
                border: "1px solid rgba(196,149,106,0.15)",
                borderRadius: 12, padding: 16, marginBottom: 12,
              }}>
                <p style={{ fontSize: 11, color: "#c4956a", margin: "0 0 12px", letterSpacing: 1, textTransform: "uppercase" }}>
                  {"\uD83C\uDF08"} New Custom Colour
                </p>
                {newItem.photo && (
                  <div style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    marginBottom: 12, padding: 10,
                    background: "rgba(196,149,106,0.04)",
                    borderRadius: 10, border: "1px solid rgba(196,149,106,0.1)",
                  }}>
                    <img src={newItem.photo} alt="reference" style={{
                      width: 80, height: 80, objectFit: "cover",
                      borderRadius: 8, border: "1px solid rgba(196,149,106,0.2)",
                      flexShrink: 0,
                    }} />
                    <p style={{ fontSize: 10, color: "#6a5a4a", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>
                      {"\uD83D\uDCA7"} Use the eyedropper on the colour picker to match from your photo \u2014 it's right here so you can see what you're picking!
                    </p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                  <input
                    type="color" value={newColour.hex}
                    onChange={e => setNewColour(prev => ({ ...prev, hex: e.target.value, warmth: guessWarmth(e.target.value) }))}
                    style={{ width: 44, height: 36, border: "none", borderRadius: 8, cursor: "pointer", background: "none" }}
                  />
                  <input
                    type="text" value={newColour.name}
                    onChange={e => setNewColour(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Colour name, e.g. Sage, Coral..."
                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {["warm", "cool", "neutral"].map(w => (
                    <button key={w} onClick={() => setNewColour(prev => ({ ...prev, warmth: w }))} style={{
                      ...chipStyle,
                      background: newColour.warmth === w ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                      borderColor: newColour.warmth === w ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                      color: newColour.warmth === w ? "#c4956a" : "#8a7a6a",
                      textTransform: "capitalize",
                    }}>{w}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addCustomColour} style={{
                    flex: 1, padding: "8px 14px",
                    background: "rgba(196,149,106,0.2)",
                    border: "1px solid rgba(196,149,106,0.3)",
                    borderRadius: 10, color: "#c4956a", fontSize: 11,
                    fontFamily: "inherit", cursor: "pointer", letterSpacing: 1,
                  }}>Add Colour {"\u2728"}</button>
                  <button onClick={() => setShowColourCreator(false)} style={{
                    padding: "8px 14px",
                    background: "rgba(196,149,106,0.06)",
                    border: "1px solid rgba(196,149,106,0.1)",
                    borderRadius: 10, color: "#6a5a4a", fontSize: 11,
                    fontFamily: "inherit", cursor: "pointer",
                  }}>Cancel</button>
                </div>
                {customColours.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 9, color: "#6a5a4a", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Your custom colours:</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {customColours.map(c => (
                        <span key={c.name} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 10, padding: "3px 8px", borderRadius: 10,
                          background: "rgba(196,149,106,0.1)", color: "#a08a70",
                        }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.hex, display: "inline-block" }} />
                          {c.name}
                          <button onClick={() => removeCustomColour(c.name)} style={{
                            background: "none", border: "none", color: "#8a7a6a",
                            cursor: "pointer", fontSize: 10, padding: 0, marginLeft: 2,
                          }}>{"\u00D7"}</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <p style={{ fontSize: 11, color: "#6a5a4a", marginBottom: 20 }}>
              Selected: <span style={{ color: "#c4956a" }}>{newItem.colour}</span>
            </p>

            <label style={labelStyle}>Vibe Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {VIBES.map(vibe => (
                <button key={vibe}
                  onClick={() => setNewItem(prev => ({
                    ...prev,
                    vibes: prev.vibes.includes(vibe) ? prev.vibes.filter(v => v !== vibe) : [...prev.vibes, vibe],
                  }))}
                  style={{
                    ...chipStyle,
                    background: newItem.vibes.includes(vibe) ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                    borderColor: newItem.vibes.includes(vibe) ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                    color: newItem.vibes.includes(vibe) ? "#c4956a" : "#8a7a6a",
                  }}
                >{vibe}</button>
              ))}
            </div>

            <label style={labelStyle}>Good for which weather?</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {WEATHERS.map(w => (
                <button key={w}
                  onClick={() => setNewItem(prev => ({
                    ...prev,
                    weatherTags: prev.weatherTags.includes(w) ? prev.weatherTags.filter(t => t !== w) : [...prev.weatherTags, w],
                  }))}
                  style={{
                    ...chipStyle,
                    background: newItem.weatherTags.includes(w) ? "rgba(106,149,196,0.2)" : "rgba(196,149,106,0.06)",
                    borderColor: newItem.weatherTags.includes(w) ? "rgba(106,149,196,0.35)" : "rgba(196,149,106,0.1)",
                    color: newItem.weatherTags.includes(w) ? "#7a9ab0" : "#8a7a6a",
                  }}
                >{WEATHER_EMOJI[w]} {w}</button>
              ))}
            </div>

            <label style={labelStyle}>Apocalypse Readiness {"\u2622\uFE0F"}</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n}
                  onClick={() => setNewItem(prev => ({ ...prev, apocalypseRating: n }))}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", fontFamily: "inherit",
                    background: n <= newItem.apocalypseRating ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                    border: `1px solid ${n <= newItem.apocalypseRating ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)"}`,
                    color: n <= newItem.apocalypseRating ? "#c4956a" : "#5a4a3a",
                    cursor: "pointer", fontSize: 14, transition: "all 0.2s ease",
                  }}
                >{"\u2622\uFE0F"}</button>
              ))}
              <span style={{ fontSize: 11, color: "#6a5a4a", marginLeft: 8 }}>
                {newItem.apocalypseRating === 1 && "Not surviving anything in this"}
                {newItem.apocalypseRating === 2 && "Might outrun a slow zombie"}
                {newItem.apocalypseRating === 3 && "Reasonable survival chance"}
                {newItem.apocalypseRating === 4 && "Built for the end times"}
                {newItem.apocalypseRating === 5 && "Would impress Mad Max"}
              </span>
            </div>

            <label style={labelStyle}>Where does it live?</label>
            <select value={newItem.location}
              onChange={e => setNewItem(prev => ({ ...prev, location: e.target.value }))}
              style={{ ...selectStyle, width: "100%", marginBottom: 20, flex: "none" }}
            >
              <option value="">Not set yet</option>
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}{BLOCKED_LOCATIONS.includes(loc) ? " 🐟💤" : ""}</option>
              ))}
            </select>

            <label style={labelStyle}>Photo (optional)</label>
            <div style={{ marginBottom: 24 }}>
              {newItem.photo ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={newItem.photo} alt="preview" style={{
                    width: 120, height: 120, objectFit: "cover",
                    borderRadius: 12, border: "1px solid rgba(196,149,106,0.2)",
                  }} />
                  <button onClick={() => setNewItem(prev => ({ ...prev, photo: null }))}
                    style={{
                      position: "absolute", top: -6, right: -6,
                      background: "#c43a3a", border: "none", color: "#fff",
                      width: 20, height: 20, borderRadius: "50%",
                      fontSize: 10, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >{"\u00D7"}</button>
                </div>
              ) : (
                <label style={{
                  display: "inline-block", padding: "12px 20px",
                  background: "rgba(196,149,106,0.06)",
                  border: "1px dashed rgba(196,149,106,0.2)",
                  borderRadius: 12, color: "#8a7a6a", fontSize: 12,
                  cursor: "pointer", transition: "all 0.3s ease",
                }}>
                  {"\uD83D\uDCF7"} Upload photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                </label>
              )}
            </div>

            <button onClick={editingItem ? saveEditItem : addItem} style={{
              width: "100%", padding: 14,
              background: "linear-gradient(135deg, rgba(196,149,106,0.3), rgba(155,27,48,0.2))",
              border: "1px solid rgba(196,149,106,0.3)", borderRadius: 12,
              color: "#c4956a", fontSize: 14, fontFamily: "inherit",
              letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
              transition: "all 0.3s ease",
            }}>{editingItem ? "Save Changes \u2728" : "Add to Wardrobe \u2728"}</button>
            {editingItem && (
              <button onClick={cancelEdit} style={{
                width: "100%", padding: 12, marginTop: 8,
                background: "rgba(196,149,106,0.06)",
                border: "1px solid rgba(196,149,106,0.1)", borderRadius: 12,
                color: "#8a7a6a", fontSize: 12, fontFamily: "inherit",
                letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
              }}>Cancel</button>
            )}
          </div>
        )}

        {/* ═══ BUILD OUTFIT ═══ */}
        {view === "outfit" && (
          <div>
            {/* ── Floating Outfit Preview Banner ── */}
            {(outfit.length > 0 || editingBuildOutfit) && (
              <div style={{
                position: "sticky", top: 0, zIndex: 30,
                background: "rgba(26,20,16,0.95)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(196,149,106,0.2)",
                borderRadius: 16, padding: 14, marginBottom: 16,
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}>
                {/* Mode label */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: outfit.length > 0 ? 10 : 0 }}>
                  <h3 style={{ fontSize: 12, color: "#c4956a", margin: 0, letterSpacing: 1, textTransform: "uppercase" }}>
                    {editingBuildOutfit ? `✎ Editing: ${editingBuildOutfit.name}` : "🌀 New Outfit"}
                  </h3>
                  <div style={{ display: "flex", gap: 6 }}>
                    {isAuthed && outfit.length > 0 && !showOutfitSave && (
                      <button onClick={() => { setOutfitForm(editingBuildOutfit ? { name: editingBuildOutfit.name, vibes: editingBuildOutfit.vibes || [], weatherTags: editingBuildOutfit.weatherTags || [], pickedBy: editingBuildOutfit.source || "manual" } : { name: "", vibes: [], weatherTags: [], pickedBy: "manual" }); setShowOutfitSave(true); }} style={{
                        padding: "5px 12px", background: "rgba(196,149,106,0.2)",
                        border: "1px solid rgba(196,149,106,0.3)", borderRadius: 16,
                        color: "#c4956a", fontSize: 10, fontFamily: "inherit", cursor: "pointer", letterSpacing: 1,
                      }}>{editingBuildOutfit ? "Save ✨" : "Save 💖"}</button>
                    )}
                    {editingBuildOutfit && (
                      <button onClick={cancelBuildEdit} style={{
                        padding: "5px 12px", background: "rgba(196,149,106,0.06)",
                        border: "1px solid rgba(196,149,106,0.1)", borderRadius: 16,
                        color: "#8a7a6a", fontSize: 10, fontFamily: "inherit", cursor: "pointer",
                      }}>Cancel</button>
                    )}
                    {!editingBuildOutfit && outfit.length > 0 && (
                      <button onClick={() => setOutfit([])} style={{
                        padding: "5px 12px", background: "rgba(196,149,106,0.06)",
                        border: "1px solid rgba(196,149,106,0.1)", borderRadius: 16,
                        color: "#6a5a4a", fontSize: 10, fontFamily: "inherit", cursor: "pointer",
                      }}>Clear</button>
                    )}
                  </div>
                </div>

                {/* Mini item cards — tap to remove */}
                {outfit.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {outfit.map(item => (
                      <div key={item.id} onClick={() => toggleOutfitItem(item)} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: "rgba(196,149,106,0.1)", padding: "4px 10px 4px 4px",
                        borderRadius: 16, fontSize: 11, cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}>
                        {item.photo ? (
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                            background: `url(${item.photo}) center/cover`,
                            border: "1px solid rgba(196,149,106,0.2)",
                          }} />
                        ) : (
                          <div style={{
                            width: 14, height: 14, borderRadius: "50%",
                            background: getColourObj(item.colour).hex,
                            border: "1px solid rgba(255,255,255,0.1)",
                          }} />
                        )}
                        <span style={{ color: "#d4c4b0" }}>{item.name}</span>
                        <span style={{ color: "#6a5a4a", fontSize: 10 }}>{"×"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completeness hints */}
                {outfit.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10 }}>
                    {!outfitCheck.hasFullBody && (
                      <>
                        <span style={{ color: outfitCheck.hasTop ? "#34d399" : "#5a4a3a" }}>
                          {outfitCheck.hasTop ? "✅" : "○"} Top
                        </span>
                        <span style={{ color: outfitCheck.hasBottom ? "#34d399" : "#5a4a3a" }}>
                          {outfitCheck.hasBottom ? "✅" : "○"} Bottom
                        </span>
                      </>
                    )}
                    {outfitCheck.hasFullBody && (
                      <span style={{ color: "#34d399" }}>✅ {outfit.find(i => ["Dress", "Jumpsuit", "Matching Set"].includes(i.category))?.category}</span>
                    )}
                    <span style={{ color: outfitCheck.hasShoes ? "#34d399" : "#5a4a3a" }}>
                      {outfitCheck.hasShoes ? "✅" : "○"} Shoes
                    </span>
                    {outfitHasBase && <ColourScoreBar score={outfitColourScore(outfit)} />}
                  </div>
                )}

                {/* Save form (inline) */}
                {showOutfitSave && (
                  <div style={{ borderTop: "1px solid rgba(196,149,106,0.15)", marginTop: 10, paddingTop: 10 }}>
                    <input type="text" value={outfitForm.name}
                      onChange={e => setOutfitForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={editingBuildOutfit ? editingBuildOutfit.name : `Outfit ${savedOutfits.length + 1}`}
                      style={{ ...inputStyle, marginBottom: 10, padding: "8px 12px", fontSize: 12 }}
                    />
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#6a5a4a", letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Picked by</span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {PICKERS.map(p => (
                          <button key={p.id} onClick={() => setOutfitForm(prev => ({ ...prev, pickedBy: p.id }))} style={{
                            padding: "3px 10px", borderRadius: 14, border: "1px solid",
                            fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                            background: outfitForm.pickedBy === p.id ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                            borderColor: outfitForm.pickedBy === p.id ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                            color: outfitForm.pickedBy === p.id ? "#c4956a" : "#8a7a6a",
                          }}>{p.icon} {p.label}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {VIBES.map(vibe => (
                        <button key={vibe} onClick={() => setOutfitForm(prev => ({
                          ...prev, vibes: prev.vibes.includes(vibe) ? prev.vibes.filter(v => v !== vibe) : [...prev.vibes, vibe],
                        }))} style={{
                          padding: "3px 8px", borderRadius: 12, border: "1px solid",
                          fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                          background: outfitForm.vibes.includes(vibe) ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                          borderColor: outfitForm.vibes.includes(vibe) ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                          color: outfitForm.vibes.includes(vibe) ? "#c4956a" : "#8a7a6a",
                        }}>{vibe}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                      {WEATHERS.map(w => (
                        <button key={w} onClick={() => setOutfitForm(prev => ({
                          ...prev, weatherTags: prev.weatherTags.includes(w) ? prev.weatherTags.filter(t => t !== w) : [...prev.weatherTags, w],
                        }))} style={{
                          padding: "3px 8px", borderRadius: 12, border: "1px solid",
                          fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                          background: outfitForm.weatherTags.includes(w) ? "rgba(106,149,196,0.2)" : "rgba(196,149,106,0.06)",
                          borderColor: outfitForm.weatherTags.includes(w) ? "rgba(106,149,196,0.35)" : "rgba(196,149,106,0.1)",
                          color: outfitForm.weatherTags.includes(w) ? "#7a9ab0" : "#8a7a6a",
                        }}>{WEATHER_EMOJI[w]} {w}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={editingBuildOutfit ? saveBuildEdit : confirmSaveOutfit} style={{
                        flex: 1, padding: 10,
                        background: "linear-gradient(135deg, rgba(196,149,106,0.3), rgba(155,27,48,0.2))",
                        border: "1px solid rgba(196,149,106,0.3)", borderRadius: 10,
                        color: "#c4956a", fontSize: 11, fontFamily: "inherit",
                        letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
                      }}>{editingBuildOutfit ? "Update ✨" : "Save ✨"}</button>
                      <button onClick={() => setShowOutfitSave(false)} style={{
                        padding: "10px 14px", background: "rgba(196,149,106,0.06)",
                        border: "1px solid rgba(196,149,106,0.1)", borderRadius: 10,
                        color: "#8a7a6a", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                      }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Filters ── */}
            {items.length > 0 && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <select value={buildFilter.category} onChange={e => { setBuildFilter(f => ({ ...f, category: e.target.value })); setBuildPage(1); }} style={selectStyle}>
                    <option value="All">All Types</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={buildFilter.colour} onChange={e => { setBuildFilter(f => ({ ...f, colour: e.target.value })); setBuildPage(1); }} style={selectStyle}>
                    <option value="All">All Colours</option>
                    {[...allColours].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <p style={{ fontSize: 11, color: "#6a5a4a", marginBottom: 10 }}>
                  Tap items to {editingBuildOutfit ? "add/remove" : "add"} · {buildItems.length} available
                </p>
              </>
            )}

            {/* ── Item Grid ── */}
            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6a5a4a" }}>
                <p>Add some clothes first, then come back to build outfits! {"✨"}</p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {buildItems.slice(0, buildPage * ITEMS_PER_PAGE).map((item, idx) => (
                    <ItemCard
                      key={item.id} item={item} idx={idx}
                      showSelect onSelect={toggleOutfitItem}
                      selected={!!outfit.find(i => i.id === item.id)}
                    />
                  ))}
                </div>
                {buildPage * ITEMS_PER_PAGE < buildItems.length && (
                  <button onClick={() => setBuildPage(p => p + 1)} style={{
                    width: "100%", padding: 14, marginTop: 16,
                    background: "rgba(196,149,106,0.08)",
                    border: "1px solid rgba(196,149,106,0.15)",
                    borderRadius: 12, color: "#c4956a", fontSize: 13,
                    fontFamily: "inherit", letterSpacing: 1, cursor: "pointer",
                  }}>
                    Show more ({buildItems.length - buildPage * ITEMS_PER_PAGE} remaining) {"🌀"}
                  </button>
                )}
              </>
            )}

          </div>
        )}


        {/* ═══ SAVED OUTFITS ═══ */}
        {view === "savedOutfits" && (
          <div>
            {savedOutfits.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.6 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>{"👗"}</div>
                <p style={{ fontSize: 16, color: "#8a7a6a", marginBottom: 8 }}>
                  No outfits saved yet
                </p>
                <p style={{ fontSize: 13, color: "#6a5a4a" }}>
                  Build one in <strong style={{ color: "#c4956a" }}>{"👗"} Build Outfit</strong> or let the snails surprise you!
                </p>
              </div>
            ) : (
              <>
                {/* Currently Wearing */}
                {(() => {
                  const wearing = savedOutfits.find(o => o.wearingToday);
                  if (!wearing) return null;
                  return (
                    <div
                      onClick={() => setExpandedOutfit(expandedOutfit === wearing.id ? null : wearing.id)}
                      style={{
                        background: "rgba(196,149,106,0.1)", borderRadius: 12,
                        padding: "10px 14px", marginBottom: 12, cursor: "pointer",
                        border: "1px solid rgba(196,149,106,0.2)",
                        display: "flex", alignItems: "center", gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", gap: 3 }}>
                        {wearing.items.slice(0, 5).map(item => (
                          <div key={item.id} style={{
                            width: 12, height: 12, borderRadius: "50%",
                            background: getColourObj(item.colour).hex,
                            border: "1px solid rgba(255,255,255,0.15)",
                          }} />
                        ))}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 11, color: "#8a7a6a", letterSpacing: 0.5 }}>
                          {"👗"} Currently Wearing
                        </p>
                        <p style={{ margin: 0, fontSize: 14, color: "#d4c4b0", fontWeight: 600 }}>
                          {wearing.name}
                        </p>
                      </div>
                      {wearing.timesWorn > 0 && (
                        <span style={{
                          fontSize: 9, padding: "2px 8px", borderRadius: 10,
                          background: "rgba(196,149,106,0.15)", color: "#8a7a6a",
                          letterSpacing: 0.3,
                        }}>worn {wearing.timesWorn}x</span>
                      )}
                    </div>
                  );
                })()}

                {/* Source filter */}
                <div style={{
                  display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10,
                  marginBottom: 12, WebkitOverflowScrolling: "touch",
                }}>
                  {[
                    { id: "All", label: "All Outfits", icon: "" },
                    ...PICKERS.map(p => ({ ...p, label: p.id === "manual" ? "My Outfits" : `${p.label}'s Pick` })),
                    ...SYSTEM_PICKERS.filter((p, i, a) => a.findIndex(x => x.id === p.id) === i).map(p => ({ id: p.id, label: p.label, icon: p.icon })),
                  ].map(f => (
                    <button key={f.id} onClick={() => setOutfitSourceFilter(f.id)} style={{
                      flexShrink: 0, padding: "8px 14px", borderRadius: 20,
                      background: outfitSourceFilter === f.id
                        ? f.id === "claude" ? "rgba(122,176,196,0.2)"
                        : f.id === "chaos" ? "rgba(232,107,107,0.15)"
                        : "rgba(196,149,106,0.2)"
                        : "rgba(196,149,106,0.06)",
                      border: `1px solid ${outfitSourceFilter === f.id
                        ? f.id === "claude" ? "rgba(122,176,196,0.4)"
                        : f.id === "chaos" ? "rgba(232,107,107,0.3)"
                        : "rgba(196,149,106,0.3)"
                        : "rgba(196,149,106,0.1)"}`,
                      color: outfitSourceFilter === f.id
                        ? f.id === "claude" ? "#7ab0c4"
                        : f.id === "chaos" ? "#e86b6b"
                        : "#c4956a"
                        : "#8a7a6a",
                      fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                      letterSpacing: 0.5, transition: "all 0.3s ease",
                    }}>{f.icon} {f.label}</button>
                  ))}
                </div>

                {/* Vibe/weather filters */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  <select value={outfitFilter.vibe} onChange={e => setOutfitFilter(f => ({ ...f, vibe: e.target.value }))} style={{ ...selectStyle, flex: "none", minWidth: 100 }}>
                    <option value="All">All Vibes</option>
                    {VIBES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={outfitFilter.weather} onChange={e => setOutfitFilter(f => ({ ...f, weather: e.target.value }))} style={{ ...selectStyle, flex: "none", minWidth: 100 }}>
                    <option value="All">All Weather</option>
                    {WEATHERS.map(w => <option key={w} value={w}>{WEATHER_EMOJI[w]} {w}</option>)}
                  </select>
                </div>

                <p style={{ fontSize: 11, color: "#6a5a4a", marginBottom: 14 }}>
                  {filteredOutfits.length} of {savedOutfits.length} outfits
                </p>

                {filteredOutfits.length === 0 && (
                  <p style={{ fontSize: 12, color: "#5a4a3a", textAlign: "center", fontStyle: "italic", padding: "30px 0" }}>
                    No outfits match those filters {"🌀"}
                  </p>
                )}

                {/* Outfit cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredOutfits.map((o, idx) => {
                    const isExpanded = expandedOutfit === o.id;
                    const src = o.source || "manual";
                    const allPickerMap = Object.fromEntries([
                      ...PICKERS.map(p => [p.id, { icon: p.icon, label: p.id === "manual" ? "My Outfit" : `${p.label}'s Pick`, color: p.color || "#c4956a" }]),
                      ...SYSTEM_PICKERS.map(p => [p.id, { icon: p.icon, label: p.label, color: p.color }]),
                    ]);
                    const sourceBadge = allPickerMap[src] || { icon: "✨", label: "Outfit", color: "#c4956a" };

                    return (
                      <div key={o.id} style={{
                        background: o.wearingToday ? "rgba(196,149,106,0.1)" : "rgba(196,149,106,0.04)",
                        border: `1px solid ${o.wearingToday ? "rgba(196,149,106,0.35)" : isExpanded ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.1)"}`,
                        borderRadius: 16, overflow: "hidden",
                        transition: "all 0.3s ease",
                        animation: `fadeSlideIn 0.4s ease ${idx * 0.06}s both`,
                        ...(o.wearingToday ? { boxShadow: "0 0 16px rgba(196,149,106,0.12)" } : {}),
                      }}>
                        {/* Collapsed header — always visible */}
                        <div
                          onClick={() => setExpandedOutfit(isExpanded ? null : o.id)}
                          style={{
                            padding: "14px 16px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 12,
                          }}
                        >
                          {/* Colour dots stack */}
                          <div style={{
                            display: "flex", flexDirection: "column", gap: 2,
                            minWidth: 20, alignItems: "center",
                          }}>
                            {o.items.slice(0, 4).map(item => (
                              <div key={item.id} style={{
                                width: 14, height: 14, borderRadius: "50%",
                                background: getColourObj(item.colour).hex,
                                border: "1px solid rgba(255,255,255,0.1)",
                              }} />
                            ))}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <p style={{ fontSize: 15, color: "#d4c4b0", margin: 0, fontWeight: 600 }}>{o.name}</p>
                              <span style={{
                                fontSize: 9, padding: "2px 8px", borderRadius: 10,
                                background: `${sourceBadge.color}20`,
                                color: sourceBadge.color, letterSpacing: 0.5,
                              }}>{sourceBadge.icon} {sourceBadge.label}</span>
                              {o.wearingToday && <span style={{
                                fontSize: 9, padding: "2px 8px", borderRadius: 10,
                                background: "rgba(196,149,106,0.2)", color: "#c4956a",
                                letterSpacing: 0.5,
                              }}>{"👗"} wearing</span>}
                            </div>
                            <p style={{ fontSize: 11, color: "#8a7a6a", margin: 0 }}>
                              {o.items.length} pieces {o.items.map(i => i.category).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
                              {(o.timesWorn || 0) > 0 && ` · worn ${o.timesWorn}x`}
                            </p>
                          </div>
                          {isAuthed && <span
                            onClick={e => { e.stopPropagation(); toggleFavouriteOutfit(o.id); }}
                            style={{
                              fontSize: 16, cursor: "pointer",
                              color: o.isFavourite ? "#c4956a" : "#4a3a2a",
                              transition: "all 0.2s ease",
                            }}
                          >{o.isFavourite ? "⭐" : "☆"}</span>}
                          <span style={{
                            fontSize: 14, color: "#6a5a4a",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                            transition: "transform 0.3s ease",
                          }}>{"▾"}</span>
                        </div>

                        {/* Expanded content — photos & details */}
                        {isExpanded && (
                          <div style={{
                            padding: "0 16px 16px",
                            borderTop: "1px solid rgba(196,149,106,0.1)",
                            animation: "fadeIn 0.3s ease",
                          }}>
                            {/* Edit mode */}
                            {editingOutfitId === o.id ? (
                              <div style={{ paddingTop: 14 }}>
                                <label style={labelStyle}>Outfit Name</label>
                                <input type="text" value={outfitForm.name}
                                  onChange={e => setOutfitForm(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder={o.name} style={inputStyle}
                                />
                                <label style={labelStyle}>Outfit Vibes</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                                  {VIBES.map(vibe => (
                                    <button key={vibe} onClick={() => setOutfitForm(prev => ({
                                      ...prev, vibes: prev.vibes.includes(vibe) ? prev.vibes.filter(v => v !== vibe) : [...prev.vibes, vibe],
                                    }))} style={{
                                      ...chipStyle,
                                      background: outfitForm.vibes.includes(vibe) ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                                      borderColor: outfitForm.vibes.includes(vibe) ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                                      color: outfitForm.vibes.includes(vibe) ? "#c4956a" : "#8a7a6a",
                                    }}>{vibe}</button>
                                  ))}
                                </div>
                                <label style={labelStyle}>Good for which weather?</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                                  {WEATHERS.map(w => (
                                    <button key={w} onClick={() => setOutfitForm(prev => ({
                                      ...prev, weatherTags: prev.weatherTags.includes(w) ? prev.weatherTags.filter(t => t !== w) : [...prev.weatherTags, w],
                                    }))} style={{
                                      ...chipStyle,
                                      background: outfitForm.weatherTags.includes(w) ? "rgba(106,149,196,0.2)" : "rgba(196,149,106,0.06)",
                                      borderColor: outfitForm.weatherTags.includes(w) ? "rgba(106,149,196,0.35)" : "rgba(196,149,106,0.1)",
                                      color: outfitForm.weatherTags.includes(w) ? "#7a9ab0" : "#8a7a6a",
                                    }}>{WEATHER_EMOJI[w]} {w}</button>
                                  ))}
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button onClick={saveEditOutfit} style={{
                                    flex: 1, padding: 12,
                                    background: "linear-gradient(135deg, rgba(196,149,106,0.3), rgba(155,27,48,0.2))",
                                    border: "1px solid rgba(196,149,106,0.3)", borderRadius: 12,
                                    color: "#c4956a", fontSize: 12, fontFamily: "inherit",
                                    letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
                                  }}>Save Changes {"✨"}</button>
                                  <button onClick={cancelEditOutfit} style={{
                                    padding: "12px 16px",
                                    background: "rgba(196,149,106,0.06)",
                                    border: "1px solid rgba(196,149,106,0.1)", borderRadius: 12,
                                    color: "#8a7a6a", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                                  }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Mirror selfie */}
                                {o.selfie ? (
                                  <div style={{ position: "relative", marginBottom: 12, paddingTop: 14 }}>
                                    <img src={o.selfie} alt={`${o.name} selfie`} loading="lazy" style={{
                                      width: "100%", maxHeight: 360, objectFit: "cover",
                                      borderRadius: 12, border: "1px solid rgba(196,149,106,0.2)",
                                    }} />
                                    {isAuthed && <>
                                    <button onClick={() => removeOutfitSelfie(o.id)} style={{
                                      position: "absolute", top: 20, right: 6,
                                      background: "rgba(0,0,0,0.6)", border: "none",
                                      color: "#d4c4b0", padding: "4px 10px", borderRadius: 16,
                                      fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                                    }}>{"×"} Remove selfie</button>
                                    <label style={{
                                      position: "absolute", bottom: 6, right: 6,
                                      background: "rgba(0,0,0,0.6)", border: "none",
                                      color: "#d4c4b0", padding: "4px 10px", borderRadius: 16,
                                      fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                                    }}>
                                      {"🪞"} Replace
                                      <input type="file" accept="image/*" onChange={e => handleOutfitSelfie(o.id, e)} style={{ display: "none" }} />
                                    </label>
                                    </>}
                                  </div>
                                ) : isAuthed ? (
                                  <div style={{ paddingTop: 14, marginBottom: 12 }}>
                                    <label style={{
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      gap: 8, padding: "14px 16px",
                                      background: "rgba(196,149,106,0.04)",
                                      border: "1px dashed rgba(196,149,106,0.2)",
                                      borderRadius: 12, color: "#8a7a6a", fontSize: 12,
                                      cursor: "pointer", transition: "all 0.3s ease",
                                    }}>
                                      {"🪞"} Add mirror selfie
                                      <input type="file" accept="image/*" onChange={e => handleOutfitSelfie(o.id, e)} style={{ display: "none" }} />
                                    </label>
                                  </div>
                                ) : null}

                                {/* Item photo grid — stylist laying clothes on the bed */}
                                <div style={{
                                  display: "grid",
                                  gridTemplateColumns: `repeat(${Math.min(o.items.length, 3)}, 1fr)`,
                                  gap: 10, padding: "14px 0",
                                }}>
                                  {o.items.map(item => (
                                    <div key={item.id} style={{ textAlign: "center" }}>
                                      {item.photo ? (
                                        <img src={item.photo} alt={item.name} style={{
                                          width: "100%", aspectRatio: "1", objectFit: "cover",
                                          borderRadius: 10, border: "1px solid rgba(196,149,106,0.2)",
                                        }} />
                                      ) : (
                                        <div style={{
                                          width: "100%", aspectRatio: "1", borderRadius: 10,
                                          background: getColourObj(item.colour).hex, opacity: 0.7,
                                          border: "1px solid rgba(255,255,255,0.05)",
                                        }} />
                                      )}
                                      <p style={{ fontSize: 10, color: "#a08a70", margin: "6px 0 0", fontWeight: 600 }}>{item.name}</p>
                                      <p style={{ fontSize: 9, color: "#6a5a4a", margin: "1px 0 0", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.category}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* Tags */}
                                {((o.vibes && o.vibes.length > 0) || (o.weatherTags && o.weatherTags.length > 0)) && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                                    {(o.vibes || []).map(v => (
                                      <span key={v} style={{
                                        fontSize: 9, padding: "2px 6px", borderRadius: 10,
                                        background: "rgba(196,149,106,0.15)", color: "#a08a70", letterSpacing: "0.5px",
                                      }}>{v}</span>
                                    ))}
                                    {(o.weatherTags || []).map(w => (
                                      <span key={w} style={{
                                        fontSize: 9, padding: "2px 6px", borderRadius: 10,
                                        background: "rgba(106,149,196,0.12)", color: "#7a9ab0", letterSpacing: "0.3px",
                                      }}>{WEATHER_EMOJI[w]} {w}</span>
                                    ))}
                                  </div>
                                )}

                                {/* Notes */}
                                {o.notes && (
                                  <p style={{
                                    fontSize: 11, color: "#8a7a6a", fontStyle: "italic",
                                    margin: "0 0 10px", lineHeight: 1.5,
                                    padding: "8px 10px", borderRadius: 8,
                                    background: "rgba(196,149,106,0.04)",
                                    borderLeft: "2px solid rgba(196,149,106,0.2)",
                                  }}>{o.notes}</p>
                                )}

                                <ColourScoreBar score={outfitColourScore(o.items)} />

                                {/* Actions — authed only */}
                                {isAuthed && <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                                  <button onClick={() => handleWearToday(o.id)} style={{
                                    flex: 1, padding: "8px 14px",
                                    background: o.wearingToday ? "rgba(196,149,106,0.2)" : "rgba(196,149,106,0.08)",
                                    border: `1px solid ${o.wearingToday ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.15)"}`,
                                    borderRadius: 10,
                                    color: o.wearingToday ? "#c4956a" : "#8a7a6a",
                                    fontSize: 11, fontFamily: "inherit",
                                    cursor: "pointer", letterSpacing: 0.5,
                                    fontWeight: o.wearingToday ? 600 : 400,
                                  }}>{o.wearingToday ? "✨ Wearing Now" : "👗 Wearing This"}</button>
                                  <button onClick={() => startBuildEdit(o)} style={{
                                    flex: 1, padding: "8px 14px",
                                    background: "rgba(196,149,106,0.08)",
                                    border: "1px solid rgba(196,149,106,0.15)", borderRadius: 10,
                                    color: "#8a7a6a", fontSize: 11, fontFamily: "inherit",
                                    cursor: "pointer", letterSpacing: 0.5,
                                  }}>{"✎"} Edit Items</button>
                                  <button onClick={() => requestDeleteOutfit(o.id)} style={{
                                    padding: "8px 14px",
                                    background: "rgba(155,27,48,0.06)",
                                    border: "1px solid rgba(155,27,48,0.12)", borderRadius: 10,
                                    color: "#8a6a6a", fontSize: 11, fontFamily: "inherit",
                                    cursor: "pointer", letterSpacing: 0.5,
                                  }}>{"×"} Remove</button>
                                </div>}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ LAUNDRY ═══ */}
        {view === "laundry" && (
          <div>
            {(() => {
              const laundryItems = items.filter(i => i.inLaundry);
              return laundryItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.6 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>{"🧺"}</div>
                  <p style={{ fontSize: 16, color: "#8a7a6a", marginBottom: 8 }}>
                    Laundry basket is empty!
                  </p>
                  <p style={{ fontSize: 13, color: "#6a5a4a" }}>
                    Everything's clean and ready to wear {"✨"}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: "#8a7a6a", margin: 0 }}>
                      {"🧺"} {laundryItems.length} {laundryItems.length === 1 ? "item" : "items"} in the wash
                    </p>
                    {isAuthed && (
                      <button onClick={laundryDone} style={{
                        padding: "8px 16px",
                        background: "rgba(52,211,153,0.15)",
                        border: "1px solid rgba(52,211,153,0.3)",
                        borderRadius: 20, color: "#34d399", fontSize: 11,
                        fontFamily: "inherit", cursor: "pointer",
                        letterSpacing: 1, transition: "all 0.3s ease",
                      }}>{"✨"} Laundry Done!</button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    {laundryItems.map((item, idx) => (
                      <ItemCard key={item.id} item={item} onLaundry={isAuthed ? toggleLaundry : undefined} onFavourite={isAuthed ? toggleFavouriteItem : undefined} idx={idx} />
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ═══ WEEKLY PICKS ═══ */}
        {view === "weeklyPicks" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, color: "#c4956a", margin: 0, letterSpacing: 2, textTransform: "uppercase", fontWeight: 400 }}>
                {"📆"} Weekly Picks
              </h2>
              {isAuthed && !showNewCategory && (
                <button onClick={() => setShowNewCategory(true)} style={{
                  padding: "6px 14px", background: "rgba(196,149,106,0.2)",
                  border: "1px solid rgba(196,149,106,0.3)", borderRadius: 20,
                  color: "#c4956a", fontSize: 11, fontFamily: "inherit", cursor: "pointer", letterSpacing: 1,
                }}>+ Category</button>
              )}
            </div>

            {/* New category form */}
            {showNewCategory && (
              <div style={{
                background: "rgba(196,149,106,0.06)", border: "1px solid rgba(196,149,106,0.15)",
                borderRadius: 12, padding: 14, marginBottom: 16,
              }}>
                <input type="text" value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Category name (e.g. Nail Polish, Watches...)"
                  style={{ ...inputStyle, marginBottom: 10, padding: "8px 12px", fontSize: 12 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={async () => {
                    if (!newCategoryName.trim()) return;
                    const res = await createWeeklyCategory({ name: newCategoryName.trim(), overlaySupport: false });
                    if (res) {
                      setWeeklyPicks(prev => [...prev, res.category || { id: Date.now(), name: newCategoryName.trim(), items: [] }]);
                      showToast(`${newCategoryName.trim()} created! ✨`);
                    }
                    setNewCategoryName("");
                    setShowNewCategory(false);
                  }} style={{
                    flex: 1, padding: 10, background: "rgba(196,149,106,0.2)",
                    border: "1px solid rgba(196,149,106,0.3)", borderRadius: 10,
                    color: "#c4956a", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                  }}>Create {"✨"}</button>
                  <button onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }} style={{
                    padding: "10px 14px", background: "rgba(196,149,106,0.06)",
                    border: "1px solid rgba(196,149,106,0.1)", borderRadius: 10,
                    color: "#8a7a6a", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                  }}>Cancel</button>
                </div>
              </div>
            )}

            {weeklyPicks.length === 0 && !showNewCategory && (
              <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.6 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>{"📆"}</div>
                <p style={{ fontSize: 16, color: "#8a7a6a", marginBottom: 8 }}>No weekly picks yet</p>
                <p style={{ fontSize: 13, color: "#6a5a4a" }}>
                  Create a category for things you rotate weekly — nail polish, watches, bags, whatever you care about!
                </p>
              </div>
            )}

            {/* Category sub-lozenges */}
            {weeklyPicks.length > 1 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
                <button onClick={() => { setWeeklyPicksCatFilter(null); setWeeklyColourFilter("All"); }} style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: 20,
                  background: weeklyPicksCatFilter === null ? "rgba(196,149,106,0.2)" : "rgba(196,149,106,0.06)",
                  border: `1px solid ${weeklyPicksCatFilter === null ? "rgba(196,149,106,0.3)" : "rgba(196,149,106,0.1)"}`,
                  color: weeklyPicksCatFilter === null ? "#c4956a" : "#8a7a6a",
                  fontSize: 11, fontFamily: "inherit", cursor: "pointer", letterSpacing: 0.5,
                }}>All ({weeklyPicks.reduce((n, c) => n + c.items.length, 0)})</button>
                {weeklyPicks.map(c => (
                  <button key={c.id} onClick={() => { setWeeklyPicksCatFilter(weeklyPicksCatFilter === c.id ? null : c.id); setWeeklyColourFilter("All"); }} style={{
                    flexShrink: 0, padding: "8px 14px", borderRadius: 20,
                    background: weeklyPicksCatFilter === c.id ? "rgba(196,149,106,0.2)" : "rgba(196,149,106,0.06)",
                    border: `1px solid ${weeklyPicksCatFilter === c.id ? "rgba(196,149,106,0.3)" : "rgba(196,149,106,0.1)"}`,
                    color: weeklyPicksCatFilter === c.id ? "#c4956a" : "#8a7a6a",
                    fontSize: 11, fontFamily: "inherit", cursor: "pointer", letterSpacing: 0.5,
                  }}>{c.name} ({c.items.length})</button>
                ))}
              </div>
            )}

            {/* Category sections */}
            {weeklyPicks.filter(cat => weeklyPicksCatFilter === null || cat.id === weeklyPicksCatFilter).map(cat => {
              const activeItems = cat.items.filter(i => i.active);
              return (
                <div key={cat.id} style={{
                  background: "rgba(196,149,106,0.04)",
                  border: "1px solid rgba(196,149,106,0.1)",
                  borderRadius: 16, padding: 16, marginBottom: 16,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, color: "#c4956a", margin: 0, letterSpacing: 1, fontWeight: 600 }}>
                      {cat.name} ({cat.items.length})
                    </h3>
                    {isAuthed && (
                      <button onClick={() => setShowAddWeeklyItem(showAddWeeklyItem === cat.id ? null : cat.id)} style={{
                        padding: "4px 10px", background: "rgba(196,149,106,0.15)",
                        border: "1px solid rgba(196,149,106,0.2)", borderRadius: 14,
                        color: "#c4956a", fontSize: 10, fontFamily: "inherit", cursor: "pointer",
                      }}>{showAddWeeklyItem === cat.id ? "Cancel" : "+ Add"}</button>
                    )}
                  </div>

                  {/* Currently using */}
                  {activeItems.length > 0 && (
                    <div style={{
                      background: "rgba(196,149,106,0.1)", borderRadius: 10,
                      padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#d4c4b0",
                    }}>
                      {"✨"} Currently using: <strong>{activeItems.map(i => i.name).join(" + ")}</strong>
                    </div>
                  )}

                  {/* Add item form */}
                  {showAddWeeklyItem === cat.id && (
                    <div style={{
                      background: "rgba(196,149,106,0.06)", border: "1px solid rgba(196,149,106,0.15)",
                      borderRadius: 10, padding: 12, marginBottom: 12,
                    }}>
                      <input type="text" value={newWeeklyItem.name}
                        onChange={e => setNewWeeklyItem(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Name" style={{ ...inputStyle, marginBottom: 8, padding: "6px 10px", fontSize: 11 }}
                      />
                      {/* Photo upload */}
                      <div style={{ marginBottom: 8 }}>
                        {newWeeklyItem.photo ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <img src={newWeeklyItem.photo} alt="preview" style={{
                              width: 48, height: 48, objectFit: "cover", borderRadius: 6,
                              border: "1px solid rgba(196,149,106,0.2)",
                            }} />
                            <button onClick={() => setNewWeeklyItem(prev => ({ ...prev, photo: "" }))} style={{
                              padding: "4px 10px", background: "rgba(196,149,106,0.1)",
                              border: "1px solid rgba(196,149,106,0.15)", borderRadius: 10,
                              color: "#8a7a6a", fontSize: 10, fontFamily: "inherit", cursor: "pointer",
                            }}>Remove</button>
                          </div>
                        ) : (
                          <label style={{
                            display: "inline-block", padding: "5px 12px", background: "rgba(196,149,106,0.1)",
                            border: "1px solid rgba(196,149,106,0.15)", borderRadius: 10,
                            color: "#8a7a6a", fontSize: 10, fontFamily: "inherit", cursor: "pointer",
                          }}>
                            {"📷"} Add photo
                            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => setNewWeeklyItem(prev => ({ ...prev, photo: reader.result }));
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <input type="text" value={newWeeklyItem.colourFamily}
                          onChange={e => setNewWeeklyItem(prev => ({ ...prev, colourFamily: e.target.value }))}
                          placeholder="Colour / group (optional)" style={{ ...inputStyle, marginBottom: 0, padding: "6px 10px", fontSize: 11, flex: 1 }}
                        />
                        <input type="text" value={newWeeklyItem.type}
                          onChange={e => setNewWeeklyItem(prev => ({ ...prev, type: e.target.value }))}
                          placeholder="Type (optional)" style={{ ...inputStyle, marginBottom: 0, padding: "6px 10px", fontSize: 11, flex: 1 }}
                        />
                      </div>
                      <input type="text" value={newWeeklyItem.description}
                        onChange={e => setNewWeeklyItem(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)" style={{ ...inputStyle, marginBottom: 8, padding: "6px 10px", fontSize: 11 }}
                      />
                      <button onClick={async () => {
                        if (!newWeeklyItem.name.trim()) { showToast("Give it a name! 🐌"); return; }
                        const res = await addWeeklyItem(cat.id, newWeeklyItem);
                        if (res) {
                          setWeeklyPicks(prev => prev.map(c => c.id === cat.id
                            ? { ...c, items: [...c.items, res.item || { ...newWeeklyItem, id: Date.now(), active: false }] }
                            : c
                          ));
                          showToast(`${newWeeklyItem.name} added! ✨`);
                        }
                        setNewWeeklyItem({ name: "", colourFamily: "", type: "", description: "", photo: "" });
                        setShowAddWeeklyItem(null);
                      }} style={{
                        width: "100%", padding: 8, background: "rgba(196,149,106,0.2)",
                        border: "1px solid rgba(196,149,106,0.3)", borderRadius: 10,
                        color: "#c4956a", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                      }}>Add {"✨"}</button>
                    </div>
                  )}

                  {/* Colour family filter */}
                  {cat.items.length > 6 && (() => {
                    const families = [...new Set(cat.items.map(i => i.colourFamily).filter(Boolean))].sort();
                    return (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                        <button onClick={() => setWeeklyColourFilter("All")} style={{
                          padding: "3px 10px", borderRadius: 14, border: "1px solid",
                          fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                          background: weeklyColourFilter === "All" ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                          borderColor: weeklyColourFilter === "All" ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                          color: weeklyColourFilter === "All" ? "#c4956a" : "#8a7a6a",
                        }}>All</button>
                        {families.map(f => {
                          const count = cat.items.filter(i => i.colourFamily === f).length;
                          return (
                            <button key={f} onClick={() => setWeeklyColourFilter(weeklyColourFilter === f ? "All" : f)} style={{
                              padding: "3px 10px", borderRadius: 14, border: "1px solid",
                              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                              display: "flex", alignItems: "center", gap: 4,
                              background: weeklyColourFilter === f ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                              borderColor: weeklyColourFilter === f ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                              color: weeklyColourFilter === f ? "#c4956a" : "#8a7a6a",
                            }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                                background: {
                                  Pink:"#d4748a", Red:"#c43a3a", "Coral & Orange":"#e8a87c", Purple:"#6a3d7a",
                                  Blue:"#4a6a8a", Teal:"#2a7a7a", Green:"#4a7a4a", Neutral:"#a09080",
                                  Yellow:"#d4b83a", Fuchsia:"#c43a7a", Dark:"#2a2a2a", Metallic:"#c4a43a",
                                  Shimmer:"#7ab0c4", Overlay:"linear-gradient(135deg,#c4956a,#7ab0c4)",
                                }[f] || "#8a7a6a",
                                border: "1px solid rgba(255,255,255,0.2)",
                              }} />
                              {f} ({count})
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Item grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                    {cat.items.filter(i => weeklyColourFilter === "All" || i.colourFamily === weeklyColourFilter).map(item => {
                      const swatchColour = {
                        Pink:"#d4748a", Red:"#c43a3a", "Coral & Orange":"#e8a87c", Purple:"#6a3d7a",
                        Blue:"#4a6a8a", Teal:"#2a7a7a", Green:"#4a7a4a", Neutral:"#a09080",
                        Yellow:"#d4b83a", Fuchsia:"#c43a7a", Dark:"#2a2a2a", Metallic:"#c4a43a",
                        Shimmer:"#7ab0c4", Overlay:"#c4956a",
                      }[item.colourFamily] || "#8a7a6a";
                      return (
                      <div key={item.id}
                        onClick={isAuthed ? async () => {
                          const prev = [...weeklyPicks];
                          // Multi-active: just toggle this item independently
                          setWeeklyPicks(wps => wps.map(c => c.id !== cat.id ? c : {
                            ...c,
                            items: c.items.map(i => i.id === item.id ? { ...i, active: !i.active } : i),
                          }));
                          const ok = await toggleWeeklyItem(cat.id, item.id);
                          if (!ok) setWeeklyPicks(prev);
                        } : undefined}
                        style={{
                          background: item.active ? "rgba(196,149,106,0.18)" : "rgba(196,149,106,0.04)",
                          border: `1px solid ${item.active ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)"}`,
                          borderRadius: 10, padding: 10, cursor: isAuthed ? "pointer" : "default",
                          transition: "all 0.3s ease", textAlign: "center",
                        }}
                      >
                        {item.active && <div style={{ fontSize: 8, color: "#c4956a", marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>{"✨"} active</div>}
                        {item.photo ? (
                          <img src={item.photo} alt={item.name} style={{
                            width: "100%", height: 48, objectFit: "cover", borderRadius: 6,
                            marginBottom: 6, border: "1px solid rgba(196,149,106,0.15)",
                            boxShadow: item.active ? "0 0 8px rgba(196,149,106,0.3)" : "none",
                          }} />
                        ) : (
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", margin: "0 auto 6px",
                          background: item.type === "Overlay" ? `linear-gradient(135deg, ${swatchColour}, #7ab0c4)` : swatchColour,
                          border: "2px solid rgba(255,255,255,0.15)",
                          boxShadow: item.active ? `0 0 8px ${swatchColour}50` : "none",
                        }} />
                        )}
                        <p style={{ fontSize: 12, color: "#d4c4b0", margin: "0 0 2px", fontWeight: item.active ? 600 : 400 }}>{item.name}</p>
                        {(item.colourFamily || item.type) && (
                        <p style={{ fontSize: 9, color: "#8a7a6a", margin: 0 }}>
                          {[item.colourFamily, item.type].filter(Boolean).join(" · ")}
                        </p>
                        )}
                        {item.description && (
                          <p style={{ fontSize: 9, color: "#6a5a4a", margin: "2px 0 0", fontStyle: "italic" }}>{item.description}</p>
                        )}
                        {isAuthed && (
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <span
                              onClick={async e => {
                                e.stopPropagation();
                                const prev = [...weeklyPicks];
                                setWeeklyPicks(wps => wps.map(c => c.id !== cat.id ? c : {
                                  ...c, items: c.items.map(i => i.id === item.id ? { ...i, isFavourite: !i.isFavourite } : i),
                                }));
                                const ok = await toggleWeeklyItemFavourite(cat.id, item.id);
                                if (!ok) setWeeklyPicks(prev);
                              }}
                              style={{
                                fontSize: 12, cursor: "pointer",
                                color: item.isFavourite ? "#c4956a" : "#4a3a2a",
                                transition: "all 0.2s ease",
                              }}
                            >{item.isFavourite ? "⭐" : "☆"}</span>
                            <span
                              onClick={e => {
                                e.stopPropagation();
                                setEditingWeeklyItem({ catId: cat.id, item: { ...item } });
                              }}
                              style={{ fontSize: 10, cursor: "pointer", color: "#6a5a4a", transition: "all 0.2s ease" }}
                              title="Edit"
                            >{"✏️"}</span>
                            <span
                              onClick={async e => {
                                e.stopPropagation();
                                if (!confirm(`Delete "${item.name}"?`)) return;
                                const prev = [...weeklyPicks];
                                setWeeklyPicks(wps => wps.map(c => c.id !== cat.id ? c : {
                                  ...c, items: c.items.filter(i => i.id !== item.id),
                                }));
                                const ok = await deleteWeeklyItem(cat.id, item.id);
                                if (ok) {
                                  showToast(`${item.name} removed 🗑️`);
                                } else {
                                  setWeeklyPicks(prev);
                                }
                              }}
                              style={{ fontSize: 10, cursor: "pointer", color: "#6a5a4a", transition: "all 0.2s ease" }}
                              title="Delete"
                            >{"🗑️"}</span>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ EDIT WEEKLY ITEM MODAL ═══ */}
        {editingWeeklyItem && (
          <div onClick={() => setEditingWeeklyItem(null)} style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "#1a1410", border: "1px solid rgba(196,149,106,0.3)",
              borderRadius: 16, padding: 20, width: "100%", maxWidth: 360,
            }}>
              <h3 style={{ color: "#c4956a", fontSize: 14, margin: "0 0 16px", letterSpacing: 1 }}>{"✏️"} Edit Item</h3>
              {editingWeeklyItem.item.photo ? (
                <div style={{ marginBottom: 10, textAlign: "center", position: "relative" }}>
                  <img src={editingWeeklyItem.item.photo} alt="preview" style={{
                    maxHeight: 80, borderRadius: 8, border: "1px solid rgba(196,149,106,0.2)",
                  }} />
                  <button onClick={() => setEditingWeeklyItem(prev => ({ ...prev, item: { ...prev.item, photo: "" } }))} style={{
                    position: "absolute", top: -6, right: "calc(50% - 46px)", background: "rgba(196,149,106,0.3)",
                    border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10,
                    cursor: "pointer", color: "#d4c4b0", lineHeight: "18px",
                  }}>{"✕"}</button>
                </div>
              ) : (
                <label style={{
                  display: "block", marginBottom: 10, padding: "8px 10px",
                  background: "rgba(196,149,106,0.06)", border: "1px solid rgba(196,149,106,0.15)",
                  borderRadius: 8, fontSize: 11, color: "#8a7a6a", cursor: "pointer", textAlign: "center",
                }}>
                  {"📷"} Add photo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setEditingWeeklyItem(prev => ({ ...prev, item: { ...prev.item, photo: reader.result } }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              )}
              <input type="text" value={editingWeeklyItem.item.name}
                onChange={e => setEditingWeeklyItem(prev => ({ ...prev, item: { ...prev.item, name: e.target.value } }))}
                placeholder="Name" style={{ ...inputStyle, marginBottom: 8, padding: "8px 10px", fontSize: 12, width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input type="text" value={editingWeeklyItem.item.colourFamily || ""}
                  onChange={e => setEditingWeeklyItem(prev => ({ ...prev, item: { ...prev.item, colourFamily: e.target.value } }))}
                  placeholder="Colour / group (optional)" style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: 11 }}
                />
                <input type="text" value={editingWeeklyItem.item.type || ""}
                  onChange={e => setEditingWeeklyItem(prev => ({ ...prev, item: { ...prev.item, type: e.target.value } }))}
                  placeholder="Type (optional)" style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: 11 }}
                />
              </div>
              <input type="text" value={editingWeeklyItem.item.description || ""}
                onChange={e => setEditingWeeklyItem(prev => ({ ...prev, item: { ...prev.item, description: e.target.value } }))}
                placeholder="Description (optional)" style={{ ...inputStyle, marginBottom: 12, padding: "6px 10px", fontSize: 11, width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditingWeeklyItem(null)} style={{
                  flex: 1, padding: 8, background: "rgba(196,149,106,0.06)",
                  border: "1px solid rgba(196,149,106,0.15)", borderRadius: 10,
                  color: "#8a7a6a", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                }}>Cancel</button>
                <button onClick={async () => {
                  if (!editingWeeklyItem.item.name.trim()) { showToast("Give it a name! 🐌"); return; }
                  const { catId, item } = editingWeeklyItem;
                  const prev = [...weeklyPicks];
                  setWeeklyPicks(wps => wps.map(c => c.id !== catId ? c : {
                    ...c, items: c.items.map(i => i.id === item.id ? { ...item } : i),
                  }));
                  const res = await updateWeeklyItem(catId, item);
                  if (res) {
                    // Use server's item (has extracted photo path) if available
                    if (res.item) {
                      setWeeklyPicks(wps => wps.map(c => c.id !== catId ? c : {
                        ...c, items: c.items.map(i => i.id === item.id ? { ...res.item } : i),
                      }));
                    }
                    showToast(`${item.name} updated! ✨`);
                  } else {
                    setWeeklyPicks(prev);
                    showToast("Update failed 😿");
                  }
                  setEditingWeeklyItem(null);
                }} style={{
                  flex: 1, padding: 8, background: "rgba(196,149,106,0.2)",
                  border: "1px solid rgba(196,149,106,0.3)", borderRadius: 10,
                  color: "#c4956a", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                }}>Save {"✨"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SURPRISE ME SETUP ═══ */}
        {view === "surpriseSetup" && (
          <div style={{
            background: "rgba(196,149,106,0.04)",
            border: "1px solid rgba(196,149,106,0.1)",
            borderRadius: 16, padding: 24,
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{"\uD83D\uDC0C\u2728"}</div>
              <h2 style={{
                fontSize: 18, color: "#c4956a", fontWeight: 400,
                letterSpacing: 2, margin: "0 0 4px",
              }}>Surprise Me</h2>
              <p style={{ fontSize: 11, color: "#6a5a4a", fontStyle: "italic" }}>
                Tell the snails what kind of day it is
              </p>
            </div>

            {/* Chaos vs Smart toggle */}
            <div style={{
              display: "flex", gap: 8, marginBottom: 24,
              background: "rgba(196,149,106,0.06)",
              borderRadius: 24, padding: 4,
            }}>
              <button onClick={() => setChaosMode(false)} style={{
                flex: 1, padding: "10px 16px", borderRadius: 20,
                background: !chaosMode ? "rgba(196,149,106,0.25)" : "transparent",
                border: "none", color: !chaosMode ? "#c4956a" : "#6a5a4a",
                fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                letterSpacing: 1, transition: "all 0.3s ease",
              }}>{"\uD83C\uDF1F"} Smart Mode</button>
              <button onClick={() => setChaosMode(true)} style={{
                flex: 1, padding: "10px 16px", borderRadius: 20,
                background: chaosMode ? "rgba(155,27,48,0.25)" : "transparent",
                border: "none", color: chaosMode ? "#e86b6b" : "#6a5a4a",
                fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                letterSpacing: 1, transition: "all 0.3s ease",
              }}>{"\uD83D\uDD25"} Chaos Mode</button>
            </div>

            {chaosMode ? (
              <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
                <p style={{ fontSize: 14, color: "#e86b6b", marginBottom: 8, fontStyle: "italic" }}>
                  No rules. No colour theory. No mercy.
                </p>
                <p style={{ fontSize: 11, color: "#6a5a4a" }}>
                  The snails will choose pure chaos {"\uD83C\uDF00"}
                </p>
              </div>
            ) : (
              <>
                {/* Weather */}
                <label style={labelStyle}>Weather</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                  {WEATHERS.map(w => (
                    <button key={w} onClick={() => setSurpriseWeather(w)} style={{
                      ...chipStyle,
                      background: surpriseWeather === w ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                      borderColor: surpriseWeather === w ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                      color: surpriseWeather === w ? "#c4956a" : "#8a7a6a",
                    }}>{WEATHER_EMOJI[w]} {w}</button>
                  ))}
                </div>

                {/* Vibe */}
                <label style={labelStyle}>What kind of day?</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                  <button onClick={() => setSurpriseVibe(null)} style={{
                    ...chipStyle,
                    background: !surpriseVibe ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                    borderColor: !surpriseVibe ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                    color: !surpriseVibe ? "#c4956a" : "#8a7a6a",
                  }}>Any vibe</button>
                  {SURPRISE_VIBES.map(v => (
                    <button key={v} onClick={() => setSurpriseVibe(v)} style={{
                      ...chipStyle,
                      background: surpriseVibe === v ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.06)",
                      borderColor: surpriseVibe === v ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.1)",
                      color: surpriseVibe === v ? "#c4956a" : "#8a7a6a",
                    }}>{v}</button>
                  ))}
                </div>

                {/* Comfort Mode (Crimson Moon) \u2014 configurable */}
                {COMFORT_MODE.enabled && (
                <div
                  onClick={() => setCrimsonMoon(!crimsonMoon)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", marginBottom: 20,
                    background: crimsonMoon ? "rgba(155,27,48,0.15)" : "rgba(196,149,106,0.04)",
                    border: `1px solid ${crimsonMoon ? "rgba(155,27,48,0.3)" : "rgba(196,149,106,0.1)"}`,
                    borderRadius: 12, cursor: "pointer", transition: "all 0.3s ease",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: crimsonMoon
                      ? "radial-gradient(circle at 40% 35%, #c43a3a, #7a1a2a)"
                      : "rgba(196,149,106,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, transition: "all 0.3s ease",
                  }}>{COMFORT_MODE.icon}</div>
                  <div>
                    <p style={{
                      fontSize: 13, margin: 0,
                      color: crimsonMoon ? "#e86b6b" : "#8a7a6a",
                      fontWeight: crimsonMoon ? 600 : 400,
                    }}>{COMFORT_MODE.name}</p>
                    <p style={{ fontSize: 10, margin: "2px 0 0", color: "#5a4a3a" }}>
                      {COMFORT_MODE.description}
                    </p>
                  </div>
                  <div style={{
                    marginLeft: "auto", width: 40, height: 22, borderRadius: 11,
                    background: crimsonMoon ? "rgba(155,27,48,0.5)" : "rgba(196,149,106,0.15)",
                    position: "relative", transition: "all 0.3s ease",
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: crimsonMoon ? "#e86b6b" : "#6a5a4a",
                      position: "absolute", top: 2,
                      left: crimsonMoon ? 20 : 2,
                      transition: "all 0.3s ease",
                    }} />
                  </div>
                </div>
                )}
              </>
            )}

            {/* Generate button */}
            <button onClick={generateSurprise} style={{
              width: "100%", padding: 16,
              background: chaosMode
                ? "linear-gradient(135deg, rgba(155,27,48,0.4), rgba(232,107,107,0.2))"
                : "linear-gradient(135deg, rgba(196,149,106,0.3), rgba(155,27,48,0.2))",
              border: `1px solid ${chaosMode ? "rgba(155,27,48,0.4)" : "rgba(196,149,106,0.3)"}`,
              borderRadius: 12, color: chaosMode ? "#e86b6b" : "#c4956a",
              fontSize: 15, fontFamily: "inherit", letterSpacing: 2,
              textTransform: "uppercase", cursor: "pointer", transition: "all 0.3s ease",
            }}>
              {chaosMode ? "\uD83D\uDD25 Unleash Chaos \uD83D\uDD25" : "\uD83C\uDF00 Generate Outfit"}
            </button>
          </div>
        )}

        {/* ═══ SURPRISE RESULT ═══ */}
        {view === "surprise" && (
          <div style={{ textAlign: "center" }}>
            {surpriseResult ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {surpriseResult.structure === "chaos" ? "\uD83D\uDD25\uD83D\uDC0C\uD83D\uDD25" : "\uD83D\uDC0C\u2728"}
                </div>
                <h2 style={{
                  fontSize: 18, color: surpriseResult.structure === "chaos" ? "#e86b6b" : "#c4956a",
                  fontWeight: 400, letterSpacing: 2, margin: "0 0 4px",
                }}>
                  {surpriseResult.structure === "chaos" ? "Chaos Has Spoken" : "Today's Shimmer"}
                </h2>
                <p style={{ fontSize: 11, color: "#6a5a4a", marginBottom: 8, fontStyle: "italic" }}>
                  {surpriseResult.chaosMessage || "The snails have spoken"}
                </p>
                {crimsonMoon && surpriseResult.structure !== "chaos" && (
                  <p style={{ fontSize: 10, color: "#9b1b30", marginBottom: 8 }}>
                    {"\uD83C\uDF19"} crimson moon mode {"\u00B7"} comfort first {"\uD83D\uDC96"}
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", marginTop: 16 }}>
                  {surpriseResult.items.map((item, idx) => (
                    <div key={item.id} style={{
                      background: "rgba(196,149,106,0.08)",
                      border: "1px solid rgba(196,149,106,0.15)",
                      borderRadius: 12, padding: "14px 20px",
                      width: "100%", maxWidth: 350,
                      display: "flex", alignItems: "center", gap: 12,
                      animation: `fadeSlideIn 0.5s ease ${idx * 0.15}s both`,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: item.photo ? `url(${item.photo}) center/cover` : getColourObj(item.colour).hex,
                        border: "1px solid rgba(196,149,106,0.2)",
                      }} />
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: 14, margin: 0, color: "#d4c4b0" }}>{item.name}</p>
                        <p style={{
                          fontSize: 10, margin: "2px 0 0", color: "#8a7a6a",
                          textTransform: "uppercase", letterSpacing: 1,
                        }}>
                          {item.category} {"\u00B7"} {item.colour}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <ColourScoreBar score={surpriseResult.colourScore} />

                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
                  <button onClick={() => setView("surpriseSetup")} style={{
                    padding: "12px 20px",
                    background: "rgba(196,149,106,0.1)",
                    border: "1px solid rgba(196,149,106,0.2)",
                    borderRadius: 24, color: "#8a7a6a", fontSize: 12,
                    fontFamily: "inherit", letterSpacing: 1,
                    textTransform: "uppercase", cursor: "pointer",
                  }}>{"\u2190"} Settings</button>
                  {isAuthed && <button onClick={saveSurpriseOutfit} style={{
                    padding: "12px 22px",
                    background: surpriseResult.structure === "chaos"
                      ? "rgba(155,27,48,0.15)" : "rgba(196,149,106,0.2)",
                    border: `1px solid ${surpriseResult.structure === "chaos"
                      ? "rgba(155,27,48,0.25)" : "rgba(196,149,106,0.3)"}`,
                    borderRadius: 24,
                    color: surpriseResult.structure === "chaos" ? "#e86b6b" : "#c4956a",
                    fontSize: 12, fontFamily: "inherit", letterSpacing: 1,
                    textTransform: "uppercase", cursor: "pointer",
                  }}>{surpriseResult.structure === "chaos" ? "\uD83D\uDD25 Save This" : "\uD83D\uDC0C Save This"}</button>}
                  <button onClick={generateSurprise} style={{
                    padding: "12px 22px",
                    background: surpriseResult.structure === "chaos"
                      ? "rgba(155,27,48,0.2)" : "rgba(196,149,106,0.15)",
                    border: `1px solid ${surpriseResult.structure === "chaos"
                      ? "rgba(155,27,48,0.3)" : "rgba(196,149,106,0.25)"}`,
                    borderRadius: 24,
                    color: surpriseResult.structure === "chaos" ? "#e86b6b" : "#c4956a",
                    fontSize: 12, fontFamily: "inherit", letterSpacing: 1,
                    textTransform: "uppercase", cursor: "pointer",
                  }}>{"\uD83C\uDF00"} Spin Again</button>
                </div>
              </>
            ) : (
              <div style={{ padding: 40, color: "#6a5a4a" }}>
                <p>Add some items first, then let the snails choose! {"\uD83D\uDC0C"}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(26,20,16,0.85)",
          border: "1px solid rgba(196,149,106,0.3)",
          color: "#c4956a", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          transition: "all 0.3s ease", zIndex: 50,
        }}
      >{"↑"}</button>

      {/* CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        select:focus, input:focus { outline: none; border-color: rgba(196,149,106,0.4) !important; }
        button:active { transform: scale(0.97); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(196,149,106,0.2); border-radius: 4px; }
        @media (max-width: 400px) {
          h1 { font-size: 22px !important; letter-spacing: 2px !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Shared styles ───
const selectStyle = {
  background: "rgba(196,149,106,0.06)",
  border: "1px solid rgba(196,149,106,0.15)",
  color: "#a08a70", padding: "8px 12px", borderRadius: 8,
  fontSize: 11, fontFamily: "'Quicksand', Georgia, serif",
  flex: 1, minWidth: 0, cursor: "pointer",
};

const inputStyle = {
  width: "100%",
  background: "rgba(196,149,106,0.06)",
  border: "1px solid rgba(196,149,106,0.15)",
  color: "#d4c4b0", padding: "12px 14px", borderRadius: 10,
  fontSize: 14, fontFamily: "'Quicksand', Georgia, serif",
  marginBottom: 20, boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontSize: 10, letterSpacing: 2,
  textTransform: "uppercase", color: "#8a7a6a",
  marginBottom: 8, fontWeight: 400,
};

const chipStyle = {
  padding: "6px 14px", borderRadius: 20, border: "1px solid",
  fontSize: 11, cursor: "pointer",
  fontFamily: "'Quicksand', Georgia, serif",
  transition: "all 0.2s ease", letterSpacing: "0.5px",
};
