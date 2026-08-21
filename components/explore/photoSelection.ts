import photosData from "@/data/photos.json";

export type Photo = {
  id: string;
  cloudinaryId: string;
  year: number;
  group: string;
  caption: string;
  metadata: { dateTaken: string; location: string };
};

/**
 * Newest first. Both the pinboard in the room and the full viewer read from
 * this, so the prints on the board are always drawn from the same recent end
 * of the collection as the wall you open behind them.
 */
export const photosByRecency: Photo[] = [...(photosData as Photo[])].sort((a, b) =>
  (b.metadata.dateTaken ?? "").localeCompare(a.metadata.dateTaken ?? ""),
);
