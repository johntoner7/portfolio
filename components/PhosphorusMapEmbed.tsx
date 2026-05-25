import { useEffect, useMemo, useRef, useState } from "react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ExternalLink, MapPinned, RefreshCw } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, annotationPlugin);

import { MAPBOX_TOKEN, fetchFarmPolygons, fetchRiverSegments, fetchStationSeries, fetchStations, type StationCollection, type StationTimeSeries } from "@/lib/riverApi";

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const MAP_CENTER: [number, number] = [-6.7, 54.63];
const MAP_ZOOM = 7.8;

function formatValue(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }
  return `${value.toFixed(3)} mg/l`;
}

const WFD_THRESHOLD = 0.035;

function Sparkline({ series }: { series: StationTimeSeries["series"] }) {
  const labels = useMemo(() => series.map((p) => String(p.year)), [series]);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Annual mean",
          data: series.map((p) => p.annual_mean_p_sol),
          borderColor: "#c0551a",
          backgroundColor: "rgba(192,85,26,0.06)",
          borderWidth: 1.5,
          tension: 0.2,
          fill: true,
          pointRadius: series.map((p) => (p.sparse_year ? 3 : 2)),
          pointBackgroundColor: series.map((p) => (p.sparse_year ? "transparent" : "#c0551a")),
          pointBorderColor: "#c0551a",
          pointBorderWidth: 1.5,
          spanGaps: false,
        },
        {
          label: "5-yr rolling mean",
          data: series.map((p) => p.rolling_mean_5yr),
          borderColor: "rgba(136,134,128,0.7)",
          borderWidth: 1.5,
          borderDash: [4, 3],
          pointRadius: 0,
          tension: 0.3,
          fill: false,
          spanGaps: true,
        },
      ],
    }),
    [series, labels],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index" as const,
          intersect: false,
          callbacks: {
            label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
              const v = ctx.parsed.y;
              return `${ctx.dataset.label}: ${v != null ? v.toFixed(3) : "—"} mg/l`;
            },
          },
        },
        annotation: {
          annotations: {
            threshold: {
              type: "line" as const,
              yMin: WFD_THRESHOLD,
              yMax: WFD_THRESHOLD,
              borderColor: "#fd8d3c",
              borderWidth: 1,
              borderDash: [4, 4],
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 9 },
            color: "#94a3b8",
            maxTicksLimit: 7,
            maxRotation: 0,
          },
        },
        y: {
          grid: { color: "rgba(100,116,139,0.12)" },
          ticks: {
            font: { size: 9 },
            color: "#94a3b8",
            callback: (v: number | string) => Number(v).toFixed(2),
          },
          min: 0,
        },
      },
      interaction: { mode: "index" as const, intersect: false },
    }),
    [],
  );

  return (
    <div style={{ height: 162, width: "100%" }}>
      <Line data={data} options={options as Parameters<typeof Line>[0]["options"]} />
    </div>
  );
}

export function PhosphorusMapEmbed() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);
  const farmPopupRef = useRef<mapboxgl.Popup | null>(null);
  const [token, setToken] = useState("");
  const [stations, setStations] = useState<StationCollection | null>(null);
  const [riverSegments, setRiverSegments] = useState<GeoJSON.FeatureCollection | null>(null);
  const [farmPolygons, setFarmPolygons] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<StationTimeSeries | null>(null);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!MAPBOX_TOKEN) {
      setError("Add VITE_MAPBOX_TOKEN to .env to enable the map.");
      return () => {
        cancelled = true;
      };
    }

    setToken(MAPBOX_TOKEN);
    fetchStations(2024)
      .then((stationsData) => {
        if (cancelled) {
          return;
        }
        setStations(stationsData);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        console.error(err);
        setError("The station data could not be loaded.");
      });

    fetchRiverSegments(2024)
      .then((riverData) => {
        if (cancelled) {
          return;
        }
        setRiverSegments(riverData);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        console.error(err);
      });

    fetchFarmPolygons(2024)
      .then((farmsData) => {
        if (cancelled) {
          return;
        }
        setFarmPolygons(farmsData);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        console.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token || !containerRef.current) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const syncStationSource = (data: StationCollection) => {
      const source = map.getSource("stations") as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(data as GeoJSON.FeatureCollection);
      }
    };

    const syncGeoSource = (id: string, data: GeoJSON.FeatureCollection | null) => {
      const source = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
      if (source && data) {
        source.setData(data);
      }
    };

    map.on("load", () => {
      map.addSource("stations", {
        type: "geojson",
        data: (stations ?? { type: "FeatureCollection", features: [] }) as GeoJSON.FeatureCollection,
      });

      map.addSource("river-segs", {
        type: "geojson",
        data: (riverSegments ?? { type: "FeatureCollection", features: [] }) as GeoJSON.FeatureCollection,
      });

      map.addSource("farm-deas", {
        type: "geojson",
        data: (farmPolygons ?? { type: "FeatureCollection", features: [] }) as GeoJSON.FeatureCollection,
      });

      map.addLayer({
        id: "river-lines",
        type: "line",
        source: "river-segs",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "metric_p_sol"], null],
            "#e5e7eb",
            [
              "step",
              ["get", "metric_p_sol"],
              "#38bdf8",
              0.035,
              "#f59e0b",
              0.1,
              "#b91c1c",
            ],
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.2, 12, 4],
          "line-opacity": ["case", ["==", ["get", "metric_p_sol"], null], 0.25, 0.95],
        },
      });

      map.addLayer({
        id: "farm-fill",
        type: "fill",
        source: "farm-deas",
        paint: {
          "fill-color": [
            "step",
            ["coalesce", ["get", "cattle_per_ha"], 0],
            "#f8fafc",
            0.5,
            "#bbf7d0",
            1.5,
            "#166534",
            2.5,
            "#052e16",
          ],
          "fill-opacity": 0.38,
        },
      });

      map.addLayer({
        id: "farm-line",
        type: "line",
        source: "farm-deas",
        paint: {
          "line-color": "#1f2937",
          "line-opacity": 0.25,
          "line-width": 0.8,
        },
      });

      const farmPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      farmPopupRef.current = farmPopup;

      const setFarmTooltip = (event: mapboxgl.MapMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) {
          farmPopup.remove();
          return;
        }
        const stationUnderCursor = map.queryRenderedFeatures(event.point, { layers: ["stations-circle"] });
        if (stationUnderCursor.length > 0) {
          farmPopup.remove();
          return;
        }

        const properties = feature.properties as Record<string, unknown>;
        const wardName = typeof properties.ward_name === "string" ? properties.ward_name : "Farm census ward";
        const cattlePerHa = properties.cattle_per_ha != null ? Number(properties.cattle_per_ha) : null;
        const cattle = properties.cattle != null ? Number(properties.cattle) : null;
        const sheep = properties.sheep != null ? Number(properties.sheep) : null;
        const farms = properties.num_farms != null ? Number(properties.num_farms) : null;

        const content = document.createElement("div");
        content.className = "space-y-1 text-sm text-slate-900";

        const title = document.createElement("div");
        title.className = "font-semibold text-slate-950";
        title.textContent = wardName;
        content.append(title);

        const density = document.createElement("div");
        density.innerHTML = `<span style="font-weight: 700; color: rgb(146 64 14)">${cattlePerHa == null ? "—" : cattlePerHa.toFixed(2)}</span> cattle / ha`;
        content.append(density);

        const counts = document.createElement("div");
        counts.textContent = `${cattle == null ? "—" : cattle.toLocaleString()} cattle · ${sheep == null ? "—" : sheep.toLocaleString()} sheep`;
        content.append(counts);

        const farmsLine = document.createElement("div");
        farmsLine.className = "text-xs uppercase tracking-[0.18em] text-slate-500";
        farmsLine.textContent = `${farms == null ? "—" : farms.toLocaleString()} farms`;
        content.append(farmsLine);

        farmPopup.setLngLat(event.lngLat).setDOMContent(content).addTo(map);
      };

      map.addLayer({
        id: "stations-circle",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": ["interpolate", ["exponential", 1.5], ["zoom"], 7, 4, 10, 9, 12, 16],
          "circle-color": [
            "case",
            ["==", ["get", "metric_p_sol"], null],
            "#cbd5e1",
            [
              "step",
              ["get", "metric_p_sol"],
              "#38bdf8",
              0.035,
              "#f59e0b",
              0.1,
              "#b91c1c",
            ],
          ],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.1, 10, 0.9],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.55)",
        },
      });

      map.on("mouseenter", "stations-circle", () => {
        map.getCanvas().style.cursor = "pointer";
        farmPopup.remove();
      });
      map.on("mouseleave", "stations-circle", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "farm-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "farm-fill", () => {
        map.getCanvas().style.cursor = "";
        farmPopup.remove();
      });
      map.on("mousemove", "farm-fill", setFarmTooltip);
      map.on("mouseleave", "farm-fill", () => {
        farmPopup.remove();
      });
      map.on("click", "stations-circle", async (event) => {
        const feature = event.features?.[0];
        const stationCode = feature?.properties && typeof feature.properties.station_code === "number" ? feature.properties.station_code : null;
        if (!stationCode) {
          return;
        }
        setLoadingSeries(true);
        try {
          const series = await fetchStationSeries(stationCode);
          setSelectedSeries(series);
        } catch (seriesError) {
          console.error(seriesError);
          setSelectedSeries(null);
        } finally {
          setLoadingSeries(false);
        }
      });
    });

    if (stations) {
      map.once("idle", () => syncStationSource(stations));
    }
    if (riverSegments) {
      map.once("idle", () => syncGeoSource("river-segs", riverSegments));
    }
    if (farmPolygons) {
      map.once("idle", () => syncGeoSource("farm-deas", farmPolygons));
    }

    resizeRef.current = new ResizeObserver(() => {
      map.resize();
    });
    if (containerRef.current) {
      resizeRef.current.observe(containerRef.current);
    }

    return () => {
      resizeRef.current?.disconnect();
      resizeRef.current = null;
      farmPopupRef.current?.remove();
      farmPopupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [farmPolygons, riverSegments, stations, token]);

  useEffect(() => {
    if (!stations || !mapRef.current) {
      return;
    }
    const source = mapRef.current.getSource("stations") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(stations as GeoJSON.FeatureCollection);
  }, [stations]);

  useEffect(() => {
    if (!riverSegments || !mapRef.current) {
      return;
    }
    const source = mapRef.current.getSource("river-segs") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(riverSegments);
  }, [riverSegments]);

  useEffect(() => {
    if (!farmPolygons || !mapRef.current) {
      return;
    }
    const source = mapRef.current.getSource("farm-deas") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(farmPolygons);
  }, [farmPolygons]);

  const selectedSummary = useMemo(() => {
    if (!selectedSeries) {
      return null;
    }
    const latest = selectedSeries.series[selectedSeries.series.length - 1];
    return {
      latestAnnual: latest?.annual_mean_p_sol ?? null,
      trend: selectedSeries.trend_direction ?? "No trend",
      significant: Boolean(selectedSeries.trend_significant),
      slope: selectedSeries.sens_slope,
    };
  }, [selectedSeries]);

  return (
    <article className="rounded-[2rem] border border-divider bg-surface/70 p-6 shadow-glow sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-env">Phosphorus map</p>
          <h3 className="text-2xl text-ink sm:text-3xl">View river phosphorus data and farm census areas.</h3>
          <p className="text-sm leading-7 text-muted">
            A simplified version of the river project. Click a station to load its trend history and sparkline.
          </p>
        </div>

        <a
          href="https://rivers.climategapni.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-divider bg-page/70 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
        >
          Live site
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-6 rounded-2xl border border-divider bg-page/60 p-3">
        <div ref={containerRef} className="h-[440px] overflow-hidden rounded-xl" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="rounded-2xl border border-divider bg-page/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MapPinned className="h-4 w-4 text-ocean" />
            {selectedSeries?.location_name ?? "Click a station"}
          </div>
          <p className="mt-2 text-sm leading-7 text-muted">
            {selectedSeries ? `${selectedSeries.catchment_name ?? "Unknown catchment"} · ${selectedSummary?.trend}${selectedSummary?.significant ? " (significant)" : ""}` : "Each station is colour-coded by its most recent annual mean phosphorus reading. Click one to load its monitoring history and sparkline."}
          </p>
          {selectedSummary && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-muted">
              <span>Latest {formatValue(selectedSummary.latestAnnual)}</span>
              <span>Slope {selectedSummary.slope == null ? "—" : selectedSummary.slope.toFixed(4)}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedSeries(null);
            setError(null);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-divider bg-page/60 px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
        >
          <RefreshCw className="h-4 w-4" />
          Reset selection
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-divider bg-page/60 p-4">
        {loadingSeries ? (
          <p className="text-sm text-muted">Loading sparkline...</p>
        ) : selectedSeries ? (
          <Sparkline series={selectedSeries.series} />
        ) : (
          <p className="text-sm leading-7 text-muted">A sparkline will appear here when you choose a station.</p>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {!token && !error && <p className="mt-4 text-sm text-muted">Waiting for the Mapbox token from the river backend.</p>}
    </article>
  );
}
