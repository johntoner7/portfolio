/**
 * Bakes the homepage hero's river network into a small static file.
 *
 *   node scripts/make-hero-rivers.mjs [year]
 *
 * The phosphorus API returns ~36k river segments as 6.5 MB of GeoJSON, which
 * is far too heavy to fetch before the first paint, and the hero should not
 * depend on the Railway API being awake. So the network is projected, clipped,
 * chained, simplified and written once to public/hero/rivers.json (~a few
 * hundred KB), one SVG path per phosphorus band, using the same breaks as the
 * live map (components/PhosphorusMapEmbed.tsx): below 0.035 mg/l, 0.035–0.1,
 * above 0.1, plus unmonitored reaches.
 *
 * The river data follows catchments, so it spills over the border into
 * Donegal, Fermanagh's neighbours and the Monaghan/Cavan drumlins. The hero is
 * a map of Northern Ireland, so the network is clipped to OSNI's outline of
 * NI, and that outline is baked in too. The outline has the large loughs as
 * holes, so rivers drawn across Lough Neagh and Lough Erne fall away with the
 * rest and the loughs' shores are drawn instead.
 *
 * Underneath sits the farm layer: census farm wards grouped by cattle per
 * hectare, on the live map's breaks (0.5, 1.5, 2.5). Ward edges are not
 * clipped here; the hero clips them to the outline when it draws them.
 *
 * If the hero's frame changes size, update ASPECT in components/RiverNetwork.tsx
 * to the width and height this prints.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const year = process.argv[2] ?? "2024";
const RIVERS_API = "https://lough-neagh-production.up.railway.app";
// OSNI Open Data – Largescale Boundaries – NI Outline (Open Government Licence)
const OUTLINE_URL =
  "https://admin.opendatani.gov.uk/dataset/1f472693-2c20-483c-b367-b42382b83886/resource/ec752797-02df-43eb-bdeb-f74838771df3/download/osni_open_data_largescale_boundaries_ni_outline.geojson";
const WIDTH = 1000;
// below this, in viewBox units, a vertex is dropped by the simplifier
const TOLERANCE = 1.4;
// the outline is the frame, so it gets a finer pass than the rivers
const OUTLINE_TOLERANCE = 0.5;
// islands and lough-holes smaller than this many square units are not drawn
const MIN_RING_AREA = 6;
// Lough Neagh, where the reveal radiates from
const ORIGIN = [-6.45, 54.62];

async function getJson(url, label) {
  // OpenDataNI refuses requests without a browser-like user agent
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`${label} fetch failed: ${response.status}`);
  return response.json();
}

const [{ features }, outline, farms] = await Promise.all([
  getJson(`${RIVERS_API}/river-segments/geojson?year=${year}&metric=rolling`, "River segments"),
  getJson(OUTLINE_URL, "NI outline"),
  getJson(`${RIVERS_API}/farms/geojson?year=${year}`, "Farm wards"),
]);

const outlineRings = outline.features.flatMap((f) =>
  (f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates]).flat(),
);

// framed on NI itself, not on the rivers, which run past the border
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const ring of outlineRings) {
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
}

// equirectangular, squashed by cos(latitude) so NI is not stretched sideways
const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
const scale = WIDTH / ((maxLon - minLon) * kx);
const HEIGHT = Math.round((maxLat - minLat) * scale);
const project = ([lon, lat]) => [(lon - minLon) * kx * scale, (maxLat - lat) * scale];

// Iterative Douglas–Peucker: the NI coastline alone is ~366k vertices, which
// is too deep for the recursive version.
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    let worst = 0, index = 0;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      const d = len ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay);
      if (d > worst) { worst = d; index = i; }
    }
    if (worst > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const ringArea = (ring) => {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(sum / 2);
};

const border = outlineRings
  .map((ring) => simplify(ring.map(project), OUTLINE_TOLERANCE))
  .filter((ring) => ring.length > 3 && ringArea(ring) >= MIN_RING_AREA);

// Even-odd ray casting over every ring at once, so loughs (holes) count as
// outside and offshore islands as inside without tracking which is which.
function inside([x, y]) {
  let isInside = false;
  for (const ring of border) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) isInside = !isInside;
    }
  }
  return isInside;
}

// where the step from an inside point to an outside one meets the border
function crossing(a, b) {
  let lo = a, hi = b;
  for (let i = 0; i < 12; i++) {
    const mid = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
    if (inside(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

// splits a line into the runs that lie inside the border
function clip(line) {
  const runs = [];
  let run = null;
  let previous = null;
  for (const point of line) {
    const isInside = inside(point);
    if (isInside) {
      if (!run) run = previous ? [crossing(point, previous)] : [];
      run.push(point);
    } else if (run) {
      run.push(crossing(previous, point));
      runs.push(run);
      run = null;
    }
    previous = point;
  }
  if (run) runs.push(run);
  return runs.filter((r) => r.length > 1);
}

const band = (p) => (p == null ? "none" : p < 0.035 ? "low" : p < 0.1 ? "mid" : "high");

const groups = { none: [], low: [], mid: [], high: [] };
for (const f of features) {
  groups[band(f.properties.metric_p_sol)].push(...clip(f.geometry.coordinates.map(project)));
}

// Segments come as short pieces; chaining same-band pieces end to start turns
// tens of thousands of "M" moves into a few thousand longer lines.
const key = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;

function chain(lines) {
  const byStart = new Map();
  lines.forEach((line, i) => {
    const k = key(line[0]);
    if (!byStart.has(k)) byStart.set(k, []);
    byStart.get(k).push(i);
  });
  const used = new Set();
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const merged = [...lines[i]];
    for (;;) {
      const next = (byStart.get(key(merged[merged.length - 1])) ?? []).find((j) => !used.has(j));
      if (next === undefined) break;
      used.add(next);
      merged.push(...lines[next].slice(1));
    }
    out.push(merged);
  }
  return out;
}

const r = (n) => Math.round(n * 10) / 10;

function toPath(lines, close = false) {
  let d = "";
  for (const pts of lines) {
    const rounded = pts.map(([x, y]) => [r(x), r(y)]);
    if (rounded.length < 2) continue;
    d += `M${rounded[0][0]} ${rounded[0][1]}`;
    for (let i = 1; i < rounded.length; i++) {
      d += `l${r(rounded[i][0] - rounded[i - 1][0])} ${r(rounded[i][1] - rounded[i - 1][1])}`;
    }
    if (close) d += "z";
  }
  return d;
}

const bands = Object.fromEntries(
  Object.entries(groups).map(([name, lines]) => [name, toPath(chain(lines).map((line) => simplify(line, TOLERANCE)))]),
);

const cattleBand = (c) => (c < 0.5 ? "sparse" : c < 1.5 ? "low" : c < 2.5 ? "mid" : "high");
const farmGroups = { sparse: [], low: [], mid: [], high: [] };
for (const f of farms.features) {
  const cattle = f.properties.cattle_per_ha;
  // wards with no cattle figure are left unshaded rather than read as zero
  if (cattle == null) continue;
  const polygons = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const ring of polygons.flat()) {
    const projected = simplify(ring.map(project), TOLERANCE);
    if (projected.length > 3) farmGroups[cattleBand(cattle)].push(projected);
  }
}
const farmBands = Object.fromEntries(Object.entries(farmGroups).map(([name, rings]) => [name, toPath(rings, true)]));

const [ox, oy] = project(ORIGIN).map(r);

const outDir = path.resolve("public/hero");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "rivers.json");
const json = JSON.stringify({
  year: Number(year),
  width: WIDTH,
  height: HEIGHT,
  origin: [ox, oy],
  border: toPath(border, true),
  bands,
  farms: farmBands,
});
writeFileSync(outFile, json);
console.log(
  `Wrote ${path.relative(process.cwd(), outFile)} (${(json.length / 1024).toFixed(0)} KB, ${WIDTH}x${HEIGHT}, ${border.length} border rings)`,
);
