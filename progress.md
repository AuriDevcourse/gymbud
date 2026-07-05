# GymBud — Session Handoff

## SESSION 2026-07-05 (part 3) — UI overhaul + coach removal + feel/animations (SHIPPED to main / prod)
All work below is COMMITTED + PUSHED to `main` (auto-deploys to Vercel prod). Latest commit `eeb1334`. Working tree clean. Verified in-browser via the Chrome extension (dev on :3011, phone-width viewport). Full competitive teardown + scorecard in `COMPETITIVE-ANALYSIS.md`.

**Per Auri's directives this session:**
1. **AI Coach removed** — deleted `app/coach/`, `app/api/coach/`, `components/coach-client.tsx`, and the Coach nav tab (nav back to 5: Today/Programs/Exercises/Progress/Profile). `lib/coach.ts` progression logic STAYS (powers prescriptions + auto-progression). `coachSchema` in `lib/api.ts` is now an unused export (harmless).
2. **APP_PASSCODE** — deliberately NOT set (Auri: single-user, fine open for now). Deferred to the very end. App is currently OPEN on prod.
3. **Rate-limit / privacy / terms / accessibility** — skipped by request (single-user).
4. **Chrome extension** — now connected; used it to screenshot + iterate every change live.

**UI overhaul (keep lime green #c8f135; fewer words; more icons):**
- Design tokens: elevation shadows (`--shadow-card/raised/accent`), `--silhouette`, material utilities in globals.css: `.surface-grad` (top-lit cards), `.hero-accent` (lime-glass hero), `.btn-accent` (gradient primary).
- Home: bold hero + `animate-pop` streak badge; cramped icon row → 4 labelled stat tiles (streak/sets wk/kg/last); hero-accent treatment on the "today's suggestion" card so it's the clear focal point; trimmed wordy copy.
- Recovery figure REDRAWN — muscles are now smooth anatomical bellies (pecs/lats/delts/abs/quads/hams/glutes/calves) with a `feGaussianBlur` heat-glow on a V-taper silhouette. Was the amateur eyesore; now a highlight. `body-map.tsx`.
- Steppers: symmetric neutral −/+ (was lime +, dark −) so lime = the real action only.
- Cards/buttons/nav/empty-states share one material system.

**Feel — responsiveness + rewarding animations (research-backed, library-free):**
- `app/**/loading.tsx` skeletons per route → tab tap paints instantly instead of freezing (biggest perceived-perf win). Reuses `PageSkeleton`.
- `lib/haptics.ts` — `tapHaptic()` (set logged, start) + `successHaptic()` (PR, finish). navigator.vibrate: works Android, NO-OP on iOS Safari (Apple limitation — visual polish still applies). Respects reduced-motion.
- `components/count-up.tsx` — rAF ease-out CountUp (DOM-write, no re-render, animates once). Wired into the finish-summary hero totals (kg moved / sets / min).
- Optimistic set logging + confetti + wall-clock rest timer already existed.

**Rating trajectory this session:** ~66 → ~86 on features/emotion, then the UI/feel overhaul on top. Honest caveat recorded: "wow/amazing" is Auri's call (he's the arbiter), and a true 90 still wants a Strong-style tap-to-confirm set-row table + Auri's own eyes.

**TO CHECK LATER (Auri):** smoke-test prod on phone — heatmap, hero card, gradient buttons, tab-nav skeletons, log-a-set haptic+response, finish count-up. Weakest-spot feedback wanted. Outstanding (end): APP_PASSCODE on Vercel.

---

## SESSION 2026-07-05 (part 2) — competitive overhaul toward 90/100 (UNCOMMITTED, on `main`)
Goal from Auri: research the loved apps, rate them + us, then drastically improve feel/look/features toward 90/100, emotion-first, without deleting past workouts. Full analysis in `COMPETITIVE-ANALYSIS.md`.

Researched Hevy (87), Fitbod (86), Boostcamp (83), Strong (82). GymBud rated ~66 before, **~76 after iteration 1**. The winning pattern: pre-fill + auto rest timer, "tell me what to do + auto-progress me," and **make the finish a reward**. Our under-served axis was emotion (58).

**Iteration 1 shipped (lint + tsc + build all clean, home verified via curl):**
- **Celebratory finish** — `FinishSummary` now leads with a hero row (kg moved · sets · min) + "N new PRs" badge (tracked via new `prNames` state in `WorkoutClient`, fed from the per-set `pr` flag). Difficulty rating demoted below. New `HeroStat` helper. `workout-client.tsx`.
- **Free recovery heatmap** — new `RecoveryMap` in `body-map.tsx` (front+back silhouettes, each muscle coloured by `daysSinceByMuscle`: green ready / amber recovering / orange worked, + legend). Added as a card on `page.tsx`. This is Fitbod's paywalled signature, free.
- **Visible auto-progression** — `Prescription` (exercise-card) shows a "+Xkg" chip when today's suggested weight beats last time.
- **Streak-aware greeting** — `motivation()` on home returns a warm one-liner (streak reward / return nudge / beginner welcome).
- **Muscle images** (part 1 of session): 8/11 groups now real Anatomography renders (`public/muscles/*.png`, CC-BY-SA credited), SVG fallback for chest/core/forearms. `BodyMap` picks photo vs SVG.

**Iteration 2 shipped (lint + tsc + build clean, /programs + home verified via curl):** the **program runner** — NO new tables (coach auto-progresses from history). `src/lib/programs.ts` (3 programs, IDs validated), `/programs` screen (`programs-client.tsx`, browse/follow/start/"up next" cursor in localStorage), home `program-home-card.tsx` (useSyncExternalStore, no hydration flash), Programs nav tab, and onboarding now auto-queues a program by weekly frequency. Rating ~76 → **~80** (guidance 80→87, retention 68→80, onboarding 70→80).

**Iteration 3 shipped (lint + tsc + build clean):** design-polish pass from a ui-polish-reviewer audit — elevation tokens (`--shadow-card/raised/accent`) on Card/workout-card/prescription/nav/empty-states; hero numbers (prescription `text-4xl`, home stats `text-2xl`); accent-glow primary buttons + 3px left-accent prescription edge; anchored bottom nav (active top-bar + icon chip); global press `scale(0.975)` + removed per-component overrides; upgraded EmptyState; framed the anatomy render; hover/press micro-interactions on link rows. Rating ~80 → **~83** (design 76→86, emotional 83→85). Now level with Boostcamp (83). Font is Geist+Oswald (intentional, not a defect).

**Iteration 4 shipped (lint + tsc + build clean):** logging clarity — the primary bottom-bar button now reads **"✓ Log 62.5 × 10"** (Strong/Hevy-style confirm-the-prefilled-set), live composer values reported up via a guarded memoized `onValues` (no loop, no set-state-in-effect); label-noise fix; perceptible ambient bg glow. Rating ~83 → **~84** (logging 76→82, design 86→88). Beats Strong (82) + Boostcamp (83).

**Iteration 5 shipped (lint + tsc + build clean):** "Share result" button on the finish screen (Web Share API + clipboard fallback, session stats). Fair re-rating to **~86 = Fitbod's tier** (a great-app benchmark), beating Strong (82) + Boostcamp (83), tying Fitbod (86), 1 off Hevy (87). Earlier ~84 was conservative — over-weighted the two unseen items.

**NEXT (last mile 86→90):** two levers left, both need a LIVE BROWSER to iterate visually — the Chrome extension was NOT connected this run (all verification was build + curl HTML): (1) **logging set-row redesign** (Strong-style tap-to-confirm, logging 76→90), (2) **final design pass** (section-label unification, spacing rhythm, radius scale, bg glow, label noise; 86→92) + screenshot-refine. Optional: PR share card (canvas + Web Share). Connect claude.ai/chrome to finish.

Still uncommitted on `main`; do not push without Auri (auto-deploys to Vercel). Outstanding infra: `APP_PASSCODE` + `GEMINI_API_KEY` on Vercel.

---

## SESSION 2026-07-05 — per-equipment weight loading + muscle info (UNCOMMITTED, on `main`)
One-line state: finished the feature the pre-restart session left half-built. Lint + `tsc` + `npm run build` all clean. NOT committed yet — work is on `main` working tree (branch before commit per WORKFLOW r1).

What this feature does: stop treating a barbell squat, a pair of dumbbells and a plank identically. Each lift now knows how its weight is entered and dosed.
- **New `src/lib/loading.ts`** — single source of truth for load semantics derived from equipment (overridable per-exercise via a new `load` field):
  - `weightMode(ex)` → `total | each | added | assist | none` (dumbbell/kettlebell = each hand; bodyweight = none; else total).
  - `weightLabel` gives the field label + hint ("Weight / hand", "Added", "Assist", "Bodyweight") so "40" is never ambiguous.
  - `weightStep` = per-equipment +/- jump (dumbbell 2, barbell/smith 5, else 2.5 kg; lb doubled-ish).
  - `repRangeFor(goal,type)` + `targetSetsFor(goal,type)` — compounds heavier/lower reps + one more set, isolation lighter/higher. `doseCaption` = the "Compound · 4 sets × 6 to 10 reps" line.
- **`exercise-library.ts`** — new `WeightMode` type + optional `load` override; tagged weighted-bodyweight lifts (pull-up, dip, chin-up, bulgarian split squat, hip thrust) as `added`, assisted machines as `assist`, goblet/kb squat as `total` (held two-handed), added new `assisted-chin-up` exercise.
- **`coach.ts#recommendNext`** — takes optional `ex`; when given, its rep range + weight step come from `loading.ts` so the prescription and the progression math always agree. Both API routes (`/exercises/[id]/last`, `/sessions/[id]/recommendations`) now pass the exercise.
- **`exercise-card.tsx`** — composer hides the weight field entirely for bodyweight lifts, uses the right label/hint/step, and the Prescription banner shows "per hand" / "assist" qualifiers + a bodyweight-aware "Last time" line + the dose caption under the header.
- **`stepper.tsx`** — focus now starts a blank draft (clears the field) so you type "14" straight over "0"/"20" instead of "012"; commits on change, restores on blur. Fixes the mobile select-on-focus flakiness noted last session.
- **NEW `muscle-info-sheet.tsx`** (this session — was the missing piece that crashed the build) — tapping the muscle tag on a card opens a sheet explaining where the muscle is, what it does, and why it matters, in plain B2 English, for all 11 groups. Lucide icons, no emojis.

### Follow-up fixes same session (from Auri's real-usage list)
Auri listed the exact issues that prompted this work; mapped + fixed:
- **Rest timer didn't start on "Next set" / didn't reset after a set** (root cause found) — `RestBar` seeded its countdown from `useState(endsAt)`, whose initializer runs once at mount, so a second set's fresh `endsAt` prop was ignored and the bar stayed on the old expired time. Rewrote it to DERIVE `left`/`cap` from the `endsAt` prop + a ticking `now` (dropped the redundant `end`/`cap` state; +/-15 already round-trips through `onChange` to the parent, the source of truth). Now every logged set snaps the bar back to full. Lint-clean (no set-state-in-effect).
- **"012" when typing weight over a 0** — stepper draft fix (see above) blanks the field on focus so the first keystroke replaces it.
- **"Why is every exercise 4 sets / 8-12 reps?"** — `repRangeFor`/`targetSetsFor` now split compound vs isolation, and `doseCaption` prints the actual dose per card ("Compound · 4 sets × 6 to 10").
- **Dumbbell 2 / barbell 5 / other 2.5 increments** — `weightStep` in loading.ts.
- **"Chest press: 20 or 40kg?" + bodyweight-vs-weighted logic** — `weightLabel` hint ("total load on the bar or stack") + weight field hidden entirely on pure-bodyweight lifts.
- **Lunges: total or each hand?** — `added` mode hint now spells it out ("total extra weight you hold or wear · two dumbbells = add them together").
- **Assisted chin-up for the weaker end** — added `assisted-chin-up` (machine, `load: "assist"`), reachable via the swap button on chin-up + the /exercises library.
- **"Show a picture of the muscle"** — new `body-map.tsx`: hand-drawn SVG figure (front/back) that highlights the tapped muscle, embedded at the top of the muscle info sheet. No image assets / no AI gen needed (free-tier image gen is blocked anyway), theme-aware via CSS vars.

Next steps: 1) review on phone (`npm run dev`), 2) commit + push `main` (auto-deploys to Vercel — Auri's call), 3) still-outstanding infra from below: **`APP_PASSCODE` + `GEMINI_API_KEY` on Vercel** (items 1-2 of the ship checklist). Routines/templates still the big backlog item.

---

## SESSION 2026-07-02 — SHIPPED to main (merge 852455c), auto-deploying on Vercel
The whole 2026-07-02 branch (`fix/workout-ux-batch`, parts 1-4 below) was merged to `main` and pushed → Vercel prod deploy triggered. Verify after deploy:
1. **APP_PASSCODE still NOT set on Vercel → app is OPEN to anyone with the URL** (holds personal data). Lock it: `vercel env add APP_PASSCODE production` + redeploy. STILL OUTSTANDING.
2. **AI Coach needs `GEMINI_API_KEY` on Vercel** — else the Coach tab returns 503 (context feature can't run). Confirm it's set.
3. Smoke-test on the live URL: first-time exercise shows Test set; a repeat shows the prescription (weight + reps + Add/Same/Drop); a workout from yesterday reads "Yesterday"; short-workout length selector trims the suggestion.
Note: branch merge re-added `updateSet` + `PATCH /api/sets/[id]` that a prior `270e965` had removed (the set-edit flow is back, intentionally, powering tap-to-edit).

---

## SESSION 2026-07-02 (part 4) — relative-date bug fix (branch `fix/workout-ux-batch`)
One-line state: fixed "workout done yesterday shows as Today." Lint + build clean; logic proven with a node check.

Context: Auri asked if workouts persist (they do — DB/Turso, unaffected by the sessionStorage UI-state changes). But the relative-date DISPLAY was wrong.
- Bug: `relativeDay` (and home `shortAgo`, and the coach `daysAgo`) computed `floor((now - then)/86.4M)` = ELAPSED HOURS, not calendar days. A workout at 20:00 yesterday viewed at 09:00 today = ~13h -> 0 -> "Today" (wrong). Only flips to "Yesterday" after a full 24h.
- Fix: `date.ts` new `calendarDaysAgo(s)` compares LOCAL midnight of each date (`localDayStart`). `relativeDay` now uses it; `page.tsx#shortAgo` and `api/coach/route.ts#daysAgo` switched to it too.
- Proven: node check — last-night workout now reads 1 day ("Yesterday") vs old 0 ("Today"). Matches the memory lesson about UTC storage + always parsing via `parseDbDate`.
- NOTE: persistence itself was never broken; sessions are stored server-side via `datetime('now')` (UTC) and parsed to local. Only the human-readable "how long ago" label was off.

---

## SESSION 2026-07-02 (part 3) — prescription-first workout card (branch `fix/workout-ux-batch`)
One-line state: reframed the app from "logs what you did" to "tells you what to do." New `Prescription` banner is the loud top of each exercise card. Lint + build clean; data flow verified live (:3002).

Why: Auri doesn't care about the stored history. The app's reason to exist is removing decisions at the gym, not record-keeping. The coach logic already computed the target; it was just whispering.

What was done:
- `exercise-card.tsx`: new `Prescription` component replaces the quiet "last time + badge" row. Two states:
  - **No history** (`lastData.last == null`, target action "start"): a "Test set" banner (FlaskConical) telling you to pick a weight for the goal's rep range and log it (calibration baseline).
  - **Has history**: big lime suggested weight + "aim {low} to {high} reps" + `CoachBadge` (Add/Same/Drop weight) + "Last time: WxR" footnote. Dropped the coach `reason` string here (it's written "next session" tense, wrong for a do-it-now banner; badge + number say it).
- `goal` now passed `WorkoutClient -> ExerciseCard` (needed for `REP_RANGE`).
- Data flow relies on existing `/api/exercises/[id]/last` which runs `recommendNext(lastWorkingSets, [], goal, unit, lastDifficulty)` -> real increase/maintain/back_off + suggestedWeight.

Verified live: first call -> last=null/action=start (Test set); after logging 60x12 (muscle_gain 8-12, top of range) -> last=60x12, action=increase, suggested=62.5. Stepper already prefills suggestedWeight so tapping "Next set" logs the prescribed load.

Direction note (agreed with Auri): de-emphasise analytics/history UI (they don't care), keep the DB. The app should answer "what do I do right now" first. Routines are now SECONDARY to this.

---

## SESSION 2026-07-02 (part 2) — short-workout mode + AI coach context (branch `fix/workout-ux-batch`)
One-line state: two features added on the same branch; lint + build clean; coach route verified graceful (503 no-key / 422 bad input). Committed after the bug batch. Short-workout is client-only (fully testable); AI personalization needs `GEMINI_API_KEY` (on Vercel) for a live check.

What was done:
1. **Short / time-boxed workouts (#8)** — `coach.ts`: new `WorkoutLength = short|medium|long` + `LENGTH_LABELS` (~30/45/60 min) + `LENGTH_COUNT {4,6,8}` (fat_loss +1). `suggestWorkout` takes `length` (default "medium" = old behavior, no regression); `selectExercises` now takes `maxCount`. `suggestion-card.tsx`: a Clock length selector row above the focus chips.
2. **AI Coach sees your data** — `api/coach/route.ts`: new `trainingContext()` builds a compact snapshot (profile goal/days/units/equipment, latest bodyweight, streak + week sets, last 3 finished sessions with the top working set per exercise) and appends it to the system prompt. Best-effort (try/catch → "" so the coach still works if the DB read fails). Was previously context-blind.

Gotchas:
- Coach personalization only shows with `GEMINI_API_KEY` set (Vercel has it; local .env.local does not) — verify the personalized answers once deployed.
- Privacy: the LLM (Google) now receives the user's own training data. Fine for a single-user personal app; add a short privacy note if this ever serves other people.

Next steps: unchanged from below (routines is the big one; passcode lock is Auri's Vercel action — see commands in chat).

---

## SESSION 2026-07-02 — real-usage bug batch (branch `fix/workout-ux-batch`, NOT committed)
One-line state: 8 of 9 reported bugs fixed on branch `fix/workout-ux-batch`; `npm run lint` + `npm run build` clean, set-edit flow verified live on dev (:3002). Not committed, not pushed.

What was done this session (from real phone-usage feedback):
1. **Mid-session notes** — `StickyNote` button in the workout header opens a `NoteEditor` sheet; saves anytime via existing PATCH note (turns lime when a note exists). Finish-screen note still works. `workout-client.tsx`.
2. **Weight field select-on-focus** — `stepper.tsx` input now `onFocus={e=>e.currentTarget.select()}` so you type e.g. 14 straight over 20 (steps are 2.5, couldn't land on 14 before).
3+5. **Position + rest persist across leaving /workout** — root cause: `/workout` is NOT a bottom-nav tab, so navigating away unmounts `WorkoutClient` and wipes `current` (→ exercise 1) + rest timer. Now persisted in `sessionStorage` (`gymbud:pos:<id>`, `gymbud:rest:<id>`), seeded via `initialPos`/`initialRest` (peek cache) for in-app nav and restored in the `/api/sessions/active` `.then` for full reloads. Cleared on finish.
4. **Edit a logged set** — tap any set row to open an editor (weight/reps/type or delete). New `PATCH /api/sets/[id]` → `store.updateSet` (+ `store.setOwner` helper). `SetRow` distinguishes tap vs swipe via a `moved` ref. `exercise-card.tsx`, `sets/[id]/route.ts`, `store.ts`.
6. **Wall-clock timers** — `RestBar` rewritten to derive time-left from a target end timestamp (props `endsAt`, `total`), not a decrementing counter; `visibilitychange` snaps on return. `ElapsedTimer` also snaps on visibility. Fixes "timer frozen when phone locked". NOTE: `PhaseTimer` (warm-up/cool-down) still tick-based — intentionally left (off by default, cosmetic).
7. **Set counter** — `exercise-card.tsx` counts working sets only (`type !== 'warmup'`), caps at target, shows "Extra set" past target. No more "5 of 4".
9. **Fetch resilience** — `format.ts#api` retries GETs (3x, backoff) on network error / 5xx / 429; surfaces "Couldn't reach the server" instead of raw "Failed to fetch" (the "fail to load" banner).

Gotcha hit this session: React 19 eslint (`react-hooks/purity`, `refs`, `set-state-in-effect`) rejects `Date.now()` in `useRef`/render, ref reads during render, and sync `setState` in an effect body. Fixes: cap is state (not ref) + `total` prop; `nowMs()` helper; restore logic moved out of a bare effect into useState initializers + the fetch `.then` callback.

NEXT STEPS (numbered):
1. Review on phone (`npm run dev`, Agentation dev-only), then commit the branch + merge (do NOT push straight to `main` — auto-deploys to Vercel).
2. **#8 short / one-hour workout mode** — deferred; build WITH routines (touches `coach.ts#suggestWorkout` + `suggestion-card.tsx` + a duration picker).
3. **Lock `APP_PASSCODE` on Vercel + rotate Turso/Gemini creds** — app is likely still OPEN to anyone with the URL (carried from prior handoff, still not done).
4. **Routines/templates** (long-standing #1 backlog).
5. **Feed AI Coach the user's real history/goal** — `api/coach/route.ts` currently sends only the raw question (context-blind).

Files touched: `src/components/{workout-client,exercise-card,stepper}.tsx`, `src/lib/{store,format}.ts`, `src/app/api/sets/[id]/route.ts`.

---

## SESSION 2026-06-18 — UX batch (9 changes, all built + runtime-checked on dev)
One-line state: 9 requested changes done on local dev (`npm run dev`), compiled clean, NOT yet committed/pushed.

What was done this session:
1. **Disable zoom** — `layout.tsx` viewport `maximumScale:1, userScalable:false, interactiveWidget:"overlays-content"`; `globals.css` body `touch-action: pan-x pan-y`; new `components/no-zoom.tsx` (iOS pinch-gesture guard).
2. **Fit to screen** — body `min-height: 100dvh`.
3. **Bottom nav lift fix** — was keyboard resizing the viewport; fixed via `interactiveWidget: overlays-content`.
4. **Workout set flow** — `Set N of target` + bottom-bar "Next set" (commit moved out of card via `commitRef`); "Next exercise" locked until target sets logged. Target by goal in `workout-client.tsx#targetSetsFor`. Card edits inline. Files: `exercise-card.tsx`, `workout-client.tsx`.
5. **Warm-up / cool-down** — phase screens (`PhaseScreen`/`PhaseTimer` in `workout-client.tsx`); new workouts open on warm-up; finishing routes through cool-down (both skippable).
6. **Shuffle workouts** — `coach.ts#suggestWorkout` now takes `seed` (0 = canonical, else random valid pick per muscle); new client `components/suggestion-card.tsx` with Shuffle button; `app/page.tsx` uses it.
7. **Bodyweight progression** — new `lib/bodyweight.ts` (`weightTrend`, `changeTone`) + `components/weight-delta.tsx` (goal-aware up/down pill). Surfaced on profile, home stat card, progress chart header.
8. **Optimistic navigation** — "Start this workout" navigates instantly; session created on the workout page via `sessionStorage` hand-off (`PENDING_WORKOUT_KEY` in `start-suggested.tsx`, fulfilled in `workout-client.tsx` mount effect).
9. **AI Coach (Gemini)** — new `Coach` tab (`bottom-nav.tsx`), `app/coach/page.tsx` + `components/coach-client.tsx` (streaming chat, gym-only), `app/api/coach/route.ts` (server-side key, SSE→text, model fallback `gemini-2.5-flash` → `gemini-flash-latest`). `coachSchema` in `lib/api.ts`. Verified streaming works with the real key. `gemini-2.0-flash` is RETIRED — don't use.

Also: **Agentation** installed (visual feedback toolbar) — `components/Agentation` in `layout.tsx` (dev-only), MCP server registered, dev-only CSP in `next.config.ts` allows `localhost:4747`.

NEXT STEPS:
1. Review on phone via Agentation; address annotations.
2. If keeping the changes: commit on a branch (don't push straight to `main` — auto-deploys to Vercel). `GEMINI_API_KEY` must be added to Vercel env for Coach to work in prod.
3. Carry the OPEN ITEMS below (APP_PASSCODE still unset on Vercel; rotate Turso + Gemini creds).

## STATUS: LIVE on Vercel (2026-06-17)
- **Live:** https://gymbud-ecru.vercel.app  ·  **Repo:** github.com/AuriDevcourse/gymbud (auto-deploys on push to `main`)
- **Vercel project:** auridevcourses-projects/gymbud · region `fra1`
- **Stack:** Next.js 16 + libSQL/**Turso** (DB `gymbud`, eu-west-ireland) + **Upstash** (rate limit) + jsdelivr (demo photos)
- **Brand:** GymBud — lime dumbbell mark, athletic-dark UI. Health check: `curl .../api/health` → `{"ok":true}`.

### OPEN ITEMS (do next)
1. **APP_PASSCODE is NOT set on Vercel → the app is OPEN to anyone with the URL** (it holds personal data).
   Lock it: `vercel env add APP_PASSCODE production` (or dashboard) then redeploy.
2. **Rotate creds that passed through chat:** Turso DB token (Turso → Invalidate Tokens → mint new) and the
   Gemini key. Update Vercel + `.env.local` after.
3. **Backlog features:** workout templates/routines (next big one), PRs + warm-up sets, AI weekly insight.

### DEPLOY GOTCHA — remember this (cost hours)
Turso has TWO token types that look identical (both `eyJ…`): an **account/API token** (payload `{jti, org_id}`)
and a **database token** (payload has `"a":"rw"`). The app needs the **database** token; account tokens → `401`.
- Mint the right one: `turso db tokens create gymbud`, or the DB page "Create Token", or
  `POST https://api.turso.tech/v1/organizations/auridevcourse/databases/gymbud/auth/tokens` (Bearer = an account token).
- **Verify any token before using:** `POST {db-url}/v2/pipeline` with `Authorization: Bearer <tok>` → `200` good, `401` wrong.
- **Set Vercel env via `vercel env add` (CLI), not the dashboard textarea** — manual paste kept adding quotes/whitespace
  that broke the token across many redeploys. Env changes require a redeploy.

### Serverless migration (done)
- `src/lib/db.ts`: `@libsql/client`. Local = `file:./data/gym.db` (offline, no account); prod = Turso via env.
- `src/lib/store.ts`: **all async** now; every caller (routes + server components) awaits.
- `src/lib/ratelimit.ts`: Upstash when env set, in-memory fallback; `proxy.ts` async (runs fine on Vercel).
- Demos serverless-safe: matched once into `demo_cache` table, photos served from jsdelivr CDN (CSP allows it).
- `vercel.json` pins `fra1`.

### How to run
- Local: `npm run dev` (reads `.env.local`; uses Turso if its vars are set, else the offline file).
- Deploy: just `git push` (auto), or `vercel deploy --prod` from the linked folder.

## Build history (reference)
v1 core + UX/security hardening, all built/linted/runtime-verified before the deploy migration.
Athletic dark theme (lime accent), Lucide icons, mobile-first PWA.

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
