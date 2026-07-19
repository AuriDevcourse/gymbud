"use client";

import { useEffect, useState } from "react";
import { Footprints } from "lucide-react";
import { RunLogger } from "./run-logger";
import { api, fmtDuration } from "@/lib/format";
import { RUN_KIND_LABELS, type Run } from "@/lib/types";

// Cardio done as part of THIS workout — runs logged mid-session show up right
// here instead of disappearing onto the home screen, so a "run + a few lifts"
// day reads as one workout.
export function SessionCardio({ sessionId }: { sessionId: number }) {
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    let cancelled = false;
    api<Run[]>(`/api/runs?session=${sessionId}`)
      .then((r) => {
        if (!cancelled) setRuns(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="mt-3">
      {runs.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {runs.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Footprints size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {RUN_KIND_LABELS[r.kind]}
              </span>
              <span className="stat-num shrink-0 text-sm text-muted-strong">
                {r.distance > 0 ? `${r.distance} km · ` : ""}
                {fmtDuration(r.duration)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <RunLogger
        sessionId={sessionId}
        onSaved={(run) => setRuns((rs) => [...rs, run])}
        trigger={(open) => (
          <button
            onClick={open}
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-3 py-2.5 text-sm font-medium text-muted-strong active:bg-surface-2"
          >
            <Footprints size={15} aria-hidden="true" />
            Add run
          </button>
        )}
      />
    </div>
  );
}
