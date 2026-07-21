import { Button } from "@/components/Button";

interface PresetButtonsProps {
  onApplyPreset: (preset: "techOnly" | "mixed" | "reset") => void;
}

export function PresetButtons({ onApplyPreset }: PresetButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => onApplyPreset("techOnly")}>
        <span className="text-xs font-medium">Tech only</span>
        <span className="ml-1.5 hidden text-[10px] text-muted sm:inline">No herd reduction</span>
      </Button>
      <Button variant="primary" size="sm" onClick={() => onApplyPreset("mixed")}>
        <span className="text-xs font-medium">Mixed</span>
        <span className="ml-1.5 hidden text-[10px] text-muted sm:inline">Closes the gap</span>
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onApplyPreset("reset")}>
        <span className="text-xs font-medium">Reset</span>
      </Button>
    </div>
  );
}
