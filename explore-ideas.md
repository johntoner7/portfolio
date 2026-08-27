# Explore room — idea backlog

Captured 2026-08-21. Not yet implemented — just tracking so nothing gets lost.

## Quick fixes

- [x] **Bookshelf is bunched up** — redistributed the 4 book stacks across
      both units, moved the football down one shelf (index 2 → 1). Top
      shelves left blank (tried a procedural trophy + folder stack, removed
      per feedback).
- [x] **Desk chair** nudged left (~0.12m).
- [x] **Plant corner clipping** — pulled the corner plant in from
      `(2.5, 2.6)` to `(2.3, 2.35)`, giving its measured canopy footprint
      (~1.06m × 1.11m) clear margin from both walls.
- [x] **Clock lag** — was flooring to whole seconds (`getSeconds()`), which
      always displays up to ~1s in the past. Switched to sub-second
      precision (`getSeconds() + getMilliseconds()/1000`) for a continuous,
      always-current sweep.

## Answered (no code change needed)

- **"What's the black cylinder on the desk?"** — it's the pen
  (`ExploreScene.tsx` around line 625), a small dark grey/black
  `cylinderGeometry` lying flat next to the mug. If it should look more
  obviously pen-like (clip, taper, etc.) that's a follow-up, but it's
  intentional, not a stray leftover.

## Bigger features

- [x] **Photo board interaction** — clicking the pinboard hands off to the
      existing `/photos` gallery with a fade, rather than showing a lesser
      copy of it inside the room. Routed by an `opensPhotos` flag on the
      item (same pattern as the laptop's `exitsToSite`). The camera already
      walks up to the object on click, so the fade runs over that approach
      and the navigation lands at 820ms, once the cover is opaque. The
      transition cover now picks its look by destination: the laptop keeps
      its screen-glow, the gallery gets a plain dissolve into that page's
      own background so the scrapbook fades up instead of arriving after a
      flash.
      Photo selection also now sorts by `dateTaken` rather than file order,
      and the six pinned prints take one per trip before doubling up —
      straight recency put four shots from a single afternoon on the board.

      (First attempt built a bespoke in-room masonry viewer; scrapped, since
      the real gallery already has a scrapbook view, a 3D gallery wall and a
      lightbox that it would only have duplicated worse.)
- [x] **Whiteboard: draw + email your message** — built, per
      `plan-whiteboard-drawing.md`. Tapping the board docks the camera
      square-on to it (the laptop's cinematic, with `release: true` since the
      room keeps running afterwards) and the pointer becomes a marker; a
      toolbar offers Clear / Send / Done. Sending POSTs the canvas PNG to a
      new `api/send-whiteboard.ts`, which mails it on via Resend — the
      repo's first backend endpoint. Opt-in as specified: nothing leaves the
      browser until Send is pressed.
      One departure from the plan: the docking distance is solved per camera
      from its fov/aspect rather than hardcoded, because a portrait phone's
      frustum has to stand ~3m back to fit the 2.06m board that a desktop
      fits at ~1.1m.
      Clear wipes to bare board, taking the printed heading/bullets/stats
      with it — the plan's Changes section said this, its Verification
      section contradicted it by expecting the printed content to survive.
      Went with a genuinely blank surface so visitors aren't drawing around
      his notes; the notes return with the texture on a theme change.
      Also fixed a latent bug the gating exposed: the top
      overlay's buttons hardcoded `pointerEvents: "auto"`, so they stayed
      clickable while faded out (already true for the photos overlay).
      Two `vercel dev` gotchas found while testing, both pre-existing rather
      than caused by this feature — they only surfaced because this is the
      first time the repo has been run under `vercel dev` at all:
      - `vercel.json`'s catch-all rewrite swallowed Vite's own dev URLs
        (`/@vite/client`, `/src/main.tsx`, the whole module graph), handing
        the browser `index.html` with `content-type: text/html` instead of
        JavaScript, so the app never booted. In production the filesystem is
        checked before rewrites so real assets win; under `vercel dev` the
        "filesystem" is the proxied Vite server, so the rewrite got there
        first. Source is now `/((?!api/|@|.*\.).*)` — verified that modules
        serve as `text/javascript` while `/`, `/explore` and `/photos` still
        fall back to HTML. (`vercel.json` rejects unknown keys, so that
        reasoning can't live in the file as a `_comment`.)
      - `vercel dev` injects *no* project env vars into functions — not
        RESEND, not the existing CLOUDINARY ones. It doesn't read
        `.env.local` (Vite does, which is why the client-side `VITE_` vars
        have always worked), and dropping a `.vercel/.env.development.local`
        didn't help either. What works is exporting into the CLI's own
        process, which the function inherits — hence the `dev:api` script.
      Endpoint verified end to end against a dummy key: valid PNG reaches
      Resend (502 on the dummy, as expected), bad prefix and missing body
      both 400, GET 405.
      **The 3D side is still unverified interactively** — no browser
      automation was available, so the drawing feel (stroke tracking, the
      docking framing on a real phone) still needs a human pass, as does a
      real send with a live key.
- [x] **Whiteboard tools** — pen colours (4), three nib widths, an eraser,
      and draggable sticky notes, plus Download and an optional name/note
      with the email.
      The notes forced the board's structure to change: it now composites
      three layers into the texture canvas each change — `printed` (the
      board as it ships, captured before anyone draws), `ink` (freehand
      strokes), and notes as live objects on top. Painting strokes straight
      onto the visible canvas was cheaper, but a note could never then be
      picked back up without taking the ink under it too.
      Two behaviour calls worth knowing:
      - The eraser lays down opaque board colour rather than clearing to
        transparent, so it takes off the printed heading/bullets as well as
        the visitor's own ink. Rubbing a board takes off whatever is under
        it; Clear is still there for wiping the lot.
      - Notes sit above the ink and so can't be rubbed out. There are two
        ways to remove one: press it with the eraser (on press only, so a
        stroke passing over a note doesn't sweep it away), or use the bin
        button in the note editor. The editor button is the discoverable
        one — the eraser route is invisible while you're mid-edit.
      Notes carry text: tapping one (or dropping a new one) selects it and
      opens a small field above the tool rail, and typing renders straight
      onto the note, wrapped and vertically centred. The selected note gets
      a dashed ring, which `whiteboardImage` hides for the duration of the
      capture so it never reaches the email or the download.
      The field's 60-character cap is `NOTE_MAX_CHARS`, matched to the five
      lines the note actually shows — the first cut allowed 120, which the
      note silently clipped in half. The wrap breaks unbroken words rather
      than overflowing; verified it terminates on pathological input (a
      120-char single word, empty strings, bare newlines) rather than
      hanging the render thread.
      Palettes live in a new `boardTools.ts` rather than `ExploreScene.tsx`:
      the toolbar needs them as *values*, and importing values from
      `ExploreScene` would have collapsed its lazy chunk and pulled three.js
      into the main bundle. Verified the split held (ExploreScene still its
      own 944KB chunk; main bundle +6KB).
      Send now opens a small form (optional name + note) so the drawing
      still only leaves the browser on a second, deliberate press. The
      endpoint escapes both fields into the HTML, collapses whitespace in
      the name since it also goes in the subject, and caps them at 80/600.
      Verified by bundling the real handler against a stubbed Resend:
      `<script>` and quotes escape correctly, newlines in the name collapse,
      overlong input truncates, non-string fields drop, and GET/bad-prefix/
      missing-body still give 405/400/400.
- [x] **Real door asset** — `door.glb` swapped in for the procedural door.
      Separate Door / DoorFrame / DoorHandle nodes on flat Wood / Metal /
      Glass materials, so it recolours with the room like the other imports.
      Raw it is 3.08m tall; scaled to a 2.06 opening (the height the
      hand-built door already used). `DOOR.width` is now derived from the
      real frame width rather than hardcoded, so the break in the skirting
      tracks the asset — verified 0.05 clear on each side.
      The asset puts its handle 40% up the door, which scaled down to 0.81m
      and read low, so the handle node is lifted on its own to 1.0m. Revert
      that line if the asset's own proportions are preferred.
      **Attribution outstanding** — source unknown, `models.ts` carries a
      TODO and `MODEL_CREDITS`/`CREDITS.md` are untouched.
- [x] **Detail panels** — desktop is now a full-height side rail
      (min(520px, 38vw), top-to-bottom) instead of a 420x70vh corner card,
      and it slides in from the right. Mobile stays a bottom sheet, now with
      a grabber. Added: sticky header (title/close no longer scroll away),
      per-object accent hairline + soft gradient, section headings with
      hairline rules, chevron affordance on expandable chips, grouped skill
      chips for About (Languages / Frameworks / Infrastructure) with the
      expanded note appearing under its own group, primary vs secondary link
      styling, and the content is retained during the slide-out so it no
      longer blanks mid-animation. The walk button now only hides when the
      panel is actually a sheet covering it.
- [x] **Ceiling light** — replaced the procedural pendant with a real asset,
      Poly Pizza's "Light Ceiling Single" (Quaternius, CC0). Kept the same
      sway animation and flicker; the bulb material is found by name and
      driven emissive the same way the desk lamp's bulb already is.
- [x] **Fairy lights** — added Poly Pizza's "Holiday lights" strand (Poly by
      Google, CC-BY 3.0), strung upright along the left wall above the
      bookshelf. The model ships lying flat with a meandering wire; standing
      that plane upright turns its own meander into a two-swag droop, so the
      sag is real geometry rather than faked. Only the coloured `Cylinder`
      bulbs glow (the wire and end caps are near-black and were being lit by
      mistake at first). Twinkles in dark mode, subtle in light, static under
      reduced-motion. Attribution added to the Credits modal + CREDITS.md.
- [x] **Window view** — built, per `plan-outside-view.md`. The back wall is
      now four strips framing a real opening (same "skip a gap" trick the
      skirting uses for the door, on two axes), the glass dropped from
      opacity 0.9 to 0.14, and `OutsideView` puts a street beyond it: road
      tiles, two parked cars, a street light whose bulb burns after dark,
      mountains and drifting clouds under a sky dome.
      Two corrections to the plan: the road tiles are *already* flat
      (8 x 0.12 x 8), so the specified -90° x-rotation would have stood them
      on end; and the room's fog (5..16) is tuned for a 7m interior and
      erased anything past ~12m outside, so the far scenery is taken out of
      the fog and hazed by hand instead, while the near street stays fogged
      so it still ties into the room.
      **Attribution outstanding** for all 7 files, per the plan's decision to
      defer it — `models.ts` carries the TODO.

- [x] **Light switch** — a wall switch beside the door works the room's
      lights, i.e. the site's light/dark theme. It sets the `light` class on
      `documentElement` and writes `localStorage.theme`, the same two lines
      the nav's toggle uses, so `useThemeMode`'s MutationObserver picks it
      up and the choice carries across pages.
      Placed at x -1.75, left of the frame: the door spans -1.43..-0.37 and
      the contact post sits at 0.15, so the clear wall is on that side. The
      rocker damps toward its angle rather than snapping (up for light, down
      for dark), holds still under reduced-motion, and carries a little
      emissive in the dark so it can be found at all.
      **Fixed a latent bug this made easy to hit:** the whiteboard texture
      was keyed on `themes[].paper`, so any theme change rebuilt it on a
      fresh canvas and threw away whatever had been drawn. Previously that
      needed an OS-level theme switch mid-draw; a switch on the wall makes
      it a two-second accident. The board now uses its own constant
      `BOARD_PAPER` — a real whiteboard doesn't change colour when the
      lights go on, the lighting does that, and the material already
      responds to it — so the texture is built once and drawings survive.

- [x] **Mobile pass on the whiteboard + drag-to-look text selection**
      - Dragging a finger to look around was starting a text selection and
        popping the callout menu. `user-select: none` on the room container
        and the canvas, plus `-webkit-touch-callout: none`; the text fields
        opt back in with `user-select: text`, since a container-level `none`
        stops you selecting inside an input on some browsers.
      - The send form was absolutely positioned at a fixed `bottom: 150px`,
        measured against the desktop toolbar. On a phone the rails wrap to
        more rows and it overlapped them. Everything is now one flow column
        (send form, note editor, tools, actions), so a wrapping row pushes
        the rest up instead.
      - The on-screen keyboard does not move a fixed container, so the note
        field opened underneath it. The toolbar now lifts by the height
        `visualViewport` reports as covered; without that API the inset
        stays 0 and nothing changes.
      - Touch targets go to 44px on mobile (chips, colour dots, buttons),
        and action labels drop to icons so the row stays on one line.
      - A tool group the current mode can't use is dropped on mobile rather
        than dimmed — the rail is the scarcest space on a phone. Desktop
        keeps it dimmed, where a steady width is worth more than the room.
- [x] **Landscape framing + rotate prompt** — a 2.06 x 1.11 board is
      width-bound in portrait, so it can only ever be ~25% of a tall screen.
      Turned sideways it becomes height-bound and fills ~94% of the area
      not covered by controls. So: nudge people to turn the phone, and make
      turning it actually pay.
      - `whiteboardViewpoint` now takes a `reserved` fraction — how much of
        the viewport the toolbar covers — and frames the board inside what
        is left rather than the whole screen. The camera is dropped below
        the board's centre by half that band, which lifts the board clear
        of the controls *without* tilting: a pitched camera would keystone
        it, a lowered one keeps the plane parallel and the corners square.
      - The pose is re-solved every frame while docked instead of being
        held at whatever the docking shot left, so turning the phone
        re-frames live. That is the whole point of the prompt.
      - A rotate hint appears on a portrait touch device while docked,
        dismissible. iOS Safari cannot be told to rotate, so it is a nudge;
        drawing still works in portrait.
      **Correction to an earlier note in this file:** landscape was never
      76% — that figure assumed fov 72, but `useIsMobile` is a *width* test
      (640px), so a phone on its side reads as desktop and gets fov 65. It
      was actually ~85%, with the toolbar sitting on top of its bottom
      fifth. It is now 76% of the full viewport but entirely clear of the
      controls, which is the honest maximum while the controls exist.
      Touch sizing and the toolbar layout no longer key off `useIsMobile`
      for the same reason: sizing follows `(pointer: coarse)` and the
      layout follows `(max-height: 539px)`, which is what actually catches
      a phone on its side. Short viewports get one icon-only row (~14
      controls, ~690px, fits an 844px landscape phone) rather than two
      stacked rails, since every extra row comes straight off the board.

## Notes

- Keep using the "measure real bounds before placing" workflow for any new
  imported asset (door, ceiling light, etc.) — parse glTF node/accessor data
  first rather than eyeballing scale/position.
- Clipping fixes should keep following the established principle: coplanar
  surfaces z-fight, overlapping volumes are safe.

---

# Round two — new ideas (captured 2026-08-27)

None of these are built yet. Written up with enough grounding (real
coordinates, real assets, the endpoints that exist) that any of them can be
picked up without re-deriving the room.

## From the brief

### Vinyl player — sleeve shows the real top album

A turntable on a low unit, with the sleeve propped against it showing
whatever the actual top album of the month is. Clicking it opens a normal
detail panel (artist / album / plays), so it slots into the existing
`ExploreItem` shape with a new `form: "vinyl"`.

The data is the interesting part, and it's the same trick the rest of the
portfolio plays — the room shows *live* facts about its owner rather than a
static dressing.

- Spotify's Web API has no "top albums" endpoint. What exists is
  `/me/top/tracks?time_range=short_term` (≈4 weeks), so the album is derived:
  group the top 50 tracks by `track.album.id`, sum, take the winner. Good
  enough and honest — call it "most played this month".
- Auth is the cost. `/me/top/*` needs a user token, not client credentials,
  so it's a one-time manual OAuth to get a refresh token, stored as a Vercel
  env var, and a serverless function that swaps refresh → access on each
  call. That's `api/spotify-top.ts`, the second backend endpoint after
  `api/send-whiteboard.ts`. Cache hard (the answer changes weekly, not
  per-visitor) — `s-maxage=21600, stale-while-revalidate` on the response.
- Note the `vercel dev` env-var trap already documented above: functions get
  nothing injected locally, so the `dev:api` export pattern applies here too.
- Album art is a remote Spotify CDN URL. Texturing it onto the sleeve means
  a cross-origin image load in three.js — fine (`crossOrigin = "anonymous"`,
  their CDN sends permissive CORS), but it must not block the room: render a
  plain-colour sleeve immediately and swap the texture in when it resolves.
- **Fallback matters.** Token expiry / rate limit / API outage must degrade
  to a hand-set "desert island" record baked into the repo, never to an
  empty sleeve or a console error.
- Cheaper variant if the OAuth dance isn't worth it: a `topAlbum` field in
  `lib/data`, updated by hand or by a monthly GitHub Action that runs a
  script and commits the JSON. Same visible result, no runtime auth.
- Nice extra once it exists: the record on the platter spins slowly (respect
  `prefers-reduced-motion`, same guard the fairy lights use), and clicking
  the tonearm is what opens the panel.

### Games console — a real playable minigame

A small console + CRT (or the console plugged into the existing screen), and
clicking it hands the visitor an actual game.

Structurally this is the whiteboard again, so most of the hard work is
already done and proven: dock the camera square-on to the screen with the
laptop cinematic and `release: true`, take over the pointer, show a small
toolbar (Restart / Done), and draw into a canvas that's mapped as a texture
onto the screen mesh. `Whiteboard` in `ExploreScene.tsx` is the template —
including the per-camera docking distance solved from fov/aspect, which
matters just as much here because a phone has to stand further back.

Which game, in order of how well it earns its place:

1. **Keepy-uppy with the football** — directly ties to *Unmarked*, the
   football project already on the shelf. One-button, works identically on
   touch and mouse, ~50 lines of canvas, and a high score that can live in
   `localStorage`. Best effort-to-payoff ratio.
2. **Snake / Pong** — instantly legible, but says nothing about him. Fine as
   a joke, weaker as a portfolio beat.
3. Anything with real 3D physics in-room — expensive, and the room already
   carries a lot of draw calls.

The screen should show an attract-mode loop when idle so the object reads as
"playable" before it's clicked, the way the click-hint arrow does elsewhere.

### Couch under the whiteboard — built, then removed

Built and then taken back out at the same sitting, so the room is unchanged
from before it. Written up because the measurements are the reusable part.

The asset is still on disk as `public/models/couch-large.glb` (renamed from
the `cough-large.glb` typo), untracked and no longer referenced by
`models.ts` — delete it if the idea is dead, keep it if this is a pause.

What was learned, if it's ever picked back up:

- **Scale.** Anchoring on seat height rather than width is the honest way to
  size it: the seat tops out at 0.949 raw, and 0.42m is what you can actually
  sit on, which lands a literal three-seater at 2.30 x 0.84 x 0.89. That
  looked small in a 6.4 x 6.8m room; 1.5x from there (3.45 wide) looked
  oversized in the other direction, with the seat at 0.60 and the back at
  1.33. Somewhere around 3.0 is probably the answer.
- **The front-right corner is the plant's, not the couch's.** The plant's
  canopy (1.06 x 1.11) overlapped the far arm by about 0.5m, and at 0.8m tall
  it is shorter than the couch back, so it grows *through* the couch rather
  than over it. Any couch on that wall needs the plant moved — the matching
  front-left corner works, clear of the door and of the framed charts.
- **`PROP_OBSTACLES` is real** — the player is pushed out of circles around
  the desk, the shelf and the plant, so the room is not collision-free. A
  couch is a box and needs a row of circles, and the spacing that matters is
  the one that keeps them overlapping *at the front edge*, not at their
  centres: otherwise someone walks into the gap between two and stands in the
  cushions.
- **Flush against the skirting z-fights.** That run is 0.1 deep centred on
  `ROOM_X - 0.06`, so its face is at 3.09; parking a back panel exactly there
  makes two coplanar faces. Sink it in by a few centimetres instead.
- **The whiteboard's pen tray is the vertical constraint**, at y 1.31 over
  x 3.00-3.12 — but the asset insets its tall section from its own back
  panel, so even a 1.33m backrest passes under it. Worth checking per-vertex
  rather than by bounding box.
- **The drawing pose is the tightest clearance.** On a wide desktop the
  docking distance clamps at 1.0m, putting the camera about 2.09 on x; a
  couch whose front edge passes that will clip the near plane.
- **Centring is a real trade.** Central on the wall (z 0) and centred under
  the whiteboard (z 1.15) are different places, and the corkboard's near edge
  at z -1.09 is what stops a wide couch reaching the wall's actual centre.

`double-bed.glb` was left alone throughout, per the reasoning above.

## In a similar vein — suggestions

Sorted by payoff per unit of work. The common thread with the vinyl idea is
what makes it good: **the room should know real things about its owner**.
That's the same argument the portfolio itself makes, so anything live beats
anything decorative.

### 1. Live weather + real local time through the window — BUILT

Open-Meteo (no key, CORS `*`, cached an hour in `sessionStorage`), Belfast at
54.5973/-5.9301. Pure helpers in `utils/weather.ts`, the fetch in
`hooks/useBelfastWeather.ts`, and a `WeatherCtx` inside `ExploreScene`.

- `timeformat=unixtime` is load-bearing: the default returns local ISO
  strings, which `new Date()` would read in the *viewer's* timezone rather
  than Belfast's. Confirmed against the live API that the timestamps are
  true UTC with no `utc_offset` quirk.
- Daylight is a smooth 0..1 ramp across a 45-minute twilight centred on the
  real sunrise/sunset, not an `is_day` flip, so the street light fades up
  through dusk instead of snapping. `is_day` is kept as a coarse fallback if
  the daily block is missing.
- Rain shows only when Belfast is actually wet; density follows mm/h with a
  visible floor, since 0.1mm of drizzle should still register.
- New `Clouds` bank thickens with real cover (more puffs, more opaque), and
  overcast takes 30% off the window's key light and some life out of the
  grass.

**The exterior no longer follows the theme toggle** — that is the point of
the idea, but it does mean a light-themed room can look out on a dark
Belfast night, and vice versa. Reverting is a one-line change to `daylight`
in `OutsideView`.

`weather === null` (loading, offline, blocked, malformed) falls back to the
old theme-driven look, and this was checked numerically rather than by eye:
dark → sky `#080c15`, light → `#6ea8e0`, lamp 1.4/0, drizzle opacity 0.384
vs the old fixed 0.38 — i.e. the previous behaviour exactly. Parser verified
against the live payload and against junk (`{}`, `null`, `{current:{}}` all
return null); daylight ramp verified monotonic with 0.5 landing exactly on
sunrise and sunset.

**Not verified interactively** — the cloud bank's density and the dusk sky
are the parts most likely to need tuning by eye.

Original idea, for reference:

The best value on this list, because `OutsideView` already exists and
already has a day/night mode with a street light that burns after dark.
Point it at a real forecast for Belfast (open-meteo, no API key, one fetch,
cache for an hour) and:

- rain streaks the glass and the clouds thicken when it's actually raining,
- the sky dome tint and the street light follow the *real* local time rather
  than the theme toggle,
- overcast damps the room's own light budget slightly.

No new assets, no auth, and it makes the room feel like a window rather than
a picture. Degrade to the current fixed look on any fetch failure.

### 2. Live GitHub contribution wall

A third framed piece on the left wall (the two charts hang at
`z = 1.3` and `z = -2.05`, so there's honest wall left), rendered from the
real contribution graph. It's a data visualisation about the person, hung
next to his data visualisations about rivers and emissions — thematically it
belongs more than a console does. GitHub's GraphQL API gives
`contributionsCollection`; token-gated, so same serverless + cache pattern
as the vinyl endpoint. Cheap once one of those exists.

### 3. "Currently reading" on the bookshelf

The shelf already holds four book stacks. Make one spine real: current book,
title textured on, clicking opens a panel with what he's reading and a line
about why. Data can be a single hand-edited field in `lib/data` — no API
needed, near-zero cost, and it's another small human fact. Pairs naturally
with the vinyl (music + reading = the "what he's into right now" corner).

### 4. Room ambience toggle

A single speaker or radio object that toggles a quiet ambient bed — rain on
the window (tied to idea 1), distant traffic from the street outside, faint
keyboard clatter. Audio must be strictly opt-in and off by default, with an
obvious state on the object itself. Sound is the one sense the room doesn't
use at all, and a well-judged loop does more for presence than another prop.
Risk: badly done, it's the single most annoying thing a portfolio can do —
so default off, one click to stop, and remember the choice.

### 5. Bin + paper-ball basketball

A waste bin by the desk that accepts a crumpled sheet from the worksheets
stack, flick-to-throw, keeps a streak. It's the console idea's payoff at a
fraction of its cost — no new screen, no attract mode, no docking cinematic,
and it uses props the room already has. Worth considering as the *instead
of* rather than the *as well as* if only one playful thing ships.

### 6. Something alive

A cat that picks a sunny spot and moves between three or four resting places
over a few minutes; or a mug of tea whose steam stops after a while. Small
signals that time is passing in the room. Purely atmospheric — no data, no
interaction — but it's what stops the space reading as a diorama.

## Things deliberately not suggested

- **A TV playing a showreel** — it's the console's screen budget spent on
  something passive, and the laptop already exits to the real site.
- **A second desk / more furniture for its own sake** — the room is
  6.4 × 6.8m and already dense along three walls. Floor space is the scarce
  resource; the couch spends most of what's left.
- **A mirror** — a real reflection is another render pass, and a fake one
  looks worse than no mirror.
