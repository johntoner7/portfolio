/** Small rounded tag: skills, tech stacks. Not a call to action — see Button. */
export function chipClass(active = false, className = "") {
  return [
    "rounded-full border px-3 py-1 text-sm transition-colors",
    active ? "border-ocean bg-ocean/10 text-ink" : "border-divider bg-surface text-muted",
    className,
  ].join(" ");
}

export function Chip({ children }: { children: string }) {
  return <span className={chipClass(false, "text-ink")}>{children}</span>;
}
