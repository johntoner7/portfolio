"use client";

import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { ArrowDown } from "lucide-react";
import * as THREE from "three";
import { darkWoodPalette, lightWoodPalette, makeWoodTextures } from "@/utils/woodTexture";
import { makeCeilingTextures } from "./ceilingTexture";
import { makeWhiteboardTexture } from "./whiteboardTexture";
import { makeCloudTexture } from "./cloudTexture";
import type { Weather } from "@/utils/weather";
import { DEFAULT_TOOL, type BoardTool } from "./boardTools";
import { makeLaptopScreenTexture } from "./laptopScreenTexture";
import { ModelBoundary, preloadModel, useModel } from "./useModel";
import { siteData } from "@/lib/data";
import { exploreItems, type ExploreItem } from "./exploreItems";
import { getCloudinaryUrl } from "@/utils/cloudinary";
import { photosByRecency, type Photo } from "./photoSelection";

const ROOM_X = 3.2; // half width — the room is narrower than it is deep
const ROOM_Z = 3.4; // half depth
const WALL_HEIGHT = 3.4;
const EYE_HEIGHT = 1.6;
const START = new THREE.Vector2(0, 2.2);
const WALK_SPEED = 2.6;
const LABEL_RANGE = 4.5;

const DESK = { x: -0.9, z: -ROOM_Z + 0.57, top: 0.74 };

/*
 * Imported-asset scaling. Every number below is measured from the glTF itself
 * (node transforms applied), not eyeballed:
 *   desk       1.250 x 0.433 x 0.622, geometry centred at x +0.320, z +0.006
 *   chair      0.762 x 1.768 x 0.825, centred at z -0.032
 *   bookshelf  0.574 x 1.320 x 0.154, shelf boards topping out at
 *              y 0.032 / 0.289 / 0.546 / 0.804 / 1.062
 *   books      0.197 x 0.156 x 0.125, centred at x +0.080, z -0.015
 */
const DESK_SCALE = DESK.top / 0.433;
const DESK_OFFSET: [number, number, number] = [-0.32 * DESK_SCALE, 0, -0.006 * DESK_SCALE];
const CHAIR_SCALE = 0.53;
const CHAIR_OFFSET: [number, number, number] = [0, 0, 0.032 * CHAIR_SCALE];
/** z is stretched hard: the shelf model is only 0.154 deep, too shallow to hold a football */
const SHELF_SCALE: [number, number, number] = [1.5, 1.5, 2.2];
const SHELF_TOPS = [0.032, 0.289, 0.546, 0.804, 1.062].map((y) => y * SHELF_SCALE[1]);
/** two matching units side by side, since one is only 0.86m wide */
const SHELF_UNIT_X = 0.435;
/**
 * The Poly Pizza furniture shares one palette atlas. These are the swatches
 * each model samples, so repainting them recolours the furniture — and lets it
 * follow the room's light/dark palette like the hand-built pieces do.
 */
const DESK_SWATCH = { body: "#462720", metal: "#3e3f57" };
const SHELF_SWATCH = { body: "#462720" };

const BOOKS_SCALE = 1.5;
/* measured model dimensions, as above */
const MUG_SCALE = 1.0; // 0.136 x 0.098 x 0.098, origin at its centre
const LAMP_SCALE = 0.042; // 5.370 x 9.918 x 8.282
const FOOTBALL_SCALE = 0.22 / 0.33; // 0.339 x 0.321 x 0.349, centred on origin
const JOURNAL_SCALE = 0.0334; // 7.182 x 0.345 x 9.864, y from -0.165
const RUG_SCALE = 1.2; // 2.131 x 0.037 x 3.093
const SHEETS_SCALE = 1.5; // 0.188 x 0.028 x 0.154, y from -0.015
// 1.141 x 0.197 x 1.761, off-centre (x -0.132, z +0.032); lies flat as-is.
const ENVELOPES_SCALE = 0.12;
const BOOKS_OFFSET: [number, number, number] = [-0.08 * BOOKS_SCALE, 0, 0.015 * BOOKS_SCALE];
/**
 * Trim runs are shortened by this much so each one ends *inside* the run it
 * meets rather than reaching the wall plane. Two boxes interpenetrating share
 * a material and read as a mitred joint; two coplanar faces z-fight.
 */
const CORNER_INSET = 0.1;
/**
 * The shelf stands clear of the skirting rather than inside it: its back panel
 * reaches x = SHELF.x - 0.18, which must stay in front of the skirting face.
 */
const SHELF = { x: -ROOM_X + 0.3, z: -0.4 };
/*
 * The door asset, measured with node transforms applied: frame 1.594 wide x
 * 3.081 tall x 0.320 deep, sitting on y 0.015 and centred at x -0.0145. Leaf,
 * frame and handle are separate nodes sharing flat Wood / Metal / Glass
 * materials, so they follow the room's palette like the other imports.
 *
 * Raw, it is a 3.08m door in a 3.4m room. It is scaled to a 2.06 opening
 * instead — the height the hand-built door it replaces already used, and a
 * normal one for a person to walk through.
 */
const DOOR_RAW = {
  width: 1.5943,
  height: 3.0814,
  centreX: -0.0145,
  footY: 0.0152,
};
const DOOR_SCALE = 2.06 / DOOR_RAW.height;
/** sinks the frame a hair into the floor, rather than leaving a hairline seam */
const DOOR_SINK = 0.004;
/**
 * The asset sets its handle 40% of the way up a 3.08m door, so scaling the
 * door to a normal opening drags the handle down to 0.81m — low enough to
 * read as wrong next to a real one at about a metre. No uniform scale fixes
 * a proportion, but the handle is its own node, so it gets lifted on its own.
 * Node translations are in metres, applied before DOOR_SCALE.
 */
const DOOR_HANDLE_RAW_Y = (1.0 + DOOR_SINK) / DOOR_SCALE + DOOR_RAW.footY;
/** width drives the break in the skirting, so it tracks the real frame */
const DOOR = { x: -0.9, width: DOOR_RAW.width * DOOR_SCALE };
/** the back wall carries an actual cut-out here, with real 3D scenery beyond it */
const WINDOW = { x: 1.65, y: 1.85, w: 2.0, h: 1.7 };

type Quality = "mobile" | "desktop";

/** Furniture the player shouldn't walk through: [x, z, radius] */
const PROP_OBSTACLES: [number, number, number][] = [
  [DESK.x, DESK.z, 1.5],
  [SHELF.x, SHELF.z, 0.95],
  [2.3, 2.35, 0.6],
];

const themes = {
  dark: {
    wall: "#241f18",
    trim: "#3a3226",
    ceiling: "#221d15",
    beam: "#3c3226",
    fog: "#14120d",
    lamp: "#ffd9a0",
    rug: "#2c2419",
    rugMotif: "#6d5b3c",
    rugAccent: "#a8794a",
    paper: "#e8e2d4",
    cork: "#7a5c3a",
    leaf: "#4a6b3a",
    pane: "#2b3d55",
    daylight: "#7793bb",
    ambient: 0.5,
    hemi: 0.45,
    key: 0.4,
    lampIntensity: 9,
    labelBg: "rgba(20,18,13,0.82)",
    labelInk: "#f0ede6",
    wood: darkWoodPalette,
  },
  light: {
    wall: "#e7e0d2",
    trim: "#cfc4ad",
    ceiling: "#f6f2ea",
    beam: "#b9a985",
    fog: "#f2efe9",
    lamp: "#fff4dd",
    rug: "#ded2ba",
    rugMotif: "#9a8460",
    rugAccent: "#b5734a",
    paper: "#fffdf7",
    cork: "#c39a67",
    leaf: "#5d8a45",
    pane: "#e4eef9",
    daylight: "#eef4fd",
    ambient: 0.9,
    hemi: 0.5,
    key: 1.0,
    lampIntensity: 4.5,
    labelBg: "rgba(255,253,248,0.86)",
    labelInk: "#1c1914",
    wood: lightWoodPalette,
  },
} as const;

type ThemeName = keyof typeof themes;

type SceneRefs = {
  registry: Map<THREE.Object3D, string>;
  floor: THREE.Object3D | null;
  marker: THREE.Vector3;
  markerAt: number;
  /** the board's own plane, so the player can raycast UVs off it */
  whiteboard: THREE.Object3D | null;
  /**
   * u/v in the plane's own space; the board decides what the phase means.
   * Returns the selected note's text, or null when nothing is selected, so
   * the toolbar can open its editor on the right note.
   */
  whiteboardPointer: ((u: number, v: number, phase: "down" | "move" | "up") => string | null) | null;
  whiteboardClear: (() => void) | null;
  whiteboardImage: (() => string | null) | null;
  /** writes into the selected note */
  whiteboardNoteText: ((text: string) => void) | null;
  whiteboardDeselect: (() => void) | null;
  /** takes the selected note off the board */
  whiteboardDeleteNote: (() => void) | null;
  /** live settings, written by the toolbar and read mid-stroke */
  whiteboardTool: BoardTool;
};


const SceneCtx = createContext<MutableRefObject<SceneRefs> | null>(null);
const QualityCtx = createContext<Quality>("desktop");
/** Live Belfast conditions, or null when the fetch hasn't landed / failed. */
const WeatherCtx = createContext<Weather | null>(null);

const mix = (from: string, to: string, t: number) =>
  new THREE.Color(from).lerp(new THREE.Color(to), THREE.MathUtils.clamp(t, 0, 1));

/* The sky, clear and overcast, at both ends of the day. */
const SKY_CLEAR = { night: "#080c15", day: "#6ea8e0" };
const SKY_OVERCAST = { night: "#171d28", day: "#9fb0c2" };
const GROUND_TONE = { night: "#243218", day: "#7f9a5c" };
const CLOUD_TINT = { night: "#2b3240", day: "#f2f5f8" };

const now = () => performance.now() / 1000;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Invisible but still raycastable, so small objects have a finger-sized tap
 * target. Sized generously — thumbs are not mouse pointers.
 */
function HitProxy({
  size,
  position,
}: {
  size: [number, number, number];
  position?: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/** Registers a group as tappable so the player's raycast can resolve it back to an item id. */
function Interactable({
  id,
  children,
  position,
  rotation,
}: {
  id: string;
  children: ReactNode;
  position: [number, number, number];
  rotation?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const ctx = useContext(SceneCtx)!;

  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    const registry = ctx.current.registry;
    registry.set(group, id);
    return () => {
      registry.delete(group);
    };
  }, [ctx, id]);

  return (
    <group ref={ref} position={position} rotation={[0, rotation ?? 0, 0]}>
      {children}
    </group>
  );
}

/** Floating DOM label that fades in as the player gets close. */
function Label({ text, y, accent, theme }: { text: string; y: number; accent: string; theme: ThemeName }) {
  const el = useRef<HTMLDivElement>(null);
  const anchor = useRef<THREE.Group>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const t = themes[theme];

  useFrame(({ camera }) => {
    if (!el.current || !anchor.current) return;
    anchor.current.getWorldPosition(world);
    const dist = world.distanceTo(camera.position);
    el.current.style.opacity = String(THREE.MathUtils.clamp((LABEL_RANGE - dist) / 2, 0, 1));
  });

  return (
    <group ref={anchor} position={[0, y, 0]}>
      <Html center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div
          ref={el}
          style={{
            opacity: 0,
            transition: "opacity 120ms linear",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-dm-sans), sans-serif",
            // one size for both: Html scales with distance, so a bigger font on
            // mobile does not aid legibility, it just makes the label loom
            // larger against the object it belongs to
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: t.labelInk,
            background: t.labelBg,
            border: `1px solid ${accent}`,
            borderRadius: 999,
            padding: "6px 14px",
            backdropFilter: "blur(4px)",
          }}
        >
          {text}
        </div>
      </Html>
    </group>
  );
}

/**
 * A small non-interactive icon anchored to the object itself, hinting that
 * it's clickable. Purely a visual cue — clicks are still resolved by the
 * raycaster in Player, so this never intercepts pointer events.
 */
function ClickHint({ accent, theme }: { accent: string; theme: ThemeName }) {
  const el = useRef<HTMLDivElement>(null);
  const anchor = useRef<THREE.Group>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const t = themes[theme];

  useFrame(({ camera }) => {
    if (!el.current || !anchor.current) return;
    anchor.current.getWorldPosition(world);
    const dist = world.distanceTo(camera.position);
    el.current.style.opacity = String(THREE.MathUtils.clamp((LABEL_RANGE - dist) / 2, 0, 1));
  });

  return (
    <group ref={anchor} position={[0, 0.05, 0]}>
      {/*
        Built at twice the size and scaled down half as hard, which comes to the
        same size in the room but is drawn from twice as many pixels. drei
        applies distanceFactor as a fractional CSS scale(), and at 16px the
        arrow was landing between device pixels — which is what read as
        off-centre. The glyph itself is dead centre in its own viewBox.
      */}
      <Html center distanceFactor={3.5} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div
          ref={el}
          style={{
            opacity: 0,
            transition: "opacity 120ms linear",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: t.labelBg,
            border: `2px solid ${accent}`,
            backdropFilter: "blur(4px)",
          }}
        >
          <ArrowDown style={{ height: 18, width: 18, display: "block" }} color={accent} />
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------- fittings ---- */

/** The single overhead pendant. */
/*
 * Poly Pizza "Light Ceiling Single" (Quaternius, CC0). Measured (node
 * transforms applied): 0.264 x 0.478 x 0.278, mount point already sits right
 * at the model's own top (y max ~0.002), so it hangs correctly with no offset.
 */
function Lamp({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const fixture = useModel("ceilinglight", {
    materials: { Grey: t.trim, LightMetal: t.trim, Light: t.lamp },
  });
  const light = useRef<THREE.PointLight>(null);
  const group = useRef<THREE.Group>(null);
  const rodTop = WALL_HEIGHT - 0.08;

  const still = useMemo(prefersReducedMotion, []);

  // the bulb material needs an emissive glow, which the plain colour swap
  // above can't give it — find it once and drive it directly, same pattern
  // as the desk lamp's bulb
  const bulbMaterial = useMemo(() => {
    let found: THREE.MeshStandardMaterial | null = null;
    fixture.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m && (m as THREE.Material).name === "Light") found = m as THREE.MeshStandardMaterial;
      });
    });
    if (found) (found as THREE.MeshStandardMaterial).emissive = new THREE.Color(t.lamp);
    return found as THREE.MeshStandardMaterial | null;
  }, [fixture, t.lamp]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (group.current && !still) group.current.rotation.z = Math.sin(time * 0.35) * 0.008;
    const flicker = 0.96 + Math.sin(time * 1.2) * 0.04;
    if (light.current) light.current.intensity = t.lampIntensity * flicker;
    if (bulbMaterial) bulbMaterial.emissiveIntensity = 0.8 * flicker;
  });

  return (
    <group ref={group} position={[0, rodTop, 0]}>
      <primitive object={fixture} />
      <pointLight
        ref={light}
        position={[0, -0.42, 0]}
        distance={15}
        decay={1.35}
        intensity={t.lampIntensity}
        color={t.lamp}
      />
    </group>
  );
}

/*
 * Poly Pizza "Holiday lights" (Poly by Google, CC-BY 3.0). Measured from the
 * glTF: 2888058 long on z, meandering 501924 across x, near-flat on y — so it
 * is modelled lying down, the wire lazily snaking through about two full
 * waves with bulbs poking out alternately to either side.
 *
 * Standing that plane upright (rotating about the run) is what makes it read
 * as a real strand: the model's own meander becomes a two-swag droop and the
 * bulbs alternate up and down, so nothing here has to fake a sag.
 */
const FAIRY_LENGTH = 2888057.75; // raw z extent
const FAIRY_SCALE = 3.2 / FAIRY_LENGTH;
const FAIRY_OFFSET: [number, number, number] = [
  -715316.125 * FAIRY_SCALE,
  -157916.703125 * FAIRY_SCALE,
  1569587.625 * FAIRY_SCALE,
];

function FairyLights({ theme }: { theme: ThemeName }) {
  const strand = useModel("fairylights");
  const still = useMemo(prefersReducedMotion, []);

  /*
   * Only the `Cylinder` nodes are bulbs — they carry the five bright
   * `NN___Default` materials (green, red, amber, cyan, purple). The wire and
   * the little end caps share a near-black material and must not glow, so
   * they are filtered out by name. useModel clones materials per mesh, so
   * bulbs sharing a colour still get separate instances to twinkle.
   */
  const bulbMaterials = useMemo(() => {
    const found: THREE.MeshStandardMaterial[] = [];
    strand.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat?.name?.endsWith("___Default")) return;
        mat.emissive = mat.color.clone();
        found.push(mat);
      });
    });
    return found;
  }, [strand]);

  useFrame((state) => {
    const base = theme === "dark" ? 0.9 : 0.12;
    const twinkle = theme === "dark" && !still ? 0.3 : 0;
    bulbMaterials.forEach((m, i) => {
      m.emissiveIntensity = Math.max(0, base + twinkle * Math.sin(state.clock.elapsedTime * 2 + i * 1.7));
    });
  });

  return (
    // Upright against the left wall, strung above the bookshelf and the two
    // project frames. Measured clear on every side: 0.07 off the wall, 0.13
    // under the cornice, 0.45 above the frame tops.
    <group position={[-ROOM_X + 0.1, 2.85, -0.2]} rotation={[0, 0, Math.PI / 2]}>
      <primitive object={strand} scale={FAIRY_SCALE} position={FAIRY_OFFSET} />
    </group>
  );
}

/** Expanding ring where the player last tapped the floor. */
function TapMarker({ theme }: { theme: ThemeName }) {
  const ctx = useContext(SceneCtx)!;
  const mesh = useRef<THREE.Mesh>(null);
  const t = themes[theme];

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const age = now() - ctx.current.markerAt;
    if (age > 1.1 || ctx.current.markerAt === 0) {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(ctx.current.marker.x, 0.03, ctx.current.marker.z);
    const scale = 0.4 + age * 1.5;
    m.scale.set(scale, scale, scale);
    (m.material as THREE.MeshBasicMaterial).opacity = (1 - age / 1.1) * 0.6;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.36, 0.44, 32]} />
      <meshBasicMaterial color={t.lamp} transparent opacity={0.6} depthWrite={false} />
    </mesh>
  );
}

function Window({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const weather = useContext(WeatherCtx);

  return (
    <group position={[WINDOW.x, WINDOW.y, -ROOM_Z + 0.06]}>
      {/*
        Glass, not a lit panel: the wall behind carries a real opening now, so
        this only has to tint and catch a little light. It stays in the
        transparent pass in front of the street outside.
      */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[WINDOW.w, WINDOW.h]} />
        <meshStandardMaterial
          color={t.daylight}
          emissive={t.daylight}
          emissiveIntensity={theme === "dark" ? 0.18 : 0.4}
          transparent
          opacity={0.14}
          roughness={0.08}
          depthWrite={false}
        />
      </mesh>
      {[-1.02, 1.02].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.12, 1.94, 0.14]} />
          <meshStandardMaterial color={t.trim} roughness={0.8} />
        </mesh>
      ))}
      {/*
        0.16 rather than 0.12 deep so the head and sill rails overlap the cut
        edge of the wall by 20mm. The jambs already overlap by 40mm; matching
        that here keeps a hairline from opening up along the opening's edge.
      */}
      {[-0.91, 0.91].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[2.16, 0.16, 0.14]} />
          <meshStandardMaterial color={t.trim} roughness={0.8} />
        </mesh>
      ))}
      {[-0.33, 0.33].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.05, 1.76, 0.08]} />
          <meshStandardMaterial color={t.trim} roughness={0.8} />
        </mesh>
      ))}
      <mesh>
        <boxGeometry args={[2.0, 0.05, 0.08]} />
        <meshStandardMaterial color={t.trim} roughness={0.8} />
      </mesh>
      {/* sill */}
      <mesh position={[0, -0.98, 0.08]}>
        <boxGeometry args={[2.3, 0.08, 0.3]} />
        <meshStandardMaterial color={t.trim} roughness={0.85} />
      </mesh>
      {/* overcast outside takes a little off the light coming in */}
      <directionalLight
        position={[3.4, 4.2, -8]}
        intensity={t.key * (1 - (weather?.cloud ?? 0) * 0.3)}
        color={t.daylight}
      />
    </group>
  );
}

/*
 * The street outside, seen through the real opening cut in the back wall.
 * Every figure below is measured from the glTF with node transforms applied,
 * not eyeballed:
 *
 *   road-straight  8 x 0.12 x 8   road surface y 0.10, pavement tops y 0.12.
 *                                 The pavements are the x -4..-3 and 3..4
 *                                 strips and the centre line runs along z,
 *                                 so the road runs ALONG Z. It is already a
 *                                 flat tile — it must not be rotated upright.
 *   road-turn      8 x 0.12 x 8   same footprint, bends the road from its
 *                                 +z edge out through its +x edge.
 *   car-white      1.64 x 1.15 x 3.31, sits from y -0.028, long axis z
 *   car-blue       45.5 x 32.3 x 89.1  — modelled in the wrong units, so it
 *                                 needs ~0.045 to land at a 4m car
 *   street-light   0.36 x 6.64 x 2.93, pole at x 0, arm reaching out to +z
 *
 * The group is anchored on the window and built into -z, so local z reads as
 * distance out from the glass. Depth comes from the room's own fog, which
 * reaches 45m: the road and the terrace sit well inside that and stay clear,
 * and everything trails off before either end of them can be seen.
 */
const CAR_BLUE_SCALE = 4.0 / 89.113;
/** the road tile's own two levels: asphalt, and the kerb 20mm above it */
const ROAD_SURFACE_Y = 0.1;
const PAVEMENT_Y = 0.12;
/*
 * Traffic. Both car models face +z — car-white's own front-wheel and headlight
 * nodes say so outright, and car-blue's roofline tapers that way into a bonnet
 * — so each drives the way its rotation points that axis, and the two pass in
 * opposite directions. They crawl: the point is a street with life in it.
 */
const TRAFFIC = [
  { lane: 1.5, dir: 1, speed: 4.5, start: -14 },
  { lane: -1.5, dir: -1, speed: 3.6, start: 18 },
] as const;
/**
 * Cars wrap round once past this, on either side. It sits beyond the fog —
 * the nearest a car could be seen from out there is about 47m, against a fog
 * wall at 45 — so a car is always long gone before it turns up again.
 */
const CAR_WRAP = 50;
/*
 * Night drizzle. One LineSegments holding every streak, so the whole shower is
 * a single draw call and the animation is one pass over its position buffer.
 * Streaks rather than points: a falling dot reads as a speck, a short vertical
 * line reads as rain. The volume starts 2m beyond the glass and runs back past
 * the terrace, so it falls between you and the street rather than behind it.
 */
const RAIN_COUNT = 520;
const RAIN_AREA = { x: 30, y: 26, near: -2, far: -36 };
const RAIN_LENGTH = 0.45;
const RAIN_SPEED = 9;
/** centre line of the road, in local z — how far out from the glass it passes */
const ROAD_Z = -9;
/*
 * Tile centres along the road. Looking out at a slant from the opposite
 * corner of the room reaches much further sideways than looking straight
 * out — far enough that covering it geometrically would need about 70m of
 * road. It does not have to be covered, only pushed past the fog: at these
 * offsets the nearest an end can ever be seen from is about 26m, well past
 * the 16m where fog is total, so the road simply fades out instead of
 * stopping.
 */
const ROAD_TILES = [-44, -36, -28, -20, -12, -4, 4, 12, 20, 28, 36, 44];
/*
 * The terrace across the road. All three building models are 2 x 2 footprint
 * tiles on one shared atlas (2.35 / 2.98 / 2.97 tall), so they are meant to be
 * mixed and repeated — at 2.8x that is a 5.6m frontage 6.6 to 8.3m tall —
 * three storeys, and deliberately no taller: a bigger terrace subtends more
 * of the view than it should for a street seen from one floor up.
 */
const BUILDING_SCALE = 2.8;
/**
 * Each tile carries its own plot surface at model y 0.100 — the same height as
 * the road tile's *asphalt*, not its pavement at 0.120. Scaled up it lands
 * well proud of the kerb, so the row is dropped until the two are the same
 * surface and the pavement runs straight from the kerb to the front doors.
 * The tile's underside ends up buried, which is where it should be.
 */
const BUILDING_Y = PAVEMENT_Y - 0.1 * BUILDING_SCALE;
/** every tile's plot is a flat 2 x 2, whatever is built on it */
const BUILDING_PLOT_HALF = 1.0 * BUILDING_SCALE;
/** front doors right on the kerb: the road tile's far pavement ends at -13 */
const BUILDING_Z = -13 - BUILDING_PLOT_HALF;
/**
 * Half-widths of the building *mass*, measured off each model — not of the
 * plot, which is 2 x 2 for all three. Building 3 is a narrow house on a full
 * plot (1.607 across against 2.007), so laying the row out on one fixed pitch
 * opened a gap beside every building 3 and left none beside the others.
 * Spacing off these instead gives one even gap the whole way along.
 */
const BUILDING_MASS_HALF = [1.0035, 1.0035, 0.8035] as const;
const BUILDING_GAP = 0.16;
/**
 * Packing to the mass means the plots overlap wherever a narrow house sits,
 * and those plot surfaces are all at one height, which z-fights. Alternate
 * houses are lifted 4mm to break that — far too small to read as a step at
 * this distance, but decisive about which pavement draws on top.
 */
const BUILDING_LIFT = 0.004;
const BUILDING_PATTERN: (0 | 1 | 2)[] = [0, 2, 1, 0, 1, 2, 1, 0, 2, 0, 1, 2, 0, 2, 1, 0, 1, 2, 0];

const BUILDINGS: { x: number; kind: 0 | 1 | 2; lift: number }[] = (() => {
  const halves = BUILDING_PATTERN.map((kind) => BUILDING_MASS_HALF[kind] * BUILDING_SCALE);
  const xs: number[] = [];
  let cursor = 0;
  halves.forEach((half, i) => {
    cursor += i === 0 ? half : halves[i - 1] + BUILDING_GAP + half;
    xs.push(cursor);
  });
  // centre the row on the window rather than on its first house
  const middle = (xs[0] - halves[0] + xs[xs.length - 1] + halves[halves.length - 1]) / 2;
  return BUILDING_PATTERN.map((kind, i) => ({
    x: xs[i] - middle,
    kind,
    lift: i % 2 === 0 ? 0 : BUILDING_LIFT,
  }));
})();
/**
 * The room is upstairs, so the ground outside sits a full storey below its
 * floor. That is what makes the window read as first-floor rather than
 * ground-level, and it costs something: from a sill at y 1.0 with the eye at
 * 1.6, the sightline only reaches the ground about 6.6m out from the glass,
 * and from across the room it never reaches it at all. So the street is
 * something you walk to the window to see, and what carries the view from
 * further back is what stands tall — the rooftops and the sky.
 */
const STOREY = WALL_HEIGHT;
/** the ground sits a hair below the road tiles rather than flush with them:
 *  coincident surfaces z-fight, overlapping ones do not */
const GROUND_Y = -0.01;

/**
 * A moon, at night only. Sat above the roofline on purpose — the terrace
 * subtends about 26 degrees from the window, so anything lower than that is
 * behind a building rather than in the sky.
 */
const MOON = { pos: [-18, 42, -58] as [number, number, number], radius: 3.0 };
/**
 * Maria — the dark patches. Slightly paler spheres sunk into the moon so only
 * a cap of each shows, which mottles the disc instead of leaving it a flat
 * circle. Positions are on the hemisphere that actually faces the window,
 * worked out from the moon's own position, in fractions of its radius.
 */
const MOON_MARIA: [number, number, number, number][] = [
  [0.454, -0.246, 0.611, 0.3],
  [0.03, -0.155, 0.784, 0.24],
  [0.026, -0.586, 0.544, 0.27],
  [0.226, -0.636, 0.429, 0.22],
  [-0.129, -0.418, 0.67, 0.2],
];

function Drizzle({ intensity }: { intensity: number }) {
  const still = useMemo(prefersReducedMotion, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const points = new Float32Array(RAIN_COUNT * 6);
    // seeded, so the shower is the same every visit rather than reshuffling
    let seed = 20260821;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = (random() * 2 - 1) * RAIN_AREA.x;
      const y = random() * RAIN_AREA.y;
      const z = RAIN_AREA.near + random() * (RAIN_AREA.far - RAIN_AREA.near);
      points.set([x, y, z, x, y - RAIN_LENGTH, z], i * 6);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(points, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (still) return;
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const points = attribute.array as Float32Array;
    const fall = RAIN_SPEED * delta;
    for (let i = 0; i < RAIN_COUNT; i++) {
      let top = points[i * 6 + 1] - fall;
      // back to the top once it reaches the ground
      if (top < 0) top += RAIN_AREA.y;
      points[i * 6 + 1] = top;
      points[i * 6 + 4] = top - RAIN_LENGTH;
    }
    attribute.needsUpdate = true;
  });

  return (
    // heavier rain is denser on the glass, not faster
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#9db4d4" transparent opacity={0.18 + intensity * 0.34} />
    </lineSegments>
  );
}

/** How many puffs the bank holds at full overcast, and how far they drift. */
const CLOUD_COUNT = 14;
const CLOUD_WRAP = 95;

const CLOUD_BANK = (() => {
  // seeded, so the sky is the same arrangement every visit
  let seed = 991127;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: CLOUD_COUNT }, () => ({
    x: (random() * 2 - 1) * CLOUD_WRAP,
    y: 26 + random() * 22,
    z: -40 - random() * 38,
    scale: 22 + random() * 26,
    speed: 0.35 + random() * 0.5,
  }));
})();

/**
 * The cloud bank over the terrace. Thickens with the real cover: more puffs
 * appear and they turn more opaque, so a clear Belfast morning shows almost
 * nothing and a wet afternoon closes the sky in.
 */
function Clouds({ cover, daylight }: { cover: number; daylight: number }) {
  const still = useMemo(prefersReducedMotion, []);
  const texture = useMemo(makeCloudTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);

  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.children.forEach((child, i) => {
      child.position.x += CLOUD_BANK[i].speed * delta;
      if (child.position.x > CLOUD_WRAP) child.position.x = -CLOUD_WRAP;
    });
  });

  const tint = useMemo(() => mix(CLOUD_TINT.night, CLOUD_TINT.day, daylight), [daylight]);
  // a bright sky still shows a few; overcast fills it
  const shown = Math.round(THREE.MathUtils.clamp(cover, 0, 1) * CLOUD_COUNT);
  const opacity = 0.28 + cover * 0.5;

  if (shown === 0) return null;

  return (
    <group ref={group}>
      {CLOUD_BANK.slice(0, shown).map((puff, i) => (
        <mesh key={i} position={[puff.x, puff.y, puff.z]}>
          <planeGeometry args={[puff.scale, puff.scale * 0.5]} />
          <meshBasicMaterial
            map={texture}
            color={tint}
            transparent
            opacity={opacity}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function OutsideView({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const weather = useContext(WeatherCtx);

  /*
   * The window follows Belfast, not the theme toggle — that is the whole
   * point of it being a window rather than a picture. Without a reading it
   * falls back to the theme, which is exactly how the room behaved before.
   */
  const daylight = weather ? weather.daylight : theme === "dark" ? 0 : 1;
  const cover = weather ? weather.cloud : 0;
  // 0.6 is the value that reproduces the old fixed drizzle opacity exactly
  const rain = weather ? weather.rain : theme === "dark" ? 0.6 : 0;
  const isNight = daylight < 0.35;

  /*
   * The sky gets its own colour rather than reusing t.daylight. That value is
   * near-white (#eef4fd) because it doubles as the glass tint and the colour
   * of the light coming through the window — reading fine on those, but flat
   * grey as an actual sky.
   */
  const sky = useMemo(
    () =>
      mix(SKY_CLEAR.night, SKY_CLEAR.day, daylight)
        .lerp(mix(SKY_OVERCAST.night, SKY_OVERCAST.day, daylight), cover * 0.8)
        .getStyle(),
    [daylight, cover],
  );

  // overcast takes the life out of the grass rather than recolouring it
  const ground = useMemo(
    () => mix(GROUND_TONE.night, GROUND_TONE.day, daylight).multiplyScalar(1 - cover * 0.18).getStyle(),
    [daylight, cover],
  );

  // one loaded tile, cloned per position: geometry and materials are shared,
  // so the extra length costs a draw call each rather than another download
  const roadTile = useModel("roadStraight");
  const road = useMemo(() => ROAD_TILES.map(() => roadTile.clone(true)), [roadTile]);

  const houseA = useModel("building1");
  const houseB = useModel("building2");
  const houseC = useModel("building3");
  const terrace = useMemo(
    () => BUILDINGS.map(({ kind }) => [houseA, houseB, houseC][kind].clone(true)),
    [houseA, houseB, houseC],
  );
  const still = useMemo(prefersReducedMotion, []);
  const traffic = useRef<(THREE.Object3D | null)[]>([]);

  useFrame((_, delta) => {
    if (still) return;
    traffic.current.forEach((node, i) => {
      if (!node) return;
      const { dir, speed } = TRAFFIC[i];
      node.position.x += dir * speed * delta;
      // wrapped rather than respawned: same car, round again
      if (node.position.x > CAR_WRAP) node.position.x = -CAR_WRAP;
      else if (node.position.x < -CAR_WRAP) node.position.x = CAR_WRAP;
    });
  });

  const carNear = useModel("carWhite");
  const carFar = useModel("carBlue");
  const lampModel = useModel("streetLight", { materials: { Light: t.lamp } });

  // its bulb burns after dark, the way the desk lamp's does
  const lamp = useMemo(() => {
    lampModel.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const material = m as THREE.MeshStandardMaterial;
        if (!material || material.name !== "Light") return;
        material.emissive = new THREE.Color(t.lamp);
        // fades up through dusk instead of snapping on with the theme
        material.emissiveIntensity = (1 - daylight) * 1.4;
      });
    });
    return lampModel;
  }, [lampModel, t.lamp, daylight]);

  return (
    <group position={[WINDOW.x, -STOREY, -ROOM_Z]}>
      {/* sky. Fog is off so it stays bright while the land hazes into it,
          which is what gives the horizon its distance. */}
      <mesh>
        <sphereGeometry args={[100, 28, 18]} />
        <meshBasicMaterial color={sky} side={THREE.BackSide} fog={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, -100]}>
        <planeGeometry args={[240, 200]} />
        <meshStandardMaterial color={ground} roughness={1} />
      </mesh>

      {/*
        The road runs across the view, not away from it — a road going past
        the house rather than out of its front door. The tiles are already
        flat and their road runs along their own z, so a quarter turn lays it
        along x. Three of them side by side cover the width you can see.
      */}
      {ROAD_TILES.map((x, i) => (
        <primitive key={x} object={road[i]} position={[x, 0, ROAD_Z]} rotation={[0, Math.PI / 2, 0]} />
      ))}

      {/* the terrace on the far side of the road */}
      {BUILDINGS.map((b, i) => (
        <primitive
          key={b.x}
          object={terrace[i]}
          scale={BUILDING_SCALE}
          position={[b.x, BUILDING_Y + b.lift, BUILDING_Z]}
        />
      ))}

      <Clouds cover={cover} daylight={daylight} />

      {/* only when it is actually raining on Belfast */}
      {rain > 0 && <Drizzle intensity={rain} />}

      {/* one in each lane, passing in opposite directions — daytime only */}
      {!isNight && (
        <>
          <group
            ref={(node) => {
              traffic.current[0] = node;
            }}
            position={[TRAFFIC[0].start, ROAD_SURFACE_Y + 0.028, ROAD_Z + TRAFFIC[0].lane]}
          >
            <primitive object={carNear} rotation={[0, Math.PI / 2, 0]} />
          </group>
          <group
            ref={(node) => {
              traffic.current[1] = node;
            }}
            position={[TRAFFIC[1].start, ROAD_SURFACE_Y, ROAD_Z + TRAFFIC[1].lane]}
          >
            <primitive object={carFar} scale={CAR_BLUE_SCALE} rotation={[0, -Math.PI / 2, 0]} />
          </group>
        </>
      )}

      {/* on the near pavement, arm turned back out over the road */}
      <primitive
        object={lamp}
        position={[3.0, PAVEMENT_Y + 0.015, ROAD_Z + 3.5]}
        rotation={[0, Math.PI, 0]}
      />

      {isNight && (
        <group position={MOON.pos}>
          <mesh>
            <sphereGeometry args={[MOON.radius, 32, 24]} />
            <meshBasicMaterial color="#f7f4e8" fog={false} />
          </mesh>
          {MOON_MARIA.map(([mx, my, mz, r], i) => (
            <mesh key={i} position={[mx * MOON.radius, my * MOON.radius, mz * MOON.radius]}>
              <sphereGeometry args={[r * MOON.radius, 16, 12]} />
              <meshBasicMaterial color="#ddd7c2" fog={false} />
            </mesh>
          ))}
          {/* two shells rather than one, so the glow falls away instead of
              ending on a hard edge */}
          <mesh>
            <sphereGeometry args={[MOON.radius * 1.6, 24, 16]} />
            <meshBasicMaterial color="#eef3ff" transparent opacity={0.15} depthWrite={false} fog={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[MOON.radius * 3.2, 24, 16]} />
            <meshBasicMaterial color="#aec3e8" transparent opacity={0.06} depthWrite={false} fog={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/*
 * Beside the door, on the hinge side. The door spans x -1.43..-0.37 and the
 * contact post sits at 0.15, so the clear wall is to the left of the frame.
 */
const SWITCH = { x: -1.75, y: 1.15, z: ROOM_Z - 0.02 };
const SWITCH_TILT = 0.32;

/** Wall switch by the door: it works the room's lights, i.e. the site theme. */
function LightSwitch({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const rocker = useRef<THREE.Mesh>(null);
  const still = useMemo(prefersReducedMotion, []);
  // light is up, dark is down — the way a switch you'd actually flick reads
  const target = theme === "light" ? SWITCH_TILT : -SWITCH_TILT;

  useFrame((_, delta) => {
    const node = rocker.current;
    if (!node) return;
    if (still) {
      node.rotation.x = target;
      return;
    }
    // a flick, not a fade: fast enough to feel mechanical
    node.rotation.x = THREE.MathUtils.damp(node.rotation.x, target, 18, delta);
  });

  return (
    <Interactable id="lightswitch" position={[SWITCH.x, SWITCH.y, SWITCH.z]} rotation={Math.PI}>
      {/* faceplate */}
      <mesh>
        <boxGeometry args={[0.086, 0.13, 0.012]} />
        <meshStandardMaterial color={t.trim} roughness={0.55} />
      </mesh>
      {/* the rocker sits proud of the plate so its tilt is readable side-on */}
      <mesh ref={rocker} position={[0, 0, 0.012]}>
        <boxGeometry args={[0.05, 0.078, 0.018]} />
        <meshStandardMaterial
          color={theme === "light" ? "#f4efe4" : "#cfc7b7"}
          roughness={0.4}
          // a hint of glow in the dark, so it can be found at all
          emissive={t.lamp}
          emissiveIntensity={theme === "dark" ? 0.35 : 0}
        />
      </mesh>
      <HitProxy size={[0.34, 0.36, 0.14]} />
      <Label text="Lights" y={0.15} accent="#e8c46a" theme={theme} />
    </Interactable>
  );
}

/** The door you presumably came in through. */
function Door({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const model = useModel("door", {
    materials: { Wood: t.beam, Metal: "#9a9086", Glass: t.pane },
  });

  const door = useMemo(() => {
    const handle = model.getObjectByName("DoorHandle");
    if (handle) handle.position.y = DOOR_HANDLE_RAW_Y;
    return model;
  }, [model]);

  return (
    <group position={[DOOR.x, 0, ROOM_Z - 0.07]} rotation={[0, Math.PI, 0]}>
      {/*
        Recentred inside the rotated group, so the offsets stay in the model's
        own frame and the rotation carries the whole centred piece.
      */}
      <primitive
        object={door}
        scale={DOOR_SCALE}
        position={[-DOOR_RAW.centreX * DOOR_SCALE, -DOOR_RAW.footY * DOOR_SCALE - DOOR_SINK, 0]}
      />
    </group>
  );
}

/**
 * Whiteboard geometry, shared with the camera so "standing at the board"
 * frames the drawing surface exactly. It hangs on the +X wall facing in, so
 * its own +Z (and the local offset that lifts the plane off the backing
 * board) points back along -X.
 */
const BOARD_ANCHOR = [ROOM_X - 0.08, 2.0, 1.15] as const;
const BOARD_FACE = 0.035;
const BOARD_SIZE = [2.06, 1.11] as const;
/**
 * The board's own surface colour, deliberately not `themes[].paper`. A real
 * whiteboard does not change colour when the lights go on — the lighting does
 * that, and the material already responds to it. Keeping it constant also
 * means the texture is never rebuilt on a theme change, which used to throw
 * away whatever a visitor had drawn.
 */
const BOARD_PAPER = "#fbf8f0";

/** sticky note and its lettering, in board-canvas pixels */
const NOTE_SIZE = 96;
const NOTE_PAD = 9;
const NOTE_FONT = 13;
const NOTE_LINE = 15;

/** Whiteboard above the desk, carrying what he is actually working on. */
function Whiteboard({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const ctx = useContext(SceneCtx)!;
  const board = useRef<THREE.Mesh>(null);
  const pen = useRef<{ x: number; y: number } | null>(null);
  /*
   * Whether the board has been wiped. Held twice on purpose: the ref is what
   * the compose loop reads, since it runs inside an effect that must not
   * re-run (re-running it would rebuild the layers and lose the drawing), and
   * the state is what the two sticky notes below render off. They are meshes
   * rather than texture, so clearing the canvas never touched them — a wiped
   * board kept two notes stuck to it that no tool could remove.
   */
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);

  const texture = useMemo(
    () =>
      makeWhiteboardTexture(
        siteData.hero.focus.title,
        [...siteData.hero.focus.body],
        siteData.stats.map((stat) => ({ ...stat })),
        BOARD_PAPER,
      ),
    [],
  );

  useEffect(() => () => texture.dispose(), [texture]);

  /*
   * Three layers composited into the texture's own canvas, because notes stay
   * draggable after they're dropped: `printed` holds the heading/bullets/stats
   * the board ships with, `ink` holds freehand strokes, and notes are objects
   * redrawn on top every frame. Painting strokes straight onto the visible
   * canvas would be cheaper, but then a note could never be picked back up
   * without taking the ink under it too.
   */
  useEffect(() => {
    const mesh = board.current;
    const display = texture.image as HTMLCanvasElement;
    const view = display.getContext("2d");
    if (!mesh || !view) return;

    const { width, height } = display;
    const layer = () => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      return c;
    };

    // the board as it ships, captured before anyone draws on it
    const printed = layer();
    printed.getContext("2d")!.drawImage(display, 0, 0);
    const ink = layer();
    const inkPaint = ink.getContext("2d")!;

    type Note = { x: number; y: number; colour: string; tilt: number; text: string };

    let notes: Note[] = [];
    let held: number | null = null;
    /** the note the toolbar's text field is currently writing into */
    let selected: Note | null = null;
    let grabX = 0;
    let grabY = 0;

    /** Greedy wrap that also breaks words too long to fit on their own line. */
    const wrapNote = (text: string, maxWidth: number) => {
      const lines: string[] = [];
      for (const paragraph of text.split("\n")) {
        let line = "";
        for (const word of paragraph.split(" ")) {
          const candidate = line ? `${line} ${word}` : word;
          if (view.measureText(candidate).width <= maxWidth) {
            line = candidate;
            continue;
          }
          if (line) lines.push(line);
          line = word;
          // a single unbroken word still has to be cut somewhere
          while (view.measureText(line).width > maxWidth && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && view.measureText(line.slice(0, cut)).width > maxWidth) cut--;
            lines.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        }
        lines.push(line);
      }
      return lines;
    };

    const drawNote = (n: Note) => {
      view.save();
      view.translate(n.x, n.y);
      view.rotate(n.tilt);
      view.fillStyle = "rgba(0,0,0,0.12)";
      view.fillRect(-NOTE_SIZE / 2 + 3, -NOTE_SIZE / 2 + 4, NOTE_SIZE, NOTE_SIZE);
      view.fillStyle = n.colour;
      view.fillRect(-NOTE_SIZE / 2, -NOTE_SIZE / 2, NOTE_SIZE, NOTE_SIZE);

      if (n === selected) {
        view.strokeStyle = "#1c1914";
        view.lineWidth = 2;
        view.setLineDash([5, 4]);
        view.strokeRect(-NOTE_SIZE / 2 - 3, -NOTE_SIZE / 2 - 3, NOTE_SIZE + 6, NOTE_SIZE + 6);
        view.setLineDash([]);
      }

      if (n.text) {
        view.fillStyle = "#1c1914";
        view.font = `500 ${NOTE_FONT}px "DM Sans", "Helvetica Neue", sans-serif`;
        view.textBaseline = "top";
        const inner = NOTE_SIZE - NOTE_PAD * 2;
        const lines = wrapNote(n.text, inner).slice(0, Math.floor(inner / NOTE_LINE));
        // vertically centred as a block, so short notes don't sit at the top
        const top = -(lines.length * NOTE_LINE) / 2;
        lines.forEach((line, i) => {
          view.fillText(line, -inner / 2, top + i * NOTE_LINE, inner);
        });
      }
      view.restore();
    };

    const compose = () => {
      view.globalAlpha = 1;
      view.fillStyle = BOARD_PAPER;
      view.fillRect(0, 0, width, height);
      if (!clearedRef.current) view.drawImage(printed, 0, 0);
      view.drawImage(ink, 0, 0);
      notes.forEach(drawNote);
      texture.needsUpdate = true;
    };

    /** Topmost note under a point — last drawn is nearest the front. */
    const noteAt = (x: number, y: number) => {
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        // the tilt is a couple of degrees, so an upright box is close enough
        if (Math.abs(x - n.x) <= NOTE_SIZE / 2 && Math.abs(y - n.y) <= NOTE_SIZE / 2) return i;
      }
      return null;
    };

    const stroke = (x: number, y: number, start: boolean) => {
      const tool = ctx.current.whiteboardTool;
      const from = start ? null : pen.current;
      const erasing = tool.mode === "eraser";
      // The eraser lays down opaque board colour rather than clearing to
      // transparent, so it rubs out the printed heading/bullets underneath
      // as well as the visitor's own ink — rubbing a board takes off
      // whatever is under it, and Clear is there for wiping the lot.
      inkPaint.strokeStyle = erasing ? BOARD_PAPER : tool.colour;
      inkPaint.lineWidth = erasing ? tool.width * 2.5 : tool.width;
      inkPaint.lineCap = "round";
      inkPaint.lineJoin = "round";
      inkPaint.beginPath();
      // a tap with no travel still leaves a dot, not nothing
      inkPaint.moveTo(from ? from.x : x, from ? from.y : y);
      inkPaint.lineTo(x, y);
      inkPaint.stroke();
      pen.current = { x, y };
    };

    const scene = ctx.current;
    scene.whiteboard = mesh;
    scene.registry.set(mesh, "whiteboard");

    scene.whiteboardPointer = (u, v, phase) => {
      // canvas y runs down, UV runs up
      const x = u * width;
      const y = (1 - v) * height;
      const tool = ctx.current.whiteboardTool;

      if (tool.mode === "note") {
        if (phase === "down") {
          const found = noteAt(x, y);
          if (found === null) {
            // dropping a new one, already under the finger to be dragged
            const fresh: Note = {
              x,
              y,
              colour: tool.noteColour,
              tilt: (Math.random() - 0.5) * 0.16,
              text: "",
            };
            notes.push(fresh);
            selected = fresh;
            held = notes.length - 1;
            grabX = 0;
            grabY = 0;
          } else {
            // bring it to the front so overlapping notes pick up predictably
            const [picked] = notes.splice(found, 1);
            notes.push(picked);
            selected = picked;
            held = notes.length - 1;
            grabX = x - picked.x;
            grabY = y - picked.y;
          }
        } else if (phase === "move" && held !== null) {
          notes[held].x = x - grabX;
          notes[held].y = y - grabY;
        } else if (phase === "up") {
          held = null;
        }
        compose();
        return selected ? selected.text : null;
      }

      // any other tool drops the selection, so the editor closes with it
      if (selected) {
        selected = null;
        compose();
      }

      if (phase === "up") {
        pen.current = null;
        return null;
      }
      // Notes sit above the ink, so rubbing over one can't lift it — pressing
      // on one with the eraser takes it off instead. Only on press, so a
      // stroke that happens to pass over a note doesn't sweep it away.
      if (tool.mode === "eraser" && phase === "down") {
        const found = noteAt(x, y);
        if (found !== null) {
          if (notes[found] === selected) selected = null;
          notes.splice(found, 1);
          compose();
          return null;
        }
      }
      stroke(x, y, phase === "down");
      compose();
      return null;
    };

    // Wipes to bare board — the printed heading/bullets/stats, every note the
    // visitor added and the two the board ships with all go, so what is left
    // is a genuinely empty surface rather than something to draw around. The
    // wipe lasts as long as the room does: the texture is memoised on [] so
    // that a theme change cannot rebuild it under a drawing in progress.
    scene.whiteboardNoteText = (text) => {
      if (!selected) return;
      selected.text = text;
      compose();
    };

    scene.whiteboardDeselect = () => {
      if (!selected) return;
      selected = null;
      compose();
    };

    scene.whiteboardDeleteNote = () => {
      if (!selected) return;
      const at = notes.indexOf(selected);
      if (at !== -1) notes.splice(at, 1);
      selected = null;
      // the splice shifts every index above it, so any drag in flight is void
      held = null;
      compose();
    };

    scene.whiteboardClear = () => {
      pen.current = null;
      held = null;
      selected = null;
      clearedRef.current = true;
      setCleared(true);
      notes = [];
      inkPaint.clearRect(0, 0, width, height);
      compose();
    };

    // the dashed selection ring is editing furniture, not part of the drawing
    scene.whiteboardImage = () => {
      const wasSelected = selected;
      selected = null;
      compose();
      const png = display.toDataURL("image/png");
      selected = wasSelected;
      compose();
      return png;
    };

    return () => {
      scene.registry.delete(mesh);
      scene.whiteboard = null;
      scene.whiteboardPointer = null;
      scene.whiteboardClear = null;
      scene.whiteboardImage = null;
      scene.whiteboardNoteText = null;
      scene.whiteboardDeselect = null;
      scene.whiteboardDeleteNote = null;
    };
  }, [ctx, texture]);

  return (
    <group position={BOARD_ANCHOR} rotation={[0, -Math.PI / 2, 0.004]}>
      <mesh>
        <boxGeometry args={[2.2, 1.25, 0.06]} />
        <meshStandardMaterial color={t.trim} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh ref={board} position={[0, 0, BOARD_FACE]}>
        <planeGeometry args={[BOARD_SIZE[0], BOARD_SIZE[1]]} />
        <meshStandardMaterial map={texture} roughness={0.35} />
      </mesh>
      {/* the two the board ships with; a wipe takes them too */}
      {!cleared &&
        [
          { x: 0.79, y: -0.4, rot: 0.09, colour: "#e8d16a" },
          { x: 0.6, y: -0.44, rot: -0.14, colour: "#e8a06a" },
        ].map((note) => (
          <mesh key={note.x} position={[note.x, note.y, 0.042]} rotation={[0, 0, note.rot]}>
            <planeGeometry args={[0.16, 0.16]} />
            <meshStandardMaterial color={note.colour} roughness={0.9} />
          </mesh>
        ))}
      <mesh position={[0, -0.66, 0.06]}>
        <boxGeometry args={[2.2, 0.06, 0.12]} />
        <meshStandardMaterial color={t.beam} roughness={0.7} />
      </mesh>
      {/* marker left in the tray */}
      <mesh position={[-0.6, -0.62, 0.11]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.13, 8]} />
        <meshStandardMaterial color="#2f5d8a" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Wall clock, hands on the real time — the one thing in here that is true. */
function WallClock({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const hour = useRef<THREE.Group>(null);
  const minute = useRef<THREE.Group>(null);
  const second = useRef<THREE.Group>(null);

  useFrame(() => {
    const now = new Date();
    // sub-second precision, so the hand reflects the true instant rather than
    // holding the previous whole second for up to 1s (read as "running behind")
    const secs = now.getSeconds() + now.getMilliseconds() / 1000;
    const mins = now.getMinutes() + secs / 60;
    const hours = (now.getHours() % 12) + mins / 60;
    if (second.current) second.current.rotation.z = -(secs / 60) * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(mins / 60) * Math.PI * 2;
    if (hour.current) hour.current.rotation.z = -(hours / 12) * Math.PI * 2;
  });

  return (
    <group position={[1.25, 2.3, ROOM_Z - 0.09]} rotation={[0, Math.PI, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 28]} />
        <meshStandardMaterial color={t.beam} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.032]}>
        <circleGeometry args={[0.21, 28]} />
        <meshStandardMaterial color={t.paper} roughness={0.5} />
      </mesh>

      {/* hour markers */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const long = i % 3 === 0;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.175, Math.cos(a) * 0.175, 0.035]} rotation={[0, 0, -a]}>
            <planeGeometry args={[long ? 0.014 : 0.008, long ? 0.038 : 0.022]} />
            <meshBasicMaterial color="#2b2620" />
          </mesh>
        );
      })}

      <group ref={hour} position={[0, 0, 0.04]}>
        <mesh position={[0, 0.052, 0]}>
          <boxGeometry args={[0.018, 0.105, 0.006]} />
          <meshBasicMaterial color="#2b2620" />
        </mesh>
      </group>
      <group ref={minute} position={[0, 0, 0.045]}>
        <mesh position={[0, 0.078, 0]}>
          <boxGeometry args={[0.012, 0.156, 0.006]} />
          <meshBasicMaterial color="#2b2620" />
        </mesh>
      </group>
      <group ref={second} position={[0, 0, 0.05]}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.005, 0.175, 0.004]} />
          <meshBasicMaterial color="#c25a4a" />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.056]}>
        <cylinderGeometry args={[0.014, 0.014, 0.01, 12]} />
        <meshStandardMaterial color="#2b2620" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

/*
 * Worked example of an imported asset. The model measures 1.166 x 0.882 x 1.220
 * with its base at y = 0, so the scale below is chosen to bring it to a 0.8m
 * plant, and the offset recentres it on its own bounding box (its geometry is
 * centred at x +0.045, z +0.024 rather than the origin).
 */
const PLANT_HEIGHT = 0.882;
const PLANT_SCALE = 0.8 / PLANT_HEIGHT;
const PLANT_OFFSET: [number, number, number] = [-0.045 * PLANT_SCALE, 0, -0.024 * PLANT_SCALE];

(
  [
    "plant",
    "desk",
    "chair",
    "bookshelf",
    "books",
    "mug",
    "desklamp",
    "football",
    "journal",
    "rug",
    "worksheets",
    "envelopes",
    "ceilinglight",
    "fairylights",
    "door",
    "roadStraight",
    "carBlue",
    "carWhite",
    "streetLight",
    "building1",
    "building2",
    "building3",
  ] as const
).forEach(preloadModel);

function Plant({ theme, position }: { theme: ThemeName; position: [number, number, number] }) {
  const t = themes[theme];
  // recolour the baked materials so the plant follows the room's palette
  const model = useModel("plant", {
    materials: { Black: t.trim, Brown: "#3a2d1e", Plant_Green: t.leaf },
  });

  return (
    <group position={position}>
      <primitive object={model} scale={PLANT_SCALE} position={PLANT_OFFSET} />
    </group>
  );
}

/* ------------------------------------------------------------ furniture ---- */

/** The desk: the notebook and laptop that sit on it are separate, tappable objects. */
function Desk({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const lamp = useRef<THREE.PointLight>(null);
  const bulb = useRef<THREE.MeshBasicMaterial>(null);
  const quality = useContext(QualityCtx);
  const here = useMemo(() => new THREE.Vector3(DESK.x, 1, DESK.z), []);
  const desk = useModel("desk", {
    swatches: { [DESK_SWATCH.body]: t.beam, [DESK_SWATCH.metal]: t.trim },
  });
  const chair = useModel("chair", { materials: { Wood: t.beam } });
  const mug = useModel("mug", { materials: { phong1SG: t.paper } });
  const deskLamp = useModel("desklamp", {
    materials: { "455A64": t.trim, FFFFFF: t.paper, FFEB3B: t.lamp },
  });

  // the lamp's bulb material still has to react to the player, so find it once
  const bulbMaterial = useMemo(() => {
    let found: THREE.MeshStandardMaterial | null = null;
    deskLamp.traverse((node) => {
      const mesh = node as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m && (m as THREE.Material).name === "FFEB3B") found = m as THREE.MeshStandardMaterial;
      });
    });
    if (found) {
      (found as THREE.MeshStandardMaterial).emissive = new THREE.Color(t.lamp);
    }
    return found as THREE.MeshStandardMaterial | null;
  }, [deskLamp, t.lamp]);

  useFrame((state) => {
    // the desk lamp warms up as you come over to it
    const near = THREE.MathUtils.clamp((4.2 - state.camera.position.distanceTo(here)) / 2.4, 0, 1);
    if (lamp.current) lamp.current.intensity = 0.3 + near * 2.3;
    if (bulbMaterial) bulbMaterial.emissiveIntensity = 0.15 + near * 1.2;
  });

  return (
    <group position={[DESK.x, 0, DESK.z]}>
      <primitive object={desk} scale={DESK_SCALE} position={DESK_OFFSET} />

      <primitive object={mug} scale={MUG_SCALE} position={[-0.85, 0.789, 0.15]} />

      {/* pen */}
      <mesh position={[-0.12, 0.775, -0.3]} rotation={[0, 0.2, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.011, 0.16, 6]} />
        <meshStandardMaterial color="#2b2b30" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* desk lamp */}
      <group position={[0.86, DESK.top, -0.26]} rotation={[0, -0.6, 0]}>
        <primitive object={deskLamp} scale={LAMP_SCALE} position={[0.008, 0, -0.004]} />
        {quality === "desktop" && (
          <pointLight
            ref={lamp}
            position={[0.05, 0.36, 0.06]}
            distance={2.6}
            decay={1.6}
            intensity={0.3}
            color={t.lamp}
          />
        )}
      </group>

      {/* chair, pushed back and turned as if someone just got up */}
      <group position={[0, 0, 0.88]} rotation={[0, Math.PI - 0.28, 0]}>
        <primitive object={chair} scale={CHAIR_SCALE} position={CHAIR_OFFSET} />
      </group>
    </group>
  );
}

/** A pair of matching bookcases, with the books that live on them. */
function Bookshelf({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const shelfOptions = { swatches: { [SHELF_SWATCH.body]: t.beam } };
  const unitA = useModel("bookshelf", shelfOptions);
  const unitB = useModel("bookshelf", shelfOptions);
  const booksA = useModel("books");
  const booksB = useModel("books");
  const booksC = useModel("books");
  const booksD = useModel("books");

  // [model, local x, shelf index] — spread across both units, keeping clear
  // of the football (unit A, shelf 1) and the worksheets (unit B, shelf 3)
  const stacks: [THREE.Object3D, number, number][] = [
    [booksA, -0.62, 0],
    [booksB, -0.6, 3],
    [booksC, 0.35, 0],
    [booksD, 0.58, 2],
  ];

  return (
    <group position={[SHELF.x, 0, SHELF.z]} rotation={[0, Math.PI / 2, 0]}>
      <primitive object={unitA} scale={SHELF_SCALE} position={[-SHELF_UNIT_X, 0, 0]} />
      <primitive object={unitB} scale={SHELF_SCALE} position={[SHELF_UNIT_X, 0, 0]} />

      {stacks.map(([model, x, shelf], i) => (
        <primitive
          key={i}
          object={model}
          scale={BOOKS_SCALE}
          position={[x + BOOKS_OFFSET[0], SHELF_TOPS[shelf], BOOKS_OFFSET[2]]}
          rotation={[0, i % 2 === 0 ? 0.05 : -0.04, 0]}
        />
      ))}
    </group>
  );
}

/* --------------------------------------------------------- the exhibits ---- */

/**
 * A framed real screenshot on the wall. Loaded the same way the pinboard
 * loads photos: a plain TextureLoader rather than useLoader/Suspense, since
 * the frame should render immediately and the image can pop in.
 *
 * The frame width is fixed; height follows the image's own aspect ratio so
 * nothing gets stretched, matching how the pinboard sizes its prints.
 */
function PhotoFrame({ src, width, theme }: { src: string; width: number; theme: ThemeName }) {
  const t = themes[theme];
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(src, (loaded) => {
      if (cancelled) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      setTexture(loaded);
    });
    return () => {
      cancelled = true;
      texture?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const image = texture?.image as { width?: number; height?: number } | undefined;
  const aspect = image?.width && image?.height ? image.width / image.height : 16 / 9;
  const innerW = width - 0.12;
  const innerH = innerW / aspect;
  const frameH = innerH + 0.12;

  return (
    <group>
      <mesh>
        <boxGeometry args={[width, frameH, 0.05]} />
        <meshStandardMaterial color={t.beam} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[width - 0.03, frameH - 0.03]} />
        <meshStandardMaterial color={t.paper} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.03]} key={texture ? texture.uuid : "blank"}>
        <planeGeometry args={[innerW, innerH]} />
        <meshStandardMaterial
          map={texture ?? undefined}
          color={texture ? "#ffffff" : "#c9c3b6"}
          roughness={0.75}
        />
      </mesh>
    </group>
  );
}

/** Unmarked: a football, sitting on the shelf. */
function Football() {
  const ball = useModel("football");
  return <primitive object={ball} scale={FOOTBALL_SCALE} />;
}

/** Pen2Paper: a stack of marked worksheets. */
function Worksheets() {
  const sheets = useModel("worksheets");
  return <primitive object={sheets} scale={SHEETS_SCALE} position={[0, 0.015 * SHEETS_SCALE, 0]} />;
}

/** About: the notebook lying on the desk. */
function Journal({ accent, theme }: { accent: string; theme: ThemeName }) {
  const t = themes[theme];
  const journal = useModel("journal", {
    materials: { "795548": "#6b4a22", FFEB3B: t.paper, F44336: accent },
  });
  return <primitive object={journal} scale={JOURNAL_SCALE} position={[0, 0.165 * JOURNAL_SCALE, 0]} />;
}

/** Lid geometry, shared with the camera so "sitting down" lands on the screen. */
const LID_PIVOT = new THREE.Vector3(0, 0.018, -0.12);
const LID_TILT = -0.28;
const SCREEN_LOCAL = new THREE.Vector3(0, 0.105, 0.0075);

/** Where the camera sits when you are nose-to-screen at the laptop. */
export function laptopViewpoint(item: ExploreItem) {
  const ry = item.rotation ?? 0;
  const screen = SCREEN_LOCAL.clone()
    .applyAxisAngle(new THREE.Vector3(1, 0, 0), LID_TILT)
    .add(LID_PIVOT)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)
    .add(new THREE.Vector3(...item.position));
  const forward = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
  const eye = screen.clone().addScaledVector(forward, 0.3);
  return {
    pos: new THREE.Vector2(eye.x, eye.z),
    y: screen.y + 0.01,
    yaw: ry,
    pitch: -0.05,
  };
}

/**
 * Where the camera stands to draw on the board. Unlike the laptop's pose the
 * distance is solved per camera rather than fixed: a portrait phone's narrow
 * frustum has to stand much further back than a desktop's to fit the same
 * 2.06m board on screen, and a cropped board is a board you can't draw on.
 */
function whiteboardViewpoint(camera: THREE.PerspectiveCamera, reserved = 0) {
  const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
  const tan = Math.tan(halfFov);
  /*
   * `reserved` is the share of the viewport the toolbar covers along the
   * bottom. The board is framed inside what is left rather than the whole
   * screen, so it can be pushed right up to the controls without ending up
   * behind them. 1.06 leaves a hair of breathing room inside that band.
   */
  const usable = THREE.MathUtils.clamp(1 - reserved, 0.35, 1);
  const margin = 1.06;
  const forHeight = ((BOARD_SIZE[1] / 2) * margin) / (tan * usable);
  const forWidth = ((BOARD_SIZE[0] / 2) * margin) / (tan * camera.aspect);
  // 0.85 is as close as the board can be framed without the near plane
  // reaching it; nothing in the room sits at eye height in front of it
  const distance = THREE.MathUtils.clamp(Math.max(forHeight, forWidth), 0.85, 3.1);

  /*
   * Dropping the camera below the board's centre lifts the board in the
   * frame, clearing the toolbar. Done this way rather than by tilting,
   * because the board stays parallel to the image plane and so keeps its
   * square corners — a pitched camera would keystone it.
   */
  const visibleHeight = 2 * distance * tan;
  const lift = (reserved / 2) * visibleHeight;

  return {
    pos: new THREE.Vector2(BOARD_ANCHOR[0] - BOARD_FACE - distance, BOARD_ANCHOR[2]),
    y: BOARD_ANCHOR[1] - lift,
    yaw: -Math.PI / 2,
    pitch: 0,
  };
}

/**
 * The share of the viewport the whiteboard toolbar covers, so the board can be
 * framed inside what is left.
 *
 * `bandPx` is measured off the toolbar rather than guessed at. It used to be a
 * table keyed on viewport height — 74px for a short viewport, 152 otherwise —
 * and the 74 was wrong: sideways on a phone the rail holds 891px of controls
 * inside its own 620px cap, so it wraps to two rows and stands about 120 tall.
 * The board was framed for a toolbar half the real size and the controls sat
 * on top of it, which is the whole reason the thing felt cramped.
 *
 * The fallbacks below are only for the first frame, before layout has run.
 */
const BOARD_UI_FALLBACK = { short: 120, tall: 152 };

function reservedForUi(viewportPx: number, bandPx = 0) {
  if (!viewportPx) return 0;
  const band =
    bandPx > 0 ? bandPx : viewportPx < 540 ? BOARD_UI_FALLBACK.short : BOARD_UI_FALLBACK.tall;
  return THREE.MathUtils.clamp(band / viewportPx, 0, 0.4);
}

/** Embeds: the laptop, open, with the tools running on it. */
function Laptop({ item }: { item: ExploreItem }) {
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useMemo(makeLaptopScreenTexture, []);
  const here = useMemo(() => new THREE.Vector3(...item.position), [item.position]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state) => {
    if (!screen.current) return;
    // dim until someone sits down to it
    const near = THREE.MathUtils.clamp((3.4 - state.camera.position.distanceTo(here)) / 1.8, 0, 1);
    screen.current.emissiveIntensity = 0.3 + near * 0.85;
  });

  return (
    <group>
      <mesh position={[0, 0.009, 0]}>
        <boxGeometry args={[0.34, 0.018, 0.24]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.35} metalness={0.6} />
      </mesh>
      {/* keyboard well and trackpad */}
      <mesh position={[0, 0.019, -0.03]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.29, 0.13]} />
        <meshStandardMaterial color="#25252c" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.019, 0.075]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.11, 0.07]} />
        <meshStandardMaterial color="#3a3a44" roughness={0.5} />
      </mesh>

      {/* lid, hinged at the back edge and leaning open */}
      <group position={LID_PIVOT.toArray()} rotation={[LID_TILT, 0, 0]}>
        <mesh position={[0, SCREEN_LOCAL.y, 0]}>
          <boxGeometry args={[0.34, 0.21, 0.011]} />
          <meshStandardMaterial color="#4a4a52" roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, SCREEN_LOCAL.y, SCREEN_LOCAL.z]}>
          <planeGeometry args={[0.31, 0.185]} />
          <meshStandardMaterial
            ref={screen}
            map={texture}
            emissive="#ffffff"
            emissiveMap={texture}
            emissiveIntensity={0.3}
            roughness={0.28}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Contact: a small wall shelf by the door, with a letter left on it. */
function PostRack({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const envelopes = useModel("envelopes");

  return (
    <group>
      {/* wall plate the shelf mounts to */}
      <mesh position={[0, 0.02, 0.01]}>
        <boxGeometry args={[0.38, 0.14, 0.02]} />
        <meshStandardMaterial color={t.trim} roughness={0.8} />
      </mesh>
      {/* shelf board, on two brackets */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.34, 0.025, 0.18]} />
        <meshStandardMaterial color={t.beam} roughness={0.75} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, -0.04, 0.06]}>
          <boxGeometry args={[0.02, 0.08, 0.1]} />
          <meshStandardMaterial color={t.trim} roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* a letter, resting flat on top */}
      <primitive
        object={envelopes}
        scale={ENVELOPES_SCALE}
        rotation={[0, 0.3, 0]}
        position={[0.02, 0.028, 0.1]}
      />
    </group>
  );
}

/** Photos: a corkboard of real prints off the gallery, pinned up slightly crooked. */
function Pinboard({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const [textures, setTextures] = useState<(THREE.Texture | null)[]>([]);
  const quality = useContext(QualityCtx);

  const layout = useMemo(
    () => [
      { x: -0.34, y: 0.19, rot: 0.04 },
      { x: 0.0, y: 0.23, rot: -0.06 },
      { x: 0.34, y: 0.18, rot: 0.03 },
      { x: -0.34, y: -0.18, rot: -0.03 },
      { x: 0.0, y: -0.2, rot: 0.05 },
      { x: 0.34, y: -0.17, rot: -0.05 },
    ],
    [],
  );

  /*
   * The most recent prints, but one trip at a time before doubling up —
   * straight recency puts four shots from a single afternoon on the board,
   * which reads as a mistake rather than a selection.
   */
  const photos = useMemo(() => {
    const seen = new Set<string>();
    const picked: Photo[] = [];
    for (const photo of photosByRecency) {
      if (seen.has(photo.group)) continue;
      seen.add(photo.group);
      picked.push(photo);
      if (picked.length === layout.length) return picked;
    }
    // fewer trips than pins: top up with the next most recent, whatever it is
    for (const photo of photosByRecency) {
      if (picked.includes(photo)) continue;
      picked.push(photo);
      if (picked.length === layout.length) break;
    }
    return picked;
  }, [layout.length]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const loaded: (THREE.Texture | null)[] = new Array(photos.length).fill(null);
    let cancelled = false;

    photos.forEach((photo, i) => {
      loader.load(
        getCloudinaryUrl(photo.cloudinaryId, quality === "mobile" ? 220 : 320),
        (texture) => {
          if (cancelled) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          loaded[i] = texture;
          setTextures([...loaded]);
        },
        undefined,
        // a missing photo just leaves a blank print on the board
        () => undefined,
      );
    });

    return () => {
      cancelled = true;
      loaded.forEach((texture) => texture?.dispose());
    };
  }, [photos, quality]);

  return (
    <group>
      <mesh>
        <boxGeometry args={[1.16, 0.88, 0.05]} />
        <meshStandardMaterial color={t.beam} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[1.04, 0.76]} />
        <meshStandardMaterial color={t.cork} roughness={0.95} />
      </mesh>
      {layout.map((print, i) => {
        const texture = textures[i] ?? null;
        const image = texture?.image as { width?: number; height?: number } | undefined;
        const aspect = image?.width && image?.height ? image.width / image.height : 1.4;
        // fit each print inside the same box, so the board stays tidy
        const long = 0.3;
        const w = aspect >= 1 ? long : long * aspect;
        const h = aspect >= 1 ? long / aspect : long;

        return (
          <group key={i} position={[print.x, print.y, 0.033]} rotation={[0, 0, print.rot]}>
            <mesh>
              <planeGeometry args={[w + 0.026, h + 0.038]} />
              <meshStandardMaterial color="#f4f1e9" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.006, 0.002]}>
              <planeGeometry args={[w, h]} />
              {/*
                keyed on the texture: r3f does not flag materials as needing a
                recompile, so a map arriving after first render is ignored
                unless the material itself is rebuilt.
              */}
              <meshStandardMaterial
                key={texture ? texture.uuid : "blank"}
                map={texture ?? undefined}
                color={texture ? "#ffffff" : "#b9b3a6"}
                roughness={0.8}
              />
            </mesh>
            <mesh position={[0, h / 2 + 0.012, 0.006]}>
              <circleGeometry args={[0.011, 8]} />
              <meshStandardMaterial color="#c25a4a" roughness={0.4} metalness={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Exhibit({ item, theme }: { item: ExploreItem; theme: ThemeName }) {
  return (
    <Interactable id={item.id} position={item.position} rotation={item.rotation}>
      {item.form === "chart" && <PhotoFrame src="/explore/emissions-chart.jpg" width={1.15} theme={theme} />}
      {item.form === "map" && <PhotoFrame src="/explore/river-map.jpg" width={1.15} theme={theme} />}
      {item.form === "football" && (
        <>
          <Football />
          <HitProxy size={[0.34, 0.34, 0.34]} />
        </>
      )}
      {item.form === "worksheets" && (
        <>
          <Worksheets />
          <HitProxy size={[0.4, 0.22, 0.32]} position={[0, 0.06, 0]} />
        </>
      )}
      {item.form === "journal" && (
        <>
          <Journal accent={item.accent} theme={theme} />
          <HitProxy size={[0.42, 0.2, 0.44]} position={[0, 0.06, 0]} />
        </>
      )}
      {item.form === "post" && (
        <>
          <PostRack theme={theme} />
          <HitProxy size={[0.5, 0.4, 0.24]} position={[0, 0, 0.08]} />
        </>
      )}
      {item.form === "laptop" && (
        <>
          <Laptop item={item} />
          <HitProxy size={[0.4, 0.3, 0.34]} position={[0, 0.13, -0.03]} />
        </>
      )}
      {item.form === "pinboard" && <Pinboard theme={theme} />}
      <Label text={item.label} y={item.labelY} accent={item.accent} theme={theme} />
      <ClickHint accent={item.accent} theme={theme} />
    </Interactable>
  );
}

/* ---------------------------------------------------------------- room ---- */

function Ceiling({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const width = ROOM_X * 2;
  const depth = ROOM_Z * 2;
  const { map, bumpMap } = useMemo(() => makeCeilingTextures(t.ceiling, t.trim), [t.ceiling, t.trim]);

  useEffect(() => {
    map.repeat.set(3, 4);
    bumpMap.repeat.set(3, 4);
    return () => {
      map.dispose();
      bumpMap.dispose();
    };
  }, [map, bumpMap]);

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={map} bumpMap={bumpMap} bumpScale={0.025} roughness={0.95} />
      </mesh>
      {[
        {
          pos: [0, WALL_HEIGHT - 0.07, -ROOM_Z + 0.07] as const,
          rot: 0,
          span: width - CORNER_INSET,
        },
        {
          pos: [0, WALL_HEIGHT - 0.07, ROOM_Z - 0.07] as const,
          rot: 0,
          span: width - CORNER_INSET,
        },
        {
          pos: [-ROOM_X + 0.07, WALL_HEIGHT - 0.07, 0] as const,
          rot: Math.PI / 2,
          span: depth - CORNER_INSET,
        },
        {
          pos: [ROOM_X - 0.07, WALL_HEIGHT - 0.07, 0] as const,
          rot: Math.PI / 2,
          span: depth - CORNER_INSET,
        },
      ].map((edge, i) => (
        <mesh key={i} position={edge.pos} rotation={[0, edge.rot, 0]}>
          <boxGeometry args={[edge.span, 0.14, 0.12]} />
          <meshStandardMaterial color={t.trim} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, WALL_HEIGHT - 0.04, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 20]} />
        <meshStandardMaterial color={t.trim} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Room({ theme }: { theme: ThemeName }) {
  const t = themes[theme];
  const ctx = useContext(SceneCtx)!;
  const floorRef = useRef<THREE.Mesh>(null);
  const { colorMap, bumpMap } = useMemo(() => makeWoodTextures(t.wood), [t.wood]);

  useEffect(() => {
    colorMap.repeat.set(3, 4);
    bumpMap.repeat.set(3, 4);
    return () => {
      colorMap.dispose();
      bumpMap.dispose();
    };
  }, [colorMap, bumpMap]);

  const rug = useModel("rug", {
    materials: { DarkRed: t.rug, LightOrange: t.rugAccent },
  });

  useEffect(() => {
    ctx.current.floor = floorRef.current;
  }, [ctx]);

  const width = ROOM_X * 2;
  const depth = ROOM_Z * 2;
  const walls = [
    { pos: [0, WALL_HEIGHT / 2, ROOM_Z] as const, rot: Math.PI, span: width },
    {
      pos: [-ROOM_X, WALL_HEIGHT / 2, 0] as const,
      rot: Math.PI / 2,
      span: depth,
    },
    {
      pos: [ROOM_X, WALL_HEIGHT / 2, 0] as const,
      rot: -Math.PI / 2,
      span: depth,
    },
  ];
  /*
   * The back wall is four plain strips framing a real opening rather than one
   * plane, so the street outside is genuinely visible through it. Same "skip a
   * gap" trick the skirting already uses for the door, on two axes instead of
   * one. The window's own frame overlaps every cut edge, so no seam shows.
   */
  const winLeft = WINDOW.x - WINDOW.w / 2;
  const winRight = WINDOW.x + WINDOW.w / 2;
  const winBottom = WINDOW.y - WINDOW.h / 2;
  const winTop = WINDOW.y + WINDOW.h / 2;
  const backWall: { pos: [number, number, number]; w: number; h: number }[] = [
    {
      pos: [(-ROOM_X + winLeft) / 2, WALL_HEIGHT / 2, -ROOM_Z],
      w: winLeft + ROOM_X,
      h: WALL_HEIGHT,
    },
    {
      pos: [(winRight + ROOM_X) / 2, WALL_HEIGHT / 2, -ROOM_Z],
      w: ROOM_X - winRight,
      h: WALL_HEIGHT,
    },
    { pos: [WINDOW.x, winBottom / 2, -ROOM_Z], w: WINDOW.w, h: winBottom },
    {
      pos: [WINDOW.x, (winTop + WALL_HEIGHT) / 2, -ROOM_Z],
      w: WINDOW.w,
      h: WALL_HEIGHT - winTop,
    },
  ];
  // Skirting breaks for the door rather than running behind it. The gap is
  // a touch narrower than the door, so the cut ends stay hidden.
  const skirtEndX = ROOM_X - CORNER_INSET / 2;
  const skirtEndZ = ROOM_Z - CORNER_INSET / 2;
  const doorLeft = DOOR.x - DOOR.width / 2 - 0.05;
  const doorRight = DOOR.x + DOOR.width / 2 + 0.05;
  // the bookshelf now stands clear of the wall, so the left run goes uncut
  const trims: { pos: [number, number, number]; rot: number; span: number }[] = [
    { pos: [0, 0, -ROOM_Z + 0.06], rot: 0, span: width - CORNER_INSET },
    {
      pos: [(doorLeft - skirtEndX) / 2, 0, ROOM_Z - 0.06],
      rot: 0,
      span: doorLeft + skirtEndX,
    },
    {
      pos: [(doorRight + skirtEndX) / 2, 0, ROOM_Z - 0.06],
      rot: 0,
      span: skirtEndX - doorRight,
    },
    {
      pos: [-ROOM_X + 0.06, 0, 0],
      rot: Math.PI / 2,
      span: depth - CORNER_INSET,
    },
    {
      pos: [ROOM_X - 0.06, 0, 0],
      rot: Math.PI / 2,
      span: depth - CORNER_INSET,
    },
  ];

  return (
    <group>
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.05}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      <primitive object={rug} scale={[RUG_SCALE, RUG_SCALE * 0.2, RUG_SCALE]} position={[0, 0.001, 0.1]} />

      {walls.map((wall, i) => (
        <mesh key={`w${i}`} position={wall.pos} rotation={[0, wall.rot, 0]}>
          <planeGeometry args={[wall.span, WALL_HEIGHT]} />
          <meshStandardMaterial color={t.wall} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {backWall.map((strip, i) => (
        <mesh key={`bw${i}`} position={strip.pos}>
          <planeGeometry args={[strip.w, strip.h]} />
          <meshStandardMaterial color={t.wall} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {trims.map((trim, i) => (
        <group key={`t${i}`} position={trim.pos} rotation={[0, trim.rot, 0]}>
          <mesh position={[0, 0.13, 0]}>
            <boxGeometry args={[trim.span, 0.26, 0.1]} />
            <meshStandardMaterial color={t.trim} roughness={0.9} />
          </mesh>
        </group>
      ))}

      <Ceiling theme={theme} />
      <Window theme={theme} />
      <Whiteboard theme={theme} />
      <WallClock theme={theme} />
      <LightSwitch theme={theme} />
      <ModelBoundary>
        <Suspense fallback={null}>
          <Lamp theme={theme} />
          <FairyLights theme={theme} />
          <Door theme={theme} />
          <Desk theme={theme} />
          <Bookshelf theme={theme} />
          <Plant theme={theme} position={[2.3, 0, 2.35]} />
          <OutsideView theme={theme} />
        </Suspense>
      </ModelBoundary>
      <TapMarker theme={theme} />
    </group>
  );
}

/* -------------------------------------------------------------- player ---- */

export type PlayerHandle = {
  walking: MutableRefObject<boolean>;
  recentre: MutableRefObject<(() => void) | null>;
  /** walks the camera back into the laptop screen, then calls back */
  sitDown: MutableRefObject<((done: () => void) => void) | null>;
  /** docks the camera square-on to the whiteboard and hands over the pointer */
  standAtBoard: MutableRefObject<((done: () => void, bandPx?: number) => void) | null>;
  /** undocks, back to wherever the player was standing before */
  leaveBoard: MutableRefObject<(() => void) | null>;
  /**
   * Re-frames the docked board for a toolbar of `bandPx`, so the space a fold
   * gives back becomes board rather than blank screen. A no-op unless docked.
   */
  reframeBoard: MutableRefObject<((bandPx: number) => void) | null>;
  clearBoard: MutableRefObject<(() => void) | null>;
  boardImage: MutableRefObject<(() => string | null) | null>;
  /** pushes the toolbar's current pen/eraser/note settings into the scene */
  setBoardTool: MutableRefObject<((tool: BoardTool) => void) | null>;
  /** writes the toolbar's text field into the selected sticky note */
  setNoteText: MutableRefObject<((text: string) => void) | null>;
  deselectNote: MutableRefObject<(() => void) | null>;
  /** removes the selected sticky note */
  deleteNote: MutableRefObject<(() => void) | null>;
};

type Pose = { pos: THREE.Vector2; y: number; yaw: number; pitch: number };

type Cinematic = {
  from: Pose;
  to: Pose;
  startedAt: number;
  duration: number;
  /** hand control back to the player when it finishes */
  release: boolean;
  onDone?: () => void;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Player({
  handle,
  onSelect,
  onMove,
  onDrawStart,
  onNoteSelect,
}: {
  handle: PlayerHandle;
  onSelect: (id: string) => void;
  onMove: () => void;
  onDrawStart: () => void;
  onNoteSelect: (text: string | null) => void;
}) {
  const { camera, gl } = useThree();
  const ctx = useContext(SceneCtx)!;

  const pos = useRef(START.clone());
  const target = useRef(START.clone());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const keys = useRef(new Set<string>());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const scratch = useMemo(() => new THREE.Vector2(), []);

  const obstacles = useMemo(() => PROP_OBSTACLES.map(([x, z, r]) => ({ x, z, r })), []);
  const still = useMemo(prefersReducedMotion, []);
  const cinematic = useRef<Cinematic | null>(null);
  const laptop = useMemo(() => exploreItems.find((i) => i.exitsToSite), []);
  /** docked at the whiteboard: the pointer draws instead of steering */
  const drawing = useRef(false);
  const preDrawPose = useRef<Pose | null>(null);
  /** eye height while docked, which sits below the board's centre */
  const eyeY = useRef(EYE_HEIGHT);
  const boardPose = useRef<Pose | null>(null);

  const clampTarget = (v: THREE.Vector2) => {
    v.x = THREE.MathUtils.clamp(v.x, -ROOM_X + 0.8, ROOM_X - 0.8);
    v.y = THREE.MathUtils.clamp(v.y, -ROOM_Z + 0.9, ROOM_Z - 0.9);
    for (const o of obstacles) {
      const dx = v.x - o.x;
      const dy = v.y - o.z;
      const d = Math.hypot(dx, dy);
      if (d < o.r && d > 1e-4) {
        v.x = o.x + (dx / d) * o.r;
        v.y = o.z + (dy / d) * o.r;
      }
    }
    return v;
  };

  useEffect(() => {
    camera.rotation.order = "YXZ";
    handle.recentre.current = () => {
      pos.current.copy(START);
      target.current.copy(START);
      yaw.current = 0;
      pitch.current = 0;
    };
    // clicking the laptop is sitting back down at it
    handle.sitDown.current = (done) => {
      if (!laptop || still) {
        done();
        return;
      }
      cinematic.current = {
        from: {
          pos: pos.current.clone(),
          y: EYE_HEIGHT,
          yaw: yaw.current,
          pitch: pitch.current,
        },
        to: laptopViewpoint(laptop),
        startedAt: now(),
        duration: 0.85,
        release: false,
        onDone: done,
      };
    };
    handle.standAtBoard.current = (done, bandPx = 0) => {
      const here: Pose = {
        pos: pos.current.clone(),
        y: EYE_HEIGHT,
        yaw: yaw.current,
        pitch: pitch.current,
      };
      preDrawPose.current = here;
      boardPose.current = whiteboardViewpoint(
        camera as THREE.PerspectiveCamera,
        reservedForUi(gl.domElement.clientHeight, bandPx),
      );
      cinematic.current = {
        from: here,
        to: boardPose.current,
        startedAt: now(),
        duration: still ? 0.001 : 0.9,
        // unlike sitDown the room keeps running afterwards, so the player's
        // own pose has to land on the framed one or leaving would snap
        release: true,
        onDone: () => {
          // land on the docked eye height, so the gate below holds it there
          // instead of easing up to it after the shot has already finished
          eyeY.current = boardPose.current?.y ?? EYE_HEIGHT;
          drawing.current = true;
          done();
        },
      };
    };

    handle.reframeBoard.current = (bandPx) => {
      const from = boardPose.current;
      if (!drawing.current || !from) return;
      const to = whiteboardViewpoint(
        camera as THREE.PerspectiveCamera,
        reservedForUi(gl.domElement.clientHeight, bandPx),
      );
      boardPose.current = to;
      // shorter than the dock itself: this is an adjustment, not an arrival
      cinematic.current = { from, to, startedAt: now(), duration: still ? 0.001 : 0.32, release: true };
      eyeY.current = to.y;
    };

    handle.leaveBoard.current = () => {
      const back = preDrawPose.current;
      const docked = boardPose.current;
      // dropped first, so a stroke in flight can't land during the pull-back
      drawing.current = false;
      preDrawPose.current = null;
      boardPose.current = null;
      eyeY.current = EYE_HEIGHT;
      if (!back || !docked) return;
      cinematic.current = {
        from: docked,
        to: back,
        startedAt: now(),
        duration: still ? 0.001 : 0.9,
        release: true,
      };
    };

    handle.clearBoard.current = () => ctx.current.whiteboardClear?.();
    handle.boardImage.current = () => ctx.current.whiteboardImage?.() ?? null;
    handle.setBoardTool.current = (tool) => {
      ctx.current.whiteboardTool = tool;
    };
    handle.setNoteText.current = (text) => ctx.current.whiteboardNoteText?.(text);
    handle.deselectNote.current = () => ctx.current.whiteboardDeselect?.();
    handle.deleteNote.current = () => ctx.current.whiteboardDeleteNote?.();

    return () => {
      handle.recentre.current = null;
      handle.sitDown.current = null;
      handle.standAtBoard.current = null;
      handle.leaveBoard.current = null;
      handle.reframeBoard.current = null;
      handle.clearBoard.current = null;
      handle.boardImage.current = null;
      handle.setBoardTool.current = null;
      handle.setNoteText.current = null;
      handle.deselectNote.current = null;
      handle.deleteNote.current = null;
    };
  }, [camera, ctx, gl, handle, laptop, still]);

  // Arriving in the room is standing up from that same laptop.
  useEffect(() => {
    if (!laptop || still) return;
    cinematic.current = {
      from: laptopViewpoint(laptop),
      to: { pos: START.clone(), y: EYE_HEIGHT, yaw: 0, pitch: 0 },
      startedAt: now(),
      duration: 1.25,
      release: true,
    };
  }, [laptop, still]);

  // Drag to look, tap to walk / open.
  useEffect(() => {
    const el = gl.domElement;
    let active: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let moved = 0;
    let startedAt = 0;

    // whether the pointer is currently on the board; leaving it lifts the pen
    // (or drops a note) so coming back starts fresh rather than ruling a line
    // across the gap
    let onBoard = false;

    /** Where a screen point lands on the board, in the board's own UV space. */
    const boardHit = (clientX: number, clientY: number) => {
      const board = ctx.current.whiteboard;
      if (!board) return null;
      const rect = el.getBoundingClientRect();
      scratch.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(scratch, camera);
      const hit = raycaster.intersectObject(board, false)[0];
      return hit?.uv ?? null;
    };

    const onDown = (e: PointerEvent) => {
      if (active !== null || cinematic.current) return;

      if (drawing.current) {
        const uv = boardHit(e.clientX, e.clientY);
        // a press off the board is simply not a mark; it must not fall
        // through to the look-drag, which is suspended while docked
        if (!uv) return;
        active = e.pointerId;
        onBoard = true;
        el.setPointerCapture(e.pointerId);
        const note = ctx.current.whiteboardPointer?.(uv.x, uv.y, "down") ?? null;
        onNoteSelect(note);
        onDrawStart();
        return;
      }

      active = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      moved = 0;
      startedAt = performance.now();
      el.setPointerCapture(e.pointerId);
    };

    const onMovePointer = (e: PointerEvent) => {
      if (active !== e.pointerId) return;

      if (drawing.current) {
        const uv = boardHit(e.clientX, e.clientY);
        if (!uv) {
          // left the board mid-gesture: lift, and let re-entry start over
          if (onBoard) ctx.current.whiteboardPointer?.(0, 0, "up");
          onBoard = false;
          return;
        }
        const note = ctx.current.whiteboardPointer?.(uv.x, uv.y, onBoard ? "move" : "down") ?? null;
        if (!onBoard) onNoteSelect(note);
        onBoard = true;
        return;
      }

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      yaw.current -= dx * 0.0045;
      pitch.current = THREE.MathUtils.clamp(pitch.current - dy * 0.0045, -0.9, 0.95);
    };

    const onUp = (e: PointerEvent) => {
      if (active !== e.pointerId) return;
      const wasTap = moved < 12 && performance.now() - startedAt < 600;
      active = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      // while docked a release just ends the mark — no tap-to-walk
      if (drawing.current) {
        ctx.current.whiteboardPointer?.(0, 0, "up");
        onBoard = false;
        return;
      }
      if (wasTap) handleTap(e.clientX, e.clientY);
    };

    const handleTap = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      scratch.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(scratch, camera);

      const registry = ctx.current.registry;
      const hits = raycaster.intersectObjects(Array.from(registry.keys()), true);
      if (hits.length > 0) {
        let node: THREE.Object3D | null = hits[0].object;
        while (node && !registry.has(node)) node = node.parent;
        if (node) {
          const id = registry.get(node)!;
          // walk up to a comfortable viewing distance, then open the panel
          const objectPos = new THREE.Vector3();
          node.getWorldPosition(objectPos);
          const toPlayer = new THREE.Vector2(pos.current.x - objectPos.x, pos.current.y - objectPos.z);
          if (toPlayer.length() > 0.01) {
            toPlayer.normalize().multiplyScalar(1.8);
            clampTarget(target.current.set(objectPos.x + toPlayer.x, objectPos.z + toPlayer.y));
          }
          onSelect(id);
          return;
        }
      }

      const floor = ctx.current.floor;
      if (!floor) return;
      const floorHits = raycaster.intersectObject(floor, false);
      if (floorHits.length > 0) {
        const p = floorHits[0].point;
        clampTarget(target.current.set(p.x, p.z));
        ctx.current.marker.set(target.current.x, 0, target.current.y);
        ctx.current.markerAt = now();
        onMove();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMovePointer);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMovePointer);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera, ctx, gl, onDrawStart, onMove, onNoteSelect, onSelect, raycaster, scratch]);

  useFrame((state, delta) => {
    // a cinematic owns the camera outright while it runs
    const shot = cinematic.current;
    if (shot) {
      const t = Math.min(1, (now() - shot.startedAt) / shot.duration);
      const e = easeInOut(t);
      state.camera.position.set(
        THREE.MathUtils.lerp(shot.from.pos.x, shot.to.pos.x, e),
        THREE.MathUtils.lerp(shot.from.y, shot.to.y, e),
        THREE.MathUtils.lerp(shot.from.pos.y, shot.to.pos.y, e),
      );
      state.camera.rotation.y = THREE.MathUtils.lerp(shot.from.yaw, shot.to.yaw, e);
      state.camera.rotation.x = THREE.MathUtils.lerp(shot.from.pitch, shot.to.pitch, e);
      if (t >= 1) {
        if (shot.release) {
          pos.current.copy(shot.to.pos);
          target.current.copy(shot.to.pos);
          yaw.current = shot.to.yaw;
          pitch.current = shot.to.pitch;
        }
        cinematic.current = null;
        shot.onDone?.();
      }
      return;
    }

    /*
     * Docked at the board: WASD, tap-to-walk and the head bob all stand
     * down, but the framing is re-solved every frame rather than held at
     * whatever the docking shot left. That is what makes turning a phone
     * to landscape re-frame — the binding axis swaps from width to height
     * and the board eases in to fill it, instead of staying at the pose
     * computed for the old aspect.
     */
    if (drawing.current) {
      const pose = whiteboardViewpoint(
        state.camera as THREE.PerspectiveCamera,
        reservedForUi(gl.domElement.clientHeight),
      );
      boardPose.current = pose;
      const k = still ? 1 : 1 - Math.exp(-12 * Math.min(delta, 0.05));
      pos.current.lerp(pose.pos, k);
      yaw.current = pose.yaw;
      pitch.current = pose.pitch;
      eyeY.current = THREE.MathUtils.lerp(eyeY.current, pose.y, k);
      state.camera.position.set(pos.current.x, eyeY.current, pos.current.y);
      state.camera.rotation.y = pose.yaw;
      state.camera.rotation.x = pose.pitch;
      return;
    }

    const step = Math.min(delta, 0.05);
    const held = keys.current;
    const forward = held.has("w") || held.has("arrowup") || handle.walking.current;
    const back = held.has("s") || held.has("arrowdown");
    const left = held.has("a") || held.has("arrowleft");
    const right = held.has("d") || held.has("arrowright");

    let moving = false;

    if (forward || back || left || right) {
      const sin = Math.sin(yaw.current);
      const cos = Math.cos(yaw.current);
      const drive = Number(forward) - Number(back);
      const strafe = Number(right) - Number(left);
      const dir = new THREE.Vector2(-sin * drive + cos * strafe, -cos * drive - sin * strafe);
      if (dir.lengthSq() > 0) {
        dir.normalize().multiplyScalar(WALK_SPEED * step);
        clampTarget(pos.current.add(dir));
        target.current.copy(pos.current);
        moving = true;
      }
    } else {
      const dx = target.current.x - pos.current.x;
      const dz = target.current.y - pos.current.y;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.02) {
        const travel = Math.min(dist, WALK_SPEED * step);
        pos.current.x += (dx / dist) * travel;
        pos.current.y += (dz / dist) * travel;
        moving = true;
      }
    }

    const bob = moving && !still ? Math.sin(state.clock.elapsedTime * 9) * 0.022 : 0;
    state.camera.position.set(pos.current.x, EYE_HEIGHT + bob, pos.current.y);
    state.camera.rotation.y = yaw.current;
    state.camera.rotation.x = pitch.current;
  });

  return null;
}

export function ExploreScene({
  theme,
  handle,
  onSelect,
  onMove,
  onDrawStart,
  onNoteSelect,
  quality,
  weather,
}: {
  theme: ThemeName;
  handle: PlayerHandle;
  onSelect: (id: string) => void;
  onMove: () => void;
  onDrawStart: () => void;
  onNoteSelect: (text: string | null) => void;
  quality: Quality;
  weather: Weather | null;
}) {
  const refs = useRef<SceneRefs>({
    registry: new Map(),
    floor: null,
    marker: new THREE.Vector3(),
    markerAt: 0,
    whiteboard: null,
    whiteboardPointer: null,
    whiteboardClear: null,
    whiteboardImage: null,
    whiteboardNoteText: null,
    whiteboardDeselect: null,
    whiteboardDeleteNote: null,
    whiteboardTool: { ...DEFAULT_TOOL },
  });
  const t = themes[theme];

  return (
    <SceneCtx.Provider value={refs}>
      <WeatherCtx.Provider value={weather}>
      <QualityCtx.Provider value={quality}>
        <Canvas
          dpr={quality === "mobile" ? [1, 1.25] : [1, 1.75]}
          gl={{
            antialias: quality === "desktop",
            powerPreference: "high-performance",
          }}
          // far was 50, which clipped anything more than ~41m out through the
          // window. near stays at 0.1, so depth precision is largely unchanged.
          camera={{
            fov: quality === "mobile" ? 72 : 65,
            near: 0.1,
            far: 120,
            position: [0, EYE_HEIGHT, START.y],
          }}
          style={{
            touchAction: "none",
            cursor: "grab",
            // Dragging to look around is a drag, not a text gesture: without
            // these, a finger swipe starts a selection and pops the callout
            // menu over the room.
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            WebkitTapHighlightColor: "transparent",
          }}
          onCreated={({ gl }) => {
            // phones drop the GL context when you switch apps; preventing the
            // default lets the browser restore it instead of leaving a blank canvas
            gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
          }}
        >
          <color attach="background" args={[t.fog]} />
          <fog attach="fog" args={[t.fog, 5, 45]} />

          <ambientLight intensity={t.ambient} />
          <hemisphereLight args={[t.ceiling, t.wall, t.hemi]} />

          <Room theme={theme} />
          {exploreItems.map((item) => (
            <Exhibit key={item.id} item={item} theme={theme} />
          ))}

          <Player
            handle={handle}
            onSelect={onSelect}
            onMove={onMove}
            onDrawStart={onDrawStart}
            onNoteSelect={onNoteSelect}
          />
        </Canvas>
      </QualityCtx.Provider>
      </WeatherCtx.Provider>
    </SceneCtx.Provider>
  );
}
