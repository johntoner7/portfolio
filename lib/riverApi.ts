function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "https://lough-neagh-production.up.railway.app";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export const RIVERS_API_BASE = normalizeBaseUrl(import.meta.env.VITE_RIVERS_API_BASE_URL || "https://lough-neagh-production.up.railway.app");
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN?.trim() || "";

export type StationProperties = {
  station_code: number;
  location_name: string;
  catchment_name: string | null;
  river_waterbody_id: string | null;
  wfd_matched: boolean;
  annual_mean_p_sol: number | null;
  rolling_mean_5yr: number | null;
  metric_p_sol: number | null;
  wfd_compliant: boolean | null;
  sparse_year: boolean | null;
  trend_direction: string | null;
  trend_significant: boolean | null;
  sens_slope: number | null;
};

export type StationFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  properties: StationProperties;
};

export type StationCollection = {
  type: "FeatureCollection";
  features: StationFeature[];
  metadata: {
    year: number;
    total_stations: number;
    stations_with_data: number;
    stations_above_threshold: number;
    wfd_threshold_mg_l: number;
    data_note: string | null;
  };
};

export type StationTimeSeries = {
  station_code: number;
  location_name: string;
  catchment_name: string | null;
  trend_direction: string | null;
  trend_significant: boolean | null;
  sens_slope: number | null;
  series: Array<{
    year: number;
    annual_mean_p_sol: number | null;
    rolling_mean_5yr: number | null;
    reading_count: number;
    sparse_year: boolean;
    wfd_compliant: boolean | null;
  }>;
};

export async function fetchStations(year: number): Promise<StationCollection> {
  const params = new URLSearchParams({ year: String(year), with_data_only: "true", metric: "annual" });
  const response = await fetch(`${RIVERS_API_BASE}/stations/geojson?${params}`);
  if (!response.ok) {
    throw new Error(`Stations fetch failed: ${response.status}`);
  }
  return (await response.json()) as StationCollection;
}

export async function fetchRiverSegments(year: number): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams({ year: String(year), metric: "rolling" });
  const response = await fetch(`${RIVERS_API_BASE}/river-segments/geojson?${params}`);
  if (!response.ok) {
    throw new Error(`River segments fetch failed: ${response.status}`);
  }
  return (await response.json()) as GeoJSON.FeatureCollection;
}

export async function fetchFarmPolygons(year: number): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams({ year: String(year) });
  const response = await fetch(`${RIVERS_API_BASE}/farms/geojson?${params}`);
  if (!response.ok) {
    throw new Error(`Farm polygons fetch failed: ${response.status}`);
  }
  return (await response.json()) as GeoJSON.FeatureCollection;
}

export async function fetchStationSeries(stationCode: number): Promise<StationTimeSeries> {
  const response = await fetch(`${RIVERS_API_BASE}/stations/${stationCode}/timeseries`);
  if (!response.ok) {
    throw new Error(`Timeseries fetch failed: ${response.status}`);
  }
  return (await response.json()) as StationTimeSeries;
}
