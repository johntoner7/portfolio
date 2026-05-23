import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

import type { Project } from "@/lib/data";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.article
      className="group relative w-full overflow-hidden rounded-3xl border border-divider bg-page/60 p-6 transition-colors duration-300 hover:border-ocean/50 sm:p-7"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-ocean to-env transition-transform duration-500 ease-out group-hover:scale-x-100"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-env">{project.slug.replace(/-/g, " ")}</p>
          <h3 className="mt-3 text-2xl text-ink sm:text-3xl">{project.title}</h3>
        </div>
      </div>

      <p className="mt-4 text-lg leading-8 text-ocean">{project.hook}</p>
      <p className="mt-3 text-base leading-7 text-muted">{project.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.stack.map((item) => (
          <span key={item} className="rounded-full border border-divider bg-surface px-3 py-1 text-sm text-ink">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {project.links.map((link) =>
          link.href ? (
            <a
              key={link.label}
              href={link.href}
              className="inline-flex items-center gap-2 rounded-full border border-divider px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ocean hover:bg-ocean/10"
            >
              {link.label}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : (
            <span
              key={link.label}
              className="inline-flex items-center gap-2 rounded-full border border-divider px-4 py-2 text-sm font-semibold text-muted"
            >
              {link.label}
            </span>
          ),
        )}
      </div>
    </motion.article>
  );
}
