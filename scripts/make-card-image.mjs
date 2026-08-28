/**
 * Turns a full-resolution screenshot into the 16:9 still a project card shows.
 *
 *   node scripts/make-card-image.mjs screenshots/rivers.png lough-neagh-phosphorus-pipeline bottom
 *
 * The card renders `object-cover`, so handing it a screenshot at its native
 * aspect lets the browser centre-crop blind — which on the emissions chart
 * clips the y-axis labels. So the 16:9 frame is made here, and how depends on
 * the shot:
 *
 *   - Pad when the bars would be thin (<=5% of the frame), whatever colour the
 *     edges are. Unmarked is 1.84:1, so it needs 12px top and bottom; that is
 *     nothing next to what cropping it costs, which is 48 source pixels off
 *     each side — enough to eat the Mapbox logo and the filter controls.
 *   - Otherwise pad only if the two edges the bars sit against match. The
 *     emissions chart is cream to both edges, so bars in that cream are
 *     invisible and nothing is lost.
 *   - Otherwise crop. The phosphorus map runs grey (#e3e2e3) down its left edge
 *     and near-white (#faf8f5) down its right, so any single pad colour seams
 *     against one side. Trimming the long axis is the lesser evil there.
 *
 * Picking per-image is the whole point, and both rules were learned the hard
 * way: padding everything framed the map in two pale bars, and cropping on the
 * edge test alone cut Unmarked's attribution off.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const [source, slug, anchor = "center"] = process.argv.slice(2);
if (!source || !slug || !existsSync(source) || !["top", "center", "bottom"].includes(anchor)) {
  console.error("usage: node scripts/make-card-image.mjs <screenshot> <project-slug> [top|center|bottom]");
  process.exit(1);
}

const outDir = path.resolve("public/cards");
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${slug}.jpg`);

const ffmpeg = (args, opts = {}) =>
  execFileSync("ffmpeg", args, { maxBuffer: 1 << 24, ...opts });

function dimensions(file) {
  /*
   * ffprobe is not always installed alongside ffmpeg, but the stream line
   * always is. `ffmpeg -i` with no output file is an error by design ("At
   * least one output file must be specified") and exits non-zero, so the
   * probe output arrives on the thrown error rather than on stdout.
   */
  let info = "";
  try {
    info = execFileSync("ffmpeg", ["-i", file], { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
  } catch (error) {
    info = String(error.stderr ?? "");
  }
  const match = info.match(/Stream #\d+:\d+.*?, (\d+)x(\d+)[ ,]/);
  if (!match) throw new Error(`could not read dimensions of ${file}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

/** Mean colour of a strip, as [r, g, b]. */
function strip(file, crop) {
  const raw = ffmpeg([
    "-v", "error", "-i", file,
    "-vf", `crop=${crop},scale=1:1`,
    "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
  ]);
  return [raw[0], raw[1], raw[2]];
}

const hex = (c) => c.map((b) => b.toString(16).padStart(2, "0")).join("");
const distance = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

const { width, height } = dimensions(source);
const TARGET = 16 / 9;
const aspect = width / height;
/** Padding runs left/right on a shot narrower than 16:9, top/bottom on a wider one. */
const padsHorizontally = aspect < TARGET;

/*
 * How much of the frame the bars would take. Small enough and it does not
 * matter what colour they are, which is the case whenever the shot is already
 * close to 16:9.
 */
const scale = Math.min(1280 / width, 720 / height);
const padFraction = padsHorizontally
  ? (1280 - width * scale) / 1280
  : (720 - height * scale) / 720;

const near = 4;
const edges = padsHorizontally
  ? [strip(source, `${near}:${height}:0:0`), strip(source, `${near}:${height}:${width - near}:0`)]
  : [strip(source, `${width}:${near}:0:0`), strip(source, `${width}:${near}:0:${height - near}`)];

/** 12/255 per channel: tight enough that a bar would show, loose enough for JPEG noise. */
const matched = distance(edges[0], edges[1]) <= 12;
const thin = padFraction <= 0.05;
const uniform = thin || matched;
const colour = hex(edges[0].map((v, i) => Math.round((v + edges[1][i]) / 2)));

/*
 * 1280x720 for a card that renders at most ~880px wide: enough for a 2x
 * display without shipping a 2.6MB PNG, which is what screenshots/rivers.png is.
 * The sources live outside public/ so they are not deployed alongside them.
 */
/*
 * Where a crop takes its 720 from. Centre is the sane default, but a screenshot
 * usually keeps something load-bearing along one edge: the map has the Mapbox
 * attribution and its timeline control at the bottom, and attribution is a
 * licence condition, not decoration. Only y is anchored — a shot wide enough to
 * crop horizontally has no equivalent claim on its left or right.
 */
const y = { top: "0", center: "(ih-oh)/2", bottom: "ih-oh" }[anchor];
const filter = uniform
  ? `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:0x${colour}`
  : `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720:(iw-ow)/2:${y}`;

const why = thin
  ? `bars would be ${(padFraction * 100).toFixed(1)}% of the frame`
  : `edges ${matched ? "match" : "differ"} (#${hex(edges[0])} / #${hex(edges[1])})`;
console.log(uniform ? `${why} — padding on #${colour}` : `${why} — cropping instead`);

ffmpeg(["-y", "-i", source, "-vf", filter, "-frames:v", "1", "-q:v", "4", out], { stdio: "inherit" });

const before = (statSync(source).size / 1024).toFixed(0);
const after = (statSync(out).size / 1024).toFixed(0);
console.log(`wrote ${out}  (${before}KB -> ${after}KB)`);
