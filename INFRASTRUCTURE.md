# Shimmer Strip - Infrastructure

Single copy lives here at `~/Documents/sparkle_portal/shimmer-strip`.
Syncs to both MacBook and Mac Mini via iCloud.
Runs as a server on the Mac Mini only.

## What's Running (Mac Mini)

| Service | Details |
|---------|---------|
| Express server | Port **3002** (3000 is taken by echo-orion) |
| Cloudflare Tunnel | Via existing `echo-orion` tunnel (`d8cd62fe-45de-43ab-83d3-bf5729595aea`) |
| Public URL | `https://wardrobe.shimmergirlsparklebutt.com` |
| Data file | `~/Documents/sparkle_portal/shimmer-strip/data/wardrobe.json` |
| Logs | `~/Library/Logs/shimmer-strip/server.log` and `error.log` |

## LaunchAgent

**Server** — `~/Library/LaunchAgents/com.shimmerstrip.server.plist`
- Runs via `~/.local/bin/shimmer-strip-start.sh` (wrapper script needed because launchd can't directly access `~/Documents` due to macOS TCC privacy protections)
- KeepAlive + RunAtLoad (auto-restarts, starts on boot)

**Tunnel** — shares the existing `com.echorion.tunnel.plist`
- The wardrobe hostname is one of several ingress rules in `~/.cloudflared/config.yml`

## After Making Code Changes

Rebuild and restart:

```bash
cd ~/Documents/sparkle_portal/shimmer-strip
npm run build
launchctl kickstart -k gui/$(id -u)/com.shimmerstrip.server
```

## Setup History (2026-03-29)

- **Express 5 fix**: Changed `app.get('*', ...)` to `app.get('/{*splat}', ...)` in `server.js` — `path-to-regexp` v8 no longer accepts bare `*`
- **Port 3002**: Port 3000 is used by echo-orion (Next.js)
- **Shared tunnel**: Added `wardrobe.shimmergirlsparklebutt.com` as an ingress rule to the existing echo-orion tunnel config
- **DNS**: CNAME record added manually in Cloudflare dashboard (cloudflared cert is scoped to echo-orion.com's zone)
- **TCC workaround**: Start script and logs live outside `~/Documents` because macOS blocks launchd access to protected folders
- **Edit items**: Added PUT endpoint and edit UI so wardrobe entries can be modified after adding
- **New categories**: Added Matching Set and Pyjamas (Jumpsuit was already there)
