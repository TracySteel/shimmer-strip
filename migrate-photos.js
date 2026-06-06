#!/usr/bin/env node
// ─── Photo Migration Script ───
// Extracts base64 photos from wardrobe.json into individual files.
// Replaces inline base64 with URL paths.
// Strips photo data from outfit item snapshots (they're duplicates).
//
// Run once: node migrate-photos.js
// Safe to run multiple times — skips already-migrated items.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
const DATA_FILE = path.join(DATA_DIR, 'wardrobe.json');

// Ensure photos directory exists
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

function isBase64Photo(val) {
  return typeof val === 'string' && val.startsWith('data:image/');
}

function saveBase64(base64Data, filename) {
  // Parse: data:image/jpeg;base64,/9j/4AAQ...
  const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!match) {
    console.warn(`  Could not parse base64 for ${filename}`);
    return null;
  }

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const fullFilename = `${filename}.${ext}`;
  const filePath = path.join(PHOTOS_DIR, fullFilename);

  fs.writeFileSync(filePath, buffer);
  return `/photos/${fullFilename}`;
}

// ─── Main Migration ───
console.log('\n  🐌 Shimmer Strip Photo Migration');
console.log('  ─────────────────────────────────\n');

const raw = fs.readFileSync(DATA_FILE, 'utf-8');
const data = JSON.parse(raw);

const originalSize = Buffer.byteLength(raw, 'utf-8');
console.log(`  Original JSON size: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Items: ${data.items?.length || 0}`);
console.log(`  Outfits: ${data.outfits?.length || 0}\n`);

let photosExtracted = 0;
let selfiesExtracted = 0;
let outfitPhotosStripped = 0;

// 1. Extract item photos
console.log('  📸 Extracting item photos...');
for (const item of (data.items || [])) {
  if (isBase64Photo(item.photo)) {
    const url = saveBase64(item.photo, `item-${item.id}`);
    if (url) {
      item.photo = url;
      photosExtracted++;
      process.stdout.write(`  ✓ ${item.name}\n`);
    }
  }
}

// 2. Extract outfit selfies + strip photos from outfit item snapshots
console.log('\n  🪞 Extracting outfit selfies...');
for (const outfit of (data.outfits || [])) {
  // Extract selfie
  if (isBase64Photo(outfit.selfie)) {
    const url = saveBase64(outfit.selfie, `selfie-${outfit.id}`);
    if (url) {
      outfit.selfie = url;
      selfiesExtracted++;
      process.stdout.write(`  ✓ ${outfit.name} (selfie)\n`);
    }
  }

  // Strip photos from outfit item snapshots (they're duplicates of item photos)
  for (const item of (outfit.items || [])) {
    if (isBase64Photo(item.photo)) {
      // Find the corresponding item in the main items array
      const mainItem = data.items?.find(i => i.id === item.id);
      if (mainItem && mainItem.photo) {
        // Use the same URL as the main item
        item.photo = mainItem.photo;
      } else {
        // Orphaned photo in outfit — extract it too
        const url = saveBase64(item.photo, `outfit-item-${outfit.id}-${item.id}`);
        if (url) item.photo = url;
      }
      outfitPhotosStripped++;
    }
  }
}

// 3. Write cleaned JSON
const cleaned = JSON.stringify(data, null, 2);
const newSize = Buffer.byteLength(cleaned, 'utf-8');

fs.writeFileSync(DATA_FILE, cleaned, 'utf-8');

console.log('\n  ─────────────────────────────────');
console.log(`  📸 Item photos extracted: ${photosExtracted}`);
console.log(`  🪞 Selfies extracted: ${selfiesExtracted}`);
console.log(`  🧹 Outfit photo copies stripped: ${outfitPhotosStripped}`);
console.log(`  📦 JSON: ${(originalSize / 1024 / 1024).toFixed(1)} MB → ${(newSize / 1024).toFixed(0)} KB`);
console.log(`  💨 Saved: ${((originalSize - newSize) / 1024 / 1024).toFixed(1)} MB\n`);
console.log('  🐌 Migration complete! The snail approves. ✨\n');
