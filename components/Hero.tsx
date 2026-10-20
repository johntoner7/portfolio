import { ArrowRight, Mail } from "lucide-react";

import { MotionSection } from "@/components/MotionSection";
import { FARM_BANDS, RiverNetwork } from "@/components/RiverNetwork";
import { siteData } from "@/lib/data";

const LEGEND = [
  { label: "< 0.035 mg/l", colour: "var(--river-low)" },
  { label: "0.035–0.1", colour: "var(--river-mid)" },
  { label: "> 0.1", colour: "var(--river-high)" },
];

export function Hero() {
  return (
    <MotionSection className="grid items-center lg:min-h-[calc(100vh-7rem)] gap-10 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
      <div className="space-y-8">
        <div className="space-y-6">
          <h1 className="text-6xl leading-[0.9] text-ink sm:text-7xl lg:text-8xl xl:text-[8.5rem]">
            {siteData.hero.title}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted sm:text-xl">{siteData.hero.copy}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={siteData.hero.primaryCta.href}
            className="inline-flex items-center gap-2 rounded-full bg-ocean px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ocean/85"
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

        <div className="max-w-xl border-t border-divider pt-5 font-mono text-xs leading-6 text-muted sm:text-sm">
          <p className="mb-2 uppercase tracking-[0.2em] text-env">{siteData.hero.focus.title}</p>
          <ul className="space-y-1">
            {siteData.hero.focus.body.map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden className="text-ocean">→</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <figure className="mx-auto w-full max-w-md lg:max-w-none">
        <RiverNetwork className="w-full" />
        <figcaption className="mt-4 space-y-3 font-mono text-xs leading-5 text-muted">
          <p>
            Every river in Northern Ireland coloured by soluble phosphorus, over cattle density by farm ward (2024).{" "}
            <a href="#projects" className="text-ink underline decoration-divider underline-offset-4 hover:decoration-ocean">
              From my Lough Neagh pipeline
            </a>
            .
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <li className="w-full text-ink sm:w-24">Phosphorus</li>
            {LEGEND.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: item.colour }} />
                {item.label}
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <li className="w-full text-ink sm:w-24">Cattle / ha</li>
            {FARM_BANDS.map((band) => (
              <li key={band.name} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-sm"
                  style={{ background: band.colour }}
                />
                {band.label}
              </li>
            ))}
          </ul>
        </figcaption>
      </figure>
    </MotionSection>
  );
}
