import { fail, ok } from "@/lib/api";
import { getAlternatives } from "@/lib/coach";
import { EXERCISES_BY_ID, type Equipment } from "@/lib/exercise-library";
import { getProfile } from "@/lib/store";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const base = EXERCISES_BY_ID[id];
  if (!base) return fail(404, "not_found", "Unknown exercise.");

  const exclude = req.nextUrl.searchParams.get("exclude") as Equipment | null;
  const available = (await getProfile()).equipment;

  const alts = getAlternatives(id, {
    available,
    excludeEquipment: exclude ?? base.equipment,
  }).slice(0, 12);

  return ok({ base, alternatives: alts });
}
