import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";

import { CountUp } from "@/components/CountUp";
import { MotionSection } from "@/components/MotionSection";
import { PhosphorusMapEmbed } from "@/components/PhosphorusMapEmbed";
import { ScenarioModeller } from "@/components/ScenarioModeller";
import { SectionHeader } from "@/components/SectionHeader";
import { UnmarkedGoalMapEmbed } from "@/components/UnmarkedGoalMapEmbed";
import { siteData, type Project } from "@/lib/data";

const projectSignals: Record<string, { category: string; value: string; label: string }> = {
  "ni-agricultural-emissions": { category: "Climate data", value: "34 years", label: "of emissions data" },
  "lough-neagh-phosphorus-pipeline": { category: "Environmental data", value: "170k+", label: "water-quality readings" },
  "unmarked-goals-map": { category: "Football data", value: "70", label: "players mapped" },
};

function ProjectLinks({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-3">
      {project.links.map((link) => {
        if (!link.href) return null;
        const external = link.href.startsWith("http");

        return (
          <a
            key={link.label}
            href={link.href}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="inline-flex items-center gap-2 rounded-full border border-divider bg-page/50 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
          >
            {link.label}
            {external ? <ExternalLink className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          </a>
        );
      })}
    </div>
  );
}

function ProjectDetails({ project }: { project: Project }) {
  return (
    <div className="flex flex-col justify-between gap-8 px-6 pb-2 pt-6 sm:px-8 sm:pb-3 sm:pt-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-env">{project.slug.replace(/-/g, " ")}</p>
        <h3 className="mt-3 text-3xl text-ink sm:text-4xl">{project.title}</h3>
        <p className="mt-5 text-lg leading-8 text-ocean">{project.hook}</p>
        <p className="mt-4 text-base leading-7 text-muted">{project.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.stack.map((item) => (
            <span key={item} className="rounded-full border border-divider bg-page/60 px-3 py-1 text-sm text-ink">
              {item}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}

function LiveProject({ project }: { project: Project }) {
  if (project.slug === "ni-agricultural-emissions") return <ScenarioModeller embedded />;
  if (project.slug === "lough-neagh-phosphorus-pipeline") return <PhosphorusMapEmbed embedded />;
  if (project.slug === "unmarked-goals-map") return <UnmarkedGoalMapEmbed />;

  return (
    <div className="flex min-h-[360px] flex-col justify-between px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-env">Live project</p>
        <p className="mt-5 max-w-xl text-3xl leading-tight text-ink sm:text-4xl">
          Explore the full experience on the live site.
        </p>
        <p className="mt-5 max-w-lg text-base leading-7 text-muted">
          This project is best experienced in its own interface, so the showcase stays lightweight while still giving you a direct route in.
        </p>
      </div>
    </div>
  );
}

export function Projects() {
  const projects = siteData.projects;
  const [activeIndex, setActiveIndex] = useState(0);
  const selectorRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectorContainerRef = useRef<HTMLDivElement | null>(null);
  const hasSelectedProject = useRef(false);
  const activeProject = projects[activeIndex];

  useEffect(() => {
    if (!hasSelectedProject.current) {
      hasSelectedProject.current = true;
      return;
    }

    const container = selectorContainerRef.current;
    const selectedButton = selectorRefs.current[activeIndex];
    if (!container || !selectedButton) return;

    const targetLeft = selectedButton.offsetLeft - (container.clientWidth - selectedButton.clientWidth) / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [activeIndex]);

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + projects.length) % projects.length);
  };

  return (
    <MotionSection id="projects" className="space-y-6 border-t border-divider pt-10 sm:pt-14" delay={0.16}>
      <SectionHeader
        eyebrow="Projects"
        title="Live tools I have built."
        description="Choose a project to explore its work, tools, and live experience."
      />

      <div className="relative">
        <div
          ref={selectorContainerRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 sm:grid sm:grid-cols-3 sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Projects"
          role="tablist"
        >
          {projects.map((project, index) => (
            <button
              key={project.slug}
              ref={(element) => { selectorRefs.current[index] = element; }}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-controls={`project-panel-${project.slug}`}
              onClick={() => setActiveIndex(index)}
              className={`min-w-[min(78vw,300px)] snap-start rounded-2xl border px-5 py-4 text-left transition-colors sm:min-w-0 sm:w-full ${
                activeIndex === index
                  ? "border-ocean bg-ocean/10 text-ink"
                  : "border-divider bg-surface/50 text-muted hover:border-ocean/60 hover:text-ink"
              }`}
            >
              <span className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.2em] text-env">
                <span>{projectSignals[project.slug].category}</span>
                <span className="text-muted/70">0{index + 1}</span>
              </span>
              <span className="mt-4 block font-mono text-3xl leading-none text-ink">
                <CountUp value={projectSignals[project.slug].value} />
              </span>
              <span className="mt-2 block font-mono text-xs uppercase tracking-[0.12em] text-muted">{projectSignals[project.slug].label}</span>
              <span className="mt-4 block text-lg leading-tight text-ink">{project.title}</span>
            </button>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-end gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous project"
              className="rounded-full border border-divider p-2 text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next project"
              className="rounded-full border border-divider p-2 text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        id={`project-panel-${activeProject.slug}`}
        role="tabpanel"
        aria-label={activeProject.title}
        className="overflow-hidden rounded-[2rem] border border-divider bg-surface/70"
      >
        {/* keyed by project so switching fades the new one in rather than swapping it instantly */}
        <motion.div
          key={activeProject.slug}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <ProjectDetails project={activeProject} />
          <LiveProject project={activeProject} />
          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <ProjectLinks project={activeProject} />
          </div>
        </motion.div>
      </div>
    </MotionSection>
  );
}
