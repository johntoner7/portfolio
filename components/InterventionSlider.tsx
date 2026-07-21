import { sliderBg, sliderBgMuted, pctOfGap } from "@/utils/scenarioCalculations";

interface InterventionSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  reduction: number;
  isMuted?: boolean;
  unit?: string;
  showReduction?: boolean;
  gapSize?: number;
  children?: React.ReactNode;
}

export function InterventionSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  reduction,
  isMuted = false,
  unit = "%",
  showReduction = true,
  gapSize,
  children,
}: InterventionSliderProps) {
  const displayValue = unit === "ha" ? value.toLocaleString() : value;
  const gradientFn = isMuted ? sliderBgMuted : sliderBg;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-xs font-mono font-medium tabular-nums text-ink">
          {displayValue} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer rounded-full outline-none"
        style={{
          WebkitAppearance: "none",
          appearance: "none",
          background: gradientFn(value, max),
        }}
      />
      <div className="flex justify-between text-[10px] text-muted/60">
        <span>{min}</span>
        <span>{max}{unit !== "ha" ? "%" : ""}</span>
      </div>
      {showReduction && reduction > 0 && gapSize && (
        <p className="text-[11px] text-muted">
          Saves <span className="font-medium text-ink">{Math.round(reduction)} kt</span>{" "}
          <span className="text-env">({pctOfGap(reduction, gapSize)}% of gap)</span>
        </p>
      )}
      {children}
    </div>
  );
}
