"use client";

import type { MuscleGroup } from "@/lib/exercise-library";

// A hand-drawn stylised figure that lights up the muscle you tapped. Not medical
// anatomy — a simple "here's roughly where it is on the body" so the name means
// something. Front or back view depending on where the muscle actually sits.
// Colours come from CSS vars so it matches light/dark automatically.

type View = "front" | "back";

// Per muscle: which side of the body to show, and the highlight shapes drawn on
// top of the silhouette (mirrored left/right where the muscle is paired).
// Muscle bellies drawn as smooth, roughly anatomical shapes (not blocks), so
// under the glow they read as a real heat-map. Coords on a 120x205 viewBox that
// matches the silhouette below.
const MAP: Record<MuscleGroup, { view: View; marks: React.ReactNode }> = {
  chest: {
    view: "front",
    // two pec shields angled toward the sternum
    marks: (
      <>
        <path d="M59 54 Q49 52 45 58 Q44 64 50 66 Q57 66 59 60 Z" />
        <path d="M61 54 Q71 52 75 58 Q76 64 70 66 Q63 66 61 60 Z" />
      </>
    ),
  },
  back: {
    view: "back",
    // two lat wings sweeping from the armpits to the waist
    marks: (
      <>
        <path d="M58 50 Q46 51 44 60 Q44 74 52 82 L58 78 Z" />
        <path d="M62 50 Q74 51 76 60 Q76 74 68 82 L62 78 Z" />
      </>
    ),
  },
  traps: {
    view: "back",
    // twin ropes from the base of the neck out toward each shoulder
    marks: (
      <>
        <path d="M60 40 Q50 42 43 49 Q49 51 56 50 Q59 46 60 42 Z" />
        <path d="M60 40 Q70 42 77 49 Q71 51 64 50 Q61 46 60 42 Z" />
      </>
    ),
  },
  shoulders: {
    view: "front",
    marks: (
      <>
        <ellipse cx="41" cy="50" rx="8" ry="7" />
        <ellipse cx="79" cy="50" rx="8" ry="7" />
      </>
    ),
  },
  biceps: {
    view: "front",
    marks: (
      <>
        <ellipse cx="35" cy="66" rx="4.5" ry="9" />
        <ellipse cx="85" cy="66" rx="4.5" ry="9" />
      </>
    ),
  },
  triceps: {
    view: "back",
    marks: (
      <>
        <ellipse cx="34" cy="66" rx="4.5" ry="10" />
        <ellipse cx="86" cy="66" rx="4.5" ry="10" />
      </>
    ),
  },
  forearms: {
    view: "front",
    marks: (
      <>
        <ellipse cx="32" cy="86" rx="4" ry="9" />
        <ellipse cx="88" cy="86" rx="4" ry="9" />
      </>
    ),
  },
  core: {
    view: "front",
    // abdominal column, tapering to the navel
    marks: <path d="M54 68 Q60 66 66 68 L64 92 Q60 96 56 92 Z" />,
  },
  quads: {
    view: "front",
    // teardrop thigh sweeps
    marks: (
      <>
        <path d="M53 105 Q49 120 52 140 Q54 146 57 140 Q58 120 57 106 Z" />
        <path d="M67 105 Q71 120 68 140 Q66 146 63 140 Q62 120 63 106 Z" />
      </>
    ),
  },
  hamstrings: {
    view: "back",
    marks: (
      <>
        <ellipse cx="54" cy="124" rx="5.5" ry="16" />
        <ellipse cx="66" cy="124" rx="5.5" ry="16" />
      </>
    ),
  },
  glutes: {
    view: "back",
    marks: (
      <>
        <ellipse cx="54" cy="102" rx="7.5" ry="8" />
        <ellipse cx="66" cy="102" rx="7.5" ry="8" />
      </>
    ),
  },
  calves: {
    view: "back",
    marks: (
      <>
        <ellipse cx="53" cy="166" rx="4.5" ry="12" />
        <ellipse cx="67" cy="166" rx="4.5" ry="12" />
      </>
    ),
  },
};

// An athletic V-taper silhouette, shared by both views. Smooth tapered limbs so
// it reads as a body, not blocks. Coordinates kept ~compatible with the muscle
// marks above.
function Silhouette() {
  return (
    <g fill="var(--silhouette, #232a33)">
      {/* head + neck */}
      <ellipse cx="60" cy="22" rx="10.5" ry="12.5" />
      <path d="M55.5 33 h9 v7 h-9 z" />
      {/* torso: wide delts tapering to the waist */}
      <path d="M41 47 Q60 40 79 47 Q81 62 74 80 Q60 87 46 80 Q39 62 41 47 Z" />
      {/* pelvis */}
      <path d="M47 79 Q60 85 73 79 L70 100 Q60 105 50 100 Z" />
      {/* arms — tapered, hanging slightly out */}
      <path d="M42 48 Q33 51 31 63 Q30 81 33.5 97 Q37 100 40 97 Q42.5 79 45.5 61 Q46.5 51 42 48 Z" />
      <path d="M78 48 Q87 51 89 63 Q90 81 86.5 97 Q83 100 80 97 Q77.5 79 74.5 61 Q73.5 51 78 48 Z" />
      {/* legs — tapered thigh to calf */}
      <path d="M49 100 Q55 104 59 100 L58 148 Q57.5 172 55.5 190 Q52 192 49 190 Q47.5 168 47.5 130 Z" />
      <path d="M61 100 Q65 104 71 100 L72.5 130 Q72.5 168 71 190 Q68 192 64.5 190 Q62.5 172 62 148 Z" />
    </g>
  );
}

// Muscles we have a real anatomical render for (public/muscles/<group>.png,
// frame-extracted from Anatomography, CC-BY-SA). The rest fall back to the SVG.
const HAS_PHOTO: Partial<Record<MuscleGroup, true>> = {
  back: true,
  shoulders: true,
  biceps: true,
  triceps: true,
  quads: true,
  hamstrings: true,
  glutes: true,
  calves: true,
};

export function BodyMap({ muscle }: { muscle: MuscleGroup }) {
  if (HAS_PHOTO[muscle]) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        {/* An intentional inset "diagram card": a soft light plate for the
            render, wrapped in a dark frame + ring so it reads as a deliberate
            anatomical inset, not a white screenshot pasted onto the dark app. */}
        <div className="rounded-[var(--radius-md)] bg-surface p-1.5 ring-1 ring-border shadow-[var(--shadow-card)]">
          <div className="rounded-[var(--radius-sm)] bg-gradient-to-b from-white to-neutral-200 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/muscles/${muscle}.png`}
              alt={`Anatomical figure with the ${muscle} highlighted in red`}
              className="h-40 w-auto object-contain"
              loading="lazy"
            />
          </div>
        </div>
        <span className="text-[0.6rem] text-muted/70">
          anatomy · Anatomography, CC BY-SA
        </span>
      </div>
    );
  }
  const { view, marks } = MAP[muscle];
  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 120 200"
        className="h-40 w-auto"
        role="img"
        aria-label={`Figure highlighting the ${muscle}, ${view} view`}
      >
        <Silhouette />
        <g fill="var(--accent, #a3e635)" opacity="0.9">
          {marks}
        </g>
      </svg>
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted">
        {view} view
      </span>
    </div>
  );
}

// ── Recovery heatmap ────────────────────────────────────────────────────────
// Colour every muscle by how long since you trained it: freshly worked = warm
// (needs rest), long-rested = cool green (ready). The whole-body "it knows my
// body" glance that Fitbod paywalls — here it's free, from data we already have.

type RecoveryState = "worked" | "recovering" | "ready" | "untrained";

// Never-trained muscles are "no data", not "ready" — same reading the coach
// gives them (it treats missing as maximally stale and prioritises them).
function recoveryState(days: number | undefined): RecoveryState {
  if (days === undefined) return "untrained";
  if (days >= 4) return "ready";
  if (days >= 2) return "recovering";
  return "worked"; // trained in last ~2 days, still fatigued
}

const STATE_COLOR: Record<RecoveryState, string> = {
  worked: "var(--push, #ff6a2b)",
  recovering: "var(--back-off, #ffb020)",
  ready: "var(--good, #46d18a)",
  untrained: "#6b7280", // neutral gray, sits quietly on the dark silhouette
};

// "Recovering" also gets a diagonal hatch so the two warm states don't rely on
// hue alone (orange vs amber is invisible to some colourblind eyes).
const HATCH_CSS = `repeating-linear-gradient(45deg, ${STATE_COLOR.recovering} 0 2px, rgba(0,0,0,0.55) 2px 3px)`;

const FRONT: MuscleGroup[] = ["chest", "shoulders", "biceps", "forearms", "core", "quads"];
const BACK: MuscleGroup[] = ["back", "traps", "triceps", "glutes", "hamstrings", "calves"];

function HeatFigure({
  muscles,
  daysSince,
}: {
  muscles: MuscleGroup[];
  daysSince: Partial<Record<MuscleGroup, number>>;
}) {
  return (
    <svg viewBox="0 0 120 205" className="h-52 w-auto" aria-hidden="true">
      <defs>
        <filter id="heatGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
        <pattern id="heatHatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3" height="3" fill={STATE_COLOR.recovering} />
          <line x1="0" y1="0" x2="0" y2="3" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" />
        </pattern>
      </defs>
      <Silhouette />
      {/* strong soft glow — the "heat" */}
      <g filter="url(#heatGlow)" opacity="0.7">
        {muscles.map((m) => (
          <g key={m} fill={STATE_COLOR[recoveryState(daysSince[m])]}>
            {MAP[m].marks}
          </g>
        ))}
      </g>
      {/* faint crisp core so the shape stays legible; hatch marks "recovering" */}
      {muscles.map((m) => {
        const state = recoveryState(daysSince[m]);
        return (
          <g key={m} fill={state === "recovering" ? "url(#heatHatch)" : STATE_COLOR[state]} opacity="0.45">
            {MAP[m].marks}
          </g>
        );
      })}
    </svg>
  );
}

// Screen-reader line for one muscle: "Quads — worked". State only, no date:
// the value here is recovery-ADJUSTED (secondary/run touches carry a +1
// discount), so phrasing it as "trained N days ago" would misstate when the
// user actually trained.
function srLine(m: MuscleGroup, days: number | undefined): string {
  const name = m[0].toUpperCase() + m.slice(1);
  return `${name} — ${days === undefined ? "untrained" : recoveryState(days)}`;
}

export function RecoveryMap({
  daysSince,
}: {
  daysSince: Partial<Record<MuscleGroup, number>>;
}) {
  return (
    <div>
      {/* the figures are aria-hidden — this list IS the map for screen readers */}
      <ul className="sr-only">
        {[...FRONT, ...BACK].map((m) => (
          <li key={m}>{srLine(m, daysSince[m])}</li>
        ))}
      </ul>
      <div className="flex items-end justify-center gap-6" aria-hidden="true">
        <figure className="flex flex-col items-center">
          <HeatFigure muscles={FRONT} daysSince={daysSince} />
          <figcaption className="text-[0.6rem] uppercase tracking-wider text-muted">front</figcaption>
        </figure>
        <figure className="flex flex-col items-center">
          <HeatFigure muscles={BACK} daysSince={daysSince} />
          <figcaption className="text-[0.6rem] uppercase tracking-wider text-muted">back</figcaption>
        </figure>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-[0.65rem] text-muted">
        <Legend color={STATE_COLOR.ready} label="ready" />
        <Legend color={HATCH_CSS} label="recovering" />
        <Legend color={STATE_COLOR.worked} label="worked" />
        <Legend color={STATE_COLOR.untrained} label="untrained" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
