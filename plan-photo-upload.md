# Plan — upload photos through the site (passkey-gated)

Goal: replace `npm run add-photo …` + manual `data/photos.json` edits with a hidden page on the
live site where I pick a file, type a group and caption, hit upload, and the photo shows up on
`/photos` with the same metadata the CLI script produces today.

---

## 1. What exists today (constraints)

| Thing | Current state | Implication |
|---|---|---|
| App | Vite SPA, no server (`vite.config.ts`, `vercel.json` rewrites everything to `index.html`) | Need to add serverless functions — Vercel serves `/api/*.ts` alongside a static Vite build with no framework change |
| Photo data | `data/photos.json`, imported **at build time** by `hooks/usePhotos.ts` | A new photo only appears after a rebuild, unless we change how the data is loaded |
| Upload logic | `scripts/add-photo.mjs` + `scripts/lib/photo-metadata.mjs` | The EXIF/geocode/normalisation logic is already written and tested — reuse it, don't rewrite it |
| Secrets | `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` are local-only (`.env.local`, gitignored); `next-steps.md` explicitly says never put them in Vercel | This changes — the server side now needs them. They stay server-side only (no `VITE_` prefix, so Vite never bundles them) |
| Deploy | Vercel, auto-deploys on push to `main` | Gives us a free "publish" step if we persist via git |

---

## 2. Recommended architecture

**Browser → Cloudinary (direct, signed) → `/api/photos` → GitHub commit → Vercel redeploy.**

```
┌──────────────┐  1. POST /api/upload-signature  ┌─────────────────┐
│  /photos/add │ ───────────────────────────────▶│  Vercel func    │
│   (React)    │ ◀─── signature + timestamp ─────│  (checks passkey)│
└──────┬───────┘                                 └─────────────────┘
       │ 2. POST file directly to Cloudinary (bypasses Vercel body limit)
       ▼
┌──────────────┐
│  Cloudinary  │ ── returns public_id + image_metadata (EXIF) ──┐
└──────────────┘                                                │
       ┌────────────────────────────────────────────────────────┘
       ▼ 3. POST /api/photos { publicId, group, caption, year? }
┌─────────────────┐  builds metadata (EXIF + reverse geocode)
│  Vercel func    │  appends entry, commits data/photos.json via GitHub API
└────────┬────────┘
         ▼ 4. push to main → Vercel redeploys → photo live in ~60s
```

### Why direct-to-Cloudinary rather than posting the file to our own function
Vercel serverless functions cap the request body at **4.5 MB**. iPhone HEIC/JPEG shots regularly
exceed that. A signed direct upload sends the bytes straight to Cloudinary, so file size stops
being our problem, and the API secret never leaves the server (only a one-shot signature does).

### Why commit to git rather than a database
- `data/photos.json` stays the single source of truth — the CLI scripts keep working unchanged.
- Full history/undo for free (`git revert` a bad upload).
- No new service, no new bill, no runtime fetch on the photos page (it stays a static import,
  so `/photos` keeps its current load performance).
- Cost: ~60s of redeploy before the photo is visible. Acceptable for a personal portfolio.

Alternatives, if the redeploy delay ever annoys me — see §8.

---

## 3. Auth: the passkey

Deliberately simple. This is a one-user gate on a personal site, not a login system.

- New env var `PHOTO_UPLOAD_KEY` (server-side only) — a long random string.
- The upload page has a single password field. The key is sent as an `x-upload-key` header on
  every API call and cached in `sessionStorage` so I only type it once per session.
- Both functions call a shared `assertAuthorised(req)` helper that compares with
  `crypto.timingSafeEqual` and returns `401` on mismatch.
- Rate limit: reject more than N requests per minute from one IP (in-memory counter is fine —
  it's a speed bump, not a wall).
- The `/photos/add` route is unlinked from the nav. Add `noindex` on it.

Note: "passkey" here means a shared secret, not WebAuthn. If I want real passkeys (Touch ID)
later that's a separate, much larger piece of work — not worth it for this.

---

## 4. Files to add / change

### New — server
| File | Job |
|---|---|
| `api/_lib/auth.ts` | `assertAuthorised(req)` — timing-safe passkey check + rate limit |
| `api/_lib/photo-metadata.ts` | Port of `scripts/lib/photo-metadata.mjs` minus the `loadEnv`/fs parts (see §5) |
| `api/_lib/github.ts` | Read `data/photos.json` via GitHub contents API, append entry, commit with sha (retry once on 409 conflict) |
| `api/upload-signature.ts` | Auth → return `{ timestamp, signature, apiKey, cloudName, folder }` for a signed upload with `image_metadata: true` |
| `api/photos.ts` | Auth → fetch the Cloudinary resource, `buildMetadata()`, assign next id, commit to git, return the entry |

### New — client
| File | Job |
|---|---|
| `pages/PhotoUpload.tsx` | The form: passkey field, file input (multi-select), group (datalist of existing groups), caption per file, optional year override, "skip geocoding" checkbox, submit, per-file status |
| Route in `src/App.tsx` | `/photos/add` → `PhotoUpload` |

### Changed
| File | Change |
|---|---|
| `package.json` | Move `cloudinary` from `devDependencies` → `dependencies` (functions need it at runtime); add `@vercel/node` types |
| `vercel.json` | Make the catch-all rewrite exclude `/api/*` — currently `"/(.*)"` swallows everything |
| `.env.local` | Add `PHOTO_UPLOAD_KEY`, `GITHUB_TOKEN`, `GITHUB_REPO=johntoner7/portfolio` |
| `next-steps.md` | Document the new flow next to the CLI one |

### Vercel env vars to set
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `PHOTO_UPLOAD_KEY`, `GITHUB_TOKEN`
(fine-grained PAT, contents:write on this repo only), `GITHUB_REPO`, `GITHUB_BRANCH=main`.
`VITE_CLOUDINARY_CLOUD_NAME` is already there.

---

## 5. Sharing the metadata logic

`scripts/lib/photo-metadata.mjs` holds everything that makes the entries good — EXIF date/time
parsing, GPS DMS→decimal, Nominatim reverse geocoding, and the `normaliseLocation` city/country
maps (Belfast→Ireland, València→Valencia, etc.). That must not fork.

Approach: move the pure functions into `api/_lib/photo-metadata.ts` (typed), and have
`scripts/lib/photo-metadata.mjs` re-export from it, keeping only `loadEnv` (Node/fs-specific) in
the scripts copy. The three CLI scripts keep working untouched.

One caveat: `reverseGeocode` sleeps 1.1s per call to respect Nominatim's rate limit. Fine for a
serverless function handling one photo; for a batch of 10 it's ~11s, still under Vercel's default
timeout, but worth making the sleep conditional on there being another lookup queued.

---

## 6. The entry that gets written

Identical shape to today's — `hooks/usePhotos.ts`'s `Photo` interface is the contract:

```json
{
  "id": "057",
  "cloudinaryId": "travel/img-1301",
  "year": 2026,
  "group": "Alicante",
  "caption": "Santa Bárbara",
  "metadata": {
    "dateTaken": "2026-06-23",
    "timeTaken": "18:32:00",
    "location": "Alicante, Spain",
    "camera": "iPhone 15 Pro",
    "tags": []
  }
}
```

- `id` — next sequential, zero-padded, computed server-side from the file just read from GitHub.
  Do **not** compute it client-side: ids seed the polaroid layout randomisation, so collisions
  matter.
- `year` — from EXIF date, overridable in the form.
- `cloudinaryId` — `travel/<slugified-filename>`, same rule as `add-photo.mjs`. Upload with
  `overwrite: false` so re-uploading the same filename fails loudly instead of silently replacing.

---

## 7. Build order

1. **Plumbing first** — `vercel.json` rewrite fix + a trivial `api/ping.ts`, deploy, confirm
   functions actually run on this static-Vite setup. Everything else depends on this.
2. **`api/_lib/photo-metadata.ts`** — extract from the `.mjs`, re-point the scripts, run
   `npm run add-photo` on a test file to prove the CLI path still works.
3. **`api/upload-signature.ts` + auth helper** — verify a signed upload works from a curl/Node
   test before touching React.
4. **`api/photos.ts`** — GitHub commit path. Test against a scratch branch first
   (`GITHUB_BRANCH=upload-test`) so a bug can't corrupt `main`'s `photos.json`.
5. **`pages/PhotoUpload.tsx`** — the form. Single file at first, multi-file after it works.
6. **Polish** — per-file progress, error surfacing, "uploaded, live in ~1 min" message with a
   link to the commit, `noindex`.
7. **Docs** — update `next-steps.md`.

---

## 8. Things that could bite, and the answer

| Risk | Mitigation |
|---|---|
| Concurrent commits → 409 on the GitHub contents API | Re-read sha and retry once. Single user, so in practice never hits |
| A malformed entry breaks the build and takes `/photos` down | Validate against the `Photo` shape server-side before committing; the entry is machine-generated so the surface is small |
| Passkey leaks (typed on a shared machine, sniffed) | Worst case: someone uploads junk photos. `git revert` + rotate the env var. No destructive endpoint exists — the API only ever appends |
| Vercel function timeout on a big batch | Cap the form at ~10 files; the browser uploads to Cloudinary in parallel and calls `/api/photos` sequentially |
| HEIC files from iPhone | Cloudinary converts on delivery, but EXIF handling differs — test one explicitly |
| Cost of moving secrets to Vercel | Contradicts `next-steps.md`'s current advice; that line gets updated. The key/secret are never `VITE_`-prefixed, so they can't reach the client bundle |

### If the ~60s redeploy delay becomes annoying
Swap the persistence layer only — the UI and upload path stay the same:
- **Cloudinary as the store** — write `group`/`caption` into Cloudinary `context` metadata and have
  `usePhotos` fetch a generated list JSON at runtime. No git, instant. Costs a runtime fetch on
  `/photos` and loses git history.
- **Vercel Blob / KV** — store `photos.json` there, function writes, page fetches. Instant, but a
  second source of truth to keep in sync with the repo copy.

Both are a change to `hooks/usePhotos.ts` plus the write side of `api/photos.ts` — deliberately
isolated so this decision can be deferred.

---

## 9. Done when

- I can open `/photos/add` on the live site on my phone, enter the passkey once, pick a photo from
  the camera roll, type a group and caption, submit, and see a success message.
- ~60s later the photo is on `/photos` in the right year and group, with date, time, camera and
  location filled in from EXIF — no different from what `npm run add-photo` produces.
- `git log` shows a clean commit per upload.
- The CLI scripts still work.
