import { useState, useEffect, useCallback } from "react";
import {
  loadItems, saveItems, loadOutfits, saveOutfits,
  fetchAllData, addItemToServer, updateItemOnServer, removeItemFromServer,
  addOutfitToServer, updateOutfitOnServer, removeOutfitFromServer,
  addColourToServer, removeColourFromServer,
} from "./storage.js";
import { COLOURS, getAllColours, getColourObj, outfitColourScore, loadCustomColours, saveCustomColours, guessWarmth } from "./colours.js";
import { generateBestOutfit, generateChaosOutfit } from "./outfitEngine.js";

const CATEGORIES = [
  "Top", "Bottom", "Dress", "Matching Set", "Jumpsuit", "Pyjamas", "Jacket", "Shoes", "Accessory", "Bag", "Hat", "Jewellery",
];

const VIBES = [
  "Everyday", "London Office", "London Adventure", "Goat Farm", "Date Night",
  "Apocalypse Ready", "Codeineificated", "Spiral Queen", "Cosy Cocoon",
  "Festival", "Fancy", "Holiday Beach", "Day Off Staying In",
  "Smart Occasion",
];

const WEATHERS = ["Hot", "Warm", "Mild", "Cold", "Rainy"];

const WEATHER_EMOJI = {
  "Hot": "\u2600\uFE0F", "Warm": "\uD83C\uDF24\uFE0F", "Mild": "\u26C5",
  "Cold": "\u2744\uFE0F", "Rainy": "\uD83C\uDF27\uFE0F",
};

const SURPRISE_VIBES = [
  "Cosy", "Evening Out", "Day Off Staying In", "London Office",
  "London Adventure", "Farm Visit", "Holiday Beach",
  "Smart Occasion (Sad)", "Smart Occasion (Happy)",
];

const LOCATIONS = [
  "Flumpasaurus Guarded Basket", "Jumpers Box", "Six-Drawer Chest",
  "Skylight Tallboy", "Three-Drawer Chest", "Spiral Cocoon Door",
  "Carved Chest", "Bag Basket", "Shoe Storage",
  "Tanks Tubes & Vests Basket", "Fishcat's Wardrobe",
];

const FISHCAT_BLOCKED = ["Fishcat's Wardrobe"];

const SNAIL_NAMES = [
  "The Audacity", "Hold My Prosecco", "The Snail Has Spoken",
  "Trust The Shell", "Slime & Shine", "Spiral Intentions",
  "Shell Yeah", "Slow Fashion", "The Gastropod Glow",
  "Snail Mail Special", "Trail Blazer", "Shimmer Slither",
  "The Shell Game", "Spiral Instinct", "The Slow Burn",
  "Antenna Approved", "The Mucus Muse", "Shell Shocked",
  "Gastropod Glamour", "Slime Time", "The Spiral Decides",
];

const CHAOS_NAMES = [
  "Chaos Theory", "The Algorithm Dared", "Colour Crime Scene",
  "Fashion Emergency", "The Eyes Need Sunglasses", "Wardrobe Malfunction",
  "Controlled Explosion", "Beautiful Disaster", "Chaos Couture",
  "The Spiral Snapped", "Unbothered Unmatched", "Hot Mess Express",
  "Aggressive Sparkle", "The Audible Gasp", "Prosecco Fuelled",
];

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
function ItemCard({ item, onRemove, onEdit, onSelect, selected, showSelect, idx }) {
  const col = getColourObj(item.colour);
  return (
    <div
      onClick={showSelect ? () => onSelect(item) : undefined}
      style={{
        background: selected ? "rgba(196,149,106,0.18)" : "rgba(196,149,106,0.06)",
        border: `1px solid ${selected ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.12)"}`,
        borderRadius: 12, padding: 12, position: "relative",
        cursor: showSelect ? "pointer" : "default",
        transition: "all 0.3s ease",
        animation: `fadeSlideIn 0.4s ease ${(idx || 0) * 0.05}s both`,
      }}
    >
      {item.photo ? (
        <div style={{
          width: "100%", height: 120, borderRadius: 8,
          overflow: "hidden", marginBottom: 8,
        }}>
          <img src={item.photo} alt={item.name} style={{
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

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name, type: "item"|"outfit" }

  // Outfit save/edit form
  const [showOutfitSave, setShowOutfitSave] = useState(false);
  const [outfitForm, setOutfitForm] = useState({ name: "", vibes: [], weatherTags: [] });
  const [expandedOutfit, setExpandedOutfit] = useState(null);
  const [outfitFilter, setOutfitFilter] = useState({ vibe: "All", weather: "All" });
  const [editingOutfitId, setEditingOutfitId] = useState(null);
  const [outfitSourceFilter, setOutfitSourceFilter] = useState("All");

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
      if (!data.fromServer) {
        showToast("Offline — changes won't sync until reconnected \uD83C\uDF00");
      }
    });
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

  const startSaveOutfit = () => {
    if (outfit.length === 0) { showToast("Pick some pieces first! \uD83D\uDC0C"); return; }
    setOutfitForm({ name: "", vibes: [], weatherTags: [] });
    setShowOutfitSave(true);
  };

  const confirmSaveOutfit = async () => {
    const name = outfitForm.name.trim() || `Outfit ${savedOutfits.length + 1}`;
    const newOutfit = {
      name, items: [...outfit], id: Date.now(),
      vibes: outfitForm.vibes, weatherTags: outfitForm.weatherTags,
      source: "manual",
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
    setOutfitForm({ name: "", vibes: [], weatherTags: [] });
    showToast(`${updated.name} updated! \u2728`);
    const ok = await updateOutfitOnServer(updated);
    if (!ok && prev) {
      setSavedOutfits(cur => cur.map(o => o.id === updated.id ? prev : o));
      showToast(`Couldn't save ${updated.name} \uD83D\uDE3F`);
    }
  };

  const cancelEditOutfit = () => {
    setEditingOutfitId(null);
    setOutfitForm({ name: "", vibes: [], weatherTags: [] });
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
    if (items.length < 2) {
      showToast("Need more clothes to surprise you! Add some items first \uD83D\uDC0C");
      return;
    }

    let result;
    if (chaosMode) {
      result = generateChaosOutfit(items);
    } else {
      // Map surprise vibes to item vibes
      const vibeMap = {
        "Cosy": "Cosy Cocoon",
        "Evening Out": "Date Night",
        "Day Off Staying In": "Codeineificated",
        "London Office": "London Office",
        "London Adventure": "London Adventure",
        "Farm Visit": "Goat Farm",
        "Holiday Beach": "Festival",
        "Smart Occasion (Sad)": "Fancy",
        "Smart Occasion (Happy)": "Fancy",
      };
      result = generateBestOutfit(items, {
        weather: surpriseWeather,
        vibe: surpriseVibe ? (vibeMap[surpriseVibe] || surpriseVibe) : null,
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
          }}>The Shimmer Strip</h1>
          <SpiralIcon size={24} />
        </div>
        <p style={{
          fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
          color: "#8a7a6a", margin: "4px 0 0", fontStyle: "italic",
        }}>Spiral Queen Wardrobe Registry</p>
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
          { id: "wardrobe", label: "Wardrobe", icon: "\uD83C\uDF00" },
          { id: "add", label: "Add", icon: "\u2728" },
          { id: "outfit", label: "Build Outfit", icon: "\uD83D\uDC57" },
          { id: "savedOutfits", label: "Saved", icon: "\uD83D\uDC96" },
          { id: "surpriseSetup", label: "Surprise Me", icon: "\uD83D\uDC0C" },
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
                  <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} style={selectStyle}>
                    <option value="All">All Types</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={filter.colour} onChange={e => setFilter(f => ({ ...f, colour: e.target.value }))} style={selectStyle}>
                    <option value="All">All Colours</option>
                    {allColours.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={filter.vibe} onChange={e => setFilter(f => ({ ...f, vibe: e.target.value }))} style={selectStyle}>
                    <option value="All">All Vibes</option>
                    {VIBES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <p style={{ fontSize: 11, color: "#6a5a4a", marginBottom: 12 }}>
                  Showing {filteredItems.length} of {items.length} pieces
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {filteredItems.map((item, idx) => (
                    <ItemCard key={item.id} item={item} onRemove={requestRemoveItem} onEdit={startEditItem} idx={idx} />
                  ))}
                </div>
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
                <option key={loc} value={loc}>{loc}{FISHCAT_BLOCKED.includes(loc) ? " 🐟💤" : ""}</option>
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
            {/* Saved Outfits — lozenges at top */}
            {savedOutfits.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ fontSize: 13, color: "#c4956a", margin: 0, letterSpacing: 1, textTransform: "uppercase" }}>
                    {"👗"} Saved Outfits ({savedOutfits.length})
                  </h3>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <select value={outfitFilter.vibe} onChange={e => setOutfitFilter(f => ({ ...f, vibe: e.target.value }))} style={{ ...selectStyle, flex: "none", minWidth: 100 }}>
                    <option value="All">All Vibes</option>
                    {VIBES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={outfitFilter.weather} onChange={e => setOutfitFilter(f => ({ ...f, weather: e.target.value }))} style={{ ...selectStyle, flex: "none", minWidth: 100 }}>
                    <option value="All">All Weather</option>
                    {WEATHERS.map(w => <option key={w} value={w}>{WEATHER_EMOJI[w]} {w}</option>)}
                  </select>
                </div>
                <div style={{
                  display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8,
                  WebkitOverflowScrolling: "touch",
                }}>
                  {filteredOutfits.map(o => (
                    <button key={o.id} onClick={() => setExpandedOutfit(expandedOutfit === o.id ? null : o.id)}
                      style={{
                        flexShrink: 0, padding: "8px 14px", borderRadius: 20,
                        background: expandedOutfit === o.id ? "rgba(196,149,106,0.2)" : "rgba(196,149,106,0.06)",
                        border: `1px solid ${expandedOutfit === o.id ? "rgba(196,149,106,0.4)" : "rgba(196,149,106,0.12)"}`,
                        color: expandedOutfit === o.id ? "#c4956a" : "#8a7a6a",
                        fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                        letterSpacing: 0.5, transition: "all 0.3s ease",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {o.name}
                      <span style={{ display: "flex", gap: 2 }}>
                        {o.items.slice(0, 4).map(item => (
                          <span key={item.id} style={{
                            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                            background: getColourObj(item.colour).hex,
                            border: "1px solid rgba(255,255,255,0.1)",
                          }} />
                        ))}
                        {o.items.length > 4 && <span style={{ fontSize: 9, color: "#6a5a4a" }}>+{o.items.length - 4}</span>}
                      </span>
                    </button>
                  ))}
                </div>
                {filteredOutfits.length === 0 && (
                  <p style={{ fontSize: 11, color: "#5a4a3a", textAlign: "center", fontStyle: "italic", margin: "8px 0 0" }}>
                    No outfits match those filters {"🌀"}
                  </p>
                )}
                {/* Expanded outfit detail */}
                {expandedOutfit && (() => {
                  const o = savedOutfits.find(x => x.id === expandedOutfit);
                  if (!o) return null;
                  if (editingOutfitId === o.id) {
                    return (
                      <div style={{
                        background: "rgba(196,149,106,0.06)",
                        border: "1px solid rgba(196,149,106,0.2)",
                        borderRadius: 12, padding: 16, marginTop: 10,
                        animation: "fadeIn 0.3s ease",
                      }}>
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
                    );
                  }
                  return (
                    <div style={{
                      background: "rgba(196,149,106,0.06)",
                      border: "1px solid rgba(196,149,106,0.15)",
                      borderRadius: 12, padding: 16, marginTop: 10,
                      animation: "fadeIn 0.3s ease",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <p style={{ fontSize: 15, color: "#d4c4b0", margin: 0, fontWeight: 600 }}>{o.name}</p>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => startEditOutfit(o)} style={{
                            background: "rgba(0,0,0,0.4)", border: "none",
                            color: "#8a7a6a", width: 24, height: 24,
                            borderRadius: "50%", fontSize: 11, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>{"✎"}</button>
                          <button onClick={() => requestDeleteOutfit(o.id)} style={{
                            background: "rgba(0,0,0,0.4)", border: "none",
                            color: "#8a7a6a", width: 24, height: 24,
                            borderRadius: "50%", fontSize: 11, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>{"×"}</button>
                        </div>
                      </div>
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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {o.items.map(item => (
                          <div key={item.id} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            background: "rgba(196,149,106,0.1)", padding: "6px 10px",
                            borderRadius: 16, fontSize: 11,
                          }}>
                            {item.photo ? (
                              <div style={{
                                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                                background: `url(${item.photo}) center/cover`,
                                border: "1px solid rgba(196,149,106,0.2)",
                              }} />
                            ) : (
                              <div style={{
                                width: 10, height: 10, borderRadius: "50%",
                                background: getColourObj(item.colour).hex,
                                border: "1px solid rgba(255,255,255,0.1)",
                              }} />
                            )}
                            <span style={{ color: "#d4c4b0" }}>{item.name}</span>
                          </div>
                        ))}
                      </div>
                      <ColourScoreBar score={outfitColourScore(o.items)} />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Current outfit being built */}
            {outfit.length > 0 && (
              <div style={{
                background: "rgba(196,149,106,0.06)",
                border: "1px solid rgba(196,149,106,0.15)",
                borderRadius: 16, padding: 16, marginBottom: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 13, color: "#c4956a", margin: 0, letterSpacing: 1, textTransform: "uppercase" }}>
                    Current Outfit
                  </h3>
                  {!showOutfitSave && (
                    <button onClick={startSaveOutfit} style={{
                      background: "rgba(196,149,106,0.2)",
                      border: "1px solid rgba(196,149,106,0.3)",
                      color: "#c4956a", padding: "6px 14px", borderRadius: 20,
                      fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1,
                    }}>Save Outfit {"\uD83D\uDC96"}</button>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {outfit.map(item => (
                    <div key={item.id} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "rgba(196,149,106,0.1)", padding: "6px 12px",
                      borderRadius: 20, fontSize: 12,
                    }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: getColourObj(item.colour).hex,
                        border: "1px solid rgba(255,255,255,0.1)",
                      }} />
                      <span style={{ color: "#d4c4b0" }}>{item.name}</span>
                      <button onClick={() => toggleOutfitItem(item)} style={{
                        background: "none", border: "none", color: "#8a7a6a",
                        cursor: "pointer", fontSize: 12, padding: "0 0 0 4px",
                      }}>{"\u00D7"}</button>
                    </div>
                  ))}
                </div>
                <ColourScoreBar score={outfitColourScore(outfit)} />

                {/* Outfit save form */}
                {showOutfitSave && (
                  <div style={{
                    borderTop: "1px solid rgba(196,149,106,0.15)",
                    marginTop: 16, paddingTop: 16,
                    animation: "fadeIn 0.3s ease",
                  }}>
                    <label style={labelStyle}>Name your outfit</label>
                    <input type="text" value={outfitForm.name}
                      onChange={e => setOutfitForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={`Outfit ${savedOutfits.length + 1}`}
                      style={inputStyle}
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
                      <button onClick={confirmSaveOutfit} style={{
                        flex: 1, padding: 12,
                        background: "linear-gradient(135deg, rgba(196,149,106,0.3), rgba(155,27,48,0.2))",
                        border: "1px solid rgba(196,149,106,0.3)", borderRadius: 12,
                        color: "#c4956a", fontSize: 12, fontFamily: "inherit",
                        letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
                      }}>Save {"\u2728"}</button>
                      <button onClick={() => setShowOutfitSave(false)} style={{
                        padding: "12px 16px",
                        background: "rgba(196,149,106,0.06)",
                        border: "1px solid rgba(196,149,106,0.1)", borderRadius: 12,
                        color: "#8a7a6a", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                      }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6a5a4a" }}>
                <p>Add some clothes first, then come back to build outfits! {"\u2728"}</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#8a7a6a", marginBottom: 12, textAlign: "center" }}>
                  Tap items to add them to your outfit
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {items.map((item, idx) => (
                    <ItemCard
                      key={item.id} item={item} idx={idx}
                      showSelect onSelect={toggleOutfitItem}
                      selected={!!outfit.find(i => i.id === item.id)}
                    />
                  ))}
                </div>
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
                {/* Source filter */}
                <div style={{
                  display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10,
                  marginBottom: 12, WebkitOverflowScrolling: "touch",
                }}>
                  {[
                    { id: "All", label: "All Outfits", icon: "" },
                    { id: "manual", label: "My Outfits", icon: "✨" },
                    { id: "claude", label: "Claude's Choice", icon: "🩵" },
                    { id: "chaos", label: "Chaos", icon: "🌀" },
                    { id: "snail", label: "Snail's Pick", icon: "🐌" },
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
                    const sourceBadge = {
                      claude: { icon: "🩵", label: "Claude's Choice", color: "#7ab0c4" },
                      chaos: { icon: "🌀", label: "Chaos Mode", color: "#e86b6b" },
                      snail: { icon: "🐌", label: "Snail's Pick", color: "#c4956a" },
                      surprise: { icon: "🐌", label: "Snail's Pick", color: "#c4956a" },
                      manual: { icon: "✨", label: "My Outfit", color: "#c4956a" },
                      nail_this: { icon: "👔", label: "Nailed It", color: "#c4956a" },
                    }[src] || { icon: "✨", label: "Outfit", color: "#c4956a" };

                    return (
                      <div key={o.id} style={{
                        background: "rgba(196,149,106,0.04)",
                        border: `1px solid ${isExpanded ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.1)"}`,
                        borderRadius: 16, overflow: "hidden",
                        transition: "all 0.3s ease",
                        animation: `fadeSlideIn 0.4s ease ${idx * 0.06}s both`,
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
                            </div>
                            <p style={{ fontSize: 11, color: "#8a7a6a", margin: 0 }}>
                              {o.items.length} pieces {o.items.map(i => i.category).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
                            </p>
                          </div>
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
                                    <img src={o.selfie} alt={`${o.name} selfie`} style={{
                                      width: "100%", maxHeight: 360, objectFit: "cover",
                                      borderRadius: 12, border: "1px solid rgba(196,149,106,0.2)",
                                    }} />
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
                                  </div>
                                ) : (
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
                                )}

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

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                  <button onClick={() => startEditOutfit(o)} style={{
                                    flex: 1, padding: "8px 14px",
                                    background: "rgba(196,149,106,0.08)",
                                    border: "1px solid rgba(196,149,106,0.15)", borderRadius: 10,
                                    color: "#8a7a6a", fontSize: 11, fontFamily: "inherit",
                                    cursor: "pointer", letterSpacing: 0.5,
                                  }}>{"✎"} Edit</button>
                                  <button onClick={() => requestDeleteOutfit(o.id)} style={{
                                    padding: "8px 14px",
                                    background: "rgba(155,27,48,0.06)",
                                    border: "1px solid rgba(155,27,48,0.12)", borderRadius: 10,
                                    color: "#8a6a6a", fontSize: 11, fontFamily: "inherit",
                                    cursor: "pointer", letterSpacing: 0.5,
                                  }}>{"×"} Remove</button>
                                </div>
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

                {/* Crimson Moon */}
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
                  }}>{"\uD83C\uDF19"}</div>
                  <div>
                    <p style={{
                      fontSize: 13, margin: 0,
                      color: crimsonMoon ? "#e86b6b" : "#8a7a6a",
                      fontWeight: crimsonMoon ? 600 : 400,
                    }}>Crimson Moon</p>
                    <p style={{ fontSize: 10, margin: "2px 0 0", color: "#5a4a3a" }}>
                      Comfort is queen. Cosy pieces prioritised {"\uD83D\uDC96"}
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
                  <button onClick={saveSurpriseOutfit} style={{
                    padding: "12px 22px",
                    background: surpriseResult.structure === "chaos"
                      ? "rgba(155,27,48,0.15)" : "rgba(196,149,106,0.2)",
                    border: `1px solid ${surpriseResult.structure === "chaos"
                      ? "rgba(155,27,48,0.25)" : "rgba(196,149,106,0.3)"}`,
                    borderRadius: 24,
                    color: surpriseResult.structure === "chaos" ? "#e86b6b" : "#c4956a",
                    fontSize: 12, fontFamily: "inherit", letterSpacing: 1,
                    textTransform: "uppercase", cursor: "pointer",
                  }}>{surpriseResult.structure === "chaos" ? "\uD83D\uDD25 Save This" : "\uD83D\uDC0C Save This"}</button>
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
