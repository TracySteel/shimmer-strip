// Shimmer Strip MCP Server — lets Claude pick outfits 🩵
//
// Tools:
//   get_wardrobe          — filtered items with metadata
//   get_wardrobe_summary  — category/colour breakdown overview
//   get_outfits           — saved outfits (filtered, summary or detail mode)
//   get_currently_wearing — quick check: current outfit + nail polish
//   get_weather           — current Milton Keynes weather
//   get_weekly_picks      — active weekly accessories
//   suggest_outfit        — algorithm-generated outfit
//   save_outfit           — save outfit (with duplicate detection)

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ─── Colour scoring (server-side, no localStorage) ───

const DEFAULT_COLOURS = [
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
  { name: "Multi", hex: "multi", group: "neutral", warmth: "neutral" },
];

const UNIVERSAL = ["Black", "White", "Cream", "Grey", "Navy", "Denim"];
const HARMONIES = {
  "Red": ["Black", "White", "Navy", "Cream", "Grey", "Denim", "Cherry Cherie"],
  "Cherry Cherie": ["Black", "White", "Navy", "Cream", "Grey", "Pink", "Red"],
  "Pink": ["Grey", "Navy", "White", "Cream", "Lilac", "Denim", "Cherry Cherie"],
  "Peach": ["White", "Cream", "Brown", "Teal", "Navy", "Gold", "Denim"],
  "Orange": ["Navy", "Teal", "Brown", "Cream", "White", "Denim"],
  "Yellow": ["Navy", "Grey", "White", "Denim", "Brown", "Teal"],
  "Green": ["Brown", "Cream", "White", "Navy", "Gold", "Denim"],
  "Teal": ["White", "Cream", "Brown", "Peach", "Gold", "Orange"],
  "Navy": ["White", "Cream", "Red", "Pink", "Peach", "Yellow", "Gold", "Silver"],
  "Purple": ["White", "Cream", "Grey", "Lilac", "Silver", "Pink"],
  "Lilac": ["White", "Cream", "Grey", "Purple", "Pink", "Navy", "Silver"],
  "Brown": ["Cream", "White", "Green", "Teal", "Peach", "Gold", "Orange"],
  "Denim": ["White", "Cream", "Red", "Pink", "Brown", "Yellow", "Peach", "Teal"],
  "Gold": ["Black", "Navy", "White", "Cream", "Brown", "Green", "Teal", "Purple"],
  "Silver": ["Black", "Navy", "White", "Grey", "Purple", "Lilac", "Pink"],
};

function getColourObj(name, customColours = []) {
  return [...DEFAULT_COLOURS, ...customColours].find(c => c.name === name) || DEFAULT_COLOURS[0];
}

function colourMatchScore(c1, c2) {
  if (c1 === c2) return 7;
  if (UNIVERSAL.includes(c1) || UNIVERSAL.includes(c2)) return 9;
  if ((HARMONIES[c1] || []).includes(c2)) return 10;
  const o1 = getColourObj(c1);
  const o2 = getColourObj(c2);
  if (o1.warmth === o2.warmth) return 6;
  if (o1.warmth === "neutral" || o2.warmth === "neutral") return 7;
  return 3;
}

function outfitColourScore(items) {
  if (items.length <= 1) return 10;
  let total = 0, pairs = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      total += colourMatchScore(items[i].colour, items[j].colour);
      pairs++;
    }
  }
  return pairs > 0 ? Math.round((total / pairs) * 10) / 10 : 10;
}

// ─── Outfit suggestion engine (server-side, improved) ───

const REQUIRED_TOP = ["Top"];
const REQUIRED_BOTTOM = ["Bottom"];
const FULL_BODY = ["Dress", "Jumpsuit", "Matching Set", "Pyjamas"];
const MID_LAYER = ["Jacket", "Cardigan"];
const FOOTWEAR = ["Shoes"];
const ACCESSORY_CATS = ["Bag", "Hat", "Jewellery", "Accessory"];
const CRIMSON_MOON_VIBES = ["Cosy Cocoon", "Everyday", "Codeineificated", "Day Off Staying In"];

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

function pickWeighted(candidates, existing) {
  if (!candidates.length) return null;
  if (!existing.length) return pickRandom(candidates);
  const weights = candidates.map(item => {
    const scores = existing.map(e => colourMatchScore(item.colour, e.colour));
    return Math.pow(scores.reduce((a, b) => a + b, 0) / scores.length, 2);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return pickRandom(candidates);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function suggestOutfitFromItems(items, options = {}) {
  const { weather, vibe, crimsonMoon, chaos, excludeLocations } = options;
  if (items.length < 2) return null;

  // Exclude pyjamas unless specifically in cosy/staying-in vibe
  const cosyVibes = ["Cosy Cocoon", "Codeineificated", "Day Off Staying In"];
  const allowPyjamas = vibe && cosyVibes.includes(vibe);
  let eligible = allowPyjamas ? items : items.filter(i => i.category !== "Pyjamas");

  // Exclude items by location (e.g. Fishcat sleeping)
  if (excludeLocations && excludeLocations.length > 0) {
    eligible = eligible.filter(i => !i.location || !excludeLocations.includes(i.location));
  }

  // Chaos mode: random items but valid structure
  if (chaos) {
    return generateChaosOutfit(eligible);
  }

  // Filter by weather tag if provided
  let pool = [...eligible];
  if (weather) {
    const tagged = pool.filter(i => i.weatherTags && i.weatherTags.includes(weather));
    if (tagged.length >= 3) pool = tagged;
  }

  // Filter by vibe
  if (vibe) {
    const vibed = pool.filter(i => i.vibes && i.vibes.includes(vibe));
    if (vibed.length >= 3) pool = vibed;
  }

  // Crimson moon: prioritise comfort
  if (crimsonMoon) {
    const cosy = pool.filter(i => i.vibes && i.vibes.some(v => CRIMSON_MOON_VIBES.includes(v)));
    if (cosy.length >= 3) pool = cosy;
  }

  // Categorise
  const tops = pool.filter(i => REQUIRED_TOP.includes(i.category));
  const bottoms = pool.filter(i => REQUIRED_BOTTOM.includes(i.category));
  const fullBody = pool.filter(i => FULL_BODY.includes(i.category));
  const layers = pool.filter(i => MID_LAYER.includes(i.category));
  const shoes = pool.filter(i => FOOTWEAR.includes(i.category));
  const accessories = pool.filter(i => ACCESSORY_CATS.includes(i.category));

  let outfit = [];
  let structure = "";

  // Decide structure
  const canFullBody = fullBody.length > 0;
  const canTopBottom = tops.length > 0 && bottoms.length > 0;

  if (!canFullBody && !canTopBottom) {
    // Fallback: pick best items without duplicating categories
    const used = new Set();
    const available = [...pool].sort(() => Math.random() - 0.5);
    for (const item of available) {
      if (!used.has(item.category) && outfit.length < 4) {
        outfit.push(item);
        used.add(item.category);
      }
    }
    return { items: outfit, structure: "mixed", colourScore: outfitColourScore(outfit) };
  }

  if (canFullBody && canTopBottom) {
    structure = Math.random() < 0.4 ? "fullBody" : "topBottom";
  } else {
    structure = canFullBody ? "fullBody" : "topBottom";
  }

  if (structure === "fullBody") {
    outfit.push(pickRandom(fullBody));
  } else {
    const top = pickRandom(tops);
    outfit.push(top);
    const bottom = pickWeighted(bottoms.filter(i => i.id !== top.id), outfit);
    if (bottom) outfit.push(bottom);
  }

  // Layer (weather-dependent)
  const shouldLayer = weather === "Cold" || weather === "Rainy"
    ? Math.random() < 0.9
    : weather === "Mild" ? Math.random() < 0.5
    : Math.random() < 0.2;

  if (shouldLayer && layers.length > 0 && weather !== "Hot") {
    const layer = pickWeighted(layers.filter(i => !outfit.find(o => o.id === i.id)), outfit);
    if (layer) outfit.push(layer);
  }

  // Shoes (always try)
  if (shoes.length > 0) {
    const shoe = pickWeighted(shoes, outfit);
    if (shoe) outfit.push(shoe);
  }

  // Maybe a bag
  const bags = accessories.filter(i => i.category === "Bag");
  if (bags.length > 0 && Math.random() > 0.3) {
    outfit.push(pickWeighted(bags, outfit));
  }

  // Maybe another accessory
  const otherAcc = accessories.filter(i =>
    !["Bag"].includes(i.category) && !outfit.find(o => o.id === i.id)
  );
  if (otherAcc.length > 0 && Math.random() > 0.5) {
    outfit.push(pickWeighted(otherAcc, outfit));
  }

  outfit = outfit.filter(Boolean);

  return {
    items: outfit,
    structure,
    colourScore: outfitColourScore(outfit),
  };
}

function generateChaosOutfit(items) {
  // Chaos colours but VALID structure
  const tops = items.filter(i => REQUIRED_TOP.includes(i.category));
  const bottoms = items.filter(i => REQUIRED_BOTTOM.includes(i.category));
  const fullBody = items.filter(i => FULL_BODY.includes(i.category));
  const shoes = items.filter(i => FOOTWEAR.includes(i.category));
  const other = items.filter(i =>
    [...MID_LAYER, ...ACCESSORY_CATS].includes(i.category)
  );

  let outfit = [];

  // Core: full body or top+bottom
  if (fullBody.length > 0 && Math.random() < 0.3) {
    outfit.push(pickRandom(fullBody));
  } else if (tops.length > 0 && bottoms.length > 0) {
    outfit.push(pickRandom(tops));
    outfit.push(pickRandom(bottoms));
  } else if (fullBody.length > 0) {
    outfit.push(pickRandom(fullBody));
  } else {
    // Just grab random stuff
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    outfit = shuffled.slice(0, Math.min(4, items.length));
    return {
      items: outfit,
      structure: "chaos",
      colourScore: outfitColourScore(outfit),
      chaosMessage: pickRandom(CHAOS_MESSAGES),
    };
  }

  // Shoes
  if (shoes.length > 0) outfit.push(pickRandom(shoes));

  // Random extras (1-3)
  const extras = other.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
  outfit.push(...extras);

  outfit = outfit.filter(Boolean);

  return {
    items: outfit,
    structure: "chaos",
    colourScore: outfitColourScore(outfit),
    chaosMessage: pickRandom(CHAOS_MESSAGES),
  };
}

const CHAOS_MESSAGES = [
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

// Generate multiple and pick the best
function bestOutfit(items, options, attempts = 5) {
  let best = null;
  for (let i = 0; i < attempts; i++) {
    const result = suggestOutfitFromItems(items, options);
    if (!result) return null;
    if (!best || result.colourScore > best.colourScore) best = result;
  }
  return best;
}

// ─── MCP Server Factory ───

export function createMcpServer(readData, writeData, getWeather) {
  const server = new Server(
    { name: "shimmer-strip", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // ── List Tools ──
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_wardrobe",
        description: "Get wardrobe items filtered by category, colour, vibe, weather, location, or laundry status. IMPORTANT: ALWAYS use filters — never call without at least one filter. For outfit picking, call once per category (tops, then bottoms, then shoes). Use get_wardrobe_summary first for an overview.",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", description: "Filter by category: Top, Bottom, Dress, Matching Set, Jumpsuit, Pyjamas, Jacket, Cardigan, Shoes, Accessory, Bag, Hat, Jewellery" },
            colour: { type: "string", description: "Filter by colour name" },
            vibe: { type: "string", description: "Filter by vibe tag" },
            weather: { type: "string", description: "Filter by weather tag: Hot, Warm, Mild, Cold, Rainy" },
            location: { type: "string", description: "Filter by storage location name" },
            excludeLocations: { type: "array", items: { type: "string" }, description: "Exclude items in these locations (e.g. [\"Fishcat's Wardrobe\"] when Fishcat is sleeping)" },
            inLaundry: { type: "boolean", description: "Filter by laundry status. false (default) = only available items. true = only items in the wash." },
            favourite: { type: "boolean", description: "Filter by favourite status. true = only favourited items." },
          },
        },
      },
      {
        name: "get_wardrobe_summary",
        description: "Quick overview of the wardrobe: total items, breakdown by category, available colours, available vibes. Use this first to understand what's available before suggesting outfits.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_outfits",
        description: "Get saved outfit combinations. Returns SUMMARIES by default (lightweight, token-efficient). Use detail: true with a specific id to get full item details for one outfit. ALWAYS use filters when browsing — don't load all outfits without reason.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "Get one specific outfit by ID (returns full item details)" },
            source: { type: "string", description: "Filter by who picked it: claude, ode, amanda, zai, manual, chaos, snail" },
            weather: { type: "string", description: "Filter by weather tag: Hot, Warm, Mild, Cold, Rainy" },
            worn: { type: "boolean", description: "true = only worn outfits, false = only never-worn outfits" },
            wearingToday: { type: "boolean", description: "true = only the currently-wearing outfit" },
            favourite: { type: "boolean", description: "true = only favourited outfits" },
            detail: { type: "boolean", description: "true = include full item details (default false for summaries)" },
          },
        },
      },
      {
        name: "get_weather",
        description: "Get weather in Milton Keynes with outfit-relevant summaries. Supports 'today' (live conditions) or 'tomorrow' (forecast for evening outfit planning while Fishcat is awake and all wardrobes accessible).",
        inputSchema: {
          type: "object",
          properties: {
            day: { type: "string", enum: ["today", "tomorrow"], description: "today = current conditions (default). tomorrow = forecast for next day." },
          },
        },
      },
      {
        name: "get_currently_wearing",
        description: "Quick check: what is Tracy wearing right now? Returns the current outfit AND all active weekly picks (nail polish, phone case, etc.) in one tiny call. Use this instead of get_outfits when you just need to know what's on today.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_weekly_picks",
        description: "Get weekly accessory categories (e.g. nail polish, watches) with their currently active items. Use this to coordinate outfit suggestions with what's currently being worn/used this week.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "suggest_outfit",
        description: "Generate an algorithmically suggested outfit. Uses colour harmony, weather awareness, and structural rules (one top + one bottom + shoes, or a dress/jumpsuit). Returns outfit items with colour score.",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["smart", "chaos"],
              description: "smart = colour-harmonised, weather-appropriate. chaos = wild colour combos but valid structure.",
            },
            weather: { type: "string", enum: ["Hot", "Warm", "Mild", "Cold", "Rainy"], description: "Override weather tag (otherwise uses live weather)" },
            vibe: { type: "string", description: "Filter items by vibe tag" },
            crimsonMoon: { type: "boolean", description: "Comfort-first mode — prioritises cosy items" },
            excludeLocations: {
              type: "array", items: { type: "string" },
              description: "Locations to exclude (e.g. [\"Fishcat's Wardrobe\"] when Fishcat is sleeping). Known locations: Flumpasaurus Guarded Basket, Jumpers Box, Six-Drawer Chest, Skylight Tallboy, Three-Drawer Chest, Spiral Cocoon, Carved Chest, Bag Basket, Shoe Storage, Tanks Tubes & Vests Basket, Fishcat's Wardrobe",
            },
            day: { type: "string", enum: ["today", "tomorrow"], description: "Use today's or tomorrow's weather forecast. Default: today" },
          },
        },
      },
      {
        name: "save_outfit",
        description: "Save a new outfit combination. Checks for duplicates first — if the core items (top/bottom/dress + shoes) match an existing outfit, warns you before saving. Provide item IDs from the wardrobe, a name, and optional tags.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Outfit name (e.g. 'Cosy Dinsdag', 'Borgoir Formal')" },
            itemIds: {
              type: "array",
              items: { type: "number" },
              description: "Array of item IDs to include in the outfit",
            },
            vibes: { type: "array", items: { type: "string" }, description: "Vibe tags for the outfit" },
            weatherTags: { type: "array", items: { type: "string" }, description: "Weather tags" },
            source: {
              type: "string",
              enum: ["claude", "ode", "amanda", "zai", "manual", "chaos", "snail", "smart"],
              description: "Who picked this outfit: claude (ShimmerClaude), ode (Claude Code), amanda, zai, manual (Tracy), chaos, snail",
            },
            notes: { type: "string", description: "Optional notes about the outfit" },
            skipDuplicateCheck: { type: "boolean", description: "Set to true to save even if a duplicate is detected (for intentional variants)" },
          },
          required: ["name", "itemIds"],
        },
      },
    ],
  }));

  // ── Call Tool ──
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_wardrobe": {
        const data = readData();
        let items = data.items || [];
        if (args?.category) items = items.filter(i => i.category === args.category);
        if (args?.colour) items = items.filter(i => i.colour === args.colour);
        if (args?.vibe) items = items.filter(i => i.vibes && i.vibes.includes(args.vibe));
        if (args?.weather) items = items.filter(i => i.weatherTags && i.weatherTags.includes(args.weather));
        if (args?.location) items = items.filter(i => i.location === args.location);
        if (args?.excludeLocations?.length) items = items.filter(i => !i.location || !args.excludeLocations.includes(i.location));
        if (args?.inLaundry === true) items = items.filter(i => i.inLaundry);
        else if (args?.inLaundry === false || !args?.hasOwnProperty?.('inLaundry')) items = items.filter(i => !i.inLaundry);
        if (args?.favourite === true) items = items.filter(i => i.isFavourite);
        if (args?.favourite === false) items = items.filter(i => !i.isFavourite);
        // Strip base64 photos from response to keep it small — just include whether photo exists
        const slim = items.map(i => ({
          ...i,
          hasPhoto: !!i.photo,
          photo: undefined,
        }));
        return { content: [{ type: "text", text: JSON.stringify(slim, null, 2) }] };
      }

      case "get_wardrobe_summary": {
        const data = readData();
        const items = data.items || [];
        const cats = {};
        const colours = {};
        const vibes = {};
        items.forEach(i => {
          cats[i.category] = (cats[i.category] || 0) + 1;
          colours[i.colour] = (colours[i.colour] || 0) + 1;
          (i.vibes || []).forEach(v => { vibes[v] = (vibes[v] || 0) + 1; });
        });
        const summary = {
          totalItems: items.length,
          totalOutfits: (data.outfits || []).length,
          categories: cats,
          colours,
          vibes,
          customColours: (data.customColours || []).map(c => c.name),
        };
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      }

      case "get_outfits": {
        const data = readData();
        let outfits = (data.outfits || []);

        // Single outfit by ID — always return full detail
        if (args?.id) {
          const outfit = outfits.find(o => o.id === args.id);
          if (!outfit) return { content: [{ type: "text", text: `Outfit not found with ID ${args.id}` }] };
          return { content: [{ type: "text", text: JSON.stringify({
            ...outfit,
            timesWorn: outfit.timesWorn || 0,
            lastWorn: outfit.lastWorn || null,
            wearingToday: outfit.wearingToday || false,
            items: outfit.items.map(i => ({ ...i, hasPhoto: !!i.photo, photo: undefined })),
          }, null, 2) }] };
        }

        // Apply filters
        if (args?.source) outfits = outfits.filter(o => {
          const src = o.source || "manual";
          if (args.source === "snail") return src === "snail" || src === "surprise";
          return src === args.source;
        });
        if (args?.weather) outfits = outfits.filter(o => o.weatherTags && o.weatherTags.includes(args.weather));
        if (args?.worn === true) outfits = outfits.filter(o => (o.timesWorn || 0) > 0);
        if (args?.worn === false) outfits = outfits.filter(o => !(o.timesWorn || 0));
        if (args?.wearingToday) outfits = outfits.filter(o => o.wearingToday);
        if (args?.favourite === true) outfits = outfits.filter(o => o.isFavourite);
        if (args?.favourite === false) outfits = outfits.filter(o => !o.isFavourite);

        // Currently wearing summary (always included)
        const wearing = (data.outfits || []).find(o => o.wearingToday);
        const currentlyWearing = wearing
          ? { id: wearing.id, name: wearing.name, source: wearing.source, items: wearing.items.map(i => `${i.name} (${i.category})`), timesWorn: wearing.timesWorn || 0, lastWorn: wearing.lastWorn }
          : null;

        // Detail mode vs summary mode
        if (args?.detail) {
          return { content: [{ type: "text", text: JSON.stringify({
            currentlyWearing,
            total: outfits.length,
            outfits: outfits.map(o => ({
              ...o,
              timesWorn: o.timesWorn || 0,
              lastWorn: o.lastWorn || null,
              wearingToday: o.wearingToday || false,
              items: o.items.map(i => ({ ...i, hasPhoto: !!i.photo, photo: undefined })),
            })),
          }, null, 2) }] };
        }

        // Summary mode (default) — lightweight, token-efficient
        return { content: [{ type: "text", text: JSON.stringify({
          currentlyWearing,
          total: outfits.length,
          outfits: outfits.map(o => ({
            id: o.id,
            name: o.name,
            source: o.source || "manual",
            itemCount: o.items.length,
            categories: [...new Set(o.items.map(i => i.category))],
            timesWorn: o.timesWorn || 0,
            lastWorn: o.lastWorn || null,
            wearingToday: o.wearingToday || false,
            isFavourite: o.isFavourite || false,
          })),
        }, null, 2) }] };
      }

      case "get_weather": {
        const weather = await getWeather(args?.day || "today");
        if (!weather) {
          return { content: [{ type: "text", text: "Weather data unavailable — Open-Meteo might be down. You can still suggest outfits using manual weather tags." }] };
        }
        return { content: [{ type: "text", text: JSON.stringify(weather, null, 2) }] };
      }

      case "get_currently_wearing": {
        const data = readData();
        const wearingOutfit = (data.outfits || []).find(o => o.wearingToday);
        // Gather active items from ALL weekly pick categories
        const weeklyActive = {};
        for (const cat of (data.weeklyPicks || [])) {
          const active = cat.items.filter(i => i.active);
          if (active.length > 0) {
            weeklyActive[cat.name] = active.map(i => ({
              name: i.name,
              ...(i.colourFamily ? { colourFamily: i.colourFamily } : {}),
              ...(i.type ? { type: i.type } : {}),
              ...(i.description ? { description: i.description } : {}),
            }));
          }
        }
        return { content: [{ type: "text", text: JSON.stringify({
          outfit: wearingOutfit ? {
            id: wearingOutfit.id,
            name: wearingOutfit.name,
            source: wearingOutfit.source || "manual",
            items: wearingOutfit.items.map(i => `${i.name} (${i.category})`),
            timesWorn: wearingOutfit.timesWorn || 0,
          } : null,
          weeklyPicks: Object.keys(weeklyActive).length > 0 ? weeklyActive : null,
        }, null, 2) }] };
      }

      case "get_weekly_picks": {
        const data = readData();
        const picks = (data.weeklyPicks || []).map(cat => {
          const activeItems = cat.items.filter(i => i.active).map(i => ({
            name: i.name,
            ...(i.colourFamily ? { colourFamily: i.colourFamily } : {}),
            ...(i.type ? { type: i.type } : {}),
            ...(i.description ? { description: i.description } : {}),
          }));
          return {
            category: cat.name,
            totalItems: cat.items.length,
            active: activeItems.length > 0 ? activeItems : null,
          };
        });
        return { content: [{ type: "text", text: JSON.stringify(picks.length ? { weeklyPicks: picks } : { weeklyPicks: [], note: "No weekly picks set. User hasn't created any categories or toggled any items as active." }, null, 2) }] };
      }

      case "suggest_outfit": {
        const data = readData();
        // Exclude items in the laundry
        const items = (data.items || []).filter(i => !i.inLaundry);

        // Determine weather tag — support "tomorrow" for evening planning
        let weatherTag = args?.weather;
        if (!weatherTag) {
          const weather = await getWeather(args?.day || "today");
          if (weather) weatherTag = weather.suggestedWeatherTag;
        }

        const result = bestOutfit(items, {
          weather: weatherTag,
          vibe: args?.vibe || null,
          crimsonMoon: args?.crimsonMoon || false,
          chaos: args?.mode === "chaos",
          excludeLocations: args?.excludeLocations || [],
        });

        if (!result) {
          return { content: [{ type: "text", text: "Not enough items in the wardrobe to generate an outfit. Need at least 2 items!" }] };
        }

        // Return outfit with items (no photos) and metadata
        const outfit = {
          ...result,
          items: result.items.map(i => ({
            ...i,
            hasPhoto: !!i.photo,
            photo: undefined,
          })),
          weatherUsed: weatherTag,
        };
        return { content: [{ type: "text", text: JSON.stringify(outfit, null, 2) }] };
      }

      case "save_outfit": {
        const data = readData();
        const allItems = data.items || [];
        const ids = args.itemIds || [];
        const found = [];
        const failed = [];
        for (const id of ids) {
          const item = allItems.find(i => i.id === id);
          if (item) found.push(item);
          else failed.push(id);
        }

        if (found.length === 0) {
          return { content: [{ type: "text", text: `No valid item IDs provided. Failed IDs: ${ids.join(", ")}. Use get_wardrobe to see available items and their IDs.` }] };
        }
        const outfitItems = found;

        // ─── Duplicate detection: compare core items (top/bottom/dress/shoes) ───
        const coreCategories = new Set(["Top", "Bottom", "Dress", "Jumpsuit", "Matching Set", "Shoes"]);
        const newCoreIds = new Set(outfitItems.filter(i => coreCategories.has(i.category)).map(i => i.id));
        if (newCoreIds.size > 0 && !args.skipDuplicateCheck) {
          for (const existing of (data.outfits || [])) {
            const existingCoreIds = new Set(existing.items.filter(i => coreCategories.has(i.category)).map(i => i.id));
            if (existingCoreIds.size === newCoreIds.size && [...newCoreIds].every(id => existingCoreIds.has(id))) {
              return { content: [{ type: "text", text: JSON.stringify({
                duplicate: true,
                existingOutfit: { id: existing.id, name: existing.name, source: existing.source || "manual" },
                message: `This combination already exists as "${existing.name}"! Same core items (top/bottom/dress + shoes). You can: update the existing outfit, save anyway with skipDuplicateCheck: true, or pick different items.`,
              }, null, 2) }] };
            }
          }
        }

        const newOutfit = {
          name: args.name,
          items: outfitItems,
          vibes: args.vibes || [],
          weatherTags: args.weatherTags || [],
          source: args.source || "claude",
          notes: args.notes || "",
          id: Date.now(),
        };

        data.outfits.push(newOutfit);
        writeData(data);

        const warnings = failed.length > 0
          ? `\n⚠️ ${failed.length} item ID(s) not found: ${failed.join(", ")}`
          : "";

        return {
          content: [{
            type: "text",
            text: `Outfit "${args.name}" saved with ${outfitItems.length} items! (ID: ${newOutfit.id})\nItems: ${outfitItems.map(i => i.name).join(", ")}${warnings}`,
          }],
        };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  });

  return server;
}
