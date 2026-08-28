/**
 * Turns a screen recording of the explore room into the three files the site
 * expects: a small looping mp4 and a poster still for the project card, plus
 * the 1200x630 social image the og:image / twitter:image tags point at.
 *
 *   node scripts/make-preview.mjs ~/Desktop/recording.mov
 *
 * The card falls back to the poster under prefers-reduced-motion and hides
 * itself entirely if neither file is present, so this can be run whenever.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const source = process.argv[2];
if (!source || !existsSync(source)) {
  console.error("usage: node scripts/make-preview.mjs <recording.mov|mp4>");
  process.exit(1);
}

const outDir = path.resolve("public/explore");
mkdirSync(outDir, { recursive: true });
const video = path.join(outDir, "room-preview.mp4");
const poster = path.join(outDir, "room-preview.jpg");
/*
 * The social card lives at the web root, not under /explore, because
 * index.html advertises it as https://johntoner.com/og.jpg for the whole site
 * rather than for one route.
 */
const social = path.resolve("public/og.jpg");

/*
 * 1280x720 is plenty for a card that renders at most ~900px wide, and keeps
 * the file small enough that it is not a real cost on a page nobody asked to
 * download a video from. Audio is dropped: the card plays it muted anyway.
 */
const scale = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720";

console.log("encoding mp4…");
execFileSync("ffmpeg", [
  "-y", "-i", source,
  "-t", "12",
  "-vf", `${scale},fps=30`,
  "-an",
  "-c:v", "libx264",
  "-profile:v", "main",
  "-pix_fmt", "yuv420p",
  "-crf", "28",
  "-preset", "slow",
  // lets the browser start playing before the whole file has arrived
  "-movflags", "+faststart",
  video,
], { stdio: "inherit" });

console.log("grabbing poster…");
execFileSync("ffmpeg", [
  "-y", "-i", source,
  "-ss", "1", "-frames:v", "1",
  "-vf", scale,
  "-q:v", "4",
  poster,
], { stdio: "inherit" });

/*
 * 1200x630 is the size every scraper crops to, and it is a wider frame than
 * the 16:9 poster, so it is cropped from the source separately rather than
 * resized from the poster and left soft.
 */
console.log("building social card…");
execFileSync("ffmpeg", [
  "-y", "-i", source,
  "-ss", "1", "-frames:v", "1",
  "-vf", "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630",
  "-q:v", "3",
  social,
], { stdio: "inherit" });

console.log(`\nwrote:\n  ${video}\n  ${poster}\n  ${social}`);
console.log("\nog:image is cached hard by every platform — re-scrape at");
console.log("  https://developers.facebook.com/tools/debug/");
console.log("  https://www.linkedin.com/post-inspector/");
