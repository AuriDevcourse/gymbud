# Gym Coach — Session Handoff

## Current state (2026-06-17)
v1 core is **built, type-checks, lints clean, production-builds, and is smoke-tested end-to-end**.
A personal, single-user, mobile-first PWA gym tracker. Next.js 16 + better-sqlite3 on a VPS.
Athletic dark theme (lime accent), Lucide icons. Not yet deployed.
A second pass added the UX/security hardening below (also verified at runtime).

## UX + security hardening pass (2026-06-17)
- **Fixed the "screen shifts on tap" bug**: `scrollbar-gutter: stable` (the centered
  layout was jumping when navigating between a scrolling and non-scrolling page),
  plus `touch-action: manipulation` (kills double-tap-zoom jump) and tap-highlight removal.
- **Accessibility**: re-enabled pinch-zoom (was blocked — WCAG fail), added keyboard
  `:focus-visible` rings, `text-size-adjust`. Icon buttons already aria-labelled.
- **Design rule sweep**: removed em-dashes from UI copy (coach reasons, labels, title)
  per DESIGN.md rule 2 (use commas / `·`).
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, COOP, Permissions-Policy; `x-powered-by` removed (`next.config.ts`).
- **Rate limiting** (`src/proxy.ts`, in-memory — fine on a single Node process):
  240 req/min/IP on `/api/*`, and 5 attempts / 15 min on `/api/login`. Returns 429 + Retry-After.
- **Optional passcode gate** (`src/lib/auth.ts` + proxy): OFF unless `APP_PASSCODE` is set,
  so local/LAN stays login-free. When set, every route needs a signed httpOnly Secure
  SameSite cookie; `/login` page + `/api/login|logout`; logout invalidates server-side
  (cookie holds an HMAC token, not a guessable value). Verified: wrong→401, right→cookie→200,
  logout→401 again.
- **`/api/health`** added for blue-green deploy probes.
- Verified at runtime: gate redirect/401, login happy path + logout, rate-limit 429s, CSP header present.

## What was just done
- Scaffolded Next.js 16 (App Router, TS, Tailwind v4, Turbopack). `src/` dir.
- Athletic-dark design system in `globals.css` (CSS vars + `@theme inline`), Oswald display + Geist body.
- PWA: `public/manifest.webmanifest` + generated icons (192/512/maskable/apple/favicon).
- SQLite layer (`src/lib/db.ts`): profile, bodyweight_log, session, session_exercise, set_log. WAL, FKs, indexes. DB file at `data/gym.db` (gitignored).
- Exercise library (`src/lib/exercise-library.ts`): **117 exercises**, tagged muscle group + equipment + type, each with validated `alternatives` (372 refs, 0 broken).
- Coach logic (`src/lib/coach.ts`): progression (increase/maintain/back_off by goal rep-range), substitution (same muscle, different equipment, never a dead end), workout suggestion (full-body / upper-lower / PPL by days-per-week + muscle staleness).
- 14 API route handlers under `src/app/api/` (Zod-validated, sized-capped, structured errors).
- UI pages: `/` (Today + suggestion), `/workout` (live logger — big steppers, last-time, swap, rest timer, finish summary), `/exercises` (browse + swap), `/progress` (recharts: bodyweight + est-1RM + history), `/profile` (goal/days/equipment/unit + bodyweight log). Bottom nav.
- Smoke test passed: profile → start session → add exercise → log sets → finish → coach said "increase to 82.5kg"; "last time" surfaces on next session; alternatives returns 12 swaps; bad input → 422; all pages 200.

## Feature batch 2 (2026-06-17) — onboarding + demos + plates
- **First-run onboarding** (`/welcome` + `welcome-wizard.tsx`): 4-step setup (goal,
  body weight + unit, days/week, equipment) writing the profile with `onboarded=true`.
  `profile.onboarded` column added (db migrate has a guarded ALTER for old DBs).
  Home `redirect("/welcome")` until done; `/welcome` bounces home once done. Nav hidden on it.
- **Exercise demos (GIF)** via ExerciseDB: `src/lib/demos.ts` resolves our exercise -> their
  exercise by name+equipment scoring, downloads the gif ONCE to `data/demos/`, caches a
  `_map.json` (incl. "missing" so we don't re-hit the API). Route `GET /api/demo/[id]`
  streams the cached gif or 404s. `demo.tsx` shows it inline (library detail) + in a sheet
  (workout card "How to" button); falls back to a YouTube search link when no gif/offline.
  Needs `EXERCISEDB_API_KEY` (RapidAPI) in `.env` — UNTESTED against the live API (no key on
  hand); fallback path verified. **TODO: add the key, then sanity-check match quality** and
  hand-correct any wrong rows in `data/demos/_map.json`.
- **Plate calculator** (`src/lib/plates.ts`): per-side plate breakdown shown inline on
  barbell/smith exercises in the logger, updates with the weight stepper. kg + lb plate sets.

## Feature batch 3 (2026-06-17) — focus mode, free demos, polish
- **Demos switched to NO-KEY source**: Free Exercise DB (public domain). `demos.ts`
  caches `exercises.json` + matched photos under `data/demos/`, serves frames from
  `/api/demo/[id]` (metadata + instructions) and `/api/demo/[id]/[frame]` (image).
  `demo.tsx` crossfades start/end photos + lists written steps; YouTube fallback only
  when truly unmatched. Runtime-verified (squat/dbbench/deadlift/etc match correctly).
  Matching is best-effort — a few pick odd variants (e.g. barbell bench -> "Guillotine");
  **hand-fix by editing `data/demos/_map.json`** (set the right entry or delete to retry).
  Removed the old ExerciseDB/RapidAPI path + `EXERCISEDB_API_KEY`.
- **Focus-mode workout** (rewrote `workout-client.tsx`): shows ONE exercise at a time
  with "Exercise N of M" + tappable progress dots, Prev / Next exercise, Finish on the
  last. Add-exercise jumps to the new one.
- **Rest countdown**: after each set a `RestBar` counts down from a goal-based target
  (strength 180s, muscle_gain 90s, fat_loss 45s, general 75s) with -15/+15/Skip + vibrate.
- **Instant swap** (no list): the swap button cycles to the next sensible alternative
  (`getAlternatives`, client-side) with an undoable toast. Removed `alternatives-sheet.tsx`.
- **Polish**: `canvas-confetti` on set-log (small) + finish (big); universal button
  press-scale; sheet slide-up + grab handle + `dvh` sizing (fixes the "off-screen"
  feeling); fade-slide on exercise change. All gated by `prefers-reduced-motion`.

## Feature batch 4 (2026-06-17) — set model clarity (kept focus mode)
Researched Hevy/Strong/Jefit. Standard model = workout is a list of exercises, each
exercise has MANY sets (set | previous | weight | reps | done). Auri chose to KEEP the
one-exercise-at-a-time focus pager but make the per-set model obvious inside it:
- Each set row now shows **"prev W×R"** (last time's matching set N) + a clear "Sets" table.
- Composer shows "Last time: W×R" for the set you're adding.
- **Set type labels**: Working / Warm-up / Drop / Failure (`set_log.type` column, guarded
  ALTER migration). Badges W/D/F on rows. **Warm-ups are excluded from the coach + target
  math** (last route + recommendations route filter `type !== 'warmup'`).
- Verified at runtime: types persist; recommendation uses working sets only.

## Feature batch 5 (2026-06-17) — responsiveness
- **Optimistic mutations** in `workout-client.tsx`: add/update/delete set and swap apply
  to local state INSTANTLY (optimistic set uses a temp negative id, replaced by the real
  row on success), then reconcile with the server; on error they roll back + show the error.
- **In-memory SWR cache** (`src/lib/swr.ts`, `useApi` + `peek`/`poke`): stale-while-
  revalidate, keyed by URL, survives client-side navigation (empty on server/first render
  so no hydration mismatch). Profile is shared across workout + profile pages; active
  session + per-exercise "last time" are cached so reopening /workout is instant.
- **Skeletons** (`src/components/skeleton.tsx`): `WorkoutSkeleton` + `PageSkeleton` replace
  the old spinners on first load (workout, progress, profile). All `animate-pulse`, reduced-motion safe.
- Note: cache is in-memory (resets on full reload, persists across in-app navigation).
  If cross-reload persistence is wanted later, back `swr.ts` with localStorage via
  `useSyncExternalStore` (avoids hydration issues).

## Next steps (numbered)
1. **Workout templates / routines** (chosen, NOT yet built — do this next): new tables
   (`workout_template`, `template_exercise` with target sets×reps), CRUD API, a Routines
   UI to build/save, and "Start routine" that creates a session pre-filled with those
   exercises. Biggest "just works" win.
2. (optional) hand-correct any odd demo matches in `data/demos/_map.json`.
3. **PRs + warm-up sets** — detect all-time bests on finish + celebrate; suggest warm-up ramp.
4. **AI weekly insight** — `OPENROUTER_API_KEY`, `POST /api/insight` (auth + rate-limit + per-use
   cap, stream tokens), surface on `/progress` or `/`.
5. **Deploy to Hetzner** (see "Deploy"). `data/` (DB + `demos/` cache) on a persistent path + backups.
6. Polish: per-set edit (currently delete + re-add), drag-reorder exercises.

## Gotchas / open TODOs
- **Architecture caveat (Auri chose this):** server SQLite = needs network at the gym. The brief's "offline-friendly" is only partly met (PWA shell installs; writes need the server). If true offline becomes important, the alternative was client-side IndexedDB. Revisit only if it bites.
- `better-sqlite3` is auto-externalized by Next 16 (in `serverExternalPackages`, also set explicitly in `next.config.ts`). Runs Node runtime only — fine for self-host, NOT Vercel-serverless-friendly (matches the "persistent Node process" lesson).
- All DB-reading pages/routes use `export const dynamic = "force-dynamic"` so nothing bakes build-time data.
- `next build` does NOT lint in Next 16 — run `npm run lint` separately (CI should).
- SQLite stores `datetime('now')` as UTC `"YYYY-MM-DD HH:MM:SS"`; always parse via `src/lib/date.ts#parseDbDate`, never `new Date(raw)`.

## Key files
- Logic: `src/lib/{db,store,coach,types,date,format,api,exercise-library}.ts`
- API: `src/app/api/**/route.ts`
- Pages: `src/app/{page,workout,exercises,progress,profile}/...`
- Components: `src/components/{workout-client,exercise-card,exercise-picker,alternatives-sheet,exercise-browser,progress-client,profile-client,start-suggested,bottom-nav,ui,sheet,stepper,coach-badge}.tsx`

## Deploy (Hetzner systemd + nginx, see reference_hetzner_nextjs_deploy_pattern)
1. `npm ci && npm run build`
2. systemd service runs `npm run start` (or `next start`) with `PORT=<port>` and `WorkingDirectory` set so `data/gym.db` persists across deploys (consider a path outside the release dir + symlink).
3. nginx reverse-proxy + certbot TLS; add Cloudflare in front (SECURITY.md rule 8).
4. Add the compliance routes only if you ever expose personal data beyond yourself; single-user/no-account = mostly exempt, but add a privacy note before the AI phase (LLM receives session data).
