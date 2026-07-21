import type { ReactNode } from "react";

interface InterventionSectionProps {
  title: string;
  maxKt: number;
  children: ReactNode;
  hasLeftBorder?: boolean;
}

export function InterventionSection({ title, maxKt, children, hasLeftBorder = false }: InterventionSectionProps) {
  return (
    <div className={hasLeftBorder ? "space-y-5 md:border-l md:border-divider md:pl-6" : "space-y-5"}>
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted">{title}</p>
        <span className="text-[10px] text-muted">up to {maxKt.toLocaleString()} kt</span>
      </div>
      {children}
    </div>
  );
}
