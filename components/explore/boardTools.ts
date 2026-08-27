/**
 * Whiteboard tool settings, kept in their own module so the toolbar in
 * `pages/Explore.tsx` can import the palettes as values without pulling the
 * lazily-loaded `ExploreScene` (and three.js with it) into the main bundle.
 */

/** What the marker is doing: freehand ink, rubbing out, or placing notes. */
export type BoardMode = "pen" | "eraser" | "note";

export type BoardTool = {
  mode: BoardMode;
  /** ink colour, used by pen (the eraser lifts ink rather than painting) */
  colour: string;
  /** nib width in canvas pixels; the eraser scales this up */
  width: number;
  noteColour: string;
};

export const BOARD_INKS = ["#2f5d8a", "#1c1914", "#b5432f", "#3d6b3a"] as const;
export const BOARD_NOTE_COLOURS = ["#e8d16a", "#e8a06a", "#d98ba8", "#8fc6d1"] as const;
export const BOARD_NIBS = [4, 9, 18] as const;

/**
 * Roughly what five lines of a sticky note hold at its drawn size. The note
 * clips anything past that, so the editor's limit is matched to what actually
 * shows rather than letting text vanish silently.
 */
export const NOTE_MAX_CHARS = 60;

export const DEFAULT_TOOL: BoardTool = {
  mode: "pen",
  colour: BOARD_INKS[0],
  width: BOARD_NIBS[1],
  noteColour: BOARD_NOTE_COLOURS[0],
};
