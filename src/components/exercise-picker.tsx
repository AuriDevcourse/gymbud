"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Sheet } from "./sheet";
import { Chip } from "./ui";
import {
  EXERCISES,
  type Exercise,
  type MuscleGroup,
} from "@/lib/exercise-library";
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from "@/lib/types";

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ex: Exercise) => void;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (muscle !== "all" && e.muscleGroup !== muscle) return false;
      if (needle && !e.name.toLowerCase().includes(needle)) return false;
      return true;
    }).slice(0, 80);
  }, [q, muscle]);

  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <div className="relative mb-3">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background pl-10 pr-3 text-foreground outline-none focus:border-accent"
        />
      </div>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip active={muscle === "all"} onClick={() => setMuscle("all")}>
          All
        </FilterChip>
        {MUSCLES.map((m) => (
          <FilterChip key={m} active={muscle === m} onClick={() => setMuscle(m)}>
            {MUSCLE_LABELS[m]}
          </FilterChip>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5">
        {results.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onPick(e)}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-3 text-left active:bg-surface-3"
            >
              <span className="font-medium">{e.name}</span>
              <span className="flex shrink-0 gap-1.5">
                <Chip tone="muted">{EQUIPMENT_LABELS[e.equipment]}</Chip>
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">No matches.</li>
        )}
      </ul>
    </Sheet>
  );
}

function FilterChip({
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
          : "border-border bg-surface-2 text-muted-strong"
      }`}
    >
      {children}
    </button>
  );
}
