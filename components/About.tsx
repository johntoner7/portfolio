import { useMemo, useState } from "react";

import { siteData } from "@/lib/data";

import { MotionSection } from "@/components/MotionSection";

export function About() {
  const [selectedItem, setSelectedItem] = useState<{ group: string; item: string } | null>(null);

  const selectedNote = useMemo(() => {
    if (!selectedItem) {
      return null;
    }
    return (siteData.about.usageNotes as Record<string, string>)[selectedItem.item] ?? null;
  }, [selectedItem]);

  return (
    <MotionSection id="about" className="border-t border-divider pt-10 sm:pt-14" delay={0.08}>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocean">{siteData.about.title}</p>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-5 text-base leading-7 text-muted sm:text-lg">
          {siteData.about.body.map((paragraph, index) =>
            index === 0 ? (
              <p key={paragraph} className="font-display text-2xl leading-snug text-ink sm:text-3xl">
                {paragraph}
              </p>
            ) : (
              <p key={paragraph}>{paragraph}</p>
            ),
          )}
        </div>

        <div className="grid gap-4">
          {siteData.about.skills.map((group) => (
            <div key={group.title} className="rounded-lg border border-divider bg-page/60 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink">{group.title}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedItem({ group: group.title, item })}
                    className={[
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      selectedItem?.item === item
                        ? "border-ocean bg-ocean/10 text-ink"
                        : "border-divider bg-surface text-muted hover:border-ocean hover:text-ink",
                    ].join(" ")}
                    aria-pressed={selectedItem?.item === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {selectedItem?.group === group.title && selectedNote && (
                <div className="mt-4 rounded-lg border border-divider bg-surface px-4 py-3 text-sm leading-6 text-muted">
                  <div className="font-mono text-xs uppercase tracking-[0.2em] text-ocean">{selectedItem.item}</div>
                  <p className="mt-2 text-ink">{selectedNote}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}
