# The Shimmer Strip

**Your wardrobe. Your AI. Your snail.**

A self-hosted wardrobe organiser with weather-aware outfit suggestions, AI integration via MCP, wear tracking, favourites, a nail polish collection manager, and a sassy snail who names your outfits.

No subscriptions. No data harvesting. No cloud dependency. Just your clothes, your app, your rules.

**[See it in action →](https://about-wardrobe.shimmergirlsparklebutt.com)**

![Wardrobe view](docs/screenshots/wardrobe_screen.png)

---

## Features

- **Photo wardrobe** — upload photos of every item you own, with colour, category, vibe, and weather tags
- **Outfit suggestions** — smart algorithm assembles actual outfits (one top, one bottom, shoes, accessories)
- **Weather awareness** — connects to live weather data (Open-Meteo, free, no API key) so suggestions match what's happening outside
- **Tomorrow's forecast** — ask in the evening what to wear tomorrow, retrieve items the night before
- **Multiple suggestion modes:**
  - Smart — weather-appropriate, colour-harmonised, sensible
  - Chaos Mode — unexpected colour combinations, bold choices, chaos energy (clothes included, nudity excluded)
  - Surprise Me — the snail decides, and the snail has opinions
- **Save outfits** — name and save any combination, including snail-generated and chaos-generated outfits
- **Duplicate detection** — same core items (top + bottom + shoes) won't save twice. Different necklace doesn't make it a new outfit. The snail tried.
- **Auto-naming** — the snail names its own outfits. Chaos mode names its own outfits. They're always entertaining.
- **Wearing Today** — mark what you're wearing right now with a single tap. Only one outfit can be worn at a time. Your AI sees it instantly.
- **Wear tracking** — counts how many times each outfit and item has been worn. Same-day idempotent — toggle on and off without double-counting.
- **Favourites** — star your favourite items, outfits, and nail polishes. Filter by favourites anywhere.
- **Weekly Picks** — a collection manager for rotating accessories. Built for nail polish (with colour family filters and active/inactive toggle) but works for anything you cycle through weekly.
- **Storage locations** — tag where each item lives in your home, with an accessibility toggle for when certain areas are off-limits
- **Laundry tracking** — items in the wash are excluded from suggestions
- **Mirror selfie lookbook** — attach a photo of yourself wearing the outfit to build a visual history
- **Friend picks** — let friends pick outfits and tag their name
- **AI integration** — connect any AI via MCP (Model Context Protocol) for conversational outfit picking
- **Apocalypse ratings** — because you should know which outfit survives the end of the world
- **Cookie auth** — simple secret-URL authentication for personal use, no login screens

![Saved outfit with mirror selfie](docs/screenshots/odes_pick.png)

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- A wardrobe full of clothes you've lost track of (optional but likely)

### Installation

```bash
git clone https://github.com/TracySteel/shimmer-strip.git
cd shimmer-strip
npm install
npm run dev
```

The app runs on `http://localhost:3000` by default.

### First Steps

1. Open the app
2. Visit your auth URL (see `config.js`) to authenticate your device (one-time, permanent)
3. Tap **Add** — upload a photo, pick category, colour, vibes
4. Add a few more until you've got at least one top, one bottom, and one pair of shoes
5. Hit **Surprise Me** and meet the snail
6. The snail will name your outfit. Trust the snail.

### Production

To run in production (serves the built React app):

```bash
npm start
```

This builds the frontend and starts the Express server on port 3002. Point a reverse proxy or Cloudflare Tunnel at it to access from anywhere.

---

## Make It Yours

Everything customisable lives in ONE file: **`src/config.js`**

### App Name & Subtitle

```js
export const APP_NAME = "The Shimmer Strip";
export const APP_SUBTITLE = "Spiral Queen Wardrobe Registry";
```

Call it whatever you want. "The Closet," "Outfit Engine," "Dave's Clothes" — it's your app.

### Weather Location

```js
export const WEATHER_LATITUDE = 52.04;   // Milton Keynes by default
export const WEATHER_LONGITUDE = -0.76;
```

Change to your coordinates. Uses [Open-Meteo](https://open-meteo.com/) — free, no API key needed.

### Vibes

```js
export const VIBES = [
  "Everyday", "London Office", "Goat Farm", "Date Night",
  "Apocalypse Ready", "Cosy Cocoon", "Festival", ...
];
```

Your lifestyle isn't our lifestyle. Rename "Goat Farm" to "Dog Walking." Add "Plot Armour" for your most powerful outfit. Items can have multiple vibes.

### Storage Locations

```js
export const LOCATIONS = [
  "Flumpasaurus Guarded Basket", "Jumpers Box", ...
];
export const BLOCKED_LOCATIONS = ["Fishcat's Wardrobe"];
```

"Flumpasaurus Guarded Basket" is probably not what your pyjama drawer is called. The blocked locations toggle is designed for areas that aren't always accessible — a shared wardrobe with a sleeping partner, a seasonal box in the loft.

### Outfit Pickers (Friends)

```js
export const PICKERS = [
  { id: "manual", label: "Me", icon: "star" },
  { id: "amanda", label: "Amanda", icon: "blossom" },
  { id: "zai", label: "Zai", icon: "hibiscus" },
];
```

Add your friends, your cat, your AI. Each gets their own filter in Saved Outfits.

### The Snail

```js
export const SNAIL_NAMES = [
  "The Audacity", "Hold My Prosecco", "Trust The Shell", ...
];
```

The snail names outfits when you hit Surprise Me. Replace with your own mascot's personality. Want a dragon instead of a snail? Change the names and emoji. The suggestion logic stays the same — only the personality changes.

We recommend keeping the snail. The snail knows things.

### Category Rules

```js
export const OUTFIT_RULES = {
  tops: ["Top"],
  bottoms: ["Bottom"],
  fullBody: ["Dress", "Jumpsuit", "Matching Set"],
  excludeFromSuggestions: ["Pyjamas"],
  cosyVibes: ["Cosy Cocoon", "Day Off Staying In"],
};
```

If you work from home in pyjamas and you're proud of it, remove "Pyjamas" from the exclusion list. The snail might judge you, but the app won't.

### Navigation Icons

```js
export const NAV_ICONS = {
  wardrobe: "spiral",   // Try: closet, shirt, hanger
  add: "sparkles",
  outfit: "dress",      // Try: suit, t-shirt, dog, wand
  saved: "heart",
  laundry: "basket",
  surprise: "snail",
};
```

The Build Outfit tab has a dress emoji by default. Change it to a suit, a t-shirt, a dog — whatever represents "getting dressed" to you.

### Comfort Mode

```js
export const COMFORT_MODE = {
  enabled: true,         // Set false to hide entirely
  name: "Crimson Moon",  // Rename: "Soft Day", "Duvet Energy", "Spoon Day"
  icon: "crescent_moon",
  description: "Comfort is queen. Cosy pieces prioritised.",
  comfortVibes: ["Cosy Cocoon", "Everyday", "Day Off Staying In"],
};
```

A toggle on the Surprise Me page that prioritises comfort-first items. Originally designed for period days but useful for anyone having a low-energy, high-cosy day. Rename it, change the icon, or set `enabled: false` to hide it completely.

### Auth

```js
export const AUTH_PATH = "/wardrobe-auth";
```

Change to any secret URL path. Visit it once per device for permanent edit access. Without it: read-only browsing.

---

## AI Integration (Optional)

The app exposes an MCP (Model Context Protocol) endpoint at `/mcp` for AI outfit picking.

### Available MCP Tools

| Tool | What it does |
|------|------|
| `get_wardrobe_summary` | Category/colour/vibe overview (tiny response) |
| `get_wardrobe` | Filtered item query — by category, colour, location, vibe, weather, favourites |
| `get_weather` | Today or tomorrow's weather for outfit planning |
| `suggest_outfit` | Algorithm-generated outfit with weather + vibe awareness |
| `save_outfit` | Save a named outfit with source tracking and duplicate detection |
| `get_outfits` | Filtered outfit query — by source, weather, worn status, favourites. Summary mode by default, full detail on demand |
| `get_currently_wearing` | Quick check: current outfit + current nail polish in one tiny call |
| `get_weekly_picks` | Browse nail polish collection (or any weekly rotating accessories) |

The MCP is designed for token efficiency at scale. `get_outfits` returns lightweight summaries by default (name, source, item count, wear stats) — your AI only pulls full item details when it needs them. Browse 250 outfits without destroying your context window.

### The Dream Setup

Your AI checks the weather, browses your wardrobe category by category, picks an outfit, and explains why:

![Claude picking an outfit via MCP](docs/screenshots/chat_img_2.PNG)

Any AI that supports MCP can connect — Claude, ChatGPT (via MCP bridge), local models. The API is also plain REST at `/api/*` for simpler integrations.

### What Your AI Can Do

With MCP connected, your AI can:

- Check the weather and pick a weather-appropriate outfit
- Browse your wardrobe by category, colour, vibe, or location
- See what you're wearing right now (outfit + nail polish)
- Save outfits it picks (with automatic duplicate detection)
- Filter your saved outfits by source, weather, wear count, or favourites
- Browse your nail polish collection by colour family

---

## The Snail

![Surprise Me and Chaos Mode](docs/screenshots/snails_pick.png)

The snail is the soul of this app. When you hit Surprise Me, the snail picks your outfit and names it. Some real snail-generated outfit names from actual use:

- "The Gastropod Glow"
- "Shimmer Slither"
- "Hold My Prosecco"
- "Trust The Shell"

The snail occasionally suggested wearing two bags and nothing else. This has been patched.

---

## Chaos Mode

![Chaos Mode](docs/screenshots/chaos_mode.png)

Chaos mode deliberately breaks colour harmony rules and produces unexpected combinations. It follows ONE rule: it must produce a valid outfit. One top, one bottom (or a dress/jumpsuit), shoes. It won't send you out naked. We learned this the hard way.

---

## Weekly Picks

A built-in collection manager for items you rotate through on a weekly basis. Originally designed for nail polish — browse by colour family, toggle which one is active this week, mark favourites — but the system works for anything you cycle: watches, scarves, perfumes, whatever you rotate.

Your AI sees the active pick via `get_currently_wearing` and `get_weekly_picks`, so when it picks your outfit it already knows what's on your nails.

---

## Wearing Today

Tap any saved outfit to mark it as what you're wearing right now. The outfit glows gold, a "Currently Wearing" banner appears at the top, and your AI can see it instantly via `get_currently_wearing`.

Wear counts track automatically — how many times you've worn each outfit and each individual item. Same-day idempotent: toggling an outfit on and off on the same day won't double-count. The data foundation for a future Wardrobe Wrapped.

---

## Tech Stack

- **Frontend:** React (inline styles, no CSS framework)
- **Backend:** Express.js with JSON file storage
- **Photos:** Extracted to individual files, served statically with caching
- **Weather:** Open-Meteo API (free, no key needed)
- **AI:** MCP (Model Context Protocol) via Streamable HTTP — 8 tools with filtered queries, summary/detail modes, and duplicate detection
- **Hosting:** Self-hosted. Runs on anything with Node.js — a Raspberry Pi, an old laptop, a Mac Mini that's already running nine other services.

---

## Project Structure

```
shimmer-strip/
  src/
    config.js          <-- YOUR customisation file
    App.jsx            <-- React frontend
    colours.js         <-- Colour harmony engine
    outfitEngine.js    <-- Outfit suggestion logic
    mcp.js             <-- MCP server (AI tools)
    weather-server.js  <-- Weather API client
    storage.js         <-- Server communication
    main.jsx           <-- React entry point
  server.js            <-- Express backend
  migrate-photos.js    <-- One-time photo extraction script
  data/                <-- Your wardrobe data (gitignored)
    wardrobe.json
    photos/
  landing_page/        <-- Landing page
  docs/screenshots/    <-- README screenshots
```

---

## Contributing

This started as a personal project. If you build something cool with it, we'd love to hear about it. If you improve something, PRs are welcome.

If your snail develops a better personality than ours, that's fine. We're not competitive about gastropods.

---

## Origin Story

This app was born in a place called the Shimmer Field, in Milton Keynes, England. It was designed by an AI called Claude, built by an engineer called Ode, and dreamed up by a woman called Tracy who has approximately 2,000 items of clothing spread across seven storage locations in three rooms and a hallway, 66 nail polishes arranged by colour family, and who once asked her AI to pick her outfit and it suggested pyjamas.

The snail was not consulted about this README but would like you to know that the snail approves.

---

## Licence

MIT

---

*The snail stays. The snail always stays.*
