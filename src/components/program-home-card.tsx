"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Play } from "lucide-react";
import { PENDING_WORKOUT_KEY } from "./start-suggested";
import { readProgram } from "./programs-client";
import { PROGRAMS_BY_ID } from "@/lib/programs";

const PROG_KEY = "gymbud:program";
const DAY_KEY = "gymbud:program-day";

// Read the program cursor without a hydration mismatch: useSyncExternalStore
// renders the server default first, then swaps to the real localStorage value.
const subscribe = () => () => {};
const serverSnap = JSON.stringify({ id: null, day: 0 });
function useProgramCursor(): { id: string | null; day: number } {
  const snap = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(readProgram()),
    () => serverSnap,
  );
  return JSON.parse(snap);
}

// Home-screen "continue your program" card. Reads the same localStorage cursor
// the Programs screen writes, so it always points at the day you're up to.
export function ProgramHomeCard({ hasActive }: { hasActive: boolean }) {
  const router = useRouter();
  const state = useProgramCursor();

  const prog = state.id ? PROGRAMS_BY_ID[state.id] : null;
  if (!prog) {
    // No program chosen yet — a gentle nudge to pick one.
    return (
      <Link
        href="/programs"
        className="group flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow-card)] transition hover:border-border/80 hover:bg-surface-2 active:scale-[0.99]"
      >
        <span className="min-w-0">
          <span className="block font-medium">Follow a program</span>
          <span className="block text-xs text-muted">
            Proven plans that tell you what to do each day
          </span>
        </span>
        <ChevronRight
          className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    );
  }

  const idx = state.day % prog.days.length;
  const day = prog.days[idx];

  const start = () => {
    const next = (idx + 1) % prog.days.length;
    try {
      localStorage.setItem(PROG_KEY, prog.id);
      localStorage.setItem(DAY_KEY, String(next));
      sessionStorage.setItem(
        PENDING_WORKOUT_KEY,
        JSON.stringify({ exerciseIds: day.exercises }),
      );
    } catch {
      /* storage unavailable */
    }
    router.push("/workout");
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-accent/40 bg-accent/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {prog.name} · up next
          </p>
          <p className="display text-lg font-bold">{day.name}</p>
          <p className="truncate text-sm text-muted">{day.focus}</p>
        </div>
        <Link href="/programs" className="shrink-0 text-xs text-muted underline-offset-2 hover:underline">
          Change
        </Link>
      </div>
      <button
        onClick={start}
        disabled={hasActive}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent py-3.5 text-base font-semibold tracking-tight text-accent-foreground shadow-[var(--shadow-accent)] disabled:opacity-50 disabled:shadow-none"
      >
        <Play size={18} aria-hidden="true" />
        {hasActive ? "Finish your open workout first" : `Start ${day.name}`}
      </button>
    </div>
  );
}
