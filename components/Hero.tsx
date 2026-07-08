import { ArrowRight, Mail } from "lucide-react";

import { MotionSection } from "@/components/MotionSection";
import { siteData } from "@/lib/data";

export function Hero() {
  return (
    <MotionSection className="grid min-h-[calc(100vh-7rem)] items-center gap-8 rounded-[2rem] border border-divider bg-surface/60 p-8 shadow-glow lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ocean">{siteData.hero.eyebrow}</p>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-5xl leading-[0.95] text-ocean sm:text-6xl lg:text-7xl xl:text-8xl">
            {siteData.hero.title}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted sm:text-xl">{siteData.hero.copy}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={siteData.hero.primaryCta.href}
            className="inline-flex items-center gap-2 rounded-full bg-ocean px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            {siteData.hero.primaryCta.label}
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={siteData.hero.secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-full border border-divider bg-transparent px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
          >
            {siteData.hero.secondaryCta.label}
            <Mail className="h-4 w-4" />
          </a>
        </div>
      </div>

      <aside className="rounded-lg border border-divider bg-page/60 p-6">
        <div className="flex items-center justify-between gap-4 border-b border-divider pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-env">{siteData.hero.focus.title}</p>
        </div>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted sm:text-base">
          {siteData.hero.focus.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </aside>
    </MotionSection>
  );
}
