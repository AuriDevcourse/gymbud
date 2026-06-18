import { coachSchema, fail, readBody } from "@/lib/api";

export const dynamic = "force-dynamic";

// Try the current stable flash first, then the rolling alias as a fallback
// (the alias occasionally returns UNAVAILABLE under load).
const MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

const SYSTEM = [
  "You are a concise, knowledgeable gym and strength-training coach inside a workout app.",
  "Only answer questions about training: exercise form & technique, programming, sets/reps/rest,",
  "muscle groups, equipment, warm-up/cool-down, recovery, and nutrition as it relates to training.",
  "If the user asks about anything off-topic, briefly say it's outside what you help with and steer",
  "back to training. Keep answers short and practical — a few sentences or a tight list. Plain text,",
  "no markdown headings, no emojis.",
].join(" ");

export async function POST(req: Request) {
  const body = await readBody(req, coachSchema);
  if ("error" in body) return body.error;

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return fail(503, "ai_unconfigured", "AI coach isn't set up yet. Add GEMINI_API_KEY to enable it.");
  }

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: body.data.question }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
  });

  let upstream: Response | null = null;
  for (const model of MODELS) {
    try {
      const res = await fetch(endpoint(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": key },
        body: payload,
      });
      if (res.ok && res.body) {
        upstream = res;
        break;
      }
    } catch {
      /* try the next model */
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
