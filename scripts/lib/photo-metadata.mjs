/**
 * Shared helpers for reading photo metadata out of Cloudinary resources.
 * Used by add-photo.mjs, bulk-upload.mjs and sync-photos.mjs.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

export function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) throw new Error(".env.local not found");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) env[key.trim()] = rest.join("=").trim();
  }
  return env;
}

/** Parse EXIF DateTimeOriginal ("2025:11:14 18:32:00") → { date: "2025-11-14", time: "18:32:00" } */
export function parseDateTimeFromExif(resource) {
  const exif = resource.image_metadata;
  const raw = exif?.DateTimeOriginal ?? exif?.DateTime;
  if (raw) {
    const [datePart, timePart] = raw.split(" ");
    return {
      date: datePart.replace(/:/g, "-"),
      time: timePart ?? "",
    };
  }
  return null;
}

export function parseDateFromExif(resource) {
  return parseDateTimeFromExif(resource)?.date ?? null;
}

/** Parse Cloudinary GPS string "54 deg 34' 54.02\" N" → decimal degrees */
export function parseGpsDms(str) {
  if (!str) return null;
  // Matches: "54 deg 34' 54.02" N"
  const m = String(str).match(/(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"\s*([NSEW])?/i);
  if (!m) return null;
  const decimal = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600;
  const sign = m[4] && (m[4].toUpperCase() === "S" || m[4].toUpperCase() === "W") ? -1 : 1;
  return decimal * sign;
}

export function parseGpsFromExif(exif) {
  const lat = parseGpsDms(exif?.GPSLatitude);
  const lon = parseGpsDms(exif?.GPSLongitude);
  if (lat == null || lon == null) return null;
  return { lat, lon };
}

export function normaliseLocation(location) {
  if (!location) return location;

  // Country name normalisation (must run before city rules)
  const countryMap = {
    "Deutschland": "Germany",
    "Schweiz/Suisse/Svizzera/Svizra": "Switzerland",
    "Schweiz": "Switzerland",
    "Suisse": "Switzerland",
    "Italia": "Italy",
    "Éire / Ireland": "Ireland",
    "Eire / Ireland": "Ireland",
    "Éire": "Ireland",
    "Eire": "Ireland",
    "España": "Spain",
    "United Kingdom": "United Kingdom",
  };

  // City / region normalisation
  const cityMap = {
    "County Londonderry": "Derry",
    "Londonderry": "Derry",
    "Alacant / Alicante": "Alicante",
    "Alacant": "Alicante",
    "Elx / Elche": "Elche",
    "County Borough of Belfast": "Belfast",
    "County Donegal": "Donegal",
    "Zürich": "Zurich",
    "València": "Valencia",
    "Milano": "Milan",
    "Frankfurt am Main": "Frankfurt",
    "Greater London": "London",
  };

  // Override country for specific cities
  const cityCountryOverride = {
    "Belfast": "Ireland",
    "Derry": "Ireland",
  };

  let [city, country] = location.split(",").map((s) => s.trim());

  // Normalise city
  city = cityMap[city] ?? city;

  // Normalise country
  country = countryMap[country] ?? country;

  // Override country for specific cities
  if (cityCountryOverride[city]) country = cityCountryOverride[city];

  return [city, country].filter(Boolean).join(", ");
}

const geocodeCache = new Map();

export async function reverseGeocode(lat, lon) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  // Nominatim requires a User-Agent
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "portfolio-photos-sync/1.0" } });
    const data = await res.json();
    const a = data.address ?? {};
    // Build "City, Country" — fall back through various address levels
    const city = a.city ?? a.town ?? a.village ?? a.county ?? a.state ?? "";
    const country = a.country ?? "";
    const location = normaliseLocation([city, country].filter(Boolean).join(", "));
    geocodeCache.set(key, location);
    // Nominatim asks for 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
    return location;
  } catch {
    return "";
  }
}

/**
 * Build a photos.json `metadata` block from a Cloudinary resource.
 * Falls back to the upload date when the image carries no EXIF timestamp.
 */
export async function buildMetadata(resource, { geocode = true } = {}) {
  const exif = resource.image_metadata ?? {};
  const dt = parseDateTimeFromExif(resource);
  const dateTaken =
    dt?.date ?? resource.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0];

  let location = "";
  if (geocode) {
    const gps = parseGpsFromExif(exif);
    if (gps) location = await reverseGeocode(gps.lat, gps.lon);
  }

  return {
    metadata: {
      dateTaken,
      timeTaken: dt?.time ?? "",
      location,
      camera: exif.Model ?? exif.Make ?? "",
      tags: [],
    },
    dateSource: dt ? "exif" : "upload date",
    gps: parseGpsFromExif(exif),
  };
}
