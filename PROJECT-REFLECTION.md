# Project Reflection: The Shimmer Strip

**Date:** Vrijdag, 27 March 2026
**Built by:** Tracy + Claude Ode 🐌✨

---

## What We Built

A personal wardrobe management app called **The Shimmer Strip** - part of the shimmergirlsparklebutt.com portal ecosystem. It's a React + Vite app with an Express backend for cross-device data persistence, designed to help Tracy pick outfits with both smart logic and chaotic abandon.

## Key Features

- **Wardrobe registry** with photos, colour tagging, vibe tagging, weather suitability, and apocalypse readiness ratings
- **Smart Surprise Me** - generates outfits following structure rules (dress / top+bottom / jumpsuit+layer), weather awareness, vibe filtering, and Crimson Moon comfort mode
- **Chaos Mode** - absolutely no rules, unhinged outfit generation with sassy commentary
- **Colour matching engine** - warm/cool/neutral harmony scoring with expandable custom colour palette
- **Cross-device sync** via a JSON file on disk, accessible through Cloudflare Tunnel

## What Went Well

- **The aesthetic landed immediately** - the warm earthy palette with spiral motifs felt right from the first render. The dark background with gold accents creates that cosy-but-elevated feel.
- **Feature iteration was smooth** - started with the core wardrobe, then layered on weather tags, delete confirmation, and custom colours in a second pass. Each addition slotted in cleanly.
- **The chaos mode messages are genuinely funny** - "nimbus would be proud (nimbus has no taste)" is a personal favourite.
- **No Git disasters!** A clean record achieved through the bold strategy of not using Git at all. Tracy: 1, Git: 0.
- **The storage evolution made sense** - started with localStorage for fast iteration, then upgraded to a server-backed JSON file when mobile access became a requirement. The app still falls back to localStorage if the server's not available.

## What Could Be Improved / Future Ideas

- **AI-powered outfit suggestions** - Tracy mentioned wanting to integrate AI for colour matching later. Could feed wardrobe data into Claude for personalised styling advice.
- **Outfit history / calendar** - "what did I wear last Tuesday?" tracking
- **Edit items** - currently you can only add and remove, not edit an existing item's tags or photo
- **Outfit photos** - snap a photo of yourself in the outfit to see what actually worked
- **Seasonal rotation** - archive pieces you're not currently wearing
- **The portal integration** - linking from shimmergirlsparklebutt.com's homepage (designed by ShimmerClaude) to the wardrobe subdomain

## Technical Decisions

| Decision | Why |
|----------|-----|
| Vite + React | Fast to build, Tracy's comfortable with it, deploys anywhere |
| JSON file on disk | No database overhead, easy to back up, human-readable |
| Express server | Minimal, serves both the API and the static files |
| Colour harmony scoring | Weighted system that knows warm/cool/neutral theory but can be overridden by chaos mode |
| localStorage fallback | App still works if server is down - graceful degradation |

## Architecture

```
shimmer-strip/
├── server.js          # Express server (API + static files)
├── data/
│   └── wardrobe.json  # All wardrobe data (the "database")
├── src/
│   ├── App.jsx        # Main UI with all views
│   ├── colours.js     # Colour definitions + harmony scoring
│   ├── outfitEngine.js # Smart + chaos outfit generation
│   ├── storage.js     # API client with localStorage fallback
│   └── main.jsx       # React entry point
├── dist/              # Built static files
├── MAC-MINI-SETUP.md  # Migration guide
└── package.json
```

## The Vibe

This project has that specific energy of building something just for yourself - no users to please, no stakeholders to report to, just "I want to know what to wear and I want a snail to help me decide." That's the best kind of software.

The Shimmer Strip joins the shimmergirlsparklebutt.com constellation alongside future projects like Plushipedia, the Orion Archives, and whatever the mystery portal turns out to be. The spiral grows. 🌀

---

*"They're all my favourite" — and they will be* 💖
