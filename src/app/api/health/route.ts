import { getDb } from "@/lib/db";
import { authEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Health probe for zero-downtime deploys (WORKFLOW.md rule 4).
export async function GET() {
  try {
    await (await getDb()).execute("SELECT 1");
    return Response.json(
      { ok: true, auth: authEnabled() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
