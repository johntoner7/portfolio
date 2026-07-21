import { siteData } from "@/lib/data";

import { MotionSection } from "@/components/MotionSection";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionHeader } from "@/components/SectionHeader";

export function Projects() {
  return (
    <MotionSection id="projects" className="space-y-6" delay={0.16}>
      <SectionHeader eyebrow="Projects" title="Live tools I have built." />

      <div className="flex flex-col gap-6">
        {siteData.projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </MotionSection>
  );
}
