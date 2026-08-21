/**
 * glTF assets, downloaded from Poly Pizza into public/models.
 *
 * Every entry here must carry its licence and source. CC0 needs no
 * attribution, but CC-BY does — MODEL_CREDITS is rendered by the Credits
 * button in the explore room, so keep it accurate as assets are added.
 */

export const MODELS = {
  desk: "/models/desk.glb",
  chair: "/models/chair.glb",
  bookshelf: "/models/bookshelf.glb",
  books: "/models/books.glb",
  plant: "/models/plant.glb",
  mug: "/models/mug.glb",
  desklamp: "/models/desklamp.glb",
  football: "/models/football.glb",
  journal: "/models/journal.glb",
  rug: "/models/rug.glb",
  worksheets: "/models/worksheets.glb",
  envelopes: "/models/envelopes.glb",
  ceilinglight: "/models/ceilinglight.glb",
  // TODO: attribution — source unknown, add to MODEL_CREDITS if CC-BY
  door: "/models/door.glb",
  /*
   * The view through the window. These seven still need attribution info
   * before shipping if any of them turn out to be CC-BY — MODEL_CREDITS and
   * CREDITS.md are deliberately untouched for them so the gap stays visible.
   */
  cloud: "/models/cloud.glb",
  mountain: "/models/mountain.glb",
  roadStraight: "/models/road-straight.glb",
  roadTurn: "/models/road-turn.glb",
  carBlue: "/models/car-blue.glb",
  carWhite: "/models/car-white.glb",
  streetLight: "/models/street-light.glb",
  building1: "/models/building-1.glb",
  building2: "/models/building-2.glb",
  building3: "/models/building-3.glb",
  fairylights: "/models/fairylights.glb",
} as const;

export type ModelName = keyof typeof MODELS;

export type ModelCredit = {
  file: string;
  title: string;
  creator: string;
  licence: string;
  source: string;
};

export const MODEL_CREDITS: ModelCredit[] = [
  {
    file: "fairylights.glb",
    title: "Holiday lights",
    creator: "Poly by Google",
    licence: "CC-BY 3.0",
    source: "https://poly.pizza/m/2LU0ahKH437",
  },
  {
    file: "worksheets.glb",
    title: "Small Stack of Paper",
    creator: "Jarlan Perez",
    licence: "CC-BY 3.0",
    source: "https://poly.pizza/m/aiBozYlPe--",
  },
  {
    file: "envelopes.glb",
    title: "Envelopes",
    creator: "Jarlan Perez",
    licence: "CC-BY 3.0",
    source: "https://poly.pizza/m/78Q1KEu-sSR",
  },
  {
    file: "mug.glb",
    title: "Mug",
    creator: "Poly by Google",
    licence: "CC-BY 3.0",
    source: "https://poly.pizza/m/2jVUdnj4mVP",
  },
  {
    file: "football.glb",
    title: "Football",
    creator: "Zsky",
    licence: "CC-BY 3.0",
    source: "https://poly.pizza/m/tDblqBpmOZ",
  },
  {
    file: "desklamp.glb",
    title: "Desk lamp",
    creator: "jeremy",
    licence: "CC-BY 3.0",
    source: "https://poly.pizza/m/4ScdjC1wytg",
  },
  {
    file: "journal.glb",
    title: "Notebook",
    creator: "jeremy",
    licence: "CC-BY 3.0",
    source: "https://poly.pizza/m/9Ptsg_xZt6B",
  },
  {
    file: "desk.glb",
    title: "Desk",
    creator: "CreativeTrio",
    licence: "CC0 1.0",
    source: "https://poly.pizza/m/YJyJam67hJ",
  },
  {
    file: "bookshelf.glb",
    title: "Bookshelf",
    creator: "CreativeTrio",
    licence: "CC0 1.0",
    source: "https://poly.pizza/m/30Iealxb0p",
  },
  {
    file: "books.glb",
    title: "Books",
    creator: "CreativeTrio",
    licence: "CC0 1.0",
    source: "https://poly.pizza/m/dxt7dETAy9",
  },
  {
    file: "chair.glb",
    title: "Chair",
    creator: "Quaternius",
    licence: "CC0 1.0",
    source: "https://poly.pizza/m/iMNqRzPwwe",
  },
  {
    file: "plant.glb",
    title: "Houseplant",
    creator: "Quaternius",
    licence: "CC0 1.0",
    source: "https://poly.pizza/m/bfLOqIV5uP",
  },
  {
    file: "rug.glb",
    title: "Rug",
    creator: "Quaternius",
    licence: "CC0 1.0",
    source: "https://poly.pizza/m/7H5qKjuxVY",
  },
  {
    file: "ceilinglight.glb",
    title: "Light Ceiling Single",
    creator: "Quaternius",
    licence: "CC0 1.0",
    source: "https://poly.pizza/m/JT44JUXU2d",
  },
];
