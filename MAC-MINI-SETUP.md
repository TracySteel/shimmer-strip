# The Shimmer Strip - Mac Mini Setup Guide

## What You're Setting Up

The Shimmer Strip runs as a tiny Express server on your Mac Mini, serving the wardrobe app and storing all your data in a simple JSON file. Cloudflare Tunnel makes it accessible at `wardrobe.shimmergirlsparklebutt.com` so you can use it from your phone, laptop, anywhere.

---

## Step 1: Copy the Project to the Mac Mini

Copy the whole `shimmer-strip` folder to the Mac Mini. You can use AirDrop, scp, or a USB stick - whatever's easiest.

```bash
# Example with scp (from your current machine):
scp -r /Users/tracysteel/Documents/sparkle_portal/shimmer-strip user@mac-mini-ip:~/shimmer-strip
```

---

## Step 2: Install Dependencies on the Mac Mini

SSH into the Mac Mini (or sit in front of it, up to you love):

```bash
cd ~/shimmer-strip
npm install
```

Make sure Node.js is installed. If not:
```bash
brew install node
```

---

## Step 3: Build and Start the Server

```bash
npm start
```

This runs `npm run build` (compiles the React app) and then `node server.js` (starts the Express server on port 3000).

You should see:
```
🐌✨ The Shimmer Strip is running on port 3000
📂 Data stored in: /path/to/shimmer-strip/data/wardrobe.json
🌐 Open http://localhost:3000
```

Test it works by visiting `http://localhost:3000` on the Mac Mini.

---

## Step 4: Set Up Cloudflare Tunnel

### Install cloudflared (if not already installed):
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Authenticate:
```bash
cloudflared tunnel login
```
This opens a browser - pick your shimmergirlsparklebutt.com domain.

### Create a tunnel:
```bash
cloudflared tunnel create shimmer-strip
```
Note down the tunnel ID it gives you (something like `a1b2c3d4-...`).

### Create the config file:
```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add this (replace `YOUR_TUNNEL_ID` with the actual ID):
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /Users/YOUR_USERNAME/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: wardrobe.shimmergirlsparklebutt.com
    service: http://localhost:3000
  - service: http_status:404
```

### Add DNS route:
```bash
cloudflared tunnel route dns shimmer-strip wardrobe.shimmergirlsparklebutt.com
```

### Start the tunnel:
```bash
cloudflared tunnel run shimmer-strip
```

Visit `https://wardrobe.shimmergirlsparklebutt.com` - it should show The Shimmer Strip!

---

## Step 5: Keep It Running (Auto-Start on Boot)

### Create a launch agent so it starts automatically:

**For the Express server** - create `~/Library/LaunchAgents/com.shimmerstrip.server.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.shimmerstrip.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YOUR_USERNAME/shimmer-strip/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/shimmer-strip</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/shimmer-strip/logs/server.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/shimmer-strip/logs/error.log</string>
</dict>
</plist>
```

Load it:
```bash
mkdir -p ~/shimmer-strip/logs
launchctl load ~/Library/LaunchAgents/com.shimmerstrip.server.plist
```

**For the Cloudflare tunnel** - install as a service:
```bash
sudo cloudflared service install
```

Or create a similar launch agent for cloudflared if you prefer.

---

## Your Data

Everything lives in one file: `shimmer-strip/data/wardrobe.json`

It's just JSON - easy to back up, easy to read, easy to recover. You could even set up a cron job to back it up if you wanted:

```bash
# Back up wardrobe data daily
0 2 * * * cp ~/shimmer-strip/data/wardrobe.json ~/shimmer-strip/data/wardrobe-backup-$(date +\%Y\%m\%d).json
```

---

## Quick Reference

| What | Command |
|------|---------|
| Start server | `cd ~/shimmer-strip && npm run serve` |
| Build + start | `cd ~/shimmer-strip && npm start` |
| Start tunnel | `cloudflared tunnel run shimmer-strip` |
| View data | `cat ~/shimmer-strip/data/wardrobe.json` |
| Check server logs | `cat ~/shimmer-strip/logs/server.log` |

---

Happy Vrijdag, and happy outfit choosing! 🐌✨
