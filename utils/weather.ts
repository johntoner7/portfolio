/**
 * Live conditions for Belfast, used to drive the view through the Explore
 * room's window. Open-Meteo needs no API key and no attribution link, and the
 * whole thing degrades to the room's fixed look if the fetch fails.
 *
 * The pure helpers live here (rather than in the hook) so the daylight maths
 * can be exercised without a browser.
 */

export const BELFAST = { latitude: 54.5973, longitude: -5.9301 } as const;

export type Weather = {
  /** 0 full night, 1 full day, ramped through twilight */
  daylight: number;
  /** 0 clear, 1 overcast */
  cloud: number;
  /** 0 dry, 1 heavy */
  rain: number;
  temperature: number;
};

/**
 * `timeformat=unixtime` matters: the default returns local ISO strings, which
 * `new Date()` would read in the *viewer's* timezone rather than Belfast's.
 * Absolute timestamps make the sunrise/sunset comparison correct everywhere.
 */
export const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${BELFAST.latitude}` +
  `&longitude=${BELFAST.longitude}` +
  "&current=temperature_2m,precipitation,cloud_cover,is_day,weather_code" +
  "&daily=sunrise,sunset&forecast_days=1" +
  "&timezone=Europe%2FLondon&timeformat=unixtime";

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Hermite ramp between two edges; flat outside them. */
export function smoothstep(edge0: number, edge1: number, value: number) {
  if (edge1 === edge0) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Twilight is ramped over this window, centred on sunrise/sunset. */
export const TWILIGHT_SECONDS = 45 * 60;

/**
 * How much daylight there is right now, 0..1. Ramping rather than a hard
 * is_day flip is what stops the window snapping from noon to midnight at a
 * single instant.
 */
export function daylightFactor(
  nowSeconds: number,
  sunriseSeconds: number,
  sunsetSeconds: number,
  twilight = TWILIGHT_SECONDS,
) {
  const half = twilight / 2;
  const rising = smoothstep(sunriseSeconds - half, sunriseSeconds + half, nowSeconds);
  const setting = 1 - smoothstep(sunsetSeconds - half, sunsetSeconds + half, nowSeconds);
  return clamp01(Math.min(rising, setting));
}

/** WMO codes that mean something is falling, even at 0mm reported. */
const WET_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
]);

/**
 * Precipitation in mm/h mapped to a 0..1 intensity. Anything actually falling
 * gets a visible floor, since 0.1mm of Belfast drizzle should still show.
 */
export function rainIntensity(precipitationMm: number, code: number) {
  const mm = Number.isFinite(precipitationMm) ? Math.max(0, precipitationMm) : 0;
  const wet = mm > 0.02 || WET_CODES.has(code);
  if (!wet) return 0;
  return clamp01(Math.max(0.28, mm / 4));
}

type Payload = {
  current?: {
    time?: number;
    temperature_2m?: number;
    precipitation?: number;
    cloud_cover?: number;
    is_day?: number;
    weather_code?: number;
  };
  daily?: { sunrise?: number[]; sunset?: number[] };
};

/**
 * Narrows the API payload to what the room actually uses. Returns null on
 * anything malformed so the caller can fall back to the fixed look.
 */
export function parseWeather(payload: unknown, nowSeconds: number): Weather | null {
  const data = payload as Payload | null | undefined;
  const current = data?.current;
  if (!current || typeof current.temperature_2m !== "number") return null;

  const sunrise = data?.daily?.sunrise?.[0];
  const sunset = data?.daily?.sunset?.[0];
  const code = typeof current.weather_code === "number" ? current.weather_code : -1;

  // sunrise/sunset are the good path; is_day is the coarse fallback
  const daylight =
    typeof sunrise === "number" && typeof sunset === "number"
      ? daylightFactor(nowSeconds, sunrise, sunset)
      : current.is_day
        ? 1
        : 0;

  return {
    daylight,
    cloud: clamp01((current.cloud_cover ?? 0) / 100),
    rain: rainIntensity(current.precipitation ?? 0, code),
    temperature: current.temperature_2m,
  };
}
