"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Play, Sparkles } from "lucide-react";
import { Button } from "./ui";
import { PENDING_WORKOUT_KEY } from "./start-suggested";
import { PROGRAMS, PROGRAMS_BY_ID } from "@/lib/programs";

// localStorage keys — the whole "which program, which day next" state. Client
// only, so no migration and your logged workouts are never touched.
const PROG_KEY = "gymbud:program";
const DAY_KEY = "gymbud:program-day";

export function readProgram(): { id: string | null; day: number } {
  if (typeof window === "undefined") return { id: null, day: 0 };
  try {
    return {
      id: localStorage.getItem(PROG_KEY),
      day: Number(localStorage.getItem(DAY_KEY) ?? 0) || 0,
    };
  } catch {
    return { id: null, day: 0 };
  }
}

export function ProgramsClient() {
  const router = useRouter();
  // Seed straight from storage (lazy initializers run on the client; readProgram
  // returns defaults server-side). No mount effect → no set-state-in-effect.
  const [active, setActive] = useState<string | null>(() => readProgram().id);
  const [dayIdx, setDayIdx] = useState(() => readProgram().day);
  const [open, setOpen] = useState<string | null>(() => readProgram().id ?? PROGRAMS[0].id);

  const choose = (id: string) => {
    setActive(id);
    setDayIdx(0);
    setOpen(id);
    try {
      localStorage.setItem(PROG_KEY, id);
      localStorage.setItem(DAY_KEY, "0");
    } catch {
      /* storage unavailable */
    }
  };

  // Start a specific day: advance the cursor to the NEXT day, hand the exercises
  // to the workout page, and go. Progression is automatic from history.
  const startDay = (programId: string, idx: number) => {
    const prog = PROGRAMS_BY_ID[programId];
    if (!prog) return;
    const next = (idx + 1) % prog.days.length;
    try {
      localStorage.setItem(PROG_KEY, programId);
      localStorage.setItem(DAY_KEY, String(next));
      sessionStorage.setItem(
        PENDING_WORKOUT_KEY,
        JSON.stringify({ exerciseIds: prog.days[idx].exercises }),
      );
    } catch {
      /* storage unavailable — workout page falls back to manual start */
    }
    router.push("/workout");
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="mb-1">
        <h1 className="display text-2xl font-bold">Programs</h1>
        <p className="text-sm text-muted">
          Pick a proven plan. Press Start and it runs each day for you, adding weight as you get
          stronger.
        </p>
      </header>

      {PROGRAMS.map((p) => {
        const isActive = active === p.id;
        const isOpen = open === p.id;
        const nextDay = isActive ? dayIdx : 0;
        return (
          <div
            key={p.id}
            className={`overflow-hidden rounded-[var(--radius-lg)] border bg-surface ${
              isActive ? "border-accent/50" : "border-border"
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : p.id)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="display font-semibold">{p.name}</h2>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[0.65rem] font-semibold text-accent">
                      <Check size={11} aria-hidden="true" />
                      Active
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted">
                  {p.level} · {p.daysPerWeek}×/week · {p.blurb}
                </p>
              </div>
              <ChevronDown
                size={18}
                className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {isOpen && (
              <div className="border-t border-border px-4 py-3">
                <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-strong">
                  <Sparkles size={13} className="text-accent" aria-hidden="true" />
                  Best for: {p.best}
                </p>
                <ul className="flex flex-col gap-2">
                  {p.days.map((d, i) => {
                    const upNext = isActive && i === nextDay;
                    return (
                      <li
                        key={d.name}
                        className={`rounded-[var(--radius-md)] border p-3 ${
                          upNext ? "border-accent/50 bg-accent/5" : "border-border bg-surface-2"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{d.name}</span>
                              {upNext && (
                                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-accent-foreground">
                                  Up next
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted">{d.focus}</p>
                            <p className="mt-0.5 text-[0.7rem] text-muted">
                              {d.exercises.length} exercises
                            </p>
                          </div>
                          <button
                            onClick={() => startDay(p.id, i)}
                            aria-label={`Start ${p.name} ${d.name}`}
                            className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-accent)]"
                          >
                            <Play size={15} aria-hidden="true" />
                            Start
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {!isActive && (
                  <Button
                    variant="surface"
                    size="md"
                    className="mt-3 w-full"
                    onClick={() => choose(p.id)}
                  >
                    Follow this program
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
