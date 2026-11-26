import { Suspense, lazy, useEffect, useRef, useState, type ComponentType } from "react";
import { ArrowUpRight, Play, X } from "lucide-react";

import { MotionSection } from "@/components/MotionSection";
import { SectionHeader } from "@/components/SectionHeader";
import { siteData, type Project } from "@/lib/data";

/*
 * The live demos are heavy (Mapbox, Chart.js), so the page shows a still for
 * each project and only loads a demo when someone asks to try it, in a dialog
 * that takes the whole window.
 */
const liveEmbeds: Record<string, ComponentType> = {
  "ni-agricultural-emissions": lazy(() =>
    import("@/components/ScenarioModeller").then((m) => ({
      default: () => (
        <div className="mx-auto w-full max-w-6xl pt-4 sm:pt-6">
          <m.ScenarioModeller embedded />
        </div>
      ),
    })),
  ),
  "lough-neagh-phosphorus-pipeline": lazy(() =>
    import("@/components/PhosphorusMapEmbed").then((m) => ({ default: () => <m.PhosphorusMapEmbed embedded fullscreen /> })),
  ),
  "unmarked-goals-map": lazy(() =>
    import("@/components/UnmarkedGoalMapEmbed").then((m) => ({ default: () => <m.UnmarkedGoalMapEmbed fullscreen /> })),
  ),
};

function ExternalLinks({ project }: { project: Project }) {
  return (
    <>
      {project.links.map((link) =>
        link.href ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-ocean hover:underline"
          >
            {link.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        ) : null,
      )}
    </>
  );
}

function ProjectCard({ project, index, onTry }: { project: Project; index: number; onTry?: () => void }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-tile bg-surface">
      {/* the stills are 16:9 captures, so the frame is too: shown whole, never cropped or stretched */}
      <div className="relative aspect-video shrink-0 overflow-hidden bg-page">
        {project.preview && (
          <img src={project.preview.src} alt={project.preview.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-page/85 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:text-[11px]">
          Plate 0{index + 1} · {project.signal.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5 lg:p-6">
        <h3 className="font-display text-2xl text-ink">{project.title}</h3>
        <p className="font-mono text-sm">
          <span className="text-data">{project.signal.value}</span>
          <span className="text-muted"> {project.signal.label}</span>
        </p>
        <p className="text-[15px] leading-relaxed text-ink">{project.hook}</p>
        <p className="text-[13px] leading-relaxed text-muted">{project.stack.join(" · ")}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-[15px]">
          {onTry && (
            <button
              type="button"
              onClick={onTry}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ocean px-4 font-semibold text-page transition-colors hover:bg-ocean/85"
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Try it here
            </button>
          )}
          <ExternalLinks project={project} />
        </div>
      </div>
    </article>
  );
}

function DemoDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
    if (!project) return;
    // the page behind should not scroll while the demo fills the window
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [project]);

  const Embed = project ? liveEmbeds[project.slug] : null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={project ? `${project.title} live demo` : undefined}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-hidden border-0 bg-page p-0 text-ink backdrop:bg-page"
    >
      {project && Embed && (
        <div className="flex h-full flex-col">
          <header className="flex h-[4.5rem] shrink-0 items-center justify-between gap-4 border-b border-divider px-4 sm:px-6">
            <div className="flex min-w-0 items-baseline gap-5">
              <h3 className="truncate font-display text-xl sm:text-2xl">{project.title}</h3>
              <span className="hidden gap-5 text-sm sm:flex">
                <ExternalLinks project={project} />
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-divider px-4 text-sm font-semibold transition-colors hover:border-ocean"
            >
              <X className="h-4 w-4" aria-hidden />
              Close
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Suspense fallback={<p className="px-6 py-24 text-center font-mono text-sm text-muted">Loading the demo…</p>}>
              <Embed />
            </Suspense>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function Projects() {
  const [demo, setDemo] = useState<Project | null>(null);

  return (
    <MotionSection id="projects" className="flex flex-col gap-6 lg:gap-8">
      <SectionHeader title="Live tools I have built." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {siteData.projects.map((project, index) => (
          <ProjectCard
            key={project.slug}
            project={project}
            index={index}
            onTry={liveEmbeds[project.slug] ? () => setDemo(project) : undefined}
          />
        ))}
      </div>

      <DemoDialog project={demo} onClose={() => setDemo(null)} />
    </MotionSection>
  );
}
