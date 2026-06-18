import { z } from "zod";
import { EXERCISES_BY_ID, type Equipment } from "./exercise-library";

// ── Response helpers (meaningful errors, never a bare 500) ─────────────────
export function ok(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Parse + validate a JSON body. Caps size to reject oversized payloads. */
export async function readBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { error: Response }> {
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > 10_000) {
      return { error: fail(413, "too_large", "Request body too large.") };
    }
    raw = text ? JSON.parse(text) : {};
  } catch {
    return { error: fail(400, "bad_json", "Body must be valid JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: fail(422, "invalid", parsed.error.issues[0]?.message ?? "Invalid input."),
    };
  }
  return { data: parsed.data };
}

/** Parse a numeric route param. */
export function intParam(v: string): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function knownExercise(id: string): boolean {
  return Boolean(EXERCISES_BY_ID[id]);
}

// ── Schemas ─────────────────────────────────────────────────────────────────
const EQUIPMENT = [
  "barbell", "dumbbell", "machine", "cable",
  "bodyweight", "kettlebell", "band", "smith",
] as const;

export const profileSchema = z.object({
  goal: z.enum(["muscle_gain", "fat_loss", "strength", "general"]),
  daysPerWeek: z.number().int().min(1).max(7),
  equipment: z.array(z.enum(EQUIPMENT)).max(8),
  unit: z.enum(["kg", "lb"]),
  onboarded: z.boolean().optional(),
});

export const bodyWeightSchema = z.object({
  weight: z.number().positive().max(635), // sanity cap (kg)
  loggedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.")
    .optional(),
});

export const setSchema = z.object({
  weight: z.number().min(0).max(1000),
  reps: z.number().int().min(1).max(100),
  type: z.enum(["normal", "warmup", "drop", "failure"]).optional(),
});

export const addExerciseSchema = z.object({
  exerciseId: z.string().min(1).max(80),
});

export const swapSchema = z.object({
  swapTo: z.string().min(1).max(80),
});

export const finishSchema = z.object({
  finish: z.literal(true).optional(),
  note: z.string().max(500).nullable().optional(),
});

export const coachSchema = z.object({
  question: z.string().trim().min(2, "Ask a question.").max(500, "Keep it under 500 characters."),
});

export type EquipmentList = Equipment[];
