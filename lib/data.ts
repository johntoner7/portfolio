export type NavLink = {
  label: string;
  href: string;
};

export type SkillGroup = {
  title: string;
  items: string[];
};

export type SkillUsageNotes = Record<string, string>;

export type ProjectLink = {
  label: string;
  href: string | null;
};

export type Project = {
  title: string;
  slug: string;
  hook: string;
  description: string;
  stack: string[];
  links: ProjectLink[];
};

export type DataStat = {
  value: number;
  label: string;
  suffix?: string;
};

export const siteData = {
  identity: {
    name: "John Toner",
    descriptor: "Software Engineer",
  },
  nav: {
    links: [
      { label: "About", href: "#about" },
      { label: "Projects", href: "#projects" },
      { label: "Contact", href: "#contact" },
    ] satisfies NavLink[],
  },
  hero: {
    eyebrow: "Portfolio",
    title: "John Toner",
    copy: "Associate Software Engineer at PwC. I build full-stack applications to automate workflows and turn complex data into usable products.",
    primaryCta: { label: "View Projects", href: "#projects" },
    secondaryCta: { label: "Get in Touch", href: "#contact" },
    focus: {
      title: "Current focus",
      body: [
        "Building agentic capabilities for document processing systems using Python.",
        "Personally focused on creating open environmental data tools and visualisations.",
      ],
    },
  },
  about: {
    title: "About",
    body: [
      "I'm a software engineer at PwC, working across Python services, React interfaces, Databricks pipelines, and AI-driven document processing. My work is primarily focused on full-stack delivery.",
      "I completed a 15-month placement at PwC as a degree apprentice, building Go backend services and React TypeScript interfaces, covering the full lifecycle from design through to deployment.",
      "Outside of work I build open data tools. Two are publicly deployed, with one covering NI agricultural emissions, and the other mapping 35 years of river phosphorus data across 1,200 monitoring stations. Both involve real backend architecture, FastAPI, PostGIS, and Mapbox.",
    ],
    usageNotes: {
      Python: "Used professionally at PwC for data processing notebooks, PySpark optimisation, and API testing automation. Used in personal projects for ETL pipelines, Mann-Kendall trend analysis, and FastAPI backend services.",
      TypeScript: "Primary language across personal projects: the emissions tool, phosphorus pipeline frontend, and client-facing tutoring site. Also used for internal interfaces at PwC.",
      Go: "Used for backend services across a 15-month placement, building and maintaining production APIs.",
      Java: "Primary language throughout university, used across coursework, group projects, and individual assignments over three years.",
      SQL: "Used for analytics queries and reporting at PwC, and for spatial joins and trend queries via PostGIS in the phosphorus pipeline.",
      React: "Used in all personal projects including a scrollytelling emissions tool, an interactive geospatial monitoring dashboard, and a client tutoring site. Also used for internal tooling at PwC.",
      "Next.js": "Used to build the NI agricultural emissions tool with App Router, TypeScript, Tailwind CSS, and Recharts, deployed on Vercel.",
      FastAPI: "Used to build the phosphorus pipeline API, serving 35 years of monitoring data across 1,201 stations with PostGIS spatial queries and Prefect-orchestrated ETL. Deployed on Railway.",
      Tailwind: "Used across the emissions tool, phosphorus pipeline frontend, portfolio site, and a client-facing tutoring website.",
      "Node.js": "used as the runtime for a backend service in my dissertation project.",
      PostGIS: "Used to store and query spatial monitoring data in the phosphorus pipeline, covering spatial joins, station lookups, and trend aggregations across NI river network data.",
      Mapbox: "Used to build an interactive geospatial interface for the phosphorus pipeline, rendering 1,201 monitoring stations, river network lines, and farm census polygons with custom styling and filtering.",
      PySpark: "Used at PwC to optimise a Canada Life capital projections notebook, reducing a multi-minute processing job to seconds through partition tuning and broadcast joins.",
      Databricks: "Used at PwC for automated financial projection workflows including notebook orchestration, YAML-to-asset-bundle conversion, job scheduling, and audit logging for a major insurance client.",
      "Azure DevOps": "Used at PwC for CI/CD pipelines, deployment automation, and release management across data engineering projects.",
    } satisfies SkillUsageNotes,
    skills: [
      {
        title: "Languages",
        items: ["Python", "TypeScript", "Go", "Java", "SQL"],
      },
      {
        title: "Frameworks",
        items: ["React", "Next.js", "FastAPI", "Tailwind", "Node.js"],
      },
      {
        title: "Tools",
        items: ["PostGIS", "Mapbox", "PySpark", "Databricks", "Azure DevOps"],
      },
    ] satisfies SkillGroup[],
  },
  projects: [
    {
      title: "Northern Ireland Agriculture Emissions Tool",
      slug: "ni-agricultural-emissions",
      hook: "NI cut overall emissions 31.5% since 1990, but agriculture emissions increased.",
      description:
        "Scrollytelling data tool built on 34 years of NAEI emissions data. Includes an interactive scenario modeller for testing intervention combinations against the 2030 target.",
      stack: ["React", "TypeScript", "Next.js", "Scrollama", "Tailwind"],
      links: [
        { label: "Live site", href: "https://climategapni.com" },
        { label: "GitHub", href: "https://github.com/johntoner7" },
      ],
    },
    {
      title: "NI River Phosphorus Tool",
      slug: "lough-neagh-phosphorus-pipeline",
      hook: "Mapping river phosphorus data spanning 35 years across 1,200 monitoring stations.",
      description:
        "FastAPI backend with PostGIS queries and a React frontend using Mapbox GL JS. Processes 170,000+ readings from government sources, with some stations holding records dating back to 1990.",
      stack: ["Python", "FastAPI", "PostGIS", "Mapbox GL JS", "Railway"],
      links: [
        { label: "Live site", href: "https://rivers.climategapni.com" },
        { label: "GitHub", href: "https://github.com/johntoner7" },
      ],
    },
    {
      title: "Pen2Paper Tutoring Website",
      slug: "pen2paper-tutoring",
      hook: "Live client website, independently maintainable.",
      description:
        "React and Tailwind site with Sanity CMS so the client can manage content without touching code. Contact form with email delivery via Resend.",
      stack: ["React", "TypeScript", "Sanity CMS", "Resend", "Vercel"],
      links: [{ label: "Live site", href: "https://pen2papertutor.com" }],
    },
  ] satisfies Project[],
  stats: [
    { value: 170000, suffix: "+", label: "phosphorus readings" },
    { value: 1201, label: "monitoring stations" },
    { value: 35, label: "years of data" },
  ] satisfies DataStat[],
  contact: {
    title: "Contact",
    copy: "Get in touch via email or find me on GitHub and LinkedIn.",
    email: "johntoner404@gmail.com",
    github: "https://github.com/johntoner7",
    linkedin: "https://www.linkedin.com/in/john-b-toner/",
  },
  footer: {
    copy: "John Toner · 2026",
  },
} as const;
