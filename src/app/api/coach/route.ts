import { coachSchema, fail, readBody } from "@/lib/api";
import {
  getProfile,
  getSession,
  latestBodyWeight,
  listSessions,
  workoutStats,
} from "@/lib/store";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import { EQUIPMENT_LABELS, GOAL_LABELS } from "@/lib/types";
import { calendarDaysAgo } from "@/lib/date";

export const dynamic = "force-dynamic";

function daysAgo(s: string): string {
  const d = calendarDaysAgo(s);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

// A compact snapshot of the lifter's real training so the coach can answer from
// their actual numbers, not generic advice. Best-effort: on any error the coach
// still works, just without personal context.
async function trainingContext(unitFallback = "kg"): Promise<string> {
  try {
    const [profile, sessions, bw, stats] = await Promise.all([
      getProfile(),
      listSessions(6),
      latestBodyWeight(),
      workoutStats(),
    ]);
    const u = profile.unit ?? unitFallback;
    const lines: string[] = [];
    const equip = profile.equipment.length
      ? profile.equipment.map((e) => EQUIPMENT_LABELS[e]).join(", ")
      : "all equipment";
    lines.push(
      `Goal: ${GOAL_LABELS[profile.goal]}. Trains ${profile.daysPerWeek} days/week. Units: ${u}. Equipment: ${equip}.`,
    );
    if (bw) lines.push(`Bodyweight: ${bw.weight}${u} (${daysAgo(bw.loggedAt)}).`);
    lines.push(
      `Streak: ${stats.streak} week(s). ${stats.thisWeekSets} sets in the last 7 days. ${stats.totalWorkouts} workouts all-time.`,
    );

    const finished = sessions.filter((s) => s.finishedAt).slice(0, 3);
    if (finished.length) {
      lines.push("Recent workouts (top working set per exercise):");
      for (const s of finished) {
        const full = await getSession(s.id);
        if (!full) continue;
        const parts: string[] = [];
        for (const se of full.exercises) {
          const working = se.sets.filter((x) => x.type !== "warmup");
          if (!working.length) continue;
          const top = working.reduce((a, b) =>
            b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a,
          );
          const name = EXERCISES_BY_ID[se.exerciseId]?.name ?? se.exerciseId;
          parts.push(`${name} ${top.weight}${u}x${top.reps}`);
        }
        if (parts.length) lines.push(`- ${daysAgo(s.startedAt)}: ${parts.slice(0, 8).join(", ")}`);
      }
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

// Fallback chain: any one of these can be briefly UNAVAILABLE under load, so we
// try them in order (and do a second pass) before giving up.
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"];
const PASSES = 2;
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

const SYSTEM = [
  "You are a concise, knowledgeable gym and strength-training coach inside a workout app.",
  "Only answer questions about training: exercise form & technique, programming, sets/reps/rest,",
  "muscle groups, equipment, warm-up/cool-down, recovery, and nutrition as it relates to training.",
  "If the user asks about anything off-topic, briefly say it's outside what you help with and steer",
  "back to training. Keep answers short and practical: a few sentences or a tight list. Plain text,",
  "no markdown headings, no emojis, no dashes. Write like a real coach talking to a person.",
].join(" ");

export async function POST(req: Request) {
  const body = await readBody(req, coachSchema);
  if ("error" in body) return body.error;

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return fail(503, "ai_unconfigured", "AI coach isn't set up yet. Add GEMINI_API_KEY to enable it.");
  }

  const ctx = await trainingContext();
  const system = ctx
    ? `${SYSTEM}\n\nBelow is this lifter's recent training data. Use it to personalise your answer: reference their actual lifts, goal, and equipment when relevant. Do not repeat it back verbatim; only cite what's useful.\n\n${ctx}`
    : SYSTEM;

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: body.data.question }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
  });

  let upstream: Response | null = null;
  outer: for (let pass = 0; pass < PASSES; pass++) {
    for (const model of MODELS) {
      try {
        const res = await fetch(endpoint(model), {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": key },
          body: payload,
        });
        if (res.ok && res.body) {
          upstream = res;
          break outer;
        }
      } catch {
        /* try the next model */
      }
    }
  }

  if (!upstream || !upstream.body) {
    return fail(502, "ai_error", "The AI service is busy right now. Try again in a moment.");
  }

  // Transform Gemini's SSE into a plain-text delta stream the client appends.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // keep the trailing partial line
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const parts = json?.candidates?.[0]?.content?.parts ?? [];
              for (const p of parts) {
                if (typeof p?.text === "string" && p.text) {
                  controller.enqueue(encoder.encode(p.text));
                }
              }
            } catch {
              /* skip malformed chunk */
            }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
