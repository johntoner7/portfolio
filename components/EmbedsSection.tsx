import { MotionSection } from "@/components/MotionSection";
import { SectionHeader } from "@/components/SectionHeader";
import { ScenarioModeller } from "@/components/ScenarioModeller";
import { PhosphorusMapEmbed } from "@/components/PhosphorusMapEmbed";

const EMBEDS_ENABLED = import.meta.env.VITE_ENABLE_EMBEDS !== "false";

export function EmbedsSection() {
  if (!EMBEDS_ENABLED) return null;

  return (
    <MotionSection id="embeds" className="space-y-6" delay={0.22}>
      <SectionHeader eyebrow="Interactive embeds" title="Interact with some of my deployed projects." />

      <div className="flex flex-col gap-6">
        <ScenarioModeller />
        <PhosphorusMapEmbed />
      </div>
    </MotionSection>
  );
}
