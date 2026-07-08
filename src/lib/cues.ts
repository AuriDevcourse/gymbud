import type { Exercise } from "./exercise-library";

// Concise, evidence-aligned coaching cues per movement pattern. Ours — so every
// lift has useful guidance even when the external photo demo is missing or wrong.
// Kept practical and short; the science notes below reflect current consensus on
// hypertrophy (train close to failure, control the eccentric, full range /
// stretch under load, and rest long enough to keep quality high).

export interface Cues {
  pattern: string; // human label, e.g. "Horizontal press"
  cues: string[]; // 2–4 short form cues, most important first
}

type Rule = { pattern: string; test: (ex: Exercise, name: string) => boolean; cues: string[] };

// Universal, evidence-based reminders appended to every exercise (trimmed to fit).
const UNIVERSAL: string[] = [
  "Push each hard set to within 1–3 reps of failure — that effort is what drives growth.",
  "Lower the weight under control (about 2 seconds); the loaded stretch builds the most muscle.",
];

const RULES: Rule[] = [
  {
    pattern: "Incline press",
    test: (_e, n) => n.includes("incline") && (n.includes("press") || n.includes("bench")),
    cues: [
      "Set the bench to 15–30° — steeper than that shifts the work onto your shoulders.",
      "Lower the bar to your upper chest, elbows tucked to about 45° from your body.",
      "Drive up and slightly back, keeping shoulder blades pinned to the bench.",
    ],
  },
  {
    pattern: "Horizontal press",
    test: (e, n) =>
      (e.muscleGroup === "chest" && (n.includes("press") || n.includes("bench") || n.includes("push"))) ||
      n.includes("push-up") ||
      n.includes("push up"),
    cues: [
      "Lower to mid-chest with elbows about 45° from your torso — not flared to 90°.",
      "Keep shoulder blades pulled back and down; feet planted, glutes tight.",
      "Press to full lockout without letting your lower back arch off the bench.",
    ],
  },
  {
    pattern: "Chest fly",
    test: (_e, n) => n.includes("fly") || n.includes("pec deck") || n.includes("pec-deck"),
    cues: [
      "Keep a soft, fixed bend in the elbows — hug, don't press.",
      "Open until you feel a strong chest stretch, then squeeze back together.",
      "Go lighter than pressing; this is about the stretch, not max load.",
    ],
  },
  {
    pattern: "Overhead press",
    test: (_e, n) => n.includes("overhead") || n.includes("shoulder press") || n.includes("military") || n.includes("arnold"),
    cues: [
      "Brace your abs and squeeze glutes so you don't lean back and press with your chest.",
      "Bar/dumbbells travel in a straight line past your forehead to full lockout.",
      "Stop each rep just short of shrugging; keep the work on the delts.",
    ],
  },
  {
    pattern: "Lateral raise",
    test: (_e, n) => n.includes("lateral") || n.includes("side raise") || n.includes("lateral raise"),
    cues: [
      "Lead with your elbows, not your hands — imagine pouring from a jug.",
      "Raise to about shoulder height; higher brings the traps in.",
      "Lower slowly. This is a light, high-rep movement — leave the ego weight.",
    ],
  },
  {
    pattern: "Vertical pull",
    test: (_e, n) => n.includes("pulldown") || n.includes("pull-up") || n.includes("pull up") || n.includes("chin-up") || n.includes("chin up"),
    cues: [
      "Start from a full hang/stretch; drive your elbows down toward your ribs.",
      "Pull your chest to the bar, not your chin — lead with the chest.",
      "Control the way back up to a full stretch; don't just drop.",
    ],
  },
  {
    pattern: "Horizontal pull (row)",
    test: (e, n) => n.includes("row") || (e.muscleGroup === "back" && n.includes("pull")),
    cues: [
      "Pull to your lower ribs / belly button, squeezing shoulder blades together.",
      "Keep a flat back and still torso — no jerking with the lower back.",
      "Pause a beat at the top; control the stretch on the way out.",
    ],
  },
  {
    pattern: "Shrug (traps)",
    test: (_e, n) => n.includes("shrug"),
    cues: [
      "Lift straight up toward your ears — don't roll the shoulders (no benefit, adds risk).",
      "Pause and squeeze hard at the top for a second.",
      "Let the weight stretch the traps fully at the bottom before the next rep.",
    ],
  },
  {
    pattern: "Squat",
    test: (_e, n) => n.includes("squat") && !n.includes("split") && !n.includes("bulgarian"),
    cues: [
      "Brace your core, break at the hips and knees together, and sit down between your legs.",
      "Descend to at least thighs-parallel; let the knees travel over the toes.",
      "Drive up through mid-foot, keeping your chest proud and back neutral.",
    ],
  },
  {
    pattern: "Hip hinge",
    test: (e, n) =>
      n.includes("deadlift") || n.includes("rdl") || n.includes("romanian") ||
      n.includes("hip thrust") || n.includes("glute bridge") || n.includes("swing") ||
      n.includes("good morning") || n.includes("pull-through") || n.includes("pull through") ||
      (e.muscleGroup === "hamstrings" && n.includes("dead")),
    cues: [
      "Push your hips back with a long, neutral spine — this is a hinge, not a squat.",
      "Feel the stretch in your hamstrings, then drive your hips forward to stand tall.",
      "Keep the bar/weight close to your body and squeeze the glutes at the top.",
    ],
  },
  {
    pattern: "Lunge / split squat",
    test: (_e, n) => n.includes("lunge") || n.includes("split squat") || n.includes("bulgarian") || n.includes("step-up") || n.includes("step up"),
    cues: [
      "Keep your front shin fairly vertical and knee tracking over the foot.",
      "Drop the back knee straight down; torso tall or with a slight forward lean.",
      "Push through your front heel to stand; go slow to keep your balance.",
    ],
  },
  {
    pattern: "Leg curl",
    test: (_e, n) => n.includes("leg curl") || n.includes("hamstring curl") || n.includes("nordic"),
    cues: [
      "Curl with control and squeeze the hamstrings hard at the top.",
      "Lower slowly to a full stretch — don't let the weight slam back.",
      "Keep your hips down on the pad; don't arch to cheat the weight up.",
    ],
  },
  {
    pattern: "Leg extension",
    test: (_e, n) => n.includes("leg extension") || n.includes("quad extension"),
    cues: [
      "Straighten fully and pause to squeeze the quads at the top.",
      "Lower under control; resist the weight the whole way down.",
      "Keep your back against the pad — no bouncing out of the bottom.",
    ],
  },
  {
    pattern: "Calf raise",
    test: (_e, n) => n.includes("calf"),
    cues: [
      "Sink into a deep stretch at the bottom of every rep.",
      "Rise all the way onto your toes and pause a beat at the top.",
      "Slow it down — calves respond to controlled reps, not bouncing.",
    ],
  },
  {
    pattern: "Biceps curl",
    test: (e, n) => n.includes("curl") && e.muscleGroup === "biceps",
    cues: [
      "Keep your elbows pinned to your sides; only the forearm moves.",
      "Curl up and squeeze, then lower slowly to a full stretch.",
      "No swinging — if you're using your back, drop the weight.",
    ],
  },
  {
    pattern: "Triceps extension",
    test: (e, n) => e.muscleGroup === "triceps" && (n.includes("extension") || n.includes("pushdown") || n.includes("pressdown") || n.includes("skull") || n.includes("kickback") || n.includes("dip")),
    cues: [
      "Keep your upper arms/elbows still — hinge only at the elbow.",
      "Lock out fully and squeeze the triceps at the bottom/end of each rep.",
      "Control the return to a deep stretch overhead or at the top.",
    ],
  },
  {
    pattern: "Core",
    test: (e, n) => e.muscleGroup === "core" || n.includes("plank") || n.includes("crunch") || n.includes("leg raise") || n.includes("twist") || n.includes("hollow"),
    cues: [
      "Brace as if about to be lightly punched; move through the abs, not momentum.",
      "Don't pull on your neck — keep it long and relaxed.",
      "Slow, controlled reps beat fast ones; quality over quantity here.",
    ],
  },
  {
    pattern: "Forearms / grip",
    test: (e) => e.muscleGroup === "forearms",
    cues: [
      "Move only at the wrist through a full range, top to bottom.",
      "Squeeze hard at the top; lower slowly for the stretch.",
      "High reps work well here — the forearms recover fast.",
    ],
  },
];

// A generic fallback so nothing is ever left without guidance.
const GENERIC: string[] = [
  "Move through a full range of motion on every rep.",
  "Control the weight — no bouncing or using momentum.",
];

export function cuesFor(ex: Exercise): Cues {
  const name = ex.name.toLowerCase();
  const rule = RULES.find((r) => r.test(ex, name));
  const specific = rule ? rule.cues : GENERIC;
  const pattern = rule ? rule.pattern : ex.type === "compound" ? "Compound lift" : "Isolation";
  // Cap at 4 so the card stays skimmable: up to 3 specific + 1 universal.
  const cues = [...specific.slice(0, 3), UNIVERSAL[0]];
  return { pattern, cues };
}
