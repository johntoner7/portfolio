#!/usr/bin/env node
/**
 * Bulk upload all images in a local folder to Cloudinary and append to photos.json.
 * Idempotent — skips files whose original filename already exists in photos.json metadata.
 *
 * Usage:
 *   node scripts/bulk-upload.mjs --dir /path/to/folder --group "Alicante" [--year 2026] [--folder travel] [--dry-run] [--no-geocode]
 *
 * Requires in .env.local:
 *   VITE_CLOUDINARY_CLOUD_NAME=...
 *   CLOUDINARY_API_KEY=...
 *   CLOUDINARY_API_SECRET=...
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve, basename, extname, join } from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { loadEnv, buildMetadata } from "./lib/photo-metadata.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tiff", ".tif"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const dir = get("--dir");
  if (!dir) {
    console.error("Usage: node scripts/bulk-upload.mjs --dir <path> --group <name> [--year <year>] [--folder <cloudinary-folder>] [--dry-run] [--no-geocode]");
    process.exit(1);
  }
  return {
    dir: resolve(dir),
    group: get("--group") ?? "",
    year: get("--year") ? parseInt(get("--year")) : null,
    folder: get("--folder") ?? "travel",
    dryRun: args.includes("--dry-run"),
    geocode: !args.includes("--no-geocode"),
  };
}

function nextId(photos) {
  if (!photos.length) return "001";
  const max = Math.max(...photos.map((p) => parseInt(p.id, 10)));
  return String(max + 1).padStart(3, "0");
}

function getImageFiles(dir) {
  if (!existsSync(dir)) throw new Error(`Directory not found: ${dir}`);
  return readdirSync(dir)
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()) && !f.startsWith("."))
    .sort()
    .map((f) => join(dir, f));
}

async function uploadOne(filePath, folder) {
  const slug = basename(filePath, extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const publicId = `${folder}/${slug}`;

  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    overwrite: false,
    resource_type: "image",
    image_metadata: true,
  });
  return result;
}

async function main() {
  const env = loadEnv();
  const { dir, group, year, folder, dryRun, geocode } = parseArgs();

  cloudinary.config({
    cloud_name: env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  const photosPath = resolve(ROOT, "data/photos.json");
  const existing = JSON.parse(readFileSync(photosPath, "utf8"));

  // Track already-uploaded files by the slug we'd generate from the filename
  const existingIds = new Set(existing.map((p) => p.cloudinaryId));

  const files = getImageFiles(dir);
  console.log(`Found ${files.length} image(s) in ${dir}\n`);

  if (!group) console.warn("⚠  No --group supplied — entries will have empty group. Edit photos.json after.\n");

  const updated = [...existing];
  let added = 0;
  let skipped = 0;

  for (const filePath of files) {
    const slug = basename(filePath, extname(filePath))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const publicId = `${folder}/${slug}`;

    if (existingIds.has(publicId)) {
      console.log(`  ✓ skip  ${basename(filePath)}  (already in photos.json)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  + would upload  ${basename(filePath)}  →  ${publicId}`);
      added++;
      continue;
    }

    process.stdout.write(`  ↑ uploading  ${basename(filePath)} … `);
    try {
      const result = await uploadOne(filePath, folder);
      const { metadata, dateSource } = await buildMetadata(result, { geocode });

      const id = nextId(updated);
      const entry = {
        id,
        cloudinaryId: result.public_id,
        year: year ?? parseInt(metadata.dateTaken.split("-")[0]),
        group,
        caption: "",
        metadata,
      };
      updated.push(entry);
      existingIds.add(result.public_id);
      added++;
      console.log(`done  [${id}]  ${metadata.dateTaken} (${dateSource})${metadata.location ? `  ${metadata.location}` : ""}`);
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
    }
  }

  console.log(`\n${added} uploaded, ${skipped} skipped.`);

  if (dryRun) {
    console.log("--dry-run: photos.json not written.");
  } else if (added > 0) {
    writeFileSync(photosPath, JSON.stringify(updated, null, 2) + "\n");
    console.log("✓ photos.json updated.");
    console.log("\nNext: edit group/caption/location in photos.json if needed, then:");
    console.log("  git add data/photos.json && git commit -m 'photos: bulk upload' && git push");
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
