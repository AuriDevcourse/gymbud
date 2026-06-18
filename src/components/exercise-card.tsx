"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { ArrowLeftRight, Dices, PlayCircle, Trash2 } from "lucide-react";
import { Stepper } from "./stepper";
import { CoachBadge } from "./coach-badge";
import { DemoSheet } from "./demo";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  type Recommendation,
  type SessionExercise,
  type SetLog,
  type SetType,
  type Unit,
} from "@/lib/types";
import { fmtWeight } from "@/lib/format";

export interface LastData {
  last: { date: string; sets: SetLog[] } | null;
  target: Recommendation;
}

export function ExerciseCard({
  se,
  unit,
  lastData,
  targetSets,
  commitRef,
  onAddSet,
  onDeleteSet,
  onSwap,
  onRandomize,
  onRemove,
}: {
  se: SessionExercise;
  unit: Unit;
  lastData?: LastData;
  /** how many working sets the plan calls for (drives the "Set N of M" label) */
  targetSets: number;
  /** the parent's bottom-bar "Next set" button fires whatever we register here */
  commitRef: MutableRefObject<(() => void) | null>;
  onAddSet: (weight: number, reps: number, type: SetType) => void;
  onDeleteSet: (setId: number) => void;
  onSwap: () => void;
  onRandomize: () => void;
  onRemove: () => void;
}) {
  const ex = EXERCISES_BY_ID[se.exerciseId];
  const isBW = ex?.equipment === "bodyweight";
  const step = unit === "kg" ? 2.5 : 5;

  // Prefill the composer from this exercise's last set, else last time / coach.
  const lastThisSession = se.sets[se.sets.length - 1];
  const lastTime = lastData?.last?.sets[lastData.last.sets.length - 1];
  const initialWeight =
    lastThisSession?.weight ??
    lastData?.target.suggestedWeight ??
    lastTime?.weight ??
    (isBW ? 0 : 20);
  const initialReps = lastThisSession?.reps ?? lastTime?.reps ?? 8;

  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [demoOpen, setDemoOpen] = useState(false);
  const adjust = (d: number) =>
    setWeight((w) => Math.max(0, Math.round((w + d) * 100) / 100));

  if (!ex) return null;

  const composerNumber = se.sets.length + 1;
  const composerPrev = lastData?.last?.sets[se.sets.length];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface">
      {/* header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div className="min-w-0">
          <h3 className="display truncate text-lg font-semibold">{ex.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.7rem] font-medium text-muted">
            <span className="rounded-full bg-surface-2 px-2 py-0.5">
              {MUSCLE_LABELS[ex.muscleGroup]}
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5">
              {EQUIPMENT_LABELS[ex.equipment]}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => setDemoOpen(true)}
            aria-label="How to do this exercise"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-accent active:bg-surface-3"
          >
            <PlayCircle size={16} aria-hidden="true" />
          </button>
          <button
            onClick={onSwap}
            aria-label="Choose a different exercise"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-muted-strong active:bg-surface-3"
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
          </button>
          <button
            onClick={onRandomize}
            aria-label="Random different exercise"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-muted-strong active:bg-surface-3"
          >
            <Dices size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* last time + coach target (only when there's real history to show) */}
      {lastData?.last && (
        <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-surface-2 px-3 py-2 text-sm">
          <span className="text-muted">
            Last time:{" "}
            <span className="text-foreground">
              {fmtWeight(topOf(lastData.last.sets).weight, unit)} ×{" "}
              {topOf(lastData.last.sets).reps}
            </span>
          </span>
          <CoachBadge action={lastData.target.action} />
        </div>
      )}

      {/* composer FIRST so adding a set (which grows the list below) never
          shifts the controls you're actually using */}
      <RegisterCommit commitRef={commitRef} weight={weight} reps={reps} onAdd={onAddSet} />
      <div className="px-4 pb-5 pt-1">
        {/* key by set number so each "Next set" fades in as a fresh window */}
        <div key={se.sets.length} className="animate-fade">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Set {composerNumber} of {targetSets}
          </p>
          {composerPrev && (
            <p className="mb-2 mt-0.5 text-xs text-muted">
              Last time: {fmtWeight(composerPrev.weight, unit)} × {composerPrev.reps}
            </p>
          )}
          <div className="mt-3 flex items-start gap-2">
            <Stepper
              label={isBW ? `Added (${unit})` : `Weight (${unit})`}
              value={weight}
              onChange={setWeight}
              step={step}
            />
            <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />
          </div>

          {/* fine weight adjust — sits under the weight column */}
          <div className="mt-2 flex gap-2">
            <div className="flex flex-1 justify-center gap-2">
              <button
                onClick={() => adjust(-1.25)}
                aria-label={`Decrease weight by 1.25 ${unit}`}
                className="stat-num rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-foreground active:bg-surface-3"
              >
                −1.25
              </button>
              <button
                onClick={() => adjust(1.25)}
                aria-label={`Increase weight by 1.25 ${unit}`}
                className="stat-num rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-foreground active:bg-surface-3"
              >
                +1.25
              </button>
            </div>
            <div className="flex-1" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* done sets — below the composer; swipe a set left to reveal Delete */}
      {se.sets.length > 0 && (
        <div className="border-t border-border/60 p-4">
          <div className="mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Done sets
            </span>
          </div>
          {/* reserve room for all target rows so logging a set never grows the
              card (which would nudge the buttons below) */}
          <ul
            className="grid grid-cols-2 content-start gap-1.5"
            style={{ minHeight: `${Math.ceil(targetSets / 2) * 2.5}rem` }}
          >
            {se.sets.map((s, i) => (
              <SetRow
                key={s.id}
                index={i}
                set={s}
                unit={unit}
                onDelete={() => onDeleteSet(s.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* low-priority action, tucked at the bottom */}
      <button
        onClick={onRemove}
        className="w-full border-t border-border/60 py-2.5 text-center text-xs text-muted active:text-danger"
      >
        Remove this exercise
      </button>

      <DemoSheet
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        exerciseId={ex.id}
        name={ex.name}
      />
    </div>
  );
}

/** Keeps the parent's bottom-bar "Next set" wired to the current composer values. */
function RegisterCommit({
  commitRef,
  weight,
  reps,
  onAdd,
}: {
  commitRef: MutableRefObject<(() => void) | null>;
  weight: number;
  reps: number;
  onAdd: (weight: number, reps: number, type: SetType) => void;
}) {
  useEffect(() => {
    commitRef.current = () => onAdd(weight, reps, "normal");
    return () => {
      commitRef.current = null;
    };
  }, [commitRef, weight, reps, onAdd]);
  return null;
}

function topOf(sets: SetLog[]): SetLog {
  return [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
}

const REVEAL = 76; // px the row slides to expose the Delete button

function SetRow({
  index,
  set,
  unit,
  onDelete,
}: {
  index: number;
  set: SetLog;
  unit: Unit;
  onDelete: () => void;
}) {
  const [tx, setTx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const base = useRef(0);

  const label = set.weight > 0 ? `${fmtWeight(set.weight, unit)} × ${set.reps}` : `BW × ${set.reps}`;

  const onDown = (e: React.PointerEvent) => {
    setDragging(true);
    startX.current = e.clientX;
    base.current = revealed ? -REVEAL : 0;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const d = e.clientX - startX.current;
    setTx(Math.min(0, Math.max(base.current + d, -REVEAL)));
  };
  const onEnd = () => {
    if (!dragging) return;
    setDragging(false);
    const open = tx <= -REVEAL / 2;
    setRevealed(open);
    setTx(open ? -REVEAL : 0);
  };

  return (
    <li className="relative overflow-hidden rounded-[var(--radius-md)] bg-surface-2">
      {/* Delete button, revealed when the row is swiped left */}
      <button
        onClick={onDelete}
        aria-label={`Delete set ${index + 1}`}
        tabIndex={revealed ? 0 : -1}
        className="absolute inset-y-0 right-0 flex items-center justify-center gap-1 bg-danger px-3 text-xs font-semibold text-white"
        style={{ width: REVEAL }}
      >
        <Trash2 size={15} aria-hidden="true" />
        Delete
      </button>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
        onClick={() => {
          if (revealed) {
            setRevealed(false);
            setTx(0);
          }
        }}
        style={{
          transform: `translateX(${tx}px)`,
          transition: dragging ? "none" : "transform 0.18s ease",
          touchAction: "pan-y",
        }}
        className="relative flex select-none items-center gap-2 bg-surface-2 px-2.5 py-2.5"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[0.65rem] font-bold text-muted-strong">
          {index + 1}
        </span>
        <span className="stat-num flex-1 truncate text-sm" style={{ lineHeight: 1.35 }}>
          {label}
        </span>
      </div>
    </li>
  );
}

