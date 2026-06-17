"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, Layers, Pencil, Plus, PlayCircle, Trash2, X } from "lucide-react";
import { Stepper } from "./stepper";
import { Chip } from "./ui";
import { CoachBadge } from "./coach-badge";
import { DemoSheet } from "./demo";
import { platesPerSide } from "@/lib/plates";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  SET_TYPE_BADGE,
  SET_TYPE_LABELS,
  type Recommendation,
  type SessionExercise,
  type SetLog,
  type SetType,
  type Unit,
} from "@/lib/types";
import { fmtWeight } from "@/lib/format";

const SET_TYPES: SetType[] = ["normal", "warmup", "drop", "failure"];

export interface LastData {
  last: { date: string; sets: SetLog[] } | null;
  target: Recommendation;
}

export function ExerciseCard({
  se,
  unit,
  lastData,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onSwap,
  onRemove,
}: {
  se: SessionExercise;
  unit: Unit;
  lastData?: LastData;
  onAddSet: (weight: number, reps: number, type: SetType) => void;
  onUpdateSet: (setId: number, weight: number, reps: number, type: SetType) => void;
  onDeleteSet: (setId: number) => void;
  onSwap: () => void;
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
  const [setType, setSetType] = useState<SetType>("normal");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const adjust = (d: number) =>
    setWeight((w) => Math.max(0, Math.round((w + d) * 100) / 100));

  if (!ex) return null;

  const editingIndex = se.sets.findIndex((s) => s.id === editingId);
  const composerNumber = editingId ? editingIndex + 1 : se.sets.length + 1;

  const startEdit = (s: SetLog) => {
    setEditingId(s.id);
    setWeight(s.weight);
    setReps(s.reps);
    setSetType(s.type);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setSetType("normal");
    setWeight(lastThisSession?.weight ?? initialWeight);
    setReps(lastThisSession?.reps ?? initialReps);
  };
  const submit = () => {
    if (editingId) {
      onUpdateSet(editingId, weight, reps, setType);
      setEditingId(null);
    } else {
      onAddSet(weight, reps, setType);
    }
    setSetType("normal");
  };

  const setLabel = (s: SetLog) =>
    s.weight > 0 ? `${fmtWeight(s.weight, unit)} × ${s.reps}` : `BW × ${s.reps}`;

  // last time's matching set (set N) for the "Previous" hint
  const prevFor = (i: number) => lastData?.last?.sets[i];
  const composerPrev = prevFor(editingId ? editingIndex : se.sets.length);

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface">
      {/* header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div className="min-w-0">
          <h3 className="display truncate text-lg font-semibold">{ex.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip tone="accent">{MUSCLE_LABELS[ex.muscleGroup]}</Chip>
            <Chip tone="muted">{EQUIPMENT_LABELS[ex.equipment]}</Chip>
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
            aria-label="Swap exercise"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-muted-strong active:bg-surface-3"
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
          </button>
          <button
            onClick={onRemove}
            aria-label="Remove exercise"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-muted active:bg-surface-3"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* last time + coach target */}
      {lastData && (
        <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-surface-2 px-3 py-2 text-sm">
          <span className="text-muted">
            {lastData.last ? (
              <>
                Last time:{" "}
                <span className="text-foreground">
                  {fmtWeight(topOf(lastData.last.sets).weight, unit)} ×{" "}
                  {topOf(lastData.last.sets).reps}
                </span>
              </>
            ) : (
              "First time. Find a working weight"
            )}
          </span>
          <CoachBadge action={lastData.target.action} />
        </div>
      )}

      {/* logged sets — each set has its own weight x reps; tap to edit */}
      <div className="px-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            Sets
          </span>
          <span className="text-xs text-muted">weight × reps</span>
        </div>
        {se.sets.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border px-3 py-3 text-center text-sm text-muted">
            No sets yet. Set the weight and reps below, then add your first set.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-[var(--radius-md)] border border-border">
            {se.sets.map((s, i) => {
              const editing = s.id === editingId;
              return (
                <li
                  key={s.id}
                  className={`flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-0 ${
                    editing ? "bg-accent/10" : "bg-surface-2/40"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-muted-strong">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="stat-num text-lg">{setLabel(s)}</span>
                    {prevFor(i) && (
                      <span className="ml-2 text-xs text-muted">
                        prev {fmtWeight(prevFor(i)!.weight, unit)} × {prevFor(i)!.reps}
                      </span>
                    )}
                  </div>
                  {SET_TYPE_BADGE[s.type] && (
                    <span
                      title={SET_TYPE_LABELS[s.type]}
                      className="rounded bg-surface-3 px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-strong"
                    >
                      {SET_TYPE_BADGE[s.type]}
                    </span>
                  )}
                  <button
                    onClick={() => startEdit(s)}
                    aria-label={`Edit set ${i + 1}`}
                    className="p-1 text-muted hover:text-accent"
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => {
                      if (editing) cancelEdit();
                      onDeleteSet(s.id);
                    }}
                    aria-label={`Delete set ${i + 1}`}
                    className="p-1 text-muted hover:text-danger"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(ex.equipment === "barbell" || ex.equipment === "smith") && (
        <div className="mt-2">
          <PlateHint weight={weight} unit={unit} />
        </div>
      )}

      {/* composer — clearly labelled for the set you're about to add/edit */}
      <div className="mt-2 border-t border-border/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {editingId ? `Editing set ${composerNumber}` : `Add set ${composerNumber}`}
        </p>
        {composerPrev && (
          <p className="mb-2 mt-0.5 text-xs text-muted">
            Last time: {fmtWeight(composerPrev.weight, unit)} × {composerPrev.reps}
          </p>
        )}
        <div className="mb-3 mt-2 flex gap-1.5">
          {SET_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSetType(t)}
              aria-pressed={setType === t}
              className={`flex-1 rounded-full border px-2 py-1.5 text-[0.7rem] font-medium transition ${
                setType === t
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surface-2 text-muted"
              }`}
            >
              {SET_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Stepper
            label={isBW ? `Added (${unit})` : `Weight (${unit})`}
            value={weight}
            onChange={setWeight}
            step={step}
          />
          <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />
        </div>

        {/* fine weight adjust (micro-plates) */}
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted">
          <span className="uppercase tracking-wider">Fine</span>
          <button
            onClick={() => adjust(-1.25)}
            aria-label={`Decrease weight by 1.25 ${unit}`}
            className="stat-num rounded-full border border-border bg-surface-2 px-3 py-1 text-foreground active:bg-surface-3"
          >
            −1.25
          </button>
          <button
            onClick={() => adjust(1.25)}
            aria-label={`Increase weight by 1.25 ${unit}`}
            className="stat-num rounded-full border border-border bg-surface-2 px-3 py-1 text-foreground active:bg-surface-3"
          >
            +1.25
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {editingId && (
            <button
              onClick={cancelEdit}
              className="flex h-12 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 font-medium text-muted-strong active:bg-surface-3"
            >
              <X size={18} aria-hidden="true" />
              Cancel
            </button>
          )}
          <button
            onClick={submit}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent font-semibold text-accent-foreground active:brightness-95"
          >
            {editingId ? (
              <>
                <Check size={20} strokeWidth={2.6} aria-hidden="true" />
                Save set {composerNumber}
              </>
            ) : (
              <>
                <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
                Add set {composerNumber}
              </>
            )}
          </button>
        </div>
      </div>

      <DemoSheet
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        exerciseId={ex.id}
        name={ex.name}
      />
    </div>
  );
}

function topOf(sets: SetLog[]): SetLog {
  return [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
}

function PlateHint({ weight, unit }: { weight: number; unit: Unit }) {
  const b = platesPerSide(weight, unit);
  let text: string;
  if (b.belowBar) text = "Below bar weight";
  else if (b.perSide.length === 0) text = "Just the bar";
  else
    text =
      b.perSide.map((p) => fmtWeight(p)).join("  ·  ") +
      (b.leftover > 0 ? `  (+${fmtWeight(b.leftover, unit)} off)` : "");
  return (
    <div className="mx-4 flex items-center gap-2 text-xs text-muted">
      <Layers size={13} aria-hidden="true" />
      <span>Per side</span>
      <span className="stat-num text-muted-strong">{text}</span>
    </div>
  );
}
