import { AGRI_GAP, COMMITTED_BASELINE_KT } from "@/lib/niClimateData";

interface GapClosedBarProps {
  gapClosedPct: number;
  targetMet: boolean;
  userReduction: number;
  totalReduction: number;
  remainingGap: number;
}

export function GapClosedBar({
  gapClosedPct,
  targetMet,
  userReduction,
  totalReduction,
  remainingGap,
}: GapClosedBarProps) {
  return (
    <div className="rounded-2xl border border-divider bg-page/60 p-4">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted">
        <span>Gap closed</span>
        <span>{gapClosedPct}% of {AGRI_GAP.toLocaleString()} kt</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-divider/80">
        <div
          className={`h-full rounded-full transition-all duration-300 ${targetMet ? "bg-env" : "bg-ocean"}`}
          style={{ width: `${gapClosedPct}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] text-muted">
        Committed: {COMMITTED_BASELINE_KT} kt · User: {Math.round(userReduction)} kt ·{" "}
        {totalReduction > AGRI_GAP ? (
          <span className="text-env">Surplus: {Math.round(totalReduction - AGRI_GAP)} kt</span>
        ) : (
          <>Remaining: {Math.round(remainingGap)} kt</>
        )}
      </p>
    </div>
  );
}
