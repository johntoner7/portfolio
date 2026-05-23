import { siteData } from "@/lib/data";

import { MotionSection } from "@/components/MotionSection";
import { ProjectCard } from "@/components/ProjectCard";

export function Projects() {
  return (
    <MotionSection id="projects" className="space-y-6" delay={0.16}>
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ocean">Projects</p>
        <h2 className="text-3xl text-ink sm:text-4xl">Live tools I have built.</h2>
      </div>

      <div className="flex flex-col gap-6">
        {siteData.projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </MotionSection>
  );
}
