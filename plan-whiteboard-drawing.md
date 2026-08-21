# Freeform whiteboard drawing + "send to me" in Explore mode

## Context

`explore-ideas.md`'s backlog already floated this: let visitors draw on the
whiteboard and send you what they drew. Right now the whiteboard
(`Whiteboard()` in `components/explore/ExploreScene.tsx:788-834`) is a static
`THREE.CanvasTexture` showing hardcoded heading/bullets/stats — it isn't even
tappable (no registry entry, no `exploreItems.ts` entry). This plan makes it
a real freeform drawing surface, and wires "Send" through a small serverless
endpoint that emails you the PNG via Resend — chosen over EmailJS or a
manual-download because you want it fully automatic with no third-party
client key exposed, at the cost of adding this repo's first backend
endpoint (there's currently none — the site's own "Contact" button is just a
`mailto:` link; Resend is only used on your Pen2Paper client project, not
here).

Two existing patterns carry almost the entire implementation:

- **The laptop's cinematic camera lock** (`sitDown`/arrival flow,
  `ExploreScene.tsx:1640-1670`) — walking up to something, camera pins to a
  framed close-up, free-roam (WASD + drag-look) is fully suppressed while
  `cinematic.current` is set, and pointer input already refuses to start a
  new drag while a cinematic is in flight. This is reused near-verbatim to
  walk the player up to the whiteboard and hold the camera there while
  drawing — solving the hard problem (drag-to-draw vs. drag-to-look-around
  fighting over the same pointer events) for free.
- **`opensPhotos`'s in-place-overlay pattern** (`pages/Explore.tsx`) — a
  special-cased id in `handleSelect`, a fade, and a piece of state
  (`photosOpen`) that shows a small UI on top of the still-mounted room.
  The whiteboard's `drawingOpen` state follows the same shape, minus the
  fade (the camera pan itself is the transition).

## Prerequisites (your side, not code)

- A Resend account + `RESEND_API_KEY`, added as a Vercel env var (Production
  + Preview) and to local `.env.local` — server-only, no `VITE_` prefix, so
  it never reaches the client bundle (same convention as
  `CLOUDINARY_API_KEY` in `scripts/*.mjs`).
- A sending identity Resend will accept as `from`: either a domain you've
  verified in Resend, or their shared `onboarding@resend.dev` for initial
  testing (that shared sender has stricter delivery limits — worth
  confirming it actually lands in your inbox before relying on it).
- Testing note: `npm run dev` (Vite) does **not** run `/api` serverless
  functions — you'll need `vercel dev` (or a real deploy) to test the Send
  button end-to-end.

## Changes

### 1. `api/send-whiteboard.ts` (new)
A Vercel serverless function (Node runtime, repo-root `api/` convention).
POST-only; body `{ image: string }`, a `data:image/png;base64,...` URL from
`canvas.toDataURL()`. Validates the prefix and caps decoded size (~3MB — a
spam/cost guard and a hedge against the Node function's default request-body
limit). Sends via the `resend` npm package:

```ts
await resend.emails.send({
  from: "Portfolio Whiteboard <onboarding@resend.dev>", // or your verified domain
  to: siteData.contact.email, // relative import from "../lib/data" — not the "@/" alias, since api/ is bundled separately from Vite
  subject: "Someone drew you something on the site",
  html: "<p>A visitor left a drawing on the Explore-room whiteboard.</p>",
  attachments: [{ filename: "whiteboard.png", content: base64Data }],
});
```
Returns 200/JSON on success, 4xx on bad input, 500 on send failure. No auth
or rate limiting for v1 (low-traffic personal site) — noted as a known gap,
not solved here.

`package.json`: add `resend` (dependency) and `@vercel/node` (devDependency,
for typed `VercelRequest`/`VercelResponse`).

### 2. `components/explore/ExploreScene.tsx` — drawing mechanics

- **`SceneRefs`** (~line 172): add `whiteboard: THREE.Object3D | null`,
  `whiteboardDraw: ((u: number, v: number, start: boolean) => void) | null`,
  `whiteboardClear: (() => void) | null`. Same shared-context idiom already
  used for `floor`.
- **`Whiteboard()`** (~line 788): grab the persistent canvas straight off
  the texture — `THREE.CanvasTexture.image` *is* the canvas passed to its
  constructor, so no new canvas tracking is needed. On mount, register
  `ctx.current.whiteboard = <the board's plane mesh ref>` (same pattern as
  `Room`'s `ctx.current.floor = floorRef.current`) and set
  `whiteboardDraw`/`whiteboardClear` to closures that draw a line segment
  (`ctx.lineTo` from the last UV-derived point) or `ctx.fillRect` the whole
  canvas back to `t.paper`, calling `texture.needsUpdate = true` after each.
  UV → canvas pixel: `x = u * canvas.width`, `y = (1 - v) * canvas.height`
  (canvas is y-down, UV is y-up). One pen colour for v1 (reuse the marker
  mesh's `#2f5d8a` blue already sitting in the tray).
  *Known limitation, not solved here*: the texture is recreated (fresh
  blank canvas) if `t.paper` changes, i.e. an OS-level theme toggle mid-draw
  clears the board. Acceptable for a "simple" v1.
- **`PlayerHandle`** (~line 1570): add two refs, `standAtBoard: ((done: () =>
  void) => void) | null` and `leaveBoard: (() => void) | null`, mirroring
  `sitDown`/the arrival effect exactly:
  - `standAtBoard`: same shape as `sitDown` (`ExploreScene.tsx:1640-1653`)
    — cinematic from the player's current pose to a new fixed
    `WHITEBOARD_VIEWPOINT` constant (position/yaw/pitch chosen to frame the
    board; simpler than `laptopViewpoint` since the board has no hinge, so
    this can be a hardcoded pose rather than derived), `release: true` (so
    `pos.current`/`yaw.current`/`pitch.current` land exactly on the framed
    pose — **must** be `release: true` here, unlike `sitDown`'s `false`,
    because the scene keeps rendering afterwards instead of navigating
    away; `onDone` sets a new `drawing.current = true` ref *and* calls the
    passed-in `done` callback, which is what flips `drawingOpen` in
    `pages/Explore.tsx`).
  - `leaveBoard`: reverse cinematic back to the pose captured in a new
    `preDrawPose` ref when `standAtBoard` started, `release: true`,
    `drawing.current = false` set immediately (before the cinematic even
    starts, so a stray in-flight stroke can't sneak in).
- **Main `useFrame`** (~line 1766): add a `drawing.current` gate right
  after the existing `if (shot) { ...; return; }` block — while drawing,
  skip the WASD/drag-look free-roam update entirely (the camera simply
  holds at whatever `release: true` left it at; no per-frame work needed).
- **Pointer handler** (`onDown`/`onMovePointer`/`onUp`, ~line 1673-1764):
  add a `drawing.current` branch before the existing yaw/pitch-drag logic:
  - `onDown`: if `drawing.current`, raycast (`raycaster.setFromCamera` +
    `raycaster.intersectObject(ctx.current.whiteboard, false)`, reusing the
    same `raycaster`/`camera` already in this closure) and if it hits,
    start a stroke — call `ctx.current.whiteboardDraw?.(hit.uv.x,
    hit.uv.y, true)` and fire a new `onDrawStart?.()` callback prop once
    (see below), else do nothing (don't fall through to camera drag).
  - `onMovePointer`: same raycast, `whiteboardDraw?.(u, v, false)` per
    move, instead of the `yaw.current -=`/`pitch.current =` lines.
  - `onUp`: no tap/floor-walk logic while drawing — just end the stroke.
- Thread a new `onDrawStart?: () => void` prop through
  `ExploreScene`/`Player` (called once, first stroke) so
  `pages/Explore.tsx` can flip a `hasDrawing` state and enable the Send
  button (skip sending a blank board).
- Whiteboard tap-to-select: register the board's plane mesh directly into
  `ctx.current.registry` with id `"whiteboard"` (same `registry.set`
  idiom `Interactable` uses at `ExploreScene.tsx:201-230`, just inlined in
  `Whiteboard()` rather than routed through `exploreItems.ts`/`Exhibit` —
  the whiteboard is a bespoke prop like `Lamp`/`WallClock`, not a
  data-driven exhibit, so it deliberately skips that generic per-item
  render loop). This makes the existing `handleTap` → `onSelect(id)` path
  "just work" for tapping the board with no changes to `handleTap` itself.
- A `getDrawingDataUrl: (() => string | null) | null` ref on `PlayerHandle`
  too, reading `(ctx.current.whiteboard as THREE.Mesh).material.map.image
  as HTMLCanvasElement).toDataURL("image/png")` — this is how
  `pages/Explore.tsx` pulls the PNG out for the Send request.

### 3. `pages/Explore.tsx` — trigger + toolbar UI

- `handleSelect`: add `if (id === "whiteboard") { walking.current = false;
  handle.standAtBoard.current?.(() => setDrawingOpen(true)); return; }`
  ahead of the generic `exploreItems.find` fallback — deliberately not
  routed through `exploreItems.ts` (no entry needed there; see above).
- New state: `drawingOpen`, `hasDrawing`, `sendStatus: "idle" | "sending" |
  "sent" | "error"`.
- New floating toolbar (styled like the existing `overlayButton`s), shown
  only while `drawingOpen`: **Clear** (`handle.clearBoard` — wire this ref
  too, calling `ctx.current.whiteboardClear`), **Send** (disabled until
  `hasDrawing`; calls `getDrawingDataUrl()` → `fetch("/api/send-whiteboard",
  { method: "POST", body: JSON.stringify({ image }) })`, tracks
  `sendStatus`), **Done** (`handle.leaveBoard.current?.()`, then
  `setDrawingOpen(false)`, reset `hasDrawing`/`sendStatus`). Unlike the
  photo overlay this doesn't need a fade cover — the camera pan itself is
  the transition, matching how `recentre` already works with no fade.
- Gate the existing top overlay / hint / hold-to-walk button on
  `!drawingOpen` too (same treatment as the `photosOpen` gating already
  added).

## Verification

- `vercel dev` (not `npm run dev` — see prerequisites) with
  `RESEND_API_KEY` set in `.env.local`.
- Walk up to the whiteboard, tap it, confirm the camera pans in and locks
  (WASD/drag-look should do nothing while docked).
- Draw a stroke, confirm it renders on the board texture in real time, on
  both mouse and a touch-emulated device.
- Clear, confirm the board wipes back to the base heading/bullets/stats
  content (not fully blank — that content is still painted underneath).
- Send with an empty board: button should be disabled/no-op. Send after
  drawing: confirm an email arrives with the PNG attached, and the UI shows
  a sent/error state appropriately.
- Done: confirm the camera pans back to exactly where the player was
  standing before, and free-roam control resumes normally.
- Confirm `/api/send-whiteboard` isn't swallowed by `vercel.json`'s
  catch-all SPA rewrite once deployed (Vercel's function routing takes
  priority over rewrites by default, but worth a real check post-deploy).
