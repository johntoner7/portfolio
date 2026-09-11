import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { ExternalLink, MapPin, RotateCcw } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

import { MAPBOX_TOKEN } from "@/lib/riverApi";

type Match = {
  date: string;
  home_team: string;
  away_team: string;
  score: string | null;
  goals: number;
  assists: number;
};

type Venue = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    team: string;
    teams: string[];
    club_slug: string;
    slug: string;
    stadium: string;
    appearances: number;
    total_goals: number;
    total_assists: number;
    matches: Match[];
  };
};

type MapData = {
  player: { name: string; home_team: string };
  features: Venue[];
};

const MAP_URL = "/api/unmarked-map";

function venueKey(venue: Venue) {
  return `${venue.properties.club_slug}-${venue.properties.slug}`;
}

export function UnmarkedGoalMapEmbed() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(MAP_URL)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<MapData>;
      })
      .then((mapData) => { if (!cancelled) setData(mapData); })
      .catch(() => { if (!cancelled) setError("The live goal map is temporarily unavailable."); });
    return () => { cancelled = true; };
  }, []);

  const venues = useMemo(() => data?.features.filter((venue) => venue.properties.total_goals > 0) ?? [], [data]);
  const selected = selectedKey ? venues.find((venue) => venueKey(venue) === selectedKey) ?? null : null;
  const totalGoals = venues.reduce((sum, venue) => sum + venue.properties.total_goals, 0);

  useEffect(() => {
    if (!mapContainer.current || !data || !MAPBOX_TOKEN || venues.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-1.5, 52.8],
      zoom: 4.8,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      const sourceFeatures = venues.map((venue) => ({
        type: "Feature" as const,
        geometry: venue.geometry,
        properties: {
          key: venueKey(venue),
          stadium: venue.properties.stadium,
          goals: venue.properties.total_goals,
        },
      }));

      map.addSource("salah-venues", {
        type: "geojson",
        data: { type: "FeatureCollection", features: sourceFeatures },
      });

      map.addLayer({
        id: "salah-venue-halo",
        type: "circle",
        source: "salah-venues",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "goals"], 1, 13, 5, 20, 15, 30, 30, 42],
          "circle-color": "#ef4444",
          "circle-opacity": 0.16,
          "circle-blur": 0.7,
        },
      });
      map.addLayer({
        id: "salah-venues",
        type: "circle",
        source: "salah-venues",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "goals"], 1, 6, 5, 10, 15, 16, 30, 22],
          "circle-color": "#ef4444",
          "circle-stroke-color": "#fecaca",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "salah-venue-labels",
        type: "symbol",
        source: "salah-venues",
        layout: {
          "text-field": ["to-string", ["get", "goals"]],
          "text-size": 10,
          "text-font": ["Open Sans Bold"],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });

      const bounds = new mapboxgl.LngLatBounds();
      venues.forEach((venue) => bounds.extend(venue.geometry.coordinates));
      if (venues.length > 1) map.fitBounds(bounds, { padding: { top: 92, right: 40, bottom: 46, left: 40 }, maxZoom: 6, duration: 0 });

      map.on("click", "salah-venues", (event) => {
        const key = event.features?.[0]?.properties?.key as string | undefined;
        if (key) setSelectedKey(key);
      });
      map.on("mouseenter", "salah-venues", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "salah-venues", () => { map.getCanvas().style.cursor = ""; });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [data, venues]);

  const resetMap = () => {
    setSelectedKey(null);
    if (mapRef.current && venues.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      venues.forEach((venue) => bounds.extend(venue.geometry.coordinates));
      mapRef.current.fitBounds(bounds, { padding: { top: 92, right: 40, bottom: 46, left: 40 }, maxZoom: 6, duration: 450 });
    }
  };

  return (
    <div className="px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
      <div className="relative h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 sm:h-[540px]">
        {MAPBOX_TOKEN && <div ref={mapContainer} className="absolute inset-0" />}
        {!MAPBOX_TOKEN && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-zinc-400">Add VITE_MAPBOX_TOKEN to enable the map.</div>}
        {MAPBOX_TOKEN && !data && !error && <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-sm text-zinc-400">Loading Salah&apos;s goal map…</div>}
        {error && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-zinc-400">{error}</div>}

        {data && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-zinc-950/95 to-transparent px-4 pb-9 pt-4">
            <div>
              <p className="text-xs font-bold text-white">{data.player.name}</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">{totalGoals} goals · {venues.length} grounds</p>
            </div>
            <a href="https://unmarked.johntoner.com/salah" target="_blank" rel="noreferrer" className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/80 px-3 py-2 text-[10px] font-semibold text-zinc-300 backdrop-blur hover:text-white">Full map <ExternalLink className="h-3 w-3" /></a>
          </div>
        )}

        <button type="button" onClick={resetMap} className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/90 px-3 py-2 text-[10px] font-semibold text-zinc-300 backdrop-blur hover:text-white"><RotateCcw className="h-3 w-3" /> Reset</button>

        {selected && (
          <aside className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-white/10 bg-zinc-900/95 p-4 text-white shadow-2xl backdrop-blur md:left-auto md:w-[280px]">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{selected.properties.stadium}</p><p className="mt-1 truncate text-xs text-zinc-500">{selected.properties.teams.join(" · ") || selected.properties.team}</p></div>
              <button type="button" onClick={() => setSelectedKey(null)} className="text-lg leading-none text-zinc-500 hover:text-white" aria-label="Close stadium details">×</button>
            </div>
            <div className="mt-3 flex gap-5 text-xs uppercase tracking-wider text-zinc-500"><span><strong className="text-red-400">{selected.properties.total_goals}</strong> goals</span><span><strong className="text-white">{selected.properties.appearances}</strong> apps</span><span><strong className="text-white">{selected.properties.total_assists}</strong> assists</span></div>
            {selected.properties.matches[0] && <p className="mt-3 text-xs leading-5 text-zinc-400">Latest: {selected.properties.matches[0].date} · {selected.properties.matches[0].home_team} {selected.properties.matches[0].score ?? "—"} {selected.properties.matches[0].away_team}</p>}
          </aside>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Click a goal marker to inspect the stadium and Salah&apos;s record there.</p>
    </div>
  );
}
