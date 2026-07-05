"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, Flame, Shuffle } from "lucide-react";
import { Button, Card, Chip, SectionTitle } from "./ui";
import { StartSuggested } from "./start-suggested";
import {
  suggestWorkout,
  FOCUS_LABELS,
  LENGTH_LABELS,
  type WorkoutFocus,
  type WorkoutLength,
} from "@/lib/coach";
import type { Equipment, MuscleGroup } from "@/lib/exercise-library";
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Goal } from "@/lib/types";

export function SuggestionCard({
  goal,
  daysPerWeek,
  available,
  daysSince,
  hasActive,
}: {
  goal: Goal;
  daysPerWeek: number;
  available: Equipment[];
  daysSince: Partial<Record<MuscleGroup, number>>;
  hasActive: boolean;
}) {
  // seed 0 = the canonical suggestion; shuffling rolls a fresh variation
  const [seed, setSeed] = useState(0);
  const [focus, setFocus] = useState<WorkoutFocus>("auto");
  const [length, setLength] = useState<WorkoutLength>("medium");

  const suggestion = useMemo(
    () => suggestWorkout({ goal, daysPerWeek, available, daysSince, seed, focus, length }),
    [goal, daysPerWeek, available, daysSince, seed, focus, length],
  );

  const FOCUSES = Object.keys(FOCUS_LABELS) as WorkoutFocus[];
  const LENGTHS = Object.keys(LENGTH_LABELS) as WorkoutLength[];
  const focusRow = useRef<HTMLDivElement>(null);

  const shuffle = () => setSeed(Math.floor(Math.random() * 1_000_000) + 1);

  return (
    <section>
      <SectionTitle right={<Chip tone="muted">{suggestion.exercises.length} moves</Chip>}>
        Today&apos;s suggestion
      </SectionTitle>
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-accent" aria-hidden="true" />
            <h3 className="display text-xl font-bold">{suggestion.title}</h3>
          </div>
          <button
            onClick={shuffle}
            aria-label="Shuffle exercises"
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted-strong active:bg-surface-3"
          >
            <Shuffle size={14} aria-hidden="true" />
            Shuffle
          </button>
        </div>
        {/* how much time you have — trims the session to fit */}
        <div className="mb-2 flex items-center gap-1.5">
          <Clock size={15} className="shrink-0 text-muted" aria-hidden="true" />
          {LENGTHS.map((l) => (
            <button
              key={l}
              onClick={() => setLength(l)}
              aria-pressed={length === l}
              className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-medium transition ${
                length === l
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surface-2 text-muted"
              }`}
            >
              {LENGTH_LABELS[l]}
            </button>
          ))}
        </div>
        {/* pick a focus, or leave on Auto. Scrollbar hidden; arrow pages right. */}
        <div className="relative mb-3">
          <div ref={focusRow} className="no-scrollbar flex gap-1.5 overflow-x-auto pr-9">
            {FOCUSES.map((f) => (
              <button
                key={f}
                onClick={() => setFocus(f)}
                aria-pressed={focus === f}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  focus === f
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface-2 text-muted"
                }`}
              >
                {FOCUS_LABELS[f]}
              </button>
            ))}
          </div>
          <button
            onClick={() => focusRow.current?.scrollBy({ left: 160, behavior: "smooth" })}
            aria-label="More workout types"
            className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-muted-strong shadow-md shadow-black/30 active:bg-surface-2"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="mb-4 mt-3 flex flex-wrap gap-1.5">
          {suggestion.focus.slice(0, 6).map((m) => (
            <Chip key={m} tone="muted">
              {MUSCLE_LABELS[m]}
            </Chip>
          ))}
        </div>
        <ol key={seed} className="mb-4 flex flex-col">
          {suggestion.exercises.map((ex, i) => (
            <li
              key={ex.id}
              className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
            >
              <span className="stat-num w-5 text-sm text-muted">{i + 1}</span>
              <span className="flex-1 font-medium">{ex.name}</span>
              <Chip tone="muted">{EQUIPMENT_LABELS[ex.equipment]}</Chip>
            </li>
          ))}
        </ol>

        {!hasActive && suggestion.exercises.length > 0 && (
          <StartSuggested exerciseIds={suggestion.exercises.map((e) => e.id)} />
        )}
        {!hasActive && (
          <Link href="/workout" className="mt-2 block">
            <Button variant="ghost" className="w-full">
              Or start an empty workout
            </Button>
          </Link>
        )}
      </Card>
    </section>
  );
}
