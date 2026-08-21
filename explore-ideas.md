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
- [ ] **Whiteboard: draw + email your message** — let visitors wipe the
      board and draw/write their own message, with a "Save" button that
      captures a screenshot and emails it (e.g. via Resend, already used for
      the Pen2Paper contact form) so there's no infra to host/store drawings.
      Must be explicit opt-in — only sent on Save, never automatically.
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

## Notes

- Keep using the "measure real bounds before placing" workflow for any new
  imported asset (door, ceiling light, etc.) — parse glTF node/accessor data
  first rather than eyeballing scale/position.
- Clipping fixes should keep following the established principle: coplanar
  surfaces z-fight, overlapping volumes are safe.
