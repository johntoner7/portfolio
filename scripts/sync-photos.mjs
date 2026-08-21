#!/usr/bin/env node
/**
 * Fetches all images from Cloudinary and syncs them into data/photos.json.
 * Idempotent — existing entries (matched by cloudinaryId) are never overwritten.
 * New entries are appended with the next sequential ID.
 *
 * Usage:
 *   node scripts/sync-photos.mjs --group "Alicante" [--year 2026] [--folder travel] [--dry-run]
 *   node scripts/sync-photos.mjs --list
 *   node scripts/sync-photos.mjs --refresh [--dry-run]
 *
 * --group    Label for all newly added images (you can edit per-photo after)
 * --year     Override year (default: taken from Cloudinary's created_at)
 * --folder   Only sync images whose public_id starts with this prefix
 * --dry-run  Preview without writing photos.json
 * --list     Print all public_ids in your account and exit
 * --refresh  Re-fetch EXIF metadata for all existing entries and update dateTaken/camera/year
 *
 * Requires in .env.local:
 *   VITE_CLOUDINARY_CLOUD_NAME=...
 *   CLOUDINARY_API_KEY=...
 *   CLOUDINARY_API_SECRET=...
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import {
  loadEnv,
  parseDateTimeFromExif,
  parseGpsFromExif,
  normaliseLocation,
  reverseGeocode,
} from "./lib/photo-metadata.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    group: get("--group") ?? "",
    year: get("--year") ? parseInt(get("--year")) : null,
    folder: get("--folder") ?? null,
    dryRun: args.includes("--dry-run"),
    list: args.includes("--list"),
    refresh: args.includes("--refresh"),
  };
}

function nextId(photos) {
  if (!photos.length) return "001";
  const max = Math.max(...photos.map((p) => parseInt(p.id, 10)));
  return String(max + 1).padStart(3, "0");
}

async function fetchAll(folder) {
  // First pass: get the list of public_ids
  const resources = [];
  let nextCursor = undefined;

  do {
    const params = {
      type: "upload",
      resource_type: "image",
      max_results: 500,
      ...(folder ? { prefix: folder + "/" } : {}),
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    };
    const response = await cloudinary.api.resources(params);
    resources.push(...response.resources);
    nextCursor = response.next_cursor;
  } while (nextCursor);

  // Second pass: fetch EXIF metadata for each resource in parallel
  // image_metadata: true returns EXIF including DateTimeOriginal from the original iOS photo
  const detailed = await Promise.all(
    resources.map((r) =>
      cloudinary.api.resource(r.public_id, { image_metadata: true }).catch(() => r)
    )
  );

  return detailed;
}

async function main() {
  const env = loadEnv();
  const { group, year: yearOverride, folder, dryRun, list, refresh } = parseArgs();

  cloudinary.config({
    cloud_name: env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  if (list) {
    console.log("Listing all images in your Cloudinary account …\n");
    const all = await cloudinary.api.resources({ type: "upload", resource_type: "image", max_results: 100 });
    if (!all.resources.length) {
      console.log("No images found — check your API key and secret.");
    } else {
      for (const r of all.resources) {
        const date = r.created_at?.split("T")[0] ?? "unknown";
        console.log(`  ${r.public_id}  (${date})`);
      }
      console.log(`\n${all.resources.length} image(s) shown.`);
    }
    return;
  }

  const photosPath = resolve(ROOT, "data/photos.json");
  const existing = JSON.parse(readFileSync(photosPath, "utf8"));

  if (refresh) {
    console.log(`Re-fetching EXIF for ${existing.length} existing entries …\n`);
    let changed = 0;

    // Process sequentially to respect Nominatim's 1 req/sec rate limit
    const updated = [];
    for (const photo of existing) {
      try {
        const r = await cloudinary.api.resource(photo.cloudinaryId, { image_metadata: true });
        const exif = r.image_metadata ?? {};
        const dt = parseDateTimeFromExif(r);
        const camera = exif.Model ?? exif.Make ?? photo.metadata.camera ?? "";
        const dateTaken = dt?.date ?? photo.metadata.dateTaken;
        const timeTaken = dt?.time ?? photo.metadata.timeTaken ?? "";
        const year = parseInt(dateTaken.split("-")[0]);

        // Normalise existing location, or reverse geocode if missing
        let location = normaliseLocation(photo.metadata.location ?? "");
        if (!location) {
          const gps = parseGpsFromExif(exif);
          if (gps) {
            process.stdout.write(`  [${photo.id}] geocoding (${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}) … `);
            location = await reverseGeocode(gps.lat, gps.lon);
            console.log(location || "(no result)");
          }
        }

        const wasChanged =
          dateTaken !== photo.metadata.dateTaken ||
          timeTaken !== (photo.metadata.timeTaken ?? "") ||
          camera !== (photo.metadata.camera ?? "") ||
          location !== (photo.metadata.location ?? "") ||
          year !== photo.year;

        if (wasChanged) {
          changed++;
          if (dateTaken !== photo.metadata.dateTaken)
            console.log(`  [${photo.id}] dateTaken: ${photo.metadata.dateTaken} → ${dateTaken}`);
          if (timeTaken !== (photo.metadata.timeTaken ?? ""))
            console.log(`  [${photo.id}] timeTaken: "${photo.metadata.timeTaken ?? ""}" → "${timeTaken}"`);
          if (camera !== (photo.metadata.camera ?? ""))
            console.log(`  [${photo.id}] camera: "${photo.metadata.camera}" → "${camera}"`);
          if (location !== (photo.metadata.location ?? ""))
            console.log(`  [${photo.id}] location: "${photo.metadata.location}" → "${location}"`);
        }

        updated.push({ ...photo, year, metadata: { ...photo.metadata, dateTaken, timeTaken, camera, location } });
      } catch {
        console.warn(`  ⚠ Could not fetch ${photo.cloudinaryId} — skipping.`);
        updated.push(photo);
      }
    }
    if (changed === 0) {
      console.log("  No changes detected.");
    } else {
      console.log(`\n${changed} entry(s) updated.`);
    }
    if (dryRun) {
      console.log("\n--dry-run: photos.json not written.");
    } else {
      writeFileSync(photosPath, JSON.stringify(updated, null, 2) + "\n");
      console.log("✓ photos.json written.");
    }
    return;
  }

  const existingIds = new Set(existing.map((p) => p.cloudinaryId));

  const label = folder ? `folder "${folder}"` : "all images";
  console.log(`Fetching ${label} from Cloudinary …`);
  const resources = await fetchAll(folder);
  console.log(`Found ${resources.length} image(s).\n`);

  if (resources.length === 0) {
    console.log("Nothing found. Run --list to inspect your account.");
    return;
  }

  const toAdd = resources.filter((r) => !existingIds.has(r.public_id));
  const alreadyPresent = resources.length - toAdd.length;

  if (alreadyPresent > 0) {
    console.log(`  ✓ ${alreadyPresent} already in photos.json — skipping.`);
  }
  if (toAdd.length === 0) {
    console.log("  Nothing new to add.");
    return;
  }

  console.log(`  + ${toAdd.length} new image(s) to add:\n`);

  const updated = [...existing];

  for (const resource of toAdd) {
    const id = nextId(updated);
    const dt = parseDateTimeFromExif(resource);
    const dateTaken = dt?.date ?? resource.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0];
    const timeTaken = dt?.time ?? "";
    const year = yearOverride ?? parseInt(dateTaken.split("-")[0]);
    const dateSource = dt ? "exif" : "upload date";

    const entry = {
      id,
      cloudinaryId: resource.public_id,
      year,
      group,
      caption: "",
      metadata: {
        dateTaken,
        timeTaken,
        location: "",
        camera: "",
        tags: [],
      },
    };

    updated.push(entry);
    console.log(`  [${id}] ${resource.public_id}  →  ${dateTaken} (${dateSource})  group: "${group || "(empty)"}"`);
  }

  if (!group) {
    console.log('\n⚠  No --group supplied. Edit photos.json to set group names before committing.');
  }

  if (dryRun) {
    console.log("\n--dry-run: photos.json not written.");
  } else {
    writeFileSync(photosPath, JSON.stringify(updated, null, 2) + "\n");
    console.log(`\n✓ photos.json updated (${toAdd.length} added, ${alreadyPresent} unchanged).`);
    console.log("Edit group/caption/location/camera in photos.json, then:");
    console.log("  git add data/photos.json && git commit -m 'photos: sync' && git push");
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
