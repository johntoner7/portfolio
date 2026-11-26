interface SectionHeaderProps {
  title: string;
  description?: string;
}

/** Plain section headings: the content says what it is, so no eyebrow labels. */
export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl space-y-3">
      <h2 className="pb-1 font-display text-4xl tracking-[-0.02em] text-ink sm:text-5xl">{title}</h2>
      {description && <p className="text-base leading-7 text-muted">{description}</p>}
    </div>
  );
}
