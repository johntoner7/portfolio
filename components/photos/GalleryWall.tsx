import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ScrollControls, useScroll, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Photo, PhotoYear } from "@/hooks/usePhotos";
import { getCloudinaryUrl } from "@/utils/cloudinary";
import { darkWoodPalette, lightWoodPalette } from "@/utils/woodTexture";
import { useThemeMode } from "@/hooks/useThemeMode";
import { WallViewer } from "./WallViewer";

interface WallItem {
  photo: Photo;
  groupPhotos: Photo[];
  groupName: string;
  position: THREE.Vector3;
  rotationY: number;
  t: number; // approximate fractional position along the path, for scroll lookups
}

interface Vec2 {
  x: number;
  z: number;
}

type DragRef = React.MutableRefObject<{ dragging: boolean; moved: number }>;
const CLICK_MOVE_THRESHOLD = 6;

const SPACING = 2.9;
const CAM_OFFSET = 4.6;
const EYE_HEIGHT = 1.6;
const MAX_PHOTO_DIM = 1.5;
const MAT_MARGIN = 0.1;
const FRAME_WIDTH = 0.09;
const FRAME_DEPTH = 0.06;
const WALL_HEIGHT = 5.4;
const WALL_SET_BACK = 0.16;
const FOCUS_DIST = 2.25;
const APPROACH_DURATION = 1.1;
const RETURN_DURATION = 0.75;
const CORNER_RADIUS = 2.1;
const CORNER_SAMPLES = 10;
const SEGMENT_LEAD = SPACING * 0.55; // gap walked before the first photo of a section and after the last

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

function rotateVec(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.z * s, z: v.x * s + v.z * c };
}

function normalizeVec(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.z) || 1;
  return { x: v.x / len, z: v.z / len };
}

function buildGallery(years: PhotoYear[]) {
  const groups: { groupName: string; photos: Photo[] }[] = [];
  for (const y of years) {
    for (const g of y.groups) groups.push({ groupName: g.groupName, photos: g.photos });
  }

  // walk a corridor of straight sections, one per group, turning a corner — alternating
  // left and right — between each. `path` holds every sampled point (photos and the
  // corner arcs that connect them) so the wall/camera curves follow the whole corridor.
  interface PathPoint { pos: Vec2; tangent: Vec2; photo?: Photo; groupPhotos?: Photo[]; groupName?: string; isGroupStart?: boolean }
  const path: PathPoint[] = [];

  let pos: Vec2 = { x: 0, z: 0 };
  let dir: Vec2 = { x: 0, z: -1 };
  let turnSign = 1;

  groups.forEach((group, gi) => {
    if (gi > 0) pos = { x: pos.x + dir.x * SEGMENT_LEAD, z: pos.z + dir.z * SEGMENT_LEAD };

    group.photos.forEach((photo, k) => {
      pos = { x: pos.x + dir.x * (k === 0 ? SPACING * 0.5 : SPACING), z: pos.z + dir.z * (k === 0 ? SPACING * 0.5 : SPACING) };
      path.push({ pos: { ...pos }, tangent: { ...dir }, photo, groupPhotos: group.photos, groupName: group.groupName, isGroupStart: k === 0 });
    });

    pos = { x: pos.x + dir.x * SEGMENT_LEAD, z: pos.z + dir.z * SEGMENT_LEAD };

    if (gi < groups.length - 1) {
      // arc around a corner, alternating which way it turns, so the corridor zigzags
      const turnAngle = turnSign * (Math.PI / 2);
      const centerOffset = rotateVec(dir, turnAngle);
      const center = { x: pos.x + centerOffset.x * CORNER_RADIUS, z: pos.z + centerOffset.z * CORNER_RADIUS };
      const startVec = { x: pos.x - center.x, z: pos.z - center.z };

      for (let s = 1; s <= CORNER_SAMPLES; s++) {
        const a = (s / CORNER_SAMPLES) * turnAngle;
        const rv = rotateVec(startVec, a);
        path.push({ pos: { x: center.x + rv.x, z: center.z + rv.z }, tangent: normalizeVec(rotateVec(dir, a)) });
      }

      pos = path[path.length - 1].pos;
      dir = normalizeVec(rotateVec(dir, turnAngle));
      turnSign *= -1;
    }
  });

  const items: WallItem[] = [];
  const wallPoints: THREE.Vector3[] = [];
  const wallBackPoints: THREE.Vector3[] = [];
  const camPoints: THREE.Vector3[] = [];

  path.forEach((p, i) => {
    // the side the camera walks on, relative to travel direction — flipped to +90°
    // so moving forward reads as heading right rather than left
    const normalSide = normalizeVec(rotateVec(p.tangent, Math.PI / 2));
    const y = EYE_HEIGHT + Math.sin(i * 0.12) * 0.12;
    const wallPos = new THREE.Vector3(p.pos.x, y, p.pos.z);
    const t = path.length > 1 ? i / (path.length - 1) : 0;

    wallPoints.push(wallPos);
    wallBackPoints.push(new THREE.Vector3(p.pos.x - normalSide.x * WALL_SET_BACK, 0, p.pos.z - normalSide.z * WALL_SET_BACK));
    camPoints.push(new THREE.Vector3(p.pos.x + normalSide.x * CAM_OFFSET, EYE_HEIGHT, p.pos.z + normalSide.z * CAM_OFFSET));

    if (p.photo) {
      const rotationY = Math.atan2(normalSide.x, normalSide.z);
      items.push({ photo: p.photo, groupPhotos: p.groupPhotos!, groupName: p.groupName!, position: wallPos, rotationY, t });
    }
  });

  const wallCurve = new THREE.CatmullRomCurve3(wallPoints.length > 1 ? wallPoints : [...wallPoints, wallPoints[0].clone().add(new THREE.Vector3(0, 0, -1))]);
  const wallBackCurve = new THREE.CatmullRomCurve3(wallBackPoints.length > 1 ? wallBackPoints : [...wallBackPoints, wallBackPoints[0].clone().add(new THREE.Vector3(0, 0, -1))]);
  const camCurve = new THREE.CatmullRomCurve3(camPoints.length > 1 ? camPoints : [...camPoints, camPoints[0].clone().add(new THREE.Vector3(0, 0, -1))]);

  const itemsById = new Map(items.map((item) => [item.photo.id, item]));

  const bounds = wallPoints.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x),
      minZ: Math.min(b.minZ, p.z), maxZ: Math.max(b.maxZ, p.z),
    }),
    { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }
  );

  return { items, wallCurve, wallBackCurve, camCurve, itemsById, bounds, count: items.length };
}

// the point a viewer would stand at to look squarely at this item, and the direction they'd face
function focusPointFor(item: WallItem) {
  const normal = new THREE.Vector3(Math.sin(item.rotationY), 0, Math.cos(item.rotationY));
  const position = item.position.clone().add(normal.clone().multiplyScalar(FOCUS_DIST));
  position.y = item.position.y;
  return { position, lookAt: item.position };
}

// builds a continuous vertical ribbon of geometry that follows a horizontal curve,
// so the gallery reads as one curved wall rather than floating frames
function buildWallGeometry(curve: THREE.CatmullRomCurve3, segments: number, height: number) {
  const points = curve.getSpacedPoints(segments);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  points.forEach((p, i) => {
    positions.push(p.x, 0, p.z, p.x, height, p.z);
    uvs.push(i / segments, 0, i / segments, 1);
  });

  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
    indices.push(a, c, b, b, c, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function PhotoFrame({ item, disabled, dragRef, onSelect }: { item: WallItem; disabled: boolean; dragRef: DragRef; onSelect: (item: WallItem) => void }) {
  const texture = useTexture(getCloudinaryUrl(item.photo.cloudinaryId, 500));
  const [hovered, setHovered] = useState(false);
  const inner = useRef<THREE.Group>(null);
  const theme = useThemeMode();

  const { w, h } = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const img = texture.image as { width: number; height: number } | undefined;
    if (!img?.width || !img?.height) return { w: MAX_PHOTO_DIM, h: MAX_PHOTO_DIM };
    const aspect = img.width / img.height;
    return aspect >= 1
      ? { w: MAX_PHOTO_DIM, h: MAX_PHOTO_DIM / aspect }
      : { w: MAX_PHOTO_DIM * aspect, h: MAX_PHOTO_DIM };
  }, [texture]);

  const matW = w + MAT_MARGIN * 2;
  const matH = h + MAT_MARGIN * 2;
  const frameW = matW + FRAME_WIDTH * 2;
  const frameH = matH + FRAME_WIDTH * 2;
  const frameColor = theme === "light" ? "#5c3d22" : "#20130a";

  useFrame(() => {
    if (!inner.current) return;
    const targetScale = hovered && !disabled ? 1.05 : 1;
    inner.current.scale.x += (targetScale - inner.current.scale.x) * 0.15;
    inner.current.scale.y += (targetScale - inner.current.scale.y) * 0.15;
    inner.current.scale.z += (targetScale - inner.current.scale.z) * 0.15;
  });

  return (
    <group position={item.position} rotation={[0, item.rotationY, 0]}>
      <group
        ref={inner}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (!disabled && dragRef.current.moved < CLICK_MOVE_THRESHOLD) onSelect(item);
        }}
        onPointerOver={(e) => { e.stopPropagation(); if (!disabled) { setHovered(true); document.body.style.cursor = "pointer"; } }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "auto"; }}
      >
        {/* soft contact shadow on the wall behind the frame */}
        <mesh position={[0, -0.03, -FRAME_DEPTH - 0.01]}>
          <planeGeometry args={[frameW * 1.18, frameH * 1.16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.22} toneMapped={false} />
        </mesh>

        {/* frame — real depth so it catches light along its edges instead of reading as a flat card */}
        <mesh position={[0, 0, -FRAME_DEPTH / 2]} castShadow>
          <boxGeometry args={[frameW, frameH, FRAME_DEPTH]} />
          <meshStandardMaterial color={frameColor} roughness={0.45} metalness={0.12} />
        </mesh>

        {/* mat */}
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[matW, matH]} />
          <meshStandardMaterial color="#f2ead9" roughness={0.95} />
        </mesh>

        {/* unlit so the photo itself always reads at full brightness, regardless of viewing angle to the lights */}
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function WallSurface({ curve, count }: { curve: THREE.CatmullRomCurve3; count: number }) {
  const theme = useThemeMode();
  const color = theme === "light" ? "#efe9dc" : "#241f19";
  const geometry = useMemo(() => buildWallGeometry(curve, Math.max(60, count * 3), WALL_HEIGHT), [curve, count]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  );
}

// lets a desktop mouse drag left/right through the gallery, same as the horizontal
// scroll/touch-swipe — touch already scrolls natively, so this only listens for mouse input
function DragScroll({ dragRef }: { dragRef: DragRef }) {
  const scroll = useScroll();
  const { gl } = useThree();
  // kept in a ref (not effect-local vars) so an in-progress drag survives the effect
  // below re-running — e.g. when the "nearest group" label updates mid-scroll
  const gesture = useRef({ active: false, startX: 0, startScrollLeft: 0 });

  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e: MouseEvent) => {
      // drei's ScrollControls renders a sticky overlay div on top of the canvas to
      // capture wheel/touch scroll, so mousedown never lands on the canvas itself —
      // listen on window instead, and skip real UI (nav, tab buttons) above it
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button, a")) return;
      const rect = el.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

      gesture.current.active = true;
      gesture.current.startX = e.clientX;
      gesture.current.startScrollLeft = scroll.el.scrollLeft;
      dragRef.current.dragging = true;
      dragRef.current.moved = 0;
      el.style.cursor = "grabbing";
    };
    const onMove = (e: MouseEvent) => {
      if (!gesture.current.active) return;
      const dx = e.clientX - gesture.current.startX;
      dragRef.current.moved = Math.max(dragRef.current.moved, Math.abs(dx));
      scroll.el.scrollLeft = gesture.current.startScrollLeft - dx;
    };
    const onUp = () => {
      if (!gesture.current.active) return;
      gesture.current.active = false;
      dragRef.current.dragging = false;
      el.style.cursor = "auto";
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [gl, scroll, dragRef]);

  return null;
}

function FlyRig({
  camCurve,
  wallCurve,
  onNearestChange,
  items,
  focusItem,
  onArrived,
}: {
  camCurve: THREE.CatmullRomCurve3;
  wallCurve: THREE.CatmullRomCurve3;
  onNearestChange: (name: string) => void;
  items: WallItem[];
  focusItem: WallItem | null;
  onArrived: () => void;
}) {
  const scroll = useScroll();
  const { camera } = useThree();
  const light = useRef<THREE.PointLight>(null);
  const lastPhotoId = useRef<string | null>(null);

  const phase = useRef<"scroll" | "approach" | "focus" | "return">("scroll");
  const phaseStart = useRef(0);
  const prevFocusId = useRef<string | null>(null);
  const approachFrom = useRef(new THREE.Vector3());
  const returnFrom = useRef(new THREE.Vector3());

  useEffect(() => {
    if (light.current) camera.add(light.current);
    return () => { if (light.current) camera.remove(light.current); };
  }, [camera]);

  useFrame((state) => {
    const t = THREE.MathUtils.clamp(scroll.offset, 0, 1);
    const scrollCamPos = camCurve.getPointAt(t);
    // look only a little ahead, so the view stays close to perpendicular to the nearest
    // photo instead of raking across it — a fixed fraction reads fine on straights and corners alike
    const scrollLookPos = wallCurve.getPointAt(THREE.MathUtils.clamp(t + 0.01, 0, 1));

    const focusId = focusItem?.photo.id ?? null;
    if (focusId !== prevFocusId.current) {
      if (focusId) {
        approachFrom.current.copy(camera.position);
        phase.current = "approach";
      } else {
        returnFrom.current.copy(camera.position);
        phase.current = "return";
      }
      phaseStart.current = state.clock.elapsedTime;
      prevFocusId.current = focusId;
    }

    if (phase.current === "approach" && focusItem) {
      const elapsed = state.clock.elapsedTime - phaseStart.current;
      const p = easeOutCubic(THREE.MathUtils.clamp(elapsed / APPROACH_DURATION, 0, 1));
      const { position, lookAt } = focusPointFor(focusItem);
      camera.position.lerpVectors(approachFrom.current, position, p);
      camera.lookAt(lookAt);
      if (p >= 1) {
        phase.current = "focus";
        onArrived();
      }
    } else if (phase.current === "focus" && focusItem) {
      const { position, lookAt } = focusPointFor(focusItem);
      camera.position.copy(position);
      camera.lookAt(lookAt);
    } else if (phase.current === "return") {
      const elapsed = state.clock.elapsedTime - phaseStart.current;
      const p = easeOutCubic(THREE.MathUtils.clamp(elapsed / RETURN_DURATION, 0, 1));
      camera.position.lerpVectors(returnFrom.current, scrollCamPos, p);
      camera.lookAt(scrollLookPos);
      if (p >= 1) phase.current = "scroll";
    } else {
      camera.position.copy(scrollCamPos);
      camera.lookAt(scrollLookPos);
    }

    let nearest = items[0];
    let bestDiff = Infinity;
    for (const item of items) {
      const diff = Math.abs(item.t - t);
      if (diff < bestDiff) { bestDiff = diff; nearest = item; }
    }
    if (nearest && nearest.photo.id !== lastPhotoId.current) {
      lastPhotoId.current = nearest.photo.id;
      onNearestChange(nearest.groupName);
    }
  });

  return <pointLight ref={light} position={[0, 0.5, 0.8]} intensity={7} distance={11} decay={2} color="#fff2dc" />;
}

function Floor({ bounds }: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number } }) {
  const theme = useThemeMode();
  const palette = theme === "light" ? lightWoodPalette : darkWoodPalette;
  const color = theme === "light" ? "#d9cdb2" : "#1a140d";
  const margin = 22;
  const width = bounds.maxX - bounds.minX + margin * 2;
  const depth = bounds.maxZ - bounds.minZ + margin * 2;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <>
      <mesh position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <color attach="background" args={[palette.bg]} />
      <fog attach="fog" args={[palette.bg, 10, 26]} />
    </>
  );
}

function Scene({
  gallery,
  focusItem,
  onSelect,
  onArrived,
  onNearestChange,
}: {
  gallery: ReturnType<typeof buildGallery>;
  focusItem: WallItem | null;
  onSelect: (item: WallItem) => void;
  onArrived: () => void;
  onNearestChange: (name: string) => void;
}) {
  const { items, wallCurve, wallBackCurve, camCurve, bounds, count } = gallery;
  const theme = useThemeMode();
  const palette = theme === "light" ? lightWoodPalette : darkWoodPalette;
  const pages = Math.max(4, Math.round(count / 6));
  const dragRef = useRef({ dragging: false, moved: 0 });

  return (
    <>
      <ambientLight intensity={theme === "light" ? 0.75 : 0.55} color={palette.ambient} />
      <directionalLight position={[6, 8, 4]} intensity={theme === "light" ? 0.7 : 0.5} color={palette.glow} />
      <Floor bounds={bounds} />
      <WallSurface curve={wallBackCurve} count={count} />

      {items.map((item) => (
        <PhotoFrame key={item.photo.id} item={item} disabled={!!focusItem} dragRef={dragRef} onSelect={onSelect} />
      ))}

      <ScrollControls pages={pages} damping={0.25} horizontal>
        <DragScroll dragRef={dragRef} />
        <FlyRig
          camCurve={camCurve}
          wallCurve={wallCurve}
          onNearestChange={onNearestChange}
          items={items}
          focusItem={focusItem}
          onArrived={onArrived}
        />
      </ScrollControls>
    </>
  );
}

export function GalleryWall({ years }: { years: PhotoYear[] }) {
  const gallery = useMemo(() => buildGallery(years), [years]);
  const [focusItem, setFocusItem] = useState<WallItem | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [nearestGroup, setNearestGroup] = useState<string>("");

  const goTo = (item: WallItem) => {
    setViewerOpen(false);
    setFocusItem(item);
  };

  const handleClose = () => {
    setViewerOpen(false);
    setFocusItem(null);
  };

  const handleNavigate = (photo: Photo) => {
    const next = gallery.itemsById.get(photo.id);
    if (next) goTo(next);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <Canvas dpr={[1, 1.5]} gl={{ antialias: true }} camera={{ fov: 42, near: 0.1, far: 70 }}>
        <Suspense fallback={null}>
          <Scene
            gallery={gallery}
            focusItem={focusItem}
            onSelect={goTo}
            onArrived={() => setViewerOpen(true)}
            onNearestChange={setNearestGroup}
          />
        </Suspense>
      </Canvas>

      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--foreground)",
          opacity: 0.7,
          pointerEvents: "none",
        }}
      >
        {nearestGroup}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--foreground)",
          opacity: 0.45,
          pointerEvents: "none",
        }}
      >
        scroll or drag sideways to walk through · click a photo
      </div>

      {viewerOpen && focusItem && (
        <WallViewer
          photo={focusItem.photo}
          groupPhotos={focusItem.groupPhotos}
          onNavigate={handleNavigate}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
