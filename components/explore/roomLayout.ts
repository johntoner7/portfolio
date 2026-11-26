/**
 * The room's size and the anchors that both the furniture (ExploreScene) and
 * the clickable things on it (exploreItems) are placed from, so the two can't
 * drift apart when the room changes.
 *
 * x runs left to right as you face the window, z from the window wall (-) to
 * the door wall (+). y is up from the floor.
 *
 * A spare room in a flat, made into a study: about 4.0 x 4.6m with a 2.6m
 * ceiling. The desk sits under the window, the left wall is the work wall
 * (whiteboard and bookcases), the right wall is the lounge (sofa, with the
 * framed charts over it), and the records are by the door.
 */
export const ROOM_X = 2.0; // half width
export const ROOM_Z = 2.3; // half depth
export const WALL_HEIGHT = 2.6;

/** how far furniture stands off a wall: enough that the two never z-fight */
export const WALL_GAP = 0.02;

/** the desk, centred under the window: 1.8 x 0.75, top 0.74 up */
export const DESK = { x: 0, z: -ROOM_Z + WALL_GAP + 0.375, top: 0.74, width: 1.8, depth: 0.75 };

/**
 * The window over the desk. Its sill sits at 0.84-0.89 and reaches 0.21 off
 * the wall, clear of the desk top at 0.74 and of the laptop lid behind it.
 */
export const WINDOW = { x: 0, y: 1.55, w: 1.3, h: 1.1 };

/** the pair of bookcases against the left wall, towards the door */
export const SHELF = { x: -ROOM_X + 0.2, z: 1.12 };
/** half the gap between the two bookcases' centres, along the wall */
export const SHELF_UNIT_X = 0.435;

/** the whiteboard on the left wall, between the window corner and the bookcases */
export const BOARD = { z: -0.95, y: 1.55 };

/** centre of the couch along the right wall */
export const COUCH_Z = -0.35;

/** the low record cabinet against the door wall, left of the door */
export const RECORD_CABINET = { x: -0.2, length: 1.2, h: 0.55, d: 0.4 };

/** height of the middle of the framed charts and the pinboard */
export const PICTURE_Y = 1.55;

/** the door, in the door wall's right-hand end */
export const DOOR_X = 1.27;

/**
 * The trainers, kicked off in the corner between the end of the bookcases
 * (z 1.99) and the record cabinet (x -0.8).
 */
export const TRAINERS = { x: -1.25, z: ROOM_Z - 0.28 };
