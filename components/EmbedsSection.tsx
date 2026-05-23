import { Suspense, lazy } from "react";

import { MotionSection } from "@/components/MotionSection";

const EMBEDS_ENABLED = import.meta.env.VITE_ENABLE_EMBEDS === "true";

const ScenarioModeller = lazy(() =>
  import("@/components/ScenarioModeller").then((module) => ({ default: module.ScenarioModeller })),
);

const PhosphorusMapEmbed = lazy(() =>
  import("@/components/PhosphorusMapEmbed").then((module) => ({ default: module.PhosphorusMapEmbed })),
);

export function EmbedsSection() {
  if (!EMBEDS_ENABLED) return null;

  return (
    <MotionSection id="embeds" className="space-y-6" delay={0.22}>
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ocean">Interactive embeds</p>
        <h2 className="text-3xl text-ink sm:text-4xl">Interact with some of my deployed projects.</h2>
      </div>

      <div className="flex flex-col gap-6">
        <Suspense fallback={<EmbedFallback title="Scenario modeller" />}>
          <ScenarioModeller />
        </Suspense>
        <Suspense fallback={<EmbedFallback title="Phosphorus map" />}>
          <PhosphorusMapEmbed />
        </Suspense>
      </div>
    </MotionSection>
  );
}

function EmbedFallback({ title }: { title: string }) {
  return (
    <article className="rounded-[2rem] border border-divider bg-surface/70 p-6 shadow-glow sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ocean">Loading</p>
      <h3 className="mt-2 text-2xl text-ink">{title}</h3>
      <div className="mt-6 space-y-3">
        <div className="h-4 w-2/3 rounded-full bg-divider/80" />
        <div className="h-4 w-1/2 rounded-full bg-divider/70" />
        <div className="h-[280px] rounded-2xl border border-divider bg-page/60" />
      </div>
    </article>
  );
}
