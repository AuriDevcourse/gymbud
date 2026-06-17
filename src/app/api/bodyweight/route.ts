import { ok, readBody, bodyWeightSchema } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { addBodyWeight, listBodyWeight } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listBodyWeight());
}

export async function POST(req: Request) {
  const body = await readBody(req, bodyWeightSchema);
  if ("error" in body) return body.error;
  const entry = await addBodyWeight(body.data.weight, body.data.loggedAt ?? todayISO());
  return ok(entry, 201);
}
