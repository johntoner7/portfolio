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
      Python: "Used for FastAPI services, API testing, and data processing notebooks.",
      TypeScript: "Used across the React portfolio and internal front-end interfaces.",
      Go: "Used for backend services during a 15-month placement.",
      Java: "Primary language throughout university, used across coursework and projects.",
      SQL: "Used for analytics queries, reporting, and spatial joins.",
      React: "Used in the portfolio, the emissions tool, and document-processing interfaces.",
      "Next.js": "Used in the original emissions project before the portfolio moved to Vite.",
      FastAPI: "Used in the river phosphorus backend to serve monitoring and map data.",
      Tailwind: "Used to keep the portfolio and client-facing interfaces consistent.",
      "Node.js": "Used for build tooling and local development.",
      PostGIS: "Used for geospatial storage and queries in the river project.",
      Mapbox: "Used to render the river stations, lines, and farm census polygons.",
      PySpark: "Used to speed up a key data-processing notebook from minutes to seconds.",
      Databricks: "Used for automated financial projections and notebook orchestration.",
      "Azure DevOps": "Used for CI/CD pipelines and deployment automation.",
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
