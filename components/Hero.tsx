import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";

import { ButtonLink } from "@/components/Button";
import { PolaroidPrint } from "@/components/PolaroidPrint";
import { SharedFilters } from "@/components/photos/SharedFilters";
import { FARM_BANDS, RiverNetwork } from "@/components/RiverNetwork";
import { siteData } from "@/lib/data";

const LEGEND = [
  { label: "< 0.035 mg/l", colour: "var(--river-low)" },
  { label: "0.035–0.1", colour: "var(--river-mid)" },
  { label: "> 0.1", colour: "var(--river-high)" },
];

/*
 * Atlas furniture, placed in the river file's own 1000 x 813 frame so it sits
 * on the right places at any size. Positions come from the same equirectangular
 * projection scripts/make-hero-rivers.mjs uses (NI outline bounds, squashed by
 * cos(latitude)); at that scale 25 km is 141.5 units across.
 */
const MAP_W = 1000;
const MAP_H = 813;
const at = (x: number, y: number) => ({ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` });
const SCALE_25KM = `${(141.5 / MAP_W) * 100}%`;

const RIVERS_SITE = siteData.projects.find((p) => p.slug === "lough-neagh-phosphorus-pipeline")?.links[0]?.href ?? "#projects";

function MapPlate() {
  return (
    <figure className="col-span-2 flex flex-col rounded-tile bg-surface/80 p-4 sm:p-6 md:col-span-1 md:row-span-2 lg:col-span-2 lg:min-h-0">
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:text-[11px]">
        <span>Plate 02 · Soluble phosphorus</span>
        <span>54.6°N 6.7°W</span>
      </div>

      {/*
        Fit the map inside whatever box the grid gives it, keeping its shape:
        as wide as it can be, unless that would make it taller than the box.
      */}
      <div className="mt-3 flex aspect-[1000/813] w-full items-center [container-type:size] lg:aspect-auto lg:min-h-0 lg:flex-1">
        <div className="relative mx-auto aspect-[1000/813] w-[min(100cqw,calc(100cqh*1000/813))]">
          <RiverNetwork className="w-full" />
          <span
            className="map-label pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[10px] italic tracking-[0.06em] text-ink sm:text-[13px]"
            style={at(629, 437)}
          >
            Lough Neagh
          </span>
          <span
            className="map-label pointer-events-none absolute flex -translate-x-[3px] -translate-y-1/2 items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-ink sm:text-[11px]"
            style={at(819, 451)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            BELFAST
          </span>
          <span
            className="map-label pointer-events-none absolute hidden origin-left -rotate-[76deg] whitespace-nowrap font-display text-[11px] italic tracking-[0.2em] text-muted sm:block"
            style={at(612, 300)}
          >
            River Bann
          </span>
          <span className="map-label pointer-events-none absolute left-[3%] top-[3%] flex flex-col items-center gap-0.5 font-mono text-[10px] text-muted" aria-hidden>
            <svg width="12" height="19" viewBox="0 0 14 22">
              <path d="M7 1 L13 21 L7 16 L1 21 Z" fill="currentColor" />
            </svg>
            N
          </span>
          <span className="map-label pointer-events-none absolute bottom-[3%] left-[3%] hidden flex-col gap-1 font-mono text-[10px] text-muted sm:flex" style={{ width: SCALE_25KM }} aria-hidden>
            <span className="flex h-[5px] w-full border border-current">
              <span className="w-1/2 bg-current" />
            </span>
            <span className="flex justify-between">
              <span>0</span>
              <span>25 km</span>
            </span>
          </span>
        </div>
      </div>

      <figcaption className="mt-3 flex flex-col gap-2.5 font-mono text-[11px] leading-5 text-muted">
        <p className="hidden lg:block">
          Every river in Northern Ireland coloured by soluble phosphorus, over cattle density by farm ward (2024). From my Lough Neagh pipeline.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {LEGEND.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span aria-hidden className="h-[3px] w-3.5 rounded-full" style={{ background: item.colour }} />
                {item.label}
              </li>
            ))}
            <li className="hidden items-center gap-1.5 xl:flex">
              <span className="sr-only">Cattle per hectare:</span>
              {FARM_BANDS.map((band) => (
                <span key={band.name} aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: band.colour }} />
              ))}
              <span aria-hidden>cattle / ha</span>
            </li>
          </ul>
          <a
            href={RIVERS_SITE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-body text-sm font-semibold text-ocean hover:underline"
          >
            Open the full map
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </figcaption>
    </figure>
  );
}

// a small spread, like a group on the Photos page's table
const SPREAD = [
  { left: "0%", top: "12%", rotate: -7, z: 1 },
  { left: "31%", top: "0%", rotate: 4, z: 2 },
  { left: "62%", top: "14%", rotate: -2.5, z: 1 },
];

function PhotosTile() {
  const { photos } = siteData.hero;
  return (
    <a
      href={photos.href}
      className="group relative col-span-2 flex min-h-[96px] flex-col justify-end overflow-hidden rounded-tile bg-env/10 p-4 transition-colors hover:bg-env/15 sm:p-6 md:col-span-1 md:row-span-2 md:min-h-0 md:gap-4 md:[container-type:size] lg:col-span-2 lg:row-span-1"
    >
      {/* phone: one small print in the corner */}
      <PolaroidPrint
        id={photos.featured[0]}
        width={120}
        tape={false}
        className="absolute right-12 top-2.5 w-[40px] md:hidden"
        style={{ rotate: "8deg" }}
      />
      {/* wider screens: a small spread of prints */}
      {/* capped to the prints' height so the spread stays overlapped on the wide tile */}
      <div aria-hidden className="tile-art relative min-h-0 w-full flex-1 md:max-w-[130cqh]">
        {photos.featured.map((id, index) => (
          <PolaroidPrint
            key={id}
            id={id}
            className="absolute w-[min(32cqw,calc(64cqh/1.4))] transition-transform duration-300 group-hover:-translate-y-1"
            style={{ left: SPREAD[index].left, top: SPREAD[index].top, rotate: `${SPREAD[index].rotate}deg`, zIndex: SPREAD[index].z }}
          />
        ))}
      </div>
      <div className="relative z-10 flex items-end justify-between gap-3">
        <span className="font-display text-[19px] text-ink sm:text-2xl">{photos.title}</span>
        <ArrowUpRight className="h-5 w-5 shrink-0 text-env transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </div>
    </a>
  );
}

export function Hero() {
  const { hero } = siteData;
  return (
    <section
      aria-label="Introduction"
      className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-rows-[auto_minmax(15rem,1fr)_minmax(15rem,1fr)] lg:h-[clamp(600px,calc(100svh-var(--nav-h)-2rem),56rem)] lg:grid-cols-4 lg:grid-rows-[1.15fr_1fr]"
    >
      <div className="col-span-2 flex flex-col justify-between gap-4 rounded-tile bg-surface p-5 sm:gap-8 sm:p-8 lg:p-10">
        <h1 id="hero-name" className="font-display text-[clamp(3rem,min(8vw,12svh),7rem)] leading-[0.92] tracking-[-0.03em] text-ink">
          {hero.title}
        </h1>
        <div className="flex flex-col gap-4 sm:gap-6">
          <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:text-[19px]">{hero.copy}</p>
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            <ButtonLink href={hero.primaryCta.href} variant="solid" size="lg">
              {hero.primaryCta.label}
              <ArrowRight className="hidden h-4 w-4 sm:block" />
            </ButtonLink>
            <ButtonLink href={hero.secondaryCta.href} size="lg">
              {hero.secondaryCta.label}
              <Mail className="hidden h-4 w-4 sm:block" />
            </ButtonLink>
          </div>
        </div>
      </div>

      <MapPlate />
      <PhotosTile />
      <SharedFilters />
    </section>
  );
}
