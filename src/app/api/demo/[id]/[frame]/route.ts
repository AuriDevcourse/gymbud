import { fail } from "@/lib/api";
import { getFrame } from "@/lib/demos";

export const dynamic = "force-dynamic";

// Serves a cached demo photo frame from our own origin.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; frame: string }> },
) {
  const { id, frame } = await params;
  const i = Number(frame);
  if (!Number.isInteger(i) || i < 0 || i > 5) return fail(400, "bad_frame", "Bad frame.");

  const buf = getFrame(id, i);
  if (!buf) return fail(404, "no_frame", "No frame.");

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=604800",
    },
  });
}
