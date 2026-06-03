import { outfitColourScore } from './colours.js';

/**
 * Outfit structure rules:
 * - jumpsuit (+ optional layering top)
 * - dress (+ optional jacket/cardigan)
 * - top + bottom (trousers/skirt/shorts)
 * Each can optionally have: jacket, shoes, bag, hat, jewellery, accessory
 */

const TOPS = ["Top"];
const BOTTOMS = ["Bottom"]; // trousers, skirts, shorts are all "Bottom" category
const FULL_BODY = ["Dress", "Jumpsuit"];
const LAYERS = ["Jacket"];
const ACCESSORIES = ["Shoes", "Bag", "Hat", "Jewellery", "Accessory"];

// Weather affects what's appropriate
const WEATHER_CONFIG = {
  "Hot": {
    avoid: ["Jacket"],
    prefer: ["Dress"],
    layerChance: 0.1,
    accessoryBonus: ["Hat"],
  },
  "Warm": {
    avoid: [],
    prefer: [],
    layerChance: 0.3,
    accessoryBonus: [],
  },
  "Mild": {
    avoid: [],
    prefer: [],
    layerChance: 0.6,
    accessoryBonus: [],
  },
  "Cold": {
    avoid: ["Dress"],
    prefer: ["Jacket"],
    layerChance: 0.95,
    accessoryBonus: ["Hat"],
  },
  "Rainy": {
    avoid: [],
    prefer: ["Jacket"],
    layerChance: 0.9,
    accessoryBonus: [],
  },
};

// Crimson moon adjustments - comfort is queen
const CRIMSON_MOON_VIBES = ["Cosy Cocoon", "Everyday", "Codeineificated"];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeightedByColour(candidates, existingItems) {
  if (candidates.length === 0) return null;
  if (existingItems.length === 0) return pickRandom(candidates);

  // Weight by colour match score
  const weights = candidates.map(item => {
    const scores = existingItems.map(existing =>
      outfitColourScore([item, existing])
    );
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.pow(avgScore, 2); // square to emphasize good matches
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return pickRandom(candidates);

  let r = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/**
 * Generate a smart outfit based on parameters
 */
export function generateSmartOutfit(items, params = {}) {
  const {
    weather = "Mild",
    vibe = null,
    crimsonMoon = false,
  } = params;

  if (items.length < 2) return null;

  const weatherConfig = WEATHER_CONFIG[weather] || WEATHER_CONFIG["Mild"];

  // Exclude pyjamas/nightwear unless specifically in cosy/staying-in vibe
  const cosyVibes = ["Cosy Cocoon", "Codeineificated", "Day Off Staying In"];
  const allowPyjamas = vibe && cosyVibes.includes(vibe);
  const eligible = allowPyjamas ? items : items.filter(i => i.category !== "Pyjamas");

  // Filter by weather suitability tags if items have them
  let weatherFiltered = eligible;
  if (weather) {
    const weatherTagged = items.filter(i => i.weatherTags && i.weatherTags.includes(weather));
    // Use weather-tagged items if we have enough, otherwise fall back to all
    if (weatherTagged.length >= 2) weatherFiltered = weatherTagged;
  }

  // Filter items by vibe if specified
  let vibeFiltered = weatherFiltered;
  if (vibe) {
    const vibeItems = items.filter(i => i.vibes && i.vibes.includes(vibe));
    // Fall back to all items if not enough vibe-specific ones
    if (vibeItems.length >= 2) vibeFiltered = vibeItems;
  }

  // Crimson moon override: prioritise comfort vibes
  if (crimsonMoon) {
    const comfyItems = items.filter(i =>
      i.vibes && i.vibes.some(v => CRIMSON_MOON_VIBES.includes(v))
    );
    if (comfyItems.length >= 2) vibeFiltered = comfyItems;
  }

  // Categorise available items
  const tops = vibeFiltered.filter(i => TOPS.includes(i.category));
  const bottoms = vibeFiltered.filter(i => BOTTOMS.includes(i.category));
  const fullBody = vibeFiltered.filter(i => FULL_BODY.includes(i.category));
  const layers = vibeFiltered.filter(i => LAYERS.includes(i.category));
  const accessories = vibeFiltered.filter(i => ACCESSORIES.includes(i.category));

  // Apply weather avoidance
  const weatherFullBody = weatherConfig.avoid.includes("Dress")
    ? fullBody.filter(i => i.category !== "Dress")
    : fullBody;

  // Decide outfit structure
  const canDoFullBody = weatherFullBody.length > 0;
  const canDoTopBottom = tops.length > 0 && bottoms.length > 0;

  let outfit = [];
  let structure = "";

  if (!canDoFullBody && !canDoTopBottom) {
    // Not enough categorised items - just pick what we can
    const available = [...vibeFiltered];
    while (outfit.length < Math.min(3, available.length)) {
      const pick = pickWeightedByColour(
        available.filter(i => !outfit.find(o => o.id === i.id)),
        outfit
      );
      if (!pick) break;
      outfit.push(pick);
    }
    return { items: outfit, structure: "mixed", colourScore: outfitColourScore(outfit) };
  }

  // Weighted choice between full body and top+bottom
  if (canDoFullBody && canDoTopBottom) {
    const fullBodyWeight = weatherConfig.prefer.includes("Dress") ? 0.6 : 0.4;
    structure = Math.random() < fullBodyWeight ? "fullBody" : "topBottom";
  } else if (canDoFullBody) {
    structure = "fullBody";
  } else {
    structure = "topBottom";
  }

  if (structure === "fullBody") {
    const mainPiece = pickRandom(weatherFullBody);
    outfit.push(mainPiece);

    // Maybe add a layering top underneath jumpsuits
    if (mainPiece.category === "Jumpsuit" && tops.length > 0 && Math.random() > 0.4) {
      const layerTop = pickWeightedByColour(
        tops.filter(i => i.id !== mainPiece.id),
        outfit
      );
      if (layerTop) outfit.push(layerTop);
    }
  } else {
    // Top + Bottom
    const top = pickRandom(tops);
    outfit.push(top);
    const bottom = pickWeightedByColour(
      bottoms.filter(i => i.id !== top.id),
      outfit
    );
    if (bottom) outfit.push(bottom);
  }

  // Layer (jacket/cardigan)?
  const shouldLayer = Math.random() < weatherConfig.layerChance;
  const weatherLayers = weatherConfig.avoid.includes("Jacket")
    ? []
    : layers;
  if (shouldLayer && weatherLayers.length > 0) {
    const layer = pickWeightedByColour(
      weatherLayers.filter(i => !outfit.find(o => o.id === i.id)),
      outfit
    );
    if (layer) outfit.push(layer);
  }

  // Shoes (always try to add)
  const shoes = accessories.filter(i => i.category === "Shoes");
  if (shoes.length > 0) {
    const shoe = pickWeightedByColour(shoes, outfit);
    if (shoe) outfit.push(shoe);
  }

  // Bag (sometimes)
  const bags = accessories.filter(i => i.category === "Bag");
  if (bags.length > 0 && Math.random() > 0.3) {
    const bag = pickWeightedByColour(bags, outfit);
    if (bag) outfit.push(bag);
  }

  // Other accessories (hat, jewellery, etc)
  const otherAcc = accessories.filter(i =>
    !["Shoes", "Bag"].includes(i.category) &&
    !outfit.find(o => o.id === i.id)
  );
  // Weather bonus accessories
  const bonusCategories = weatherConfig.accessoryBonus;
  for (const cat of bonusCategories) {
    const bonusItems = otherAcc.filter(i => i.category === cat);
    if (bonusItems.length > 0) {
      const pick = pickWeightedByColour(bonusItems, outfit);
      if (pick) outfit.push(pick);
    }
  }
  // Maybe one more random accessory
  if (Math.random() > 0.5) {
    const remaining = otherAcc.filter(i => !outfit.find(o => o.id === i.id));
    if (remaining.length > 0) {
      const pick = pickWeightedByColour(remaining, outfit);
      if (pick) outfit.push(pick);
    }
  }

  return {
    items: outfit,
    structure,
    colourScore: outfitColourScore(outfit),
  };
}

/**
 * CHAOS MODE - absolutely no rules, pure randomness
 */
export function generateChaosOutfit(items) {
  if (items.length < 2) return null;

  // Exclude pyjamas from chaos too — chaos colours, not chaos nightwear
  const eligible = items.filter(i => i.category !== "Pyjamas");

  // Chaos means chaos COLOURS, not chaos structure — still need a valid outfit!
  const tops = eligible.filter(i => TOPS.includes(i.category));
  const bottoms = eligible.filter(i => BOTTOMS.includes(i.category));
  const fullBody = eligible.filter(i => FULL_BODY.includes(i.category));
  const shoes = eligible.filter(i => i.category === "Shoes");
  const layers = eligible.filter(i => LAYERS.includes(i.category));
  const accessories = eligible.filter(i => ACCESSORIES.includes(i.category) && i.category !== "Shoes");

  let outfit = [];

  // Core structure: full body OR top+bottom (random pick, ignoring colour harmony)
  if (fullBody.length > 0 && tops.length > 0 && bottoms.length > 0) {
    if (Math.random() < 0.3) {
      outfit.push(pickRandom(fullBody));
    } else {
      outfit.push(pickRandom(tops));
      outfit.push(pickRandom(bottoms));
    }
  } else if (fullBody.length > 0) {
    outfit.push(pickRandom(fullBody));
  } else if (tops.length > 0 && bottoms.length > 0) {
    outfit.push(pickRandom(tops));
    outfit.push(pickRandom(bottoms));
  } else {
    // Fallback: just grab random non-duplicate-category items
    const used = new Set();
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    for (const item of shuffled) {
      if (!used.has(item.category) && outfit.length < 4) {
        outfit.push(item);
        used.add(item.category);
      }
    }
  }

  // Shoes (always try)
  if (shoes.length > 0) outfit.push(pickRandom(shoes));

  // Maybe a layer
  if (layers.length > 0 && Math.random() > 0.5) outfit.push(pickRandom(layers));

  // Random accessories (1-2)
  const shuffledAcc = [...accessories].sort(() => Math.random() - 0.5);
  const accCount = Math.floor(Math.random() * 3); // 0, 1, or 2
  for (let i = 0; i < accCount && i < shuffledAcc.length; i++) {
    if (!outfit.find(o => o.id === shuffledAcc[i].id)) {
      outfit.push(shuffledAcc[i]);
    }
  }

  const chaosMessages = [
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

  return {
    items: outfit,
    structure: "chaos",
    colourScore: outfitColourScore(outfit),
    chaosMessage: chaosMessages[Math.floor(Math.random() * chaosMessages.length)],
  };
}

/**
 * Generate multiple outfits and pick the best colour match
 */
export function generateBestOutfit(items, params, attempts = 5) {
  let best = null;
  for (let i = 0; i < attempts; i++) {
    const outfit = generateSmartOutfit(items, params);
    if (!outfit) return null;
    if (!best || outfit.colourScore > best.colourScore) {
      best = outfit;
    }
  }
  return best;
}
