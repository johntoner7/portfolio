interface ToggleInterventionButtonProps {
  label: string;
  value: number;
  isActive: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export function ToggleInterventionButton({
  label,
  value,
  isActive,
  onToggle,
  children,
}: ToggleInterventionButtonProps) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
          isActive ? "border-ocean bg-ocean/10 text-ink" : "border-divider bg-page/60 text-muted"
        }`}
      >
        <span className="block text-xs font-medium">{isActive ? "✓ " : ""}{label}</span>
        <span className="text-[10px] tabular-nums">
          {isActive ? `+${value} kt` : `${value} kt potential`}
        </span>
      </button>
      {children}
    </>
  );
}
