"use client";

import type { MuscleGroup } from "@/lib/exercise-library";

// A hand-drawn stylised figure that lights up the muscle you tapped. Not medical
// anatomy — a simple "here's roughly where it is on the body" so the name means
// something. Front or back view depending on where the muscle actually sits.
// Colours come from CSS vars so it matches light/dark automatically.

type View = "front" | "back";

// Per muscle: which side of the body to show, and the highlight shapes drawn on
// top of the silhouette (mirrored left/right where the muscle is paired).
const MAP: Record<MuscleGroup, { view: View; marks: React.ReactNode }> = {
  chest: {
    view: "front",
    marks: (
      <>
        <ellipse cx="52" cy="60" rx="10" ry="8" />
        <ellipse cx="68" cy="60" rx="10" ry="8" />
      </>
    ),
  },
  back: {
    view: "back",
    marks: <path d="M42 50 h36 v34 l-18 8 -18 -8 Z" />,
  },
  shoulders: {
    view: "front",
    marks: (
      <>
        <circle cx="40" cy="50" r="8" />
        <circle cx="80" cy="50" r="8" />
      </>
    ),
  },
  biceps: {
    view: "front",
    marks: (
      <>
        <rect x="30" y="58" width="9" height="18" rx="4.5" />
        <rect x="81" y="58" width="9" height="18" rx="4.5" />
      </>
    ),
  },
  triceps: {
    view: "back",
    marks: (
      <>
        <rect x="29" y="58" width="9" height="20" rx="4.5" />
        <rect x="82" y="58" width="9" height="20" rx="4.5" />
      </>
    ),
  },
  forearms: {
    view: "front",
    marks: (
      <>
        <rect x="27" y="78" width="8" height="18" rx="4" />
        <rect x="85" y="78" width="8" height="18" rx="4" />
      </>
    ),
  },
  core: {
    view: "front",
    marks: <rect x="50" y="70" width="20" height="26" rx="5" />,
  },
  quads: {
    view: "front",
    marks: (
      <>
        <rect x="47" y="120" width="12" height="34" rx="6" />
        <rect x="61" y="120" width="12" height="34" rx="6" />
      </>
    ),
  },
  hamstrings: {
    view: "back",
    marks: (
      <>
        <rect x="47" y="122" width="12" height="32" rx="6" />
        <rect x="61" y="122" width="12" height="32" rx="6" />
      </>
    ),
  },
  glutes: {
    view: "back",
    marks: <rect x="46" y="100" width="28" height="20" rx="8" />,
  },
  calves: {
    view: "back",
    marks: (
      <>
        <rect x="48" y="162" width="10" height="26" rx="5" />
        <rect x="62" y="162" width="10" height="26" rx="5" />
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

function recoveryColor(days: number | undefined): string {
  if (days === undefined || days >= 4) return "var(--good, #46d18a)"; // fresh / ready
  if (days >= 2) return "var(--back-off, #ffb020)"; // recovering
  return "var(--push, #ff6a2b)"; // trained in last ~2 days, still fatigued
}

const FRONT: MuscleGroup[] = ["chest", "shoulders", "biceps", "forearms", "core", "quads"];
const BACK: MuscleGroup[] = ["back", "triceps", "glutes", "hamstrings", "calves"];

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
      </defs>
      <Silhouette />
      {/* strong soft glow — the "heat" */}
      <g filter="url(#heatGlow)" opacity="0.7">
        {muscles.map((m) => (
          <g key={m} fill={recoveryColor(daysSince[m])}>
            {MAP[m].marks}
          </g>
        ))}
      </g>
      {/* faint crisp core so the shape stays legible */}
      {muscles.map((m) => (
        <g key={m} fill={recoveryColor(daysSince[m])} opacity="0.45">
          {MAP[m].marks}
        </g>
      ))}
    </svg>
  );
}

export function RecoveryMap({
  daysSince,
}: {
  daysSince: Partial<Record<MuscleGroup, number>>;
}) {
  return (
    <div>
      <div className="flex items-end justify-center gap-6">
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
        <Legend color="var(--good, #46d18a)" label="ready" />
        <Legend color="var(--back-off, #ffb020)" label="recovering" />
        <Legend color="var(--push, #ff6a2b)" label="worked" />
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
