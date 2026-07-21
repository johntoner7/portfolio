import { ZoomIn, ZoomOut } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { AGRI_TARGET_2030, NAEI_AGRI_2023 } from "@/lib/niClimateData";

interface ChartDataPoint {
  year: number;
  actual: number | null;
  committed: number | null;
  scenario: number | null;
}

interface ScenarioChartProps {
  chartData: ChartDataPoint[];
  zoomed: boolean;
  onZoomToggle: () => void;
  newProjected2030: number;
  committedProjected2030: number;
  remainingGap: number;
  targetMet: boolean;
  scenarioColour: string;
  statusMessage: string;
}

function RightEdgeReferenceLabel({
  viewBox,
  value,
  fill,
  dy = 0,
}: {
  viewBox?: { x?: number; y?: number };
  value: string;
  fill: string;
  dy?: number;
}) {
  if (typeof viewBox?.x !== "number" || typeof viewBox?.y !== "number") return null;
  return (
    <text x={viewBox.x + 8} y={viewBox.y + dy} fill={fill} fontSize={9} textAnchor="start" dominantBaseline="middle">
      {value}
    </text>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const year = Number(label);
  const key = year < 2024 ? "actual" : "scenario";
  const item = payload.find((p) => p.value != null && p.dataKey === key);
  if (!item) return null;
  return (
    <div className="rounded bg-surface/90 px-2 py-1 text-[10px] shadow backdrop-blur-sm">
      <p className="text-muted">
        {year}: {Math.round(item.value).toLocaleString()} kt
      </p>
    </div>
  );
}

export function ScenarioChart({
  chartData,
  zoomed,
  onZoomToggle,
  newProjected2030,
  committedProjected2030,
  remainingGap,
  targetMet,
  scenarioColour,
  statusMessage,
}: ScenarioChartProps) {
  const xDomain: [number, number] = zoomed ? [2016, 2030] : [1990, 2030];
  const xTickCount = zoomed ? 8 : 5;
  const zoomVisibleValues = [AGRI_TARGET_2030, newProjected2030, committedProjected2030, NAEI_AGRI_2023];
  const yMin = zoomed ? Math.floor((Math.min(...zoomVisibleValues) - 200) / 500) * 500 : 4000;
  const yMax = zoomed ? Math.ceil((Math.max(...zoomVisibleValues) + 200) / 500) * 500 : 6500;
  const yDomain: [number, number] = [yMin, yMax];
  const displayData = zoomed ? chartData.filter((d) => d.year >= 2016) : chartData;

  return (
    <div className="rounded-2xl border border-divider bg-page/60 p-4">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onZoomToggle}
          className={`transition-colors ${zoomed ? "text-ocean" : "text-muted hover:text-ink"}`}
          title={zoomed ? "Show full history" : "Zoom to 2016–2030"}
        >
          {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={displayData} margin={{ top: 5, right: 90, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(50,70,90,0.4)" />
          <XAxis
            dataKey="year"
            type="number"
            domain={xDomain}
            tickCount={xTickCount}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis
            tickLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}Mt`}
            domain={yDomain}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={AGRI_TARGET_2030}
            stroke="#16a34a"
            strokeWidth={2}
            strokeDasharray="6 3"
            label={{ value: "CCC target", position: "right", fontSize: 9, fill: "#16a34a" }}
          />
          <ReferenceLine
            y={NAEI_AGRI_2023}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="2 2"
            label={{ value: "2023 actual", position: "right", fontSize: 9, fill: "#64748b" }}
          />
          <Area
            type="monotone"
            dataKey="scenario"
            baseValue={AGRI_TARGET_2030}
            fill={targetMet ? "rgba(22,163,74,0.15)" : "rgba(239,68,68,0.12)"}
            fillOpacity={1}
            stroke="none"
            legendType="none"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#94a3b8"
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="committed"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="4 2"
            isAnimationActive={false}
            dot={false}
            connectNulls
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="scenario"
            stroke={scenarioColour}
            strokeWidth={2}
            strokeDasharray="6 4"
            isAnimationActive={true}
            animationDuration={400}
            dot={false}
            connectNulls
          />
          <ReferenceDot
            x={2030}
            y={committedProjected2030}
            r={0}
            label={<RightEdgeReferenceLabel value="Draft CAP" fill="#64748b" dy={10} />}
          />
          <ReferenceDot
            x={2030}
            y={newProjected2030}
            r={0}
            label={<RightEdgeReferenceLabel value="Your scenario" fill={scenarioColour} dy={-10} />}
          />
          {!zoomed && (
            <ReferenceDot
              x={2005}
              y={chartData.find((d) => d.year === 2005)?.actual ?? NAEI_AGRI_2023}
              r={0}
              label={{ value: "Historical", position: "top", fontSize: 9, fill: "#94a3b8" }}
            />
          )}
          {!targetMet && (
            <ReferenceDot
              x={2028.85}
              y={(newProjected2030 + AGRI_TARGET_2030) / 2}
              r={0}
              label={{ value: `Gap: ${remainingGap.toLocaleString()} kt`, position: "left", fontSize: 10, fill: "#ef4444" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-3 text-sm leading-7 text-muted">{statusMessage}</p>
    </div>
  );
}
