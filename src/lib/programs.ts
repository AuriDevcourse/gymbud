// Built-in training programs — the "just press Start and it runs a real program
// for you" loop that Boostcamp's users love. A program is only an ordered list
// of days, each an ordered list of exercise IDs. We need NO new tables and NO
// progression state of our own: the coach already reads your history and
// prescribes the next weight per lift (see recommendNext / the prescription
// card), so following a program auto-progresses for free.
//
// Every ID below must exist in exercise-library.ts. Compounds lead each day.

export interface ProgramDay {
  /** short name shown on the card, e.g. "Push" */
  name: string;
  /** one-line focus, e.g. "Chest · shoulders · triceps" */
  focus: string;
  /** ordered exercise IDs — handed straight to StartSuggested */
  exercises: string[];
}

export interface Program {
  id: string;
  name: string;
  blurb: string;
  level: "Beginner" | "Intermediate";
  daysPerWeek: number;
  /** why this one, in plain words */
  best: string;
  days: ProgramDay[];
}

export const PROGRAMS: Program[] = [
  {
    id: "fullbody-3x",
    name: "Full Body 3×",
    blurb: "Three full-body days a week. The most proven way to start.",
    level: "Beginner",
    daysPerWeek: 3,
    best: "New to lifting, or back after a break.",
    days: [
      {
        name: "Day A",
        focus: "Squat · press · row",
        exercises: [
          "barbell-back-squat",
          "barbell-bench-press",
          "barbell-bent-over-row",
          "dumbbell-shoulder-press",
          "plank",
        ],
      },
      {
        name: "Day B",
        focus: "Hinge · press · pull",
        exercises: [
          "romanian-deadlift",
          "barbell-overhead-press",
          "lat-pulldown",
          "leg-press",
          "hanging-leg-raise",
        ],
      },
      {
        name: "Day C",
        focus: "Legs · incline · row",
        exercises: [
          "leg-press",
          "incline-dumbbell-bench-press",
          "cable-seated-row",
          "dumbbell-lateral-raise",
          "cable-crunch",
        ],
      },
    ],
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    blurb: "The classic split. Push, pull, then legs — repeat.",
    level: "Intermediate",
    daysPerWeek: 6,
    best: "Training 5–6 days and want more volume per muscle.",
    days: [
      {
        name: "Push",
        focus: "Chest · shoulders · triceps",
        exercises: [
          "barbell-bench-press",
          "barbell-overhead-press",
          "incline-dumbbell-bench-press",
          "dumbbell-lateral-raise",
          "cable-tricep-pushdown",
        ],
      },
      {
        name: "Pull",
        focus: "Back · biceps",
        exercises: [
          "barbell-deadlift",
          "pull-up",
          "barbell-bent-over-row",
          "dumbbell-curl",
          "hammer-curl",
        ],
      },
      {
        name: "Legs",
        focus: "Quads · hamstrings · calves",
        exercises: [
          "barbell-back-squat",
          "romanian-deadlift",
          "leg-press",
          "leg-curl",
          "standing-calf-raise",
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    blurb: "Four days: two upper, two lower. Balanced and time-efficient.",
    level: "Intermediate",
    daysPerWeek: 4,
    best: "Training 3–4 days and want strength plus size.",
    days: [
      {
        name: "Upper A",
        focus: "Chest · back · arms",
        exercises: [
          "barbell-bench-press",
          "barbell-bent-over-row",
          "dumbbell-shoulder-press",
          "lat-pulldown",
          "barbell-curl",
          "cable-tricep-pushdown",
        ],
      },
      {
        name: "Lower A",
        focus: "Quads · hamstrings · calves",
        exercises: [
          "barbell-back-squat",
          "romanian-deadlift",
          "leg-press",
          "leg-curl",
          "standing-calf-raise",
        ],
      },
      {
        name: "Upper B",
        focus: "Shoulders · back · arms",
        exercises: [
          "barbell-overhead-press",
          "pull-up",
          "incline-dumbbell-bench-press",
          "cable-seated-row",
          "hammer-curl",
          "skull-crusher",
        ],
      },
      {
        name: "Lower B",
        focus: "Legs · glutes · calves",
        exercises: [
          "barbell-deadlift",
          "barbell-front-squat",
          "leg-extension",
          "seated-leg-curl",
          "seated-calf-raise",
        ],
      },
    ],
  },
];

export const PROGRAMS_BY_ID: Record<string, Program> = Object.fromEntries(
  PROGRAMS.map((p) => [p.id, p]),
);
