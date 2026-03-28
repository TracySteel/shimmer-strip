// Colour definitions and matching logic

export const DEFAULT_COLOURS = [
  { name: "Black", hex: "#1a1a1a", group: "neutral", warmth: "neutral" },
  { name: "White", hex: "#f5f0eb", group: "neutral", warmth: "neutral" },
  { name: "Cream", hex: "#f0e6d3", group: "neutral", warmth: "warm" },
  { name: "Grey", hex: "#8a8a8a", group: "neutral", warmth: "neutral" },
  { name: "Navy", hex: "#1b2a4a", group: "cool", warmth: "cool" },
  { name: "Teal", hex: "#2a7a7a", group: "cool", warmth: "cool" },
  { name: "Red", hex: "#c43a3a", group: "warm", warmth: "warm" },
  { name: "Cherry Cherie", hex: "#9b1b30", group: "warm", warmth: "warm" },
  { name: "Pink", hex: "#d4748a", group: "warm", warmth: "warm" },
  { name: "Peach", hex: "#e8a87c", group: "warm", warmth: "warm" },
  { name: "Orange", hex: "#d4763a", group: "warm", warmth: "warm" },
  { name: "Yellow", hex: "#d4b83a", group: "warm", warmth: "warm" },
  { name: "Green", hex: "#4a7a4a", group: "cool", warmth: "cool" },
  { name: "Purple", hex: "#6a3d7a", group: "cool", warmth: "cool" },
  { name: "Lilac", hex: "#b491c8", group: "cool", warmth: "cool" },
  { name: "Brown", hex: "#7a5a3a", group: "warm", warmth: "warm" },
  { name: "Denim", hex: "#4a6a8a", group: "cool", warmth: "cool" },
  { name: "Gold", hex: "#c4a43a", group: "warm", warmth: "warm" },
  { name: "Silver", hex: "#b0b0b0", group: "neutral", warmth: "cool" },
  { name: "Multi", hex: "linear-gradient(135deg, #c43a3a, #d4b83a, #4a7a4a, #2a7a7a, #6a3d7a)", group: "neutral", warmth: "neutral" },
];

// Custom colours stored in localStorage
const CUSTOM_COLOURS_KEY = "shimmer-strip-custom-colours";

export function loadCustomColours() {
  try {
    const raw = localStorage.getItem(CUSTOM_COLOURS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCustomColours(colours) {
  localStorage.setItem(CUSTOM_COLOURS_KEY, JSON.stringify(colours));
}

export function getAllColours() {
  return [...DEFAULT_COLOURS, ...loadCustomColours()];
}

// For backwards compat — components that imported COLOURS
export const COLOURS = DEFAULT_COLOURS;

export function getColourObj(name) {
  const all = getAllColours();
  return all.find(c => c.name === name) || DEFAULT_COLOURS[0];
}

/**
 * Guess warmth from hex colour for custom colours
 */
export function guessWarmth(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return "neutral";
  if (r > b + 30) return "warm";
  if (b > r + 30) return "cool";
  return "neutral";
}

// Colours that go with everything
const UNIVERSAL = ["Black", "White", "Cream", "Grey", "Navy", "Denim"];

// Harmonious colour pairings beyond neutrals
const HARMONIES = {
  "Red": ["Black", "White", "Navy", "Cream", "Grey", "Denim", "Cherry Cherie"],
  "Cherry Cherie": ["Black", "White", "Navy", "Cream", "Grey", "Pink", "Red"],
  "Pink": ["Grey", "Navy", "White", "Cream", "Lilac", "Denim", "Cherry Cherie"],
  "Peach": ["White", "Cream", "Brown", "Teal", "Navy", "Gold", "Denim"],
  "Orange": ["Navy", "Teal", "Brown", "Cream", "White", "Denim"],
  "Yellow": ["Navy", "Grey", "White", "Denim", "Brown", "Teal"],
  "Green": ["Brown", "Cream", "White", "Navy", "Gold", "Denim"],
  "Teal": ["White", "Cream", "Brown", "Peach", "Gold", "Orange", "Coral"],
  "Navy": ["White", "Cream", "Red", "Pink", "Peach", "Yellow", "Gold", "Silver"],
  "Purple": ["White", "Cream", "Grey", "Lilac", "Silver", "Pink"],
  "Lilac": ["White", "Cream", "Grey", "Purple", "Pink", "Navy", "Silver"],
  "Brown": ["Cream", "White", "Green", "Teal", "Peach", "Gold", "Orange"],
  "Denim": ["White", "Cream", "Red", "Pink", "Brown", "Yellow", "Peach", "Teal"],
  "Gold": ["Black", "Navy", "White", "Cream", "Brown", "Green", "Teal", "Purple"],
  "Silver": ["Black", "Navy", "White", "Grey", "Purple", "Lilac", "Pink"],
  "Black": UNIVERSAL,
  "White": UNIVERSAL,
  "Cream": UNIVERSAL,
  "Grey": UNIVERSAL,
  "Multi": UNIVERSAL,
};

/**
 * Score how well two colours go together (0-10)
 */
export function colourMatchScore(colour1, colour2) {
  if (colour1 === colour2) return 7; // matching is fine but not exciting
  if (UNIVERSAL.includes(colour1) || UNIVERSAL.includes(colour2)) return 9;
  const harmonies1 = HARMONIES[colour1] || [];
  if (harmonies1.includes(colour2)) return 10;

  // Check warmth compatibility
  const c1 = getColourObj(colour1);
  const c2 = getColourObj(colour2);
  if (c1.warmth === c2.warmth) return 6;
  if (c1.warmth === "neutral" || c2.warmth === "neutral") return 7;

  // Warm + cool clash
  return 3;
}

/**
 * Score an entire outfit's colour harmony (0-10)
 */
export function outfitColourScore(items) {
  if (items.length <= 1) return 10;
  let totalScore = 0;
  let pairs = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      totalScore += colourMatchScore(items[i].colour, items[j].colour);
      pairs++;
    }
  }
  return pairs > 0 ? totalScore / pairs : 10;
}
