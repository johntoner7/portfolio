import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  color?: "ocean" | "env";
}

export function SectionHeader({ eyebrow, title, description, color = "ocean" }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className={`font-mono text-xs uppercase tracking-[0.2em] text-${color}`}>{eyebrow}</p>
      <h2 className="pb-1 text-4xl text-ink sm:text-5xl">{title}</h2>
      {description && (
        <p className="text-sm leading-7 text-muted">{description}</p>
      )}
    </div>
  );
}
