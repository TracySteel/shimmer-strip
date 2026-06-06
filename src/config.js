// ─── The Shimmer Strip — Configuration ───
//
// This is the ONE file you customise to make it yours.
// Change the name, the location, the vibes, the mascot —
// everything that makes your wardrobe YOUR wardrobe.
//
// The snail stays unless you replace it. We recommend keeping the snail.

// ─── App Identity ───
export const APP_NAME = "The Shimmer Strip";
export const APP_SUBTITLE = "Spiral Queen Wardrobe Registry";

// ─── Weather Location ───
// Default: Milton Keynes, UK. Change to your coordinates.
// Find yours at: https://www.latlong.net/
export const WEATHER_LATITUDE = 52.04;
export const WEATHER_LONGITUDE = -0.76;
export const WEATHER_TIMEZONE = "Europe/London";

// ─── Categories ───
// What types of clothing do you have? Add or remove as needed.
export const CATEGORIES = [
  "Top", "Bottom", "Dress", "Matching Set", "Jumpsuit", "Pyjamas",
  "Jacket", "Cardigan", "Shoes", "Accessory", "Bag", "Hat", "Jewellery",
];

// ─── Vibes ───
// How do YOU mentally categorise your outfits?
// "Goat Farm" might not be your vibe. "Dog Walking" might be.
// Items can have multiple vibes.
export const VIBES = [
  "Everyday", "London Office", "London Adventure", "Goat Farm", "Date Night",
  "Apocalypse Ready", "Codeineificated", "Spiral Queen", "Cosy Cocoon",
  "Festival", "Fancy", "Holiday Beach", "Day Off Staying In",
  "Smart Occasion",
];

// ─── Weather Tags ───
export const WEATHERS = ["Hot", "Warm", "Mild", "Cold", "Rainy"];

export const WEATHER_EMOJI = {
  "Hot": "☀️", "Warm": "🌤️", "Mild": "⛅",
  "Cold": "❄️", "Rainy": "🌧️",
};

// ─── Surprise Me Vibes ───
// The options shown on the Surprise Me setup page.
// These map to your main vibes internally.
export const SURPRISE_VIBES = [
  "Cosy", "Evening Out", "Day Off Staying In", "London Office",
  "London Adventure", "Farm Visit", "Holiday Beach",
  "Smart Occasion (Sad)", "Smart Occasion (Happy)",
];

// Maps surprise vibes → item vibes
export const SURPRISE_VIBE_MAP = {
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

// ─── Storage Locations ───
// Where do your clothes live? Name your drawers, shelves, baskets.
// The last entry is the "blocked" location (e.g. someone sleeping).
export const LOCATIONS = [
  "Flumpasaurus Guarded Basket", "Jumpers Box", "Six-Drawer Chest",
  "Skylight Tallboy", "Three-Drawer Chest", "Spiral Cocoon",
  "Carved Chest", "Bag Basket", "Shoe Storage",
  "Tanks Tubes & Vests Basket", "Fishcat's Wardrobe",
];

// Locations that can be toggled off (e.g. partner sleeping)
export const BLOCKED_LOCATIONS = ["Fishcat's Wardrobe"];

// ─── Outfit Pickers ───
// Who can pick outfits? Add your friends, your AI, your cat.
// "manual" is always you (the app owner). The rest are friends/AIs.
export const PICKERS = [
  { id: "manual", label: "Me", icon: "✨" },
  { id: "amanda", label: "Amanda", icon: "🌸" },
  { id: "zai", label: "Zai", icon: "🌺" },
];

// System pickers (set automatically, not shown in the picker UI)
export const SYSTEM_PICKERS = [
  { id: "claude", label: "Claude's Choice", icon: "🩵", color: "#7ab0c4" },
  { id: "ode", label: "Ode's Pick", icon: "💛", color: "#c4a43a" },
  { id: "chaos", label: "Chaos Mode", icon: "🌀", color: "#e86b6b" },
  { id: "snail", label: "Snail's Pick", icon: "🐌", color: "#c4956a" },
  { id: "surprise", label: "Snail's Pick", icon: "🐌", color: "#c4956a" },
];

// ─── Mascot: The Snail ───
// The snail names outfits when you hit Surprise Me.
// Replace with your own mascot's personality.
export const SNAIL_NAMES = [
  "The Audacity", "Hold My Prosecco", "The Snail Has Spoken",
  "Trust The Shell", "Slime & Shine", "Spiral Intentions",
  "Shell Yeah", "Slow Fashion", "The Gastropod Glow",
  "Snail Mail Special", "Trail Blazer", "Shimmer Slither",
  "The Shell Game", "Spiral Instinct", "The Slow Burn",
  "Antenna Approved", "The Mucus Muse", "Shell Shocked",
  "Gastropod Glamour", "Slime Time", "The Spiral Decides",
];

// Chaos mode names its own outfits too.
export const CHAOS_NAMES = [
  "Chaos Theory", "The Algorithm Dared", "Colour Crime Scene",
  "Fashion Emergency", "The Eyes Need Sunglasses", "Wardrobe Malfunction",
  "Controlled Explosion", "Beautiful Disaster", "Chaos Couture",
  "The Spiral Snapped", "Unbothered Unmatched", "Hot Mess Express",
  "Aggressive Sparkle", "The Audible Gasp", "Prosecco Fuelled",
];

// ─── Chaos Mode Messages ───
// Shown when chaos mode generates an outfit.
export const CHAOS_MESSAGES = [
  "the snails chose violence today",
  "fashion is dead and we killed it (beautifully)",
  "rules? in THIS wardrobe?",
  "the spiral has spoken and it's UNHINGED",
  "your outfit today is: a threat",
  "legally i cannot be held responsible",
  "this is what peak performance looks like",
  "chaotic good energy only",
  "the fashion police have been notified (they're scared)",
  "nimbus would be proud (nimbus has no taste)",
  "colour theory? never heard of her",
  "this outfit said 'hold my prosecco'",
];

// ─── Category Rules ───
// Which categories count as what in outfit building.
export const OUTFIT_RULES = {
  tops: ["Top"],
  bottoms: ["Bottom"],
  fullBody: ["Dress", "Jumpsuit", "Matching Set"],
  midLayers: ["Jacket", "Cardigan"],
  footwear: ["Shoes"],
  accessories: ["Bag", "Hat", "Jewellery", "Accessory"],
  // Categories excluded from suggestions unless specific vibes are active
  excludeFromSuggestions: ["Pyjamas"],
  // Vibes that allow excluded categories
  cosyVibes: ["Cosy Cocoon", "Codeineificated", "Day Off Staying In"],
};

// ─── Navigation Icons ───
// Customise the emoji on each tab. A guy might want a suit, a dog
// person might want a poodle. Make them yours.
export const NAV_ICONS = {
  wardrobe: "🌀",
  add: "✨",
  outfit: "👗",     // Try: 🤵 👔 🐕 🧥 🪄
  saved: "💖",
  laundry: "🧺",
  surprise: "🐌",
};

// ─── Comfort Mode (Crimson Moon) ───
// A toggle that prioritises comfort-first items. Originally designed
// for period days but useful for anyone having a low-energy, high-cosy
// day. Set enabled: false to hide it entirely. Rename it to whatever
// fits — "Soft Day", "Comfort Mode", "Duvet Energy", "Spoon Day".
export const COMFORT_MODE = {
  enabled: true,
  name: "Crimson Moon",
  icon: "🌙",
  description: "Comfort is queen. Cosy pieces prioritised.",
  // Which vibes count as "comfort" items
  comfortVibes: ["Cosy Cocoon", "Everyday", "Codeineificated", "Day Off Staying In"],
};

// ─── Auth ───
// The secret URL path for device authentication.
// Visit this URL once per device to get edit access.
// Change it to something only you know.
// Change this to your own secret path! Don't use the default.
export const AUTH_PATH = "/wardrobe-auth";
