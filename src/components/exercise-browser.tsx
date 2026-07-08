"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { Sheet } from "./sheet";
import { DemoImage } from "./demo";
import { Chip } from "./ui";
import {
  EXERCISES,
  EXERCISES_BY_ID,
  type Exercise,
  type MuscleGroup,
} from "@/lib/exercise-library";
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from "@/lib/types";

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

export function ExerciseBrowser() {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [detail, setDetail] = useState<Exercise | null>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (muscle !== "all" && e.muscleGroup !== muscle) return false;
      if (needle && !e.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, muscle]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h1 className="display text-2xl font-bold">Exercises</h1>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${EXERCISES.length} exercises`}
          aria-label="Search exercises"
          className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-surface pl-10 pr-3 text-foreground outline-none focus:border-accent"
        />
      </div>

      {/* Wrap instead of horizontal-scroll so every group (incl. Calves, Traps)
          is visible at once — a scrolled-off chip reads as "no such exercises". */}
      <div className="flex flex-wrap gap-2">
        <Pill active={muscle === "all"} onClick={() => setMuscle("all")}>
          All
        </Pill>
        {MUSCLES.map((m) => (
          <Pill key={m} active={muscle === m} onClick={() => setMuscle(m)}>
            {MUSCLE_LABELS[m]}
          </Pill>
        ))}
      </div>

      <p className="-mt-1 text-xs text-muted">{results.length} exercises</p>

      <ul className="flex flex-col gap-1.5">
        {results.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => setDetail(e)}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 text-left active:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{e.name}</span>
                <span className="text-xs text-muted">
                  {MUSCLE_LABELS[e.muscleGroup]} · {e.type}
                </span>
              </span>
              <Chip tone="muted">{EQUIPMENT_LABELS[e.equipment]}</Chip>
            </button>
          </li>
        ))}
      </ul>

      <Sheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
      >
        {detail && <Detail ex={detail} onOpen={(ex) => setDetail(ex)} />}
      </Sheet>
    </div>
  );
}

function Detail({ ex, onOpen }: { ex: Exercise; onOpen: (e: Exercise) => void }) {
  const alts = ex.alternatives
    .map((id) => EXERCISES_BY_ID[id])
    .filter(Boolean) as Exercise[];
  return (
    <div>
      <div className="mb-4">
        <DemoImage key={ex.id} exerciseId={ex.id} name={ex.name} />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip tone="accent">{MUSCLE_LABELS[ex.muscleGroup]}</Chip>
        {ex.secondary?.map((m) => (
          <Chip key={m} tone="muted">
            {MUSCLE_LABELS[m]}
          </Chip>
        ))}
        <Chip>{EQUIPMENT_LABELS[ex.equipment]}</Chip>
        <Chip tone="muted">{ex.type}</Chip>
      </div>

      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted">
        <ArrowLeftRight size={14} aria-hidden="true" /> If it&apos;s taken, swap to
      </p>
      <ul className="flex flex-col gap-1.5">
        {alts.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => onOpen(a)}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2.5 text-left active:bg-surface-3"
            >
              <span className="font-medium">{a.name}</span>
              <Chip tone={a.equipment === ex.equipment ? "muted" : "accent"}>
                {EQUIPMENT_LABELS[a.equipment]}
              </Chip>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-surface text-muted-strong"
      }`}
    >
      {children}
    </button>
  );
}
