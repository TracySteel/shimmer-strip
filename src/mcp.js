// Shimmer Strip MCP Server — lets Claude pick outfits 🩵
//
// Tools:
//   get_wardrobe      — all items with metadata
//   get_wardrobe_summary — category/colour breakdown overview
//   get_outfits        — saved outfit combinations
//   get_weather        — current Milton Keynes weather
//   suggest_outfit     — algorithm-generated outfit
//   save_outfit        — save a new outfit combination

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
        description: "Get all wardrobe items with full metadata (name, category, colour, vibes, weather tags, photo URLs, apocalypse rating). Use filters to narrow results. Returns JSON array of items.",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", description: "Filter by category: Top, Bottom, Dress, Matching Set, Jumpsuit, Pyjamas, Jacket, Cardigan, Shoes, Accessory, Bag, Hat, Jewellery" },
            colour: { type: "string", description: "Filter by colour name" },
            vibe: { type: "string", description: "Filter by vibe tag" },
            weather: { type: "string", description: "Filter by weather tag: Hot, Warm, Mild, Cold, Rainy" },
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
        description: "Get all saved outfit combinations with their names, items, vibes, and weather tags.",
        inputSchema: { type: "object", properties: {} },
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
        description: "Save a new outfit combination. Provide item IDs from the wardrobe, a name, and optional tags.",
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
              enum: ["claude", "manual", "chaos", "snail", "smart"],
              description: "How this outfit was created",
            },
            notes: { type: "string", description: "Optional notes about the outfit" },
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
        const outfits = (data.outfits || []).map(o => ({
          ...o,
          items: o.items.map(i => ({ ...i, hasPhoto: !!i.photo, photo: undefined })),
        }));
        return { content: [{ type: "text", text: JSON.stringify(outfits, null, 2) }] };
      }

      case "get_weather": {
        const weather = await getWeather(args?.day || "today");
        if (!weather) {
          return { content: [{ type: "text", text: "Weather data unavailable — Open-Meteo might be down. You can still suggest outfits using manual weather tags." }] };
        }
        return { content: [{ type: "text", text: JSON.stringify(weather, null, 2) }] };
      }

      case "suggest_outfit": {
        const data = readData();
        const items = data.items || [];

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
        const outfitItems = ids.map(id => allItems.find(i => i.id === id)).filter(Boolean);

        if (outfitItems.length === 0) {
          return { content: [{ type: "text", text: "No valid item IDs provided. Use get_wardrobe to see available items and their IDs." }] };
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

        return {
          content: [{
            type: "text",
            text: `Outfit "${args.name}" saved with ${outfitItems.length} items! (ID: ${newOutfit.id})\nItems: ${outfitItems.map(i => i.name).join(", ")}`,
          }],
        };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  });

  return server;
}
