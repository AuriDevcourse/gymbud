"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { Button } from "./ui";
import { api } from "@/lib/format";
import type { Session, SessionExercise } from "@/lib/types";

export function StartSuggested({
  exerciseIds,
  label = "Start this workout",
}: {
  exerciseIds: string[];
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await api<Session>("/api/sessions", { method: "POST" });
      // only pre-fill a brand new, empty session
      if (session.exercises.length === 0) {
        for (const id of exerciseIds) {
          await api<SessionExercise>(`/api/sessions/${session.id}/exercises`, {
            method: "POST",
            body: JSON.stringify({ exerciseId: id }),
          });
        }
      }
      router.push("/workout");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div>
      <Button variant="accent" size="lg" className="w-full" onClick={start} disabled={busy}>
        {busy ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Play size={18} aria-hidden="true" />
        )}
        {label}
      </Button>
      {error && <p className="mt-2 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
