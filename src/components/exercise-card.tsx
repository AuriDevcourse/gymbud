"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { ArrowLeftRight, Check, Layers, PlayCircle, Trash2, X } from "lucide-react";
import { Stepper } from "./stepper";
import { CoachBadge } from "./coach-badge";
import { DemoSheet } from "./demo";
import { platesPerSide } from "@/lib/plates";
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
  onUpdateSet,
  onDeleteSet,
  onSwap,
  onRemove,
  onEditingChange,
}: {
  se: SessionExercise;
  unit: Unit;
  lastData?: LastData;
  /** how many working sets the plan calls for (drives the "Set N of M" label) */
  targetSets: number;
  /** the parent's bottom-bar "Next set" button fires whatever we register here */
  commitRef: MutableRefObject<(() => void) | null>;
  onAddSet: (weight: number, reps: number, type: SetType) => void;
  onUpdateSet: (setId: number, weight: number, reps: number, type: SetType) => void;
  onDeleteSet: (setId: number) => void;
  onSwap: () => void;
  onRemove: () => void;
  /** lets the parent hide the "Next set" button while a set is being edited */
  onEditingChange?: (editing: boolean) => void;
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

  // Drive the "Next set" button in the parent's bottom bar. While editing, we
  // register nothing so the parent hides it (the inline Save/Cancel takes over).
  useEffect(() => {
    commitRef.current = editingId
      ? null
      : () => {
          onAddSet(weight, reps, setType);
          setSetType("normal");
        };
    return () => {
      commitRef.current = null;
    };
  }, [editingId, weight, reps, setType, onAddSet, commitRef]);

  useEffect(() => {
    onEditingChange?.(!!editingId);
  }, [editingId, onEditingChange]);

  // last time's matching set (set N) for the "Previous" hint
  const prevFor = (i: number) => lastData?.last?.sets[i];
  const composerPrev = prevFor(editingId ? editingIndex : se.sets.length);

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

      {/* done sets — compact, capped height so adding more never shifts the
          composer; tap a set to edit, swipe it left to delete */}
      {se.sets.length > 0 && (
        <div className="px-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Done sets
            </span>
            <span className="text-xs text-muted">tap to edit, swipe to delete</span>
          </div>
          <ul className="grid max-h-[9rem] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
            {se.sets.map((s, i) => (
              <SetRow
                key={s.id}
                index={i}
                set={s}
                unit={unit}
                editing={s.id === editingId}
                onEdit={() => startEdit(s)}
                onDelete={() => {
                  if (s.id === editingId) cancelEdit();
                  onDeleteSet(s.id);
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {(ex.equipment === "barbell" || ex.equipment === "smith") && (
        <div className="mt-2">
          <PlateHint weight={weight} unit={unit} />
        </div>
      )}

      {/* composer — clearly labelled for the set you're about to add/edit */}
      <div className="mt-2 border-t border-border/60 p-4">
        {/* key by set number so each "Next set" slides in like a fresh window */}
        <div key={editingId ?? composerNumber} className="animate-fade-slide">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {editingId
            ? `Editing set ${composerNumber}`
            : `Set ${composerNumber} of ${targetSets}`}
        </p>
        {composerPrev && (
          <p className="mb-2 mt-0.5 text-xs text-muted">
            Last time: {fmtWeight(composerPrev.weight, unit)} × {composerPrev.reps}
          </p>
        )}
        <div className="mt-3 flex items-end gap-2">
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
        </div>

        {/* When adding, the "Next set" button lives in the workout bottom bar.
            Editing keeps its own inline Save / Cancel. */}
        {editingId && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={cancelEdit}
              className="flex h-12 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 font-medium text-muted-strong active:bg-surface-3"
            >
              <X size={18} aria-hidden="true" />
              Cancel
            </button>
            <button
              onClick={submit}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent font-semibold text-accent-foreground active:brightness-95"
            >
              <Check size={20} strokeWidth={2.6} aria-hidden="true" />
              Save set {composerNumber}
            </button>
          </div>
        )}
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

const DELETE_AT = -80; // px of left-swipe that commits a delete

function SetRow({
  index,
  set,
  unit,
  editing,
  onEdit,
  onDelete,
}: {
  index: number;
  set: SetLog;
  unit: Unit;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [dx, setDx] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const moved = useRef(false);

  const label = set.weight > 0 ? `${fmtWeight(set.weight, unit)} × ${set.reps}` : `BW × ${set.reps}`;

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 6) moved.current = true;
    setDx(Math.min(0, Math.max(d, -120))); // only allow swiping left
  };
  const onUp = () => {
    dragging.current = false;
    if (dx <= DELETE_AT) onDelete();
    setDx(0);
  };
  const onClick = () => {
    if (!moved.current) onEdit();
  };

  return (
    <li className="relative overflow-hidden rounded-[var(--radius-md)]">
      {/* revealed behind the row as you swipe left */}
      <div className="absolute inset-0 flex items-center justify-end bg-danger/20 pr-4 text-danger">
        <Trash2 size={16} aria-hidden="true" />
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Set ${index + 1}, ${label}. Tap to edit.`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit();
          }
        }}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? "transform 0.18s ease" : "none",
          touchAction: "pan-y",
        }}
        className={`relative flex select-none items-center gap-2 px-2.5 py-2 ${
          editing ? "bg-accent/15" : "bg-surface-2"
        }`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[0.65rem] font-bold text-muted-strong">
          {index + 1}
        </span>
        <span className="stat-num flex-1 truncate text-sm">{label}</span>
      </div>
    </li>
  );
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
