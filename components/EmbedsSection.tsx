import { MotionSection } from "@/components/MotionSection";
import { ScenarioModeller } from "@/components/ScenarioModeller";
import { PhosphorusMapEmbed } from "@/components/PhosphorusMapEmbed";

const EMBEDS_ENABLED = import.meta.env.VITE_ENABLE_EMBEDS !== "false";

export function EmbedsSection() {
  if (!EMBEDS_ENABLED) return null;

  return (
    <MotionSection id="embeds" className="space-y-6" delay={0.22}>
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ocean">Interactive embeds</p>
        <h2 className="pb-1 text-3xl text-ink sm:text-4xl">Interact with some of my deployed projects.</h2>
      </div>

      <div className="flex flex-col gap-6">
        <ScenarioModeller />
        <PhosphorusMapEmbed />
      </div>
    </MotionSection>
  );
}
