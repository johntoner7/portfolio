import { AGRI_GAP, AGRI_TARGET_2030 } from "@/lib/niClimateData";

interface ScenarioMetricsProps {
  newProjected2030: number;
  remainingGap: number;
  targetMet: boolean;
}

export function ScenarioMetrics({ newProjected2030, remainingGap, targetMet }: ScenarioMetricsProps) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-divider">
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted">Projection 2030</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{newProjected2030.toLocaleString()} kt</p>
      </div>
      <div className="border-l border-divider p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted">Target</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-env">{AGRI_TARGET_2030.toLocaleString()} kt</p>
      </div>
      <div className="border-l border-divider p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted">Gap</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${targetMet ? "text-env" : "text-red-400"}`}>
          {remainingGap.toLocaleString()} kt
        </p>
      </div>
    </div>
  );
}
