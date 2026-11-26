/**
 * A summary of John's listening, running and Spanish, exported from his life
 * dashboard (the private `tracking` repo) by
 *
 *   npm run portfolio:snapshot -- --out ../portfolio/lib/lifeSnapshot.json
 *
 * It is a committed file rather than a live fetch: the dashboard sits behind
 * a sign-in, and a snapshot means nothing about it is reachable from here.
 * The export keeps to totals and rankings over the last 3 months, with no
 * dates, times or places.
 */
import raw from "./lifeSnapshot.json";

export type LifeSnapshot = {
  generatedOn: string;
  spotify: {
    from: string;
    to: string;
    hours: number;
    artists: number;
    daysWithMusic: number;
    span: number;
    streakDays: number;
    topArtists: { name: string; plays: number; hours: number }[];
    topTrack: { name: string; artist: string; plays: number } | null;
    albums: { name: string; artist: string; plays: number; cover: string | null }[];
    complete: boolean;
  } | null;
  running: {
    from: string;
    to: string;
    runs: number;
    km: number;
    hours: number;
    longestKm: number | null;
    fastestPace: number | null;
    fastestPaceMinKm: number;
    shoes: { name: string; km: number }[];
  } | null;
  spanish: {
    lessons: number;
    learned: number;
    words: { es: string; en: string }[];
  } | null;
};

export const lifeSnapshot = raw as LifeSnapshot;

/** seconds per km as "5:17 /km" */
export function formatPace(secondsPerKm: number) {
  const s = Math.round(secondsPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} /km`;
}

/**
 * Spotify cover URLs carry their size in the id: b273 is 640px, 1e02 is 300px.
 * 300 is plenty for a sleeve on a shelf or a tile in the panel.
 */
export function coverAt300(url: string) {
  return url.replace("ab67616d0000b273", "ab67616d00001e02");
}

/** "26 November 2026" */
export function formatDay(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The flashcard on the desk: one word a day, the same for every visitor that
 * day, cycling through the list.
 */
export function wordOfTheDay(words: { es: string; en: string }[], now = new Date()) {
  if (!words.length) return null;
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
  const index = day % words.length;
  return { word: words[index], index };
}
