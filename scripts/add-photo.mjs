#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/add-photo.mjs <file> --group "Alicante" [--year 2026] [--caption "Santa Bárbara"] [--folder travel] [--no-geocode]
 *
 * dateTaken, timeTaken and camera come from the image's EXIF; location is reverse
 * geocoded from EXIF GPS unless --no-geocode is passed.
 *
 * Requires in .env.local:
 *   VITE_CLOUDINARY_CLOUD_NAME=...
 *   CLOUDINARY_API_KEY=...
 *   CLOUDINARY_API_SECRET=...
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename, extname } from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { loadEnv, buildMetadata } from "./lib/photo-metadata.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- Parse CLI args ---
function parseArgs() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  if (!filePath || filePath.startsWith("--")) {
    console.error("Usage: node scripts/add-photo.mjs <file> --group <name> [--year <year>] [--caption <text>] [--folder <folder>] [--no-geocode]");
    process.exit(1);
  }
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    filePath: resolve(process.cwd(), filePath),
    group: get("--group"),
    year: get("--year") ? parseInt(get("--year")) : null,
    caption: get("--caption") ?? "",
    folder: get("--folder") ?? "travel",
    geocode: !args.includes("--no-geocode"),
  };
}

// --- Next sequential ID ---
function nextId(photos) {
  if (!photos.length) return "001";
  const max = Math.max(...photos.map((p) => parseInt(p.id, 10)));
  return String(max + 1).padStart(3, "0");
}

// --- Main ---
async function main() {
  const env = loadEnv();
  const { filePath, group, year: yearOverride, caption, folder, geocode } = parseArgs();

  if (!group) {
    console.error("--group is required (e.g. --group \"Alicante\")");
    process.exit(1);
  }
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  const photosPath = resolve(ROOT, "data/photos.json");
  const photos = JSON.parse(readFileSync(photosPath, "utf8"));
  const id = nextId(photos);

  // Derive public_id from filename (strip extension, slugify)
  const slug = basename(filePath, extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const publicId = `${folder}/${slug}`;

  console.log(`Uploading ${filePath} → ${publicId} …`);
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    overwrite: false,
    resource_type: "image",
    image_metadata: true,
  });

  const { metadata, dateSource, gps } = await buildMetadata(result, { geocode });
  if (geocode && gps && !metadata.location) {
    console.warn("⚠  GPS present but reverse geocoding returned nothing — fill in location manually.");
  }

  const entry = {
    id,
    cloudinaryId: result.public_id,
    year: yearOverride ?? parseInt(metadata.dateTaken.split("-")[0]),
    group,
    caption,
    metadata,
  };

  photos.push(entry);
  writeFileSync(photosPath, JSON.stringify(photos, null, 2) + "\n");

  console.log(`\n✓ Added photo ${id} to data/photos.json  (date from ${dateSource})`);
  console.log(JSON.stringify(entry, null, 2));
  console.log("\nNext: commit and push — Vercel will redeploy automatically.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
