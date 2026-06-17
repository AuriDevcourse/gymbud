import { ok } from "@/lib/api";
import { activeSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await activeSession());
}
