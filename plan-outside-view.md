# Real outside view through the Explore-room window

## Context

The Explore room's window (`components/explore/ExploreScene.tsx`) is currently
just a glowing flat pane — `explore-ideas.md` records an earlier attempt at a
real diorama behind it that was reverted because "the opening/scenery
placement wasn't landing right and wasn't easy to debug without visual
feedback." Seven new glb assets have since been added to `public/models/`
(cloud, mountain, road-straight, road-turn, car-blue, car-white,
street-light) that are enough, once measured, to build the scene originally
planned: a street receding into the distance, parked cars, a street light,
a range of low-poly mountains on the horizon, and drifting clouds. This plan
builds that scene and makes it actually visible by cutting a real opening in
the back wall instead of relying on a fake illustrative pane.

Bounding boxes were measured directly from each glTF's accessor min/max
(not eyeballed), per the project's established "measure real bounds before
placing" workflow:

| Asset | Size x,y,z (m) | Note |
|---|---|---|
| `road-straight.glb` | 8 × 0.12 × 8 | flat tile |
| `road-turn.glb` | 8 × 0.12 × 8 | same footprint, bends the road out of frame |
| `car-white.glb` | 1.6 × 1.1 × 3.3 | correct scale already |
| `car-blue.glb` | 45.5 × 32.3 × 89.1 | **wrong units** — needs `scale ≈ 0.045` at placement |
| `street-light.glb` | 0.36 × 6.6 × 2.9 | tall pole, good foreground scale anchor |
| `mountain.glb` | 1.5 × 1.37 × 1.1 | single peak, meant to be instanced 3-4x |
| `cloud.glb` | 4.0 × 2.4 × 2.4 | instance 2-3x, animate drift |

Per user decision: **skip attribution for this pass** — `models.ts` gets the
new `MODELS` entries only, `MODEL_CREDITS`/`CREDITS.md` are left untouched
with a `// TODO: attribution` comment for these 7 files, to be filled in
separately once the Poly Pizza source links are known.

## Key existing patterns to reuse

- `useModel(name, options?)` (`components/explore/useModel.tsx:85`) returns a
  cloned `THREE.Object3D` per call — cheap to call multiple times for the
  same asset (drei caches the parsed glTF; only a scene-graph clone happens
  per instance), which is exactly what's needed for 3-4 mountains / 2-3
  clouds. No auto-centering — offsets must be hardcoded from the measured
  bounds above, same as the existing `FAIRY_LENGTH`/`FAIRY_SCALE` constants.
- Animation + reduced-motion pattern, reused verbatim from `Lamp`/
  `FairyLights` (`ExploreScene.tsx` ~267-347): `const still =
  useMemo(prefersReducedMotion, [])`, then inside `useFrame((state) => {...
  if (!still) ... })`, driven by `state.clock.elapsedTime`.
- Quality gating: read via `useContext(QualityCtx)` inside the component
  (not a prop) — see `Desk`'s point-light gated on `quality === "desktop"`.
- New glTF-backed components go inside the existing `<ModelBoundary>
  <Suspense fallback={null}>...</Suspense></ModelBoundary>` block
  (`ExploreScene.tsx:1209-1217`), alongside `Lamp`, `FairyLights`, `Desk`,
  `Bookshelf`, `Plant`.
- Scene has global fog: `<fog args={[t.fog, 5, 16]} />` and background color
  `t.fog` (`ExploreScene.tsx:1524-1525`). This isn't a problem to fight —
  placing the mountains/sky within roughly 8-10 units behind the wall lets
  them fade naturally into atmospheric haze/the background color, which
  reads as distance rather than a hard cutoff.

## Changes

### 1. `components/explore/models.ts`
Add 7 entries to `MODELS`: `cloud`, `mountain`, `roadStraight`,
`roadTurn`, `carBlue`, `carWhite`, `streetLight` → their `/models/*.glb`
paths. Leave `MODEL_CREDITS` alone but add a one-line comment noting these
7 files still need attribution info before shipping if any turn out to be
CC-BY.

### 2. Cut a real opening in the back wall
`Room`'s back wall (`ExploreScene.tsx` walls array index 0, `pos: [0,
WALL_HEIGHT/2, -ROOM_Z]`) is currently one full-width `planeGeometry`. Split
just that one wall into 4 plane segments framing the window rect
(`WINDOW = { x: 1.65, y: 1.85, w: 2.0, h: 1.7 }`, `WALL_HEIGHT = 3.4`):

- left: x ∈ [-ROOM_X, WINDOW.x - w/2]
- right: x ∈ [WINDOW.x + w/2, ROOM_X]
- bottom: x ∈ window span, y ∈ [0, WINDOW.y - h/2]
- top: x ∈ window span, y ∈ [WINDOW.y + h/2, WALL_HEIGHT]

Same `meshStandardMaterial color={t.wall} roughness={1} side={DoubleSide}`
as today. Walls 1-3 (front/left/right) stay as single planes — untouched.
This is the same "skip a gap" technique the skirting trim already uses for
the door (`doorLeft`/`doorRight` in the same function), just applied on two
axes instead of one.

### 3. Make the window glass see-through
In `Window()` (`ExploreScene.tsx:397-447`), the emissive plane at
`opacity={0.9}` currently fully blocks the view. Reduce it to a lightly
tinted, mostly-transparent pane (e.g. `opacity ~0.12-0.2`, keep a small
`emissiveIntensity` for glass sheen/glow, especially in dark theme) so the
`OutsideView` geometry behind it reads clearly through the glass. Keep the
existing frame/mullions/sill/directional light as-is — the wall cut is
sized to exactly match this opening so nothing needs repositioning.

### 4. New `OutsideView({ theme })` component
Added inside the `ModelBoundary`/`Suspense` block, after `<Plant .../>`.
Anchored to `WINDOW.x`, extending in -z behind the new wall opening:

- **Road**: 2 `roadStraight` tiles + 1 `roadTurn` at the far end, laid flat
  (rotate -90° on x like the floor) starting just behind the glass.
- **Cars**: one `carWhite` (native scale) parked near the glass; one
  `carBlue` scaled `~0.045` further back, corrected per the measured-bounds
  table above.
- **Street light**: one `streetLight` instance beside the road, tall enough
  to rise past the window's top edge for foreground scale contrast.
- **Mountains**: 3-4 `mountain` instances (each its own `useModel("mountain")`
  call, not shared instances — `primitive` objects can't be reused twice in
  the graph), varied scale (~2-4x) and rotation, placed ~6-9 units behind
  the wall, low on the horizon.
- **Sky backdrop**: one large plane behind the mountains, flat color, sized
  to fill the window's visible frustum with margin.
- **Clouds**: 2-3 `cloud` instances, mid-height, animated with the
  `still`/`useFrame` pattern above — a slow bounded sine drift in x (matches
  the sway/twinkle style already used, no need for wraparound scrolling).
- Mountain/cloud instance counts and the `carBlue` point light (if any is
  added for headlights) are gated by `quality === "desktop"` to keep mobile
  cheap, following the `Desk` precedent.

### 5. Wire it in
`<OutsideView theme={theme} />` added to the `Room` JSX inside
`ModelBoundary`/`Suspense`, after `<Plant .../>` (`ExploreScene.tsx:1215`).

## Verification

- `npm run dev`, open `/explore` in both light and dark theme — confirm the
  street/mountains/clouds are visible and readable through the window from
  a few different standing positions in the room.
- Check the `carBlue` instance reads as a normal-sized car, not a giant
  wrong-scale prop.
- Toggle OS-level reduced-motion and confirm clouds stop drifting but still
  render.
- Resize/emulate mobile (or check `isMobile` path) and confirm the scene
  still renders with the lighter instance count, no console errors from
  `ModelBoundary`.
- Walk around the room to confirm the new wall segments don't leave a
  visible gap/seam at the window frame edges, and that collision/click-to-
  walk against the back wall is unaffected (it's bounded by `ROOM_Z`, not
  by wall mesh geometry, so this should be a no-op check).
