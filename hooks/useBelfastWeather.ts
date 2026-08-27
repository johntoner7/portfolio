import { useEffect, useState } from "react";
import { WEATHER_URL, parseWeather, type Weather } from "@/utils/weather";

const CACHE_KEY = "belfast-weather";
const CACHE_MS = 60 * 60 * 1000; // an hour; the room is not a forecast service

type Cached = { at: number; payload: unknown };

function readCache(): unknown | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Cached;
    if (!cached || Date.now() - cached.at > CACHE_MS) return null;
    return cached.payload;
  } catch {
    // private mode, blocked storage, or corrupt JSON — just refetch
    return null;
  }
}

function writeCache(payload: unknown) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), payload } satisfies Cached));
  } catch {
    // caching is an optimisation, never a requirement
  }
}

/**
 * Current conditions for Belfast, or null while loading and on any failure.
 * Null is a first-class state: every caller falls back to the room's own
 * fixed look rather than waiting or showing an error.
 */
export function useBelfastWeather(): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const apply = (payload: unknown) => {
      const parsed = parseWeather(payload, Date.now() / 1000);
      if (parsed) setWeather(parsed);
      return parsed;
    };

    const cached = readCache();
    if (cached && apply(cached)) return;

    fetch(WEATHER_URL, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload && apply(payload)) writeCache(payload);
      })
      .catch(() => {
        // offline, blocked, or aborted — the room keeps its fixed sky
      });

    return () => controller.abort();
  }, []);

  return weather;
}
