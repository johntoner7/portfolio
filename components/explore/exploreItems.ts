import { siteData } from "@/lib/data";
import { coverAt300, formatDay, formatPace, lifeSnapshot, wordOfTheDay } from "@/lib/lifeSnapshot";
import {
  COUCH_Z,
  DESK,
  PICTURE_Y,
  RECORD_CABINET,
  ROOM_X,
  ROOM_Z,
  SHELF,
  SHELF_UNIT_X,
  TRAINERS,
} from "./roomLayout";

/** where something hangs flat on the right (+x) wall, facing into the room */
const RIGHT_WALL_X = ROOM_X - 0.03;
/** the front edge of the bookcase shelves, where things sit */
const ON_SHELF_X = SHELF.x + 0.1;

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
  | "letters"
  | "laptop"
  | "pinboard"
  | "records"
  | "trainers"
  | "phrasebook";

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
  /** one thing set large at the top of the panel, like the word on a flashcard */
  feature?: { kicker: string; big: string; small: string };
  /** a row of headline figures */
  stats?: { value: string; label: string }[];
  /** a grid of artwork, like album sleeves */
  covers?: { title: string; covers: { src: string | null; title: string; sub: string }[] };
  /** short ranked lists under their own headings */
  lists?: { title: string; rows: { primary: string; secondary?: string }[] }[];
  /** small print at the foot of the panel: where the figures come from */
  footnote?: string;
  accent: string;
  form: ExploreForm;
  /** world position of the object itself, not the furniture under it */
  position: [number, number, number];
  /** y rotation in radians */
  rotation?: number;
  /** sits the player back down at the laptop and returns to the 2D site */
  exitsToSite?: boolean;
  /** opens the scrollable wall of prints instead of the detail panel */
  opensPhotos?: boolean;
};

const projects = siteData.projects;

const projectMeta: Record<
  string,
  { label: string; accent: string; form: ExploreForm; position: [number, number, number]; rotation?: number }
> = {
  // the two data projects hang framed over the couch, the way you'd hang prints
  "ni-agricultural-emissions": {
    label: "Emissions Tool",
    accent: "#84a83c",
    form: "chart",
    position: [RIGHT_WALL_X, PICTURE_Y, COUCH_Z + 0.5],
    rotation: -Math.PI / 2,
  },
  "lough-neagh-phosphorus-pipeline": {
    label: "River Phosphorus",
    accent: "#4aa3c7",
    form: "map",
    position: [RIGHT_WALL_X, PICTURE_Y, COUCH_Z - 0.5],
    rotation: -Math.PI / 2,
  },
  // a keepsake football on the shelf
  "unmarked-goals-map": {
    label: "Unmarked",
    accent: "#d98b2b",
    form: "football",
    position: [ON_SHELF_X, 0.549, SHELF.z + SHELF_UNIT_X],
    rotation: Math.PI / 2,
  },
  // the tutoring worksheets, stacked on the shelf above it
  "pen2paper-tutoring": {
    label: "Pen2Paper",
    accent: "#a78bfa",
    form: "worksheets",
    position: [ON_SHELF_X, 1.21, SHELF.z - SHELF_UNIT_X],
    rotation: Math.PI / 2,
  },
};

/*
 * Only the projects with a placement in `projectMeta` become objects in the
 * room. This used to be a `.map` with fallbacks, which was a poor safety net:
 * an unplaced project landed at [0, 1, 0] as a stack of worksheets, head
 * height in the middle of the floor. The explore room is itself listed as a
 * project now and is the case in point — the room does not contain a model of
 * itself, so it must not be placed at all. `flatMap` drops it instead, and
 * lets the rest read `meta.x` rather than `meta?.x ?? guess`.
 */
const projectItems: ExploreItem[] = projects.flatMap((project) => {
  const meta = projectMeta[project.slug];
  if (!meta) return [];

  return [
    {
      id: project.slug,
      label: meta.label,
      title: project.title,
      hook: project.hook,
      body: [project.description],
      chips: [...project.stack],
      links: project.links.filter((l): l is { label: string; href: string } => Boolean(l.href)),
      accent: meta.accent,
      form: meta.form,
      position: meta.position,
      rotation: meta.rotation,
    },
  ];
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
        // middle of the desk, square to the window
        position: [DESK.x + 0.08, 0.745, DESK.z + 0.02],
        rotation: -0.1,
        exitsToSite: true,
      },
];

/*
 * Bits of John's own life, read from a snapshot of his life dashboard (see
 * lib/lifeSnapshot.ts). Each is left out when its part of the snapshot is
 * missing, so an export without, say, any runs just leaves the trainers off.
 */
const { spotify, running, spanish, generatedOn } = lifeSnapshot;

const lifeItems: ExploreItem[] = [];

if (spotify) {
  lifeItems.push({
    // a turntable on the record cabinet by the door, with the most played sleeves beside it
    id: "records",
    label: "Records",
    title: "Music",
    hook: `${spotify.hours} hours of music in the last 3 months, on ${spotify.daysWithMusic} of ${spotify.span} days.`,
    stats: [
      { value: `${spotify.hours}h`, label: "listened" },
      { value: String(spotify.artists), label: "artists" },
      { value: `${spotify.streakDays} days`, label: "longest streak" },
    ],
    body: [],
    covers: {
      title: "Most played albums",
      covers: spotify.albums.slice(0, 6).map((album) => ({
        src: album.cover ? coverAt300(album.cover) : null,
        title: album.name,
        sub: album.artist,
      })),
    },
    lists: [
      {
        title: "Top artists",
        rows: spotify.topArtists.map((artist) => ({ primary: artist.name, secondary: `${artist.hours} h` })),
      },
      ...(spotify.topTrack
        ? [
            {
              title: "Most played track",
              rows: [
                {
                  primary: spotify.topTrack.name,
                  secondary: `${spotify.topTrack.artist} · ${spotify.topTrack.plays} plays`,
                },
              ],
            },
          ]
        : []),
    ],
    accent: "#7c9cf0",
    form: "records",
    // the door end of the record cabinet (RECORD_CABINET in roomLayout), on its top;
    // turned to face into the room, so the sleeves run along the wall away from the door
    position: [RECORD_CABINET.x + 0.33, RECORD_CABINET.h, ROOM_Z - 0.24],
    rotation: Math.PI,
  });
}

if (running) {
  lifeItems.push({
    // a pair of trainers kicked off in the corner by the bookcase
    id: "running",
    label: "Running",
    title: "Running",
    hook: `${running.km} km over ${running.runs} runs in the last 3 months.`,
    stats: [
      { value: `${running.km} km`, label: "run" },
      ...(running.longestKm ? [{ value: `${running.longestKm} km`, label: "longest" }] : []),
      ...(running.fastestPace
        ? [{ value: formatPace(running.fastestPace).replace(" /km", ""), label: `best /km (${running.fastestPaceMinKm} km+)` }]
        : []),
    ],
    body: ["Runs come in from Apple Health to my life dashboard."],
    lists: [
      ...(running.shoes.length
        ? [{ title: "Shoes", rows: running.shoes.map((shoe) => ({ primary: shoe.name, secondary: `${shoe.km} km` })) }]
        : []),
    ],
    accent: "#ef6f4f",
    form: "trainers",
    // on the floor in the corner between the bookcase and the record cabinet
    position: [TRAINERS.x, 0, TRAINERS.z],
    rotation: Math.PI,
  });
}

if (spanish && spanish.words.length) {
  // a different handful each day, starting from the word on the card
  const start = wordOfTheDay(spanish.words)!.index;
  const revising = Array.from({ length: Math.min(8, spanish.words.length) }, (_, i) =>
    spanish.words[(start + i) % spanish.words.length],
  );

  lifeItems.push({
    // a phrasebook and flashcards on the bookshelf
    id: "spanish",
    label: "Español",
    title: "Learning Spanish",
    hook: "Here's what I've been revising in Spanish recently.",
    body: [],
    lists: [{ title: "Revising", rows: revising.map((word) => ({ primary: word.es, secondary: word.en })) }],
    accent: "#e3b23c",
    form: "phrasebook",
    // on the second bookcase's fourth shelf (1.21 up, where the football's
    // across from it), turned so the card reads the right way up from the room
    position: [SHELF.x + 0.05, 1.21, SHELF.z - SHELF_UNIT_X],
    rotation: Math.PI / 2 + 0.15,
  });
}

export const exploreItems: ExploreItem[] = [
  ...projectItems,
  ...embedItem,
  ...lifeItems,
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
    position: [DESK.x - 0.55, 0.75, DESK.z + 0.06],
    rotation: 0.14,
  },
  {
    // letters left on the desk, by the laptop
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
    form: "letters",
    position: [DESK.x + 0.5, DESK.top, DESK.z + 0.17],
    rotation: 0.35,
  },
  {
    // corkboard of prints on the window wall, right of the window; it opens the scrapbook in place
    // over the room, so like the laptop it never opens a panel and carries
    // no panel copy
    id: "photos",
    label: "Photos",
    title: "Photos",
    hook: "",
    body: [],
    accent: "#e0b88a",
    form: "pinboard",
    position: [1.4, PICTURE_Y + 0.05, -ROOM_Z + 0.03],
    rotation: 0,
    opensPhotos: true,
  },
];
