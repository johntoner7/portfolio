/**
 * Machine-readable copies of the portfolio for AI agents and crawlers.
 *
 * The site is a client-rendered SPA, so anything that fetches a page without
 * running JavaScript (most agents, most LLM crawlers) sees an empty <div
 * id="root">. This plugin gives them something to read, all generated from
 * lib/data.ts so it never drifts from what the page shows:
 *
 *   /llms.txt    – markdown summary, per the llms.txt convention
 *   /robots.txt  – allows crawling and points at llms.txt and the site
 *   index.html   – JSON-LD Person data plus a <noscript> text summary
 *
 * Deliberately left out: email address (scraper bait; the contact section has
 * it for humans), team or system names at work, photos and anything else
 * about life outside of work. Company, title and city only.
 */
import type { Plugin } from "vite";

import { siteData } from "../lib/data";

const SITE = "https://johntoner.com";

const { identity, hero, about, projects, contact } = siteData;

// The About copy names the employer and city; that's the agreed level of detail.
const summary = hero.copy;

function liveUrl(links: readonly { label: string; href: string | null }[]) {
  return links.find((l) => l.label === "Live site")?.href ?? null;
}

export function buildLlmsTxt(): string {
  const skills = about.skills.map((g) => `- ${g.title}: ${g.items.join(", ")}`).join("\n");

  const projectList = projects
    .map((p) => {
      const url = liveUrl(p.links);
      const title = url ? `[${p.title}](${url})` : p.title;
      return `### ${title}\n\n${p.hook}\n\n${p.description}\n\nStack: ${p.stack.join(", ")}`;
    })
    .join("\n\n");

  return `# ${identity.name}

> ${summary}

${about.body.join("\n\n")}

## Skills

${skills}

## Projects

${projectList}

## Links

- [Portfolio](${SITE}/): projects, skills and contact details
- [3D room](${SITE}/explore): a 3D room you can walk around, built with three.js (needs a browser with WebGL)
- [GitHub](${contact.github})
- [LinkedIn](${contact.linkedin})

## Contact

Use the contact section at ${SITE}/#contact, or message on LinkedIn.
`;
}

export function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /api/

# A plain-text summary of this site for AI agents and LLMs.
# llms.txt: ${SITE}/llms.txt
`;
}

function buildJsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: identity.name,
    url: `${SITE}/`,
    jobTitle: identity.descriptor,
    worksFor: { "@type": "Organization", name: "Symphony" },
    address: { "@type": "PostalAddress", addressLocality: "Belfast", addressCountry: "GB" },
    description: summary,
    knowsAbout: about.skills.flatMap((g) => g.items),
    sameAs: [contact.github, contact.linkedin],
    subjectOf: projects.flatMap((p) => {
      const url = liveUrl(p.links);
      return url
        ? [{ "@type": "CreativeWork", name: p.title, url, description: p.hook }]
        : [];
    }),
  };
  // Escape "<" so no string in the data can close the script tag early.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildNoscript(): string {
  const items = projects
    .map((p) => {
      const url = liveUrl(p.links);
      const name = url ? `<a href="${url}">${escapeHtml(p.title)}</a>` : escapeHtml(p.title);
      return `<li>${name}: ${escapeHtml(p.hook)}</li>`;
    })
    .join("");
  return `<h1>${escapeHtml(identity.name)}</h1><p>${escapeHtml(summary)}</p><ul>${items}</ul><p>A fuller text summary is at <a href="/llms.txt">/llms.txt</a>.</p>`;
}

export function agentDocs(): Plugin {
  const files: Record<string, () => string> = {
    "/llms.txt": buildLlmsTxt,
    "/robots.txt": buildRobotsTxt,
  };

  return {
    name: "agent-docs",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const build = req.url ? files[req.url.split("?")[0]] : undefined;
        if (!build) return next();
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(build());
      });
    },
    generateBundle() {
      for (const [path, build] of Object.entries(files)) {
        this.emitFile({ type: "asset", fileName: path.slice(1), source: build() });
      }
    },
    transformIndexHtml() {
      return [
        {
          tag: "link",
          attrs: { rel: "alternate", type: "text/plain", href: "/llms.txt", title: "Text summary for LLMs" },
          injectTo: "head",
        },
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          children: buildJsonLd(),
          injectTo: "head",
        },
        { tag: "noscript", children: buildNoscript(), injectTo: "body-prepend" },
      ];
    },
  };
}
