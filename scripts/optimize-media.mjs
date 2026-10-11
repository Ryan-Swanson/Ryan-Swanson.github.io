#!/usr/bin/env node
// Turns reviewed raw captures into web-ready WebP files under public/media and
// writes src/content/media.generated.json.
//
// Usage: node scripts/optimize-media.mjs <media-map.json>
//
// The map lives outside this repository because it points at local capture
// folders. Each entry:
//   { "id": "fr3t-app/workspace", "file": "/abs/path/raw.png",
//     "source": "live-site", "captured": "2026-10", "device": "desktop",
//     "crop": { "left": 0, "top": 0, "width": 2880, "height": 1800 },   // optional, source pixels
//     "widths": [800, 1600],                                            // optional
//     "texture": true }                                                 // optional, adds a scene texture (fits 2048x1400)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const mapPath = process.argv[2];
if (!mapPath) {
  console.error("Usage: node scripts/optimize-media.mjs <media-map.json>");
  process.exit(1);
}

const entries = JSON.parse(await readFile(mapPath, "utf8"));
const out = {};

for (const e of entries) {
  let img = sharp(e.file, { limitInputPixels: false }).rotate();
  if (e.crop) img = img.extract(e.crop);
  const buf = await img.toBuffer();
  const meta = await sharp(buf).metadata();
  const srcW = meta.width;
  const widths = (e.widths ?? [800, 1600]).filter((w) => w <= srcW);
  if (widths.length === 0) widths.push(srcW);

  const dir = path.join(root, "public/media", path.dirname(e.id));
  await mkdir(dir, { recursive: true });
  const base = path.join(root, "public/media", e.id);

  let largest = { width: 0, height: 0 };
  for (const w of widths) {
    const info = await sharp(buf)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6, smartSubsample: true })
      .toFile(`${base}-${w}.webp`);
    if (info.width > largest.width) largest = { width: info.width, height: info.height };
  }

  const record = {
    src: `/media/${e.id}`,
    widths,
    width: largest.width,
    height: largest.height,
    source: e.source,
    captured: e.captured,
    device: e.device,
  };

  if (e.texture) {
    // Landscape screens get up to 2048 px wide; portrait screens are capped at 1400 px tall.
    const info = await sharp(buf)
      .resize({ width: 2048, height: 1400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(`${base}-tex.webp`);
    record.texture = { src: `/media/${e.id}-tex.webp`, width: info.width, height: info.height };
  }

  out[e.id] = record;
  console.log(`${e.id}: ${widths.join(", ")}${e.texture ? " + texture" : ""}`);
}

const target = path.join(root, "src/content/media.generated.json");
await writeFile(target, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${Object.keys(out).length} entries to ${path.relative(root, target)}`);
