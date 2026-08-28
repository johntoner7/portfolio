import { siteData } from "@/lib/data";

/**
 * Everything in the room is something the person whose office it is would
 * plausibly own: their own charts framed on the wall, a pinboard of photos,
 * the notebook on the desk, a football on the shelf.
 */
export type ExploreForm =
  | "chart"
  | "map"
  | "football"
  | "worksheets"
  | "journal"
  | "post"
  | "laptop"
  | "pinboard";

export type ExploreItem = {
  id: string;
  /** short label floated above the object in-world */
  label: string;
  title: string;
  hook?: string;
  body: string[];
  chips?: string[];
  /** per-chip detail, revealed when a chip is tapped */
  chipNotes?: Record<string, string>;
  /**
   * Optional grouping for the chips. A short stack reads fine as one row, but
   * the full skill list is long enough that it needs its own headings.
   */
  chipGroups?: { title: string; items: string[] }[];
  links?: { label: string; href: string }[];
  accent: string;
  form: ExploreForm;
  /** world position of the object itself, not the furniture under it */
  position: [number, number, number];
  /** y rotation in radians */
  rotation?: number;
  /** label height, relative to the object */
  labelY: number;
  /** sits the player back down at the laptop and returns to the 2D site */
  exitsToSite?: boolean;
  /** opens the scrollable wall of prints instead of the detail panel */
  opensPhotos?: boolean;
};

const projects = siteData.projects;

const projectMeta: Record<
  string,
  { label: string; accent: string; form: ExploreForm; position: [number, number, number]; rotation?: number; labelY: number }
> = {
  // the two data projects hang framed on the wall, the way you'd pin up your own work
  "ni-agricultural-emissions": {
    label: "Emissions Tool",
    accent: "#84a83c",
    form: "chart",
    position: [-3.17, 1.72, 1.3],
    rotation: Math.PI / 2,
    labelY: 0.62,
  },
  "lough-neagh-phosphorus-pipeline": {
    label: "River Phosphorus",
    accent: "#4aa3c7",
    form: "map",
    position: [-3.17, 1.72, -2.05],
    rotation: Math.PI / 2,
    labelY: 0.64,
  },
  // a keepsake football on the shelf
  "unmarked-goals-map": {
    label: "Unmarked",
    accent: "#d98b2b",
    form: "football",
    position: [-2.9, 0.549, 0.035],
    rotation: Math.PI / 2,
    labelY: 0.32,
  },
  // the tutoring worksheets, stacked on the shelf above it
  "pen2paper-tutoring": {
    label: "Pen2Paper",
    accent: "#a78bfa",
    form: "worksheets",
    position: [-2.9, 1.21, -0.835],
    rotation: Math.PI / 2,
    labelY: 0.28,
  },
};

/*
 * Only the projects with a placement in `projectMeta` become objects. The
 * fallbacks below used to be the safety net for that, but they are a poor one:
 * a project with no entry lands at [0, 1, 0] as a stack of worksheets, which
 * is head height in the middle of the floor. The explore room is itself listed
 * as a project now, and it is the case in point — the room does not contain a
 * model of itself, so it must not be placed at all.
 */
const projectItems: ExploreItem[] = projects
  .filter((project) => projectMeta[project.slug])
  .map((project) => {
  const meta = projectMeta[project.slug];
  return {
    id: project.slug,
    label: meta?.label ?? project.title,
    title: project.title,
    hook: project.hook,
    body: [project.description],
    chips: [...project.stack],
    links: project.links.filter((l): l is { label: string; href: string } => Boolean(l.href)),
    accent: meta?.accent ?? "#84a83c",
    form: meta?.form ?? "worksheets",
    position: meta?.position ?? [0, 1, 0],
    rotation: meta?.rotation,
    labelY: meta?.labelY ?? 0.5,
  };
});

const embedItem: ExploreItem[] = [
      {
        // the laptop you stood up from: sitting back down returns you to the site
        id: "laptop",
        label: "Main site",
        title: "Main site",
        hook: "",
        body: [],
        accent: "#84a83c",
        form: "laptop",
        position: [-0.48, 0.745, -2.9],
        rotation: -0.22,
        labelY: 0.44,
        exitsToSite: true,
      },
];

export const exploreItems: ExploreItem[] = [
  ...projectItems,
  ...embedItem,
  {
    // the notebook lying open on the desk
    id: "about",
    label: "About",
    title: siteData.about.title,
    hook: siteData.hero.copy,
    body: [...siteData.about.body],
    chips: siteData.about.skills.flatMap((group) => [...group.items]),
    chipGroups: siteData.about.skills.map((group) => ({
      title: group.title,
      items: [...group.items],
    })),
    chipNotes: { ...siteData.about.usageNotes },
    accent: "#c9a227",
    form: "journal",
    position: [-1.35, 0.75, -2.55],
    rotation: 0.14,
    labelY: 0.46,
  },
  {
    // post rack by the door: where things addressed to him arrive
    id: "contact",
    label: "Contact",
    title: siteData.contact.title,
    hook: siteData.contact.copy,
    body: [],
    links: [
      { label: siteData.contact.email, href: `mailto:${siteData.contact.email}` },
      { label: "GitHub", href: siteData.contact.github },
      { label: "LinkedIn", href: siteData.contact.linkedin },
    ],
    accent: "#84a83c",
    form: "post",
    position: [0.15, 1.35, 3.38],
    rotation: Math.PI,
    labelY: 0.4,
  },
  {
    // corkboard of prints on the far wall; it opens the scrapbook in place
    // over the room, so like the laptop it never opens a panel and carries
    // no panel copy
    id: "photos",
    label: "Photos",
    title: "Photos",
    hook: "",
    body: [],
    accent: "#e0b88a",
    form: "pinboard",
    position: [3.17, 1.8, -1.67],
    rotation: -Math.PI / 2,
    labelY: 0.78,
    opensPhotos: true,
  },
];
