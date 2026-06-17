import { ok, readBody, profileSchema } from "@/lib/api";
import { getProfile, updateProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await getProfile());
}

export async function PUT(req: Request) {
  const body = await readBody(req, profileSchema);
  if ("error" in body) return body.error;
  return ok(await updateProfile(body.data));
}
