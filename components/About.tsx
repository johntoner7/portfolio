import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { siteData } from "@/lib/data";

import { chipClass } from "@/components/Chip";
import { MotionSection } from "@/components/MotionSection";
import { SectionHeader } from "@/components/SectionHeader";

export function About() {
  const [selectedItem, setSelectedItem] = useState<{ group: string; item: string } | null>(null);

  const selectedNote = useMemo(() => {
    if (!selectedItem) {
      return null;
    }
    return (siteData.about.usageNotes as Record<string, string>)[selectedItem.item] ?? null;
  }, [selectedItem]);

  return (
    <MotionSection id="about">
      <SectionHeader title={siteData.about.title} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
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
          <RoomLink />
        </div>

        <div className="grid gap-4">
          {siteData.about.skills.map((group) => (
            <div key={group.title} className="rounded-tile bg-surface p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-ink">{group.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedItem({ group: group.title, item })}
                    className={chipClass(selectedItem?.item === item, "hover:border-ocean hover:text-ink")}
                    aria-pressed={selectedItem?.item === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {selectedItem?.group === group.title && selectedNote && (
                <div className="mt-4 rounded-tile bg-page px-4 py-3 text-sm leading-6 text-muted">
                  <div className="text-sm font-semibold text-ink">{selectedItem.item}</div>
                  <p className="mt-1.5">{selectedNote}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

// A quiet way into the 3D room, for people already reading about me.
function RoomLink() {
  const { room } = siteData.about;
  return (
    <a href={room.href} className="group !mt-8 flex max-w-md items-center gap-4 rounded-tile p-1.5 pr-4 transition-colors hover:bg-surface">
      <img
        src={room.image}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-14 w-20 shrink-0 rounded-[10px] object-cover object-[42%_60%]"
      />
      <span className="flex flex-col">
        <span className="inline-flex items-center gap-1 text-base font-semibold text-ink">
          {room.title}
          <ArrowUpRight className="h-4 w-4 text-ocean transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </span>
        <span className="text-sm text-muted">{room.body}</span>
      </span>
    </a>
  );
}
