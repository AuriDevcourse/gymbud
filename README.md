# GymBud — Personal Gym Tracker

A single-user, mobile-first gym companion. Log lifts at the gym, see what you did
last time, get told when to push harder or back off, and never get stuck when a
machine is taken. No accounts, no third parties — your data lives in a SQLite file
on your own server.

## Stack
- Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4
- better-sqlite3 (single file at `data/gym.db`)
- Lucide icons · Recharts · PWA (installable, athletic dark UI)

## Features
- **Workout logger** — weight × reps per set, big thumb-friendly steppers, last
  session shown inline, optional rest timer + session note.
- **Coach** — after each lift, an increase / hold / back-off call based on your
  goal's rep range and how the set went.
- **Swap (117-exercise library)** — every exercise has pre-mapped alternatives that
  hit the same muscle with different equipment. One tap, no dead ends.
- **Suggestions** — today's session from your goal, weekly frequency and which
  muscles are freshest (full-body / upper-lower / push-pull-legs).
- **Progress** — body-weight trend, estimated 1RM per exercise, session history.
- **Profile** — goal, days/week, available equipment, kg/lb.

## Develop
```bash
npm install
npm run dev        # http://localhost:3000
npm run lint       # next build does NOT lint in v16 — run this separately
npm run build && npm run start
```
The SQLite DB and any secrets are gitignored. First run creates `data/gym.db`.

## Notes
- Self-hosted on a persistent Node process (Hetzner + systemd), not serverless.
- The optional AI weekly insight is not built yet — see `progress.md`.
