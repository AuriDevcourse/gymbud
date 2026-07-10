"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { ArrowLeftRight, Dices, FlaskConical, Info, PlayCircle, Trash2, TrendingUp } from "lucide-react";
import { Stepper } from "./stepper";
import { CoachBadge } from "./coach-badge";
import { DemoSheet } from "./demo";
import { MuscleInfoSheet } from "./muscle-info-sheet";
import { Sheet } from "./sheet";
import { Button } from "./ui";
import { EXERCISES_BY_ID, type Exercise } from "@/lib/exercise-library";
import {
  doseCaption,
  hasWeight,
  repRangeFor,
  weightLabel,
  weightMode,
  weightStep,
} from "@/lib/loading";
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  SET_TYPE_LABELS,
  type Goal,
  type Recommendation,
  type SessionExercise,
  type SetLog,
  type SetType,
  type Unit,
} from "@/lib/types";
import { fmtWeight } from "@/lib/format";
import { readinessFactor } from "@/lib/readiness";

export interface LastData {
  last: { date: string; sets: SetLog[] } | null;
  target: Recommendation;
}

export function ExerciseCard({
  se,
  unit,
  goal,
  lastData,
  targetSets,
  commitRef,
  onValues,
  onAddSet,
  onDeleteSet,
  onEditSet,
  onSwap,
  onRandomize,
  onRemove,
}: {
  se: SessionExercise;
  unit: Unit;
  goal: Goal;
  lastData?: LastData;
  /** how many working sets the plan calls for (drives the "Set N of M" label) */
  targetSets: number;
  /** the parent's bottom-bar "Next set" button fires whatever we register here */
  commitRef: MutableRefObject<(() => void) | null>;
  /** report live composer values up so the parent can label the log button */
  onValues?: (weight: number, reps: number, showWeight: boolean) => void;
  onAddSet: (weight: number, reps: number, type: SetType) => void;
  onDeleteSet: (setId: number) => void;
  onEditSet: (setId: number, weight: number, reps: number, type: SetType) => void;
  onSwap: () => void;
  onRandomize: () => void;
  onRemove: () => void;
}) {
  const ex = EXERCISES_BY_ID[se.exerciseId];
  const mode = ex ? weightMode(ex) : "total";
  const showWeight = ex ? hasWeight(ex) : true;
  const step = ex ? weightStep(ex, unit) : unit === "kg" ? 2.5 : 5;
  const wl = ex ? weightLabel(ex, unit) : { label: `Weight (${unit})` };

  // set being edited (tap a logged set to fix a mistake)
  const [editing, setEditing] = useState<SetLog | null>(null);
  const [eW, setEW] = useState(0);
  const [eR, setER] = useState(0);
  const [eT, setET] = useState<SetType>("normal");
  const openEdit = (s: SetLog) => {
    setEditing(s);
    setEW(s.weight);
    setER(s.reps);
    setET(s.type);
  };

  // Prefill the composer from this exercise's last set, else last time / coach.
  // The coach's suggested weight gets a small readiness nudge (from the
  // "how strong today?" check) — up when you feel strong, down when drained.
  const lastThisSession = se.sets[se.sets.length - 1];
  const lastTime = lastData?.last?.sets[lastData.last.sets.length - 1];
  const suggested =
    lastData?.target.suggestedWeight != null
      ? Math.max(0, Math.round((lastData.target.suggestedWeight * readinessFactor()) / step) * step)
      : undefined;
  const initialWeight = !showWeight
    ? 0
    : (lastThisSession?.weight ??
      suggested ??
      lastTime?.weight ??
      (mode === "added" ? 0 : 20));
  const initialReps = lastThisSession?.reps ?? lastTime?.reps ?? 8;

  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [demoOpen, setDemoOpen] = useState(false);
  const [muscleOpen, setMuscleOpen] = useState(false);
  const adjust = (d: number) =>
    setWeight((w) => Math.max(0, Math.round((w + d) * 100) / 100));

  if (!ex) return null;

  // Count only working sets against the target so a warm-up doesn't inflate the
  // "Set N of M" label, and never show a number past the target (no "5 of 4").
  const workingDone = se.sets.filter((s) => s.type !== "warmup").length;
  const overTarget = workingDone >= targetSets;
  const composerNumber = Math.min(workingDone + 1, targetSets);
  const composerPrev = lastData?.last?.sets[workingDone];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface">
      {/* header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div className="min-w-0">
          <h3 className="display truncate text-lg font-semibold">{ex.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.7rem] font-medium text-muted">
            <button
              onClick={() => setMuscleOpen(true)}
              aria-label={`What is the ${MUSCLE_LABELS[ex.muscleGroup]} and what does it do`}
              className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-accent active:bg-surface-3"
            >
              {MUSCLE_LABELS[ex.muscleGroup]}
              <Info size={11} aria-hidden="true" />
            </button>
            <span className="rounded-full bg-surface-2 px-2 py-0.5">
              {EQUIPMENT_LABELS[ex.equipment]}
            </span>
          </div>
          <p className="mt-1 text-[0.7rem] text-muted">{doseCaption(goal, ex)}</p>
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

      {/* The loud part: what to actually do on this exercise right now. */}
      <Prescription lastData={lastData} unit={unit} goal={goal} ex={ex} />


      {/* composer FIRST so adding a set (which grows the list below) never
          shifts the controls you're actually using */}
      <RegisterCommit
        commitRef={commitRef}
        weight={weight}
        reps={reps}
        showWeight={showWeight}
        onAdd={onAddSet}
        onValues={onValues}
      />
      <div className="px-4 pb-3 pt-1">
        {/* key by set number so each "Next set" fades in as a fresh window */}
        <div key={se.sets.length} className="animate-fade">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            {overTarget ? "Extra set" : `Set ${composerNumber} of ${targetSets}`}
          </p>
          {composerPrev && (
            <p className="mb-2 mt-0.5 text-xs text-muted">
              Last time: {fmtWeight(composerPrev.weight, unit)} × {composerPrev.reps}
            </p>
          )}
          <div className="mt-3 flex items-start gap-2">
            {showWeight && (
              <Stepper label={wl.label} value={weight} onChange={setWeight} step={step} />
            )}
            <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />
          </div>

          {showWeight && wl.hint && (
            <p className="mt-1.5 text-center text-[0.7rem] text-muted">{wl.hint}</p>
          )}

          {/* fine weight adjust — sits under the weight column */}
          {showWeight && (
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
          )}
        </div>
      </div>

      {/* done sets — below the composer; swipe a set left to reveal Delete */}
      {se.sets.length > 0 && (
        <div className="border-t border-border/60 p-4">
          <div className="mb-1.5">
            <span className="text-[0.7rem] text-muted">Done sets · tap to edit</span>
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
                onEdit={() => openEdit(s)}
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

      <MuscleInfoSheet
        open={muscleOpen}
        onClose={() => setMuscleOpen(false)}
        muscle={ex.muscleGroup}
      />

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit set">
        {editing && (
          <div>
            <div className="flex items-start gap-2">
              {showWeight && (
                <Stepper label={wl.label} value={eW} onChange={setEW} step={step} />
              )}
              <Stepper label="Reps" value={eR} onChange={setER} step={1} min={1} />
            </div>
            <div className="mt-3 flex gap-1.5">
              {(Object.keys(SET_TYPE_LABELS) as SetType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setET(t)}
                  aria-pressed={eT === t}
                  className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-medium transition ${
                    eT === t
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  {SET_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="surface"
                size="lg"
                onClick={() => {
                  onDeleteSet(editing.id);
                  setEditing(null);
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </Button>
              <Button
                variant="accent"
                size="lg"
                className="flex-1"
                onClick={() => {
                  onEditSet(editing.id, eW, eR, eT);
                  setEditing(null);
                }}
              >
                Save set
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** Keeps the parent's bottom-bar "Next set" wired to the current composer values. */
function RegisterCommit({
  commitRef,
  weight,
  reps,
  showWeight,
  onAdd,
  onValues,
}: {
  commitRef: MutableRefObject<(() => void) | null>;
  weight: number;
  reps: number;
  showWeight: boolean;
  onAdd: (weight: number, reps: number, type: SetType) => void;
  onValues?: (weight: number, reps: number, showWeight: boolean) => void;
}) {
  useEffect(() => {
    commitRef.current = () => onAdd(weight, reps, "normal");
    // report the live composer values up so the primary button can show exactly
    // what it will log ("Log 62.5 × 10") — the crisp confirm Strong/Hevy nail.
    onValues?.(weight, reps, showWeight);
    return () => {
      commitRef.current = null;
    };
  }, [commitRef, weight, reps, showWeight, onAdd, onValues]);
  return null;
}

function topOf(sets: SetLog[]): SetLog {
  return [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
}

// The single most important thing on the card: what to do on this lift right now.
// No history yet -> a calibration "test set". History -> the coach's prescription
// (the weight to load + the rep target), with last time as a small footnote.
function Prescription({
  lastData,
  unit,
  goal,
  ex,
}: {
  lastData?: LastData;
  unit: Unit;
  goal: Goal;
  ex: Exercise;
}) {
  if (!lastData) return null; // last-time data still loading
  const range = repRangeFor(goal, ex.type);
  const mode = weightMode(ex);

  // First time on this exercise: don't fake a number, calibrate.
  if (!lastData.last) {
    return (
      <div className="mx-4 mb-3 rounded-[var(--radius-md)] border border-accent/30 bg-accent/5 px-3 py-3">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-accent" aria-hidden="true" />
          <span className="display font-semibold">Test set</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          First time on this one.{" "}
          {mode === "none"
            ? `Do as many clean reps as you can (aim ${range.low} to ${range.high}) and log it.`
            : `Pick a weight you can do for ${range.low} to ${range.high} reps and log it. Next session I'll tell you the weight.`}
        </p>
      </div>
    );
  }

  const t = lastData.target;
  const last = topOf(lastData.last.sets);
  // What the big number means, given how this lift is loaded.
  const headline =
    mode === "none"
      ? "Bodyweight"
      : t.suggestedWeight !== null
        ? fmtWeight(t.suggestedWeight, unit)
        : "—";
  // Make the progression felt: how much heavier than last time is the target?
  const bump =
    mode !== "none" && t.suggestedWeight !== null && last.weight > 0
      ? Math.round((t.suggestedWeight - last.weight) * 100) / 100
      : 0;
  return (
    <div className="mx-4 mb-3 rounded-[var(--radius-md)] border border-border border-l-[3px] border-l-accent bg-surface-2 px-3.5 py-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="stat-num block text-4xl font-bold leading-none text-accent">
            {headline}
          </span>
          <span className="mt-1 block text-sm text-muted">
            {mode === "each" && headline !== "—" ? "per hand · " : ""}
            {mode === "assist" && headline !== "—" ? "assist · " : ""}
            aim {range.low} to {range.high} reps
          </span>
        </div>
        <CoachBadge action={t.action} />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <p className="text-xs text-muted">
          Last time: {last.weight > 0 ? `${fmtWeight(last.weight, unit)} × ` : ""}
          {last.weight > 0 ? last.reps : `${last.reps} reps`}
        </p>
        {bump > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent">
            <TrendingUp size={11} aria-hidden="true" />
            +{fmtWeight(bump, unit)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}

const REVEAL = 76; // px the row slides to expose the Delete button

function SetRow({
  index,
  set,
  unit,
  onEdit,
  onDelete,
}: {
  index: number;
  set: SetLog;
  unit: Unit;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [tx, setTx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const base = useRef(0);
  const moved = useRef(false); // distinguish a swipe from a tap

  const label = set.weight > 0 ? `${fmtWeight(set.weight, unit)} × ${set.reps}` : `BW × ${set.reps}`;

  const onDown = (e: React.PointerEvent) => {
    setDragging(true);
    moved.current = false;
    startX.current = e.clientX;
    base.current = revealed ? -REVEAL : 0;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 4) moved.current = true;
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
            return;
          }
          if (moved.current) return; // was a swipe, not a tap
          onEdit();
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

