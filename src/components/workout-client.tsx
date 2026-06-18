"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Flame,
  Loader2,
  Plus,
  Snowflake,
  Timer,
  Undo2,
  X,
} from "lucide-react";
import { Button, EmptyState } from "./ui";
import { Sheet } from "./sheet";
import { ExercisePicker } from "./exercise-picker";
import { PENDING_WORKOUT_KEY } from "./start-suggested";
import { CoachBadge } from "./coach-badge";
import { ExerciseCard, type LastData } from "./exercise-card";
import { WorkoutSkeleton } from "./skeleton";
import { api } from "@/lib/format";
import { peek, poke, useApi } from "@/lib/swr";
import { parseDbDate } from "@/lib/date";
import { getAlternatives } from "@/lib/coach";
import { EXERCISES_BY_ID, type Equipment, type Exercise } from "@/lib/exercise-library";
import { EQUIPMENT_LABELS } from "@/lib/types";
import type {
  Goal,
  Recommendation,
  Session,
  SessionExercise,
  SetLog,
  SetType,
  Unit,
} from "@/lib/types";

type RecRow = { exerciseId: string; name: string; recommendation: Recommendation };

// monotonic negative ids for optimistic (not-yet-saved) sets
let tempSetId = -1;

function restSeconds(goal: Goal): number {
  if (goal === "strength") return 180;
  if (goal === "muscle_gain") return 90;
  if (goal === "fat_loss") return 45;
  return 75;
}

// how many working sets the plan calls for, by goal
function targetSetsFor(goal: Goal): number {
  if (goal === "strength") return 5;
  if (goal === "muscle_gain") return 4;
  return 3; // fat_loss, general
}

function celebrate(intense = false) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  import("canvas-confetti").then(({ default: confetti }) => {
    confetti({
      particleCount: intense ? 160 : 34,
      spread: intense ? 95 : 55,
      startVelocity: intense ? 48 : 28,
      origin: { y: intense ? 0.55 : 0.8 },
      colors: ["#c8f135", "#ff6a2b", "#46d18a", "#ffffff"],
      scalar: intense ? 1.1 : 0.8,
      disableForReducedMotion: true,
    });
  });
}

const ACTIVE_KEY = "active-session";

export function WorkoutClient() {
  const router = useRouter();

  // profile is cached + revalidated (instant on repeat visits)
  const { data: profile } = useApi<{ unit: Unit; goal: Goal; equipment: Equipment[] }>(
    "/api/profile",
  );
  const unit: Unit = profile?.unit ?? "kg";
  const goal: Goal = profile?.goal ?? "general";
  const available: Equipment[] = profile?.equipment ?? [];

  // active session: seed from cache for instant render, then revalidate
  const [session, setSession] = useState<Session | null>(
    () => peek<Session>(ACTIVE_KEY) ?? null,
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [lastMap, setLastMap] = useState<Record<string, LastData>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [restKey, setRestKey] = useState(0);
  const [restOpen, setRestOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);

  const [finishOpen, setFinishOpen] = useState(false);
  const [summary, setSummary] = useState<RecRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  // bottom-bar "Next set" fires the current exercise card's add-set commit
  const commitRef = useRef<(() => void) | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  // workout phases: warm up → working sets → cool down
  const [phase, setPhase] = useState<"warmup" | "main" | "cooldown">("main");

  // On mount: either fulfill an optimistic "start this workout" hand-off, or
  // just revalidate the active session for a normal resume.
  useEffect(() => {
    let cancelled = false;

    let pending: { exerciseIds: string[] } | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_WORKOUT_KEY);
      if (raw) pending = JSON.parse(raw);
    } catch {
      pending = null;
    }

    if (pending) {
      // navigated here optimistically — create the session now
      sessionStorage.removeItem(PENDING_WORKOUT_KEY);
      const ids = pending.exerciseIds ?? [];
      (async () => {
        try {
          const s = await api<Session>("/api/sessions", { method: "POST" });
          let exercises = s.exercises;
          if (exercises.length === 0 && ids.length) {
            const added: SessionExercise[] = [];
            for (const id of ids) {
              const se = await api<SessionExercise>(`/api/sessions/${s.id}/exercises`, {
                method: "POST",
                body: JSON.stringify({ exerciseId: id }),
              });
              added.push(se);
            }
            exercises = added;
          }
          if (cancelled) return;
          const full = { ...s, exercises };
          setSession(full);
          poke(ACTIVE_KEY, full);
          setPhase("warmup");
        } catch (e) {
          if (!cancelled) setError((e as Error).message);
        } finally {
          if (!cancelled) setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    api<Session | null>("/api/sessions/active")
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setLoaded(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // keep the cache in sync so reopening /workout is instant
  useEffect(() => {
    poke(ACTIVE_KEY, session);
  }, [session]);

  // fetch (cached) "last time" for any exercise we don't have yet
  useEffect(() => {
    if (!session) return;
    session.exercises
      .filter((e) => !(e.exerciseId in lastMap))
      .forEach((e) => {
        const key = `last:${e.exerciseId}`;
        const cached = peek<LastData>(key);
        if (cached) setLastMap((m) => ({ ...m, [e.exerciseId]: cached }));
        api<LastData>(`/api/exercises/${e.exerciseId}/last?session=${session.id}`)
          .then((d) => {
            poke(key, d);
            setLastMap((m) => ({ ...m, [e.exerciseId]: d }));
          })
          .catch(() => {});
      });
  }, [session, lastMap]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = (u: (s: Session) => Session) => setSession((s) => (s ? u(s) : s));

  const startSession = async () => {
    setBusy(true);
    try {
      const s = await api<Session>("/api/sessions", { method: "POST" });
      setSession(s);
      setPhase("warmup"); // new workouts open on the warm-up screen
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addExercise = async (ex: Exercise) => {
    if (!session) return;
    setPickerOpen(false);
    try {
      const se = await api<SessionExercise>(`/api/sessions/${session.id}/exercises`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex.id }),
      });
      patch((s) => ({ ...s, exercises: [...s.exercises, se] }));
      setCurrent(session.exercises.length);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeExercise = async (se: SessionExercise) => {
    const snapshot = session;
    patch((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== se.id) }));
    setCurrent((c) => Math.max(0, c - (c > 0 ? 1 : 0)));
    try {
      await api(`/api/session-exercises/${se.id}`, { method: "DELETE" });
    } catch (e) {
      if (snapshot) setSession(snapshot);
      setError((e as Error).message);
    }
  };

  const swapTo = async (se: SessionExercise, newId: string, undoTo?: string) => {
    const prevId = se.exerciseId;
    const prevSets = se.sets;
    patch((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === se.id ? { ...e, exerciseId: newId, sets: [] } : e,
      ),
    }));
    setToast({
      msg: `Swapped to ${EXERCISES_BY_ID[newId]?.name ?? "exercise"}`,
      undo: undoTo ? () => swapTo({ ...se, exerciseId: newId }, undoTo) : undefined,
    });
    try {
      await api(`/api/session-exercises/${se.id}`, {
        method: "PATCH",
        body: JSON.stringify({ swapTo: newId }),
      });
    } catch (e) {
      patch((s) => ({
        ...s,
        exercises: s.exercises.map((e) =>
          e.id === se.id ? { ...e, exerciseId: prevId, sets: prevSets } : e,
        ),
      }));
      setError((e as Error).message);
    }
  };

  // Dice: jump to a random different same-muscle exercise.
  const cycleSwap = (se: SessionExercise) => {
    const alts = getAlternatives(se.exerciseId, { available })
      .map((e) => e.id)
      .filter((id) => id !== se.exerciseId);
    if (!alts.length) return;
    const pick = alts[Math.floor(Math.random() * alts.length)];
    swapTo(se, pick, se.exerciseId);
  };

  // ── optimistic set mutations ──
  const addSet = async (se: SessionExercise, weight: number, reps: number, type: SetType) => {
    const id = tempSetId--;
    const optimistic: SetLog = {
      id,
      sessionExerciseId: se.id,
      setIndex: se.sets.length,
      weight,
      reps,
      type,
    };
    patch((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === se.id ? { ...e, sets: [...e.sets, optimistic] } : e,
      ),
    }));
    celebrate(false);
    setRestKey((k) => k + 1);
    setRestOpen(true);
    try {
      const real = await api<SetLog>(`/api/session-exercises/${se.id}/sets`, {
        method: "POST",
        body: JSON.stringify({ weight, reps, type }),
      });
      patch((s) => ({
        ...s,
        exercises: s.exercises.map((e) =>
          e.id === se.id
            ? { ...e, sets: e.sets.map((x) => (x.id === id ? real : x)) }
            : e,
        ),
      }));
    } catch (e) {
      patch((s) => ({
        ...s,
        exercises: s.exercises.map((e) =>
          e.id === se.id ? { ...e, sets: e.sets.filter((x) => x.id !== id) } : e,
        ),
      }));
      setError((e as Error).message);
    }
  };

  const deleteSet = async (se: SessionExercise, setId: number) => {
    const idx = se.sets.findIndex((x) => x.id === setId);
    const removed = se.sets[idx];
    patch((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === se.id ? { ...e, sets: e.sets.filter((x) => x.id !== setId) } : e,
      ),
    }));
    try {
      await api(`/api/sets/${setId}`, { method: "DELETE" });
    } catch (e) {
      if (removed) {
        patch((s) => ({
          ...s,
          exercises: s.exercises.map((el) => {
            if (el.id !== se.id) return el;
            const sets = [...el.sets];
            sets.splice(Math.max(0, idx), 0, removed);
            return { ...el, sets };
          }),
        }));
      }
      setError((e as Error).message);
    }
  };

  const finish = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await api(`/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ finish: true }),
      });
      poke(ACTIVE_KEY, null);
      const res = await api<{ recommendations: RecRow[] }>(
        `/api/sessions/${session.id}/recommendations`,
      );
      setSummary(res.recommendations);
      setFinishOpen(true);
      celebrate(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async (note: string) => {
    if (!session) return;
    try {
      await api(`/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ note: note || null }),
      });
    } catch {
      /* non-critical */
    }
  };

  const closeSummary = () => {
    setFinishOpen(false);
    router.push("/");
    router.refresh();
  };

  // ── render ──
  if (!loaded && !session) return <WorkoutSkeleton />;

  if (!session) {
    return (
      <div className="py-8">
        <EmptyState
          icon={<Flag size={32} aria-hidden="true" />}
          title="No active workout"
          hint="Start a session and your lifts will show up here."
          action={
            <Button variant="accent" size="lg" onClick={startSession} disabled={busy}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Start workout
            </Button>
          }
        />
      </div>
    );
  }

  // Warm-up screen: shown first on a fresh workout; "Start workout" → working sets.
  if (phase === "warmup") {
    return (
      <div className="pb-4">
        <PhaseScreen
          kind="warmup"
          onPrimary={() => setPhase("main")}
          onSkip={() => setPhase("main")}
        />
      </div>
    );
  }

  // Cool-down screen: optional, between the last set and saving the session.
  if (phase === "cooldown") {
    return (
      <div className="pb-4">
        <PhaseScreen kind="cooldown" busy={busy} onPrimary={finish} onSkip={finish} />
        <Sheet open={finishOpen} onClose={closeSummary} title="Session done">
          <FinishSummary summary={summary} onNote={saveNote} />
          <Button variant="accent" size="lg" className="mt-4 w-full" onClick={closeSummary}>
            <CheckCircle2 size={18} aria-hidden="true" />
            Done
          </Button>
        </Sheet>
      </div>
    );
  }

  const exercises = session.exercises;
  const idx = Math.min(current, Math.max(0, exercises.length - 1));
  const se = exercises[idx];
  const onLast = idx >= exercises.length - 1;
  const target = targetSetsFor(goal);
  // warm-up sets don't count toward the working-set target
  const setsDone = se ? se.sets.filter((s) => s.type !== "warmup").length : 0;
  const setsComplete = setsDone >= target;

  return (
    <div className="pb-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-bold leading-tight">Workout</h1>
          <ElapsedTimer startedAt={session.startedAt} />
        </div>
        <Button variant="surface" size="sm" onClick={() => setPhase("cooldown")} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
          Finish
        </Button>
      </div>

      {exercises.length > 0 && (
        <div className="mb-4 flex items-center gap-1.5">
          {exercises.map((e, i) => {
            const done = e.sets.length > 0;
            return (
              <button
                key={e.id}
                aria-label={`Go to exercise ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i === idx ? "bg-accent" : done ? "bg-good/60" : "bg-surface-2"
                }`}
              />
            );
          })}
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss error">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {exercises.length === 0 ? (
        <EmptyState
          icon={<Plus size={30} aria-hidden="true" />}
          title="Empty workout"
          hint="Add your first exercise to get going."
          action={
            <Button variant="accent" size="lg" onClick={() => setPickerOpen(true)}>
              <Plus size={18} aria-hidden="true" />
              Add exercise
            </Button>
          }
        />
      ) : (
        se && (
          <>
            {restOpen && (
              <RestBar key={restKey} target={restSeconds(goal)} onClose={() => setRestOpen(false)} />
            )}
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
              Exercise {idx + 1} of {exercises.length}
            </p>
            <div key={se.id} className="animate-fade-slide">
              <ExerciseCard
                se={se}
                unit={unit}
                lastData={lastMap[se.exerciseId]}
                targetSets={target}
                commitRef={commitRef}
                onAddSet={(w, r, t) => addSet(se, w, r, t)}
                onDeleteSet={(id) => deleteSet(se, id)}
                onSwap={() => setSwapOpen(true)}
                onRandomize={() => cycleSwap(se)}
                onRemove={() => removeExercise(se)}
              />
            </div>

            {/* Bottom bar: back · next set (until all sets logged) · next exercise */}
            <div className="mt-4 flex gap-2">
              <Button
                variant="surface"
                size="lg"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={idx === 0}
                aria-label="Previous exercise"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </Button>

              {!setsComplete ? (
                <Button
                  variant="accent"
                  size="lg"
                  className="flex-1"
                  onClick={() => commitRef.current?.()}
                >
                  Next set
                </Button>
              ) : onLast ? (
                <Button
                  variant="accent"
                  size="lg"
                  className="flex-1"
                  onClick={() => setPhase("cooldown")}
                  disabled={busy}
                >
                  <Flag size={18} aria-hidden="true" />
                  Finish workout
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="lg"
                  className="flex-1"
                  onClick={() => setCurrent((c) => c + 1)}
                >
                  Next exercise
                  <ChevronRight size={18} aria-hidden="true" />
                </Button>
              )}
            </div>

          </>
        )
      )}

      {toast && (
        <div
          className="fixed inset-x-0 z-[60] mx-auto flex w-full max-w-md justify-center px-4"
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="animate-slide-up flex items-center gap-3 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm shadow-lg shadow-black/40">
            <span>{toast.msg}</span>
            {toast.undo && (
              <button
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="flex items-center gap-1 font-semibold text-accent"
              >
                <Undo2 size={14} aria-hidden="true" /> Undo
              </button>
            )}
          </div>
        </div>
      )}

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addExercise} />

      <Sheet open={swapOpen && !!se} onClose={() => setSwapOpen(false)} title="Choose exercise">
        <ul className="flex flex-col gap-1.5">
          {se &&
            getAlternatives(se.exerciseId, { available }).map((alt) => (
              <li key={alt.id}>
                <button
                  onClick={() => {
                    swapTo(se, alt.id, se.exerciseId);
                    setSwapOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-3 text-left active:bg-surface-3"
                >
                  <span className="font-medium">{alt.name}</span>
                  <span className="text-xs text-muted">{EQUIPMENT_LABELS[alt.equipment]}</span>
                </button>
              </li>
            ))}
        </ul>
      </Sheet>

      <Sheet open={finishOpen} onClose={closeSummary} title="Session done">
        <FinishSummary summary={summary} onNote={saveNote} />
        <Button variant="accent" size="lg" className="mt-4 w-full" onClick={closeSummary}>
          <CheckCircle2 size={18} aria-hidden="true" />
          Done
        </Button>
      </Sheet>
    </div>
  );
}

function FinishSummary({
  summary,
  onNote,
}: {
  summary: RecRow[] | null;
  onNote: (n: string) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted">Here&apos;s what your coach says for next time.</p>
      <ul className="flex flex-col gap-2">
        {(summary ?? [])
          .filter((r) => r.recommendation.action !== "start")
          .map((r) => (
            <li
              key={r.exerciseId}
              className="animate-pop rounded-[var(--radius-md)] border border-border bg-surface-2 p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">{r.name}</span>
                <CoachBadge action={r.recommendation.action} />
              </div>
              <p className="text-sm text-muted">{r.recommendation.reason}</p>
            </li>
          ))}
        {(!summary || summary.length === 0) && (
          <li className="py-4 text-center text-sm text-muted">No sets logged this session.</li>
        )}
      </ul>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
          Session note (optional)
        </span>
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Felt strong, shoulder a bit tight..."
          onBlur={(e) => onNote(e.target.value.trim())}
          className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
    </div>
  );
}

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [start] = useState(() => parseDbDate(startedAt).getTime());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - start) / 1000));
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted">
      <Timer size={14} aria-hidden="true" />
      <span className="stat-num">{fmtClock(secs)}</span> elapsed
    </span>
  );
}

function RestBar({ target, onClose }: { target: number; onClose: () => void }) {
  const [left, setLeft] = useState(target);
  const [cap, setCap] = useState(target);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left === 0 && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(180);
    }
  }, [left]);

  const done = left <= 0;
  const pct = Math.max(0, Math.min(1, left / cap));

  return (
    <div className="mb-3 w-full">
      <div className="animate-slide-up overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-lg shadow-black/40">
        <div className="h-1 w-full bg-surface-2">
          <div
            className={`h-full ${done ? "bg-good" : "bg-accent"}`}
            style={{ width: `${done ? 100 : pct * 100}%`, transition: "width 1s linear" }}
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <Timer size={16} className={done ? "text-good" : "text-accent"} aria-hidden="true" />
          <span className="text-sm text-muted">{done ? "Time's up" : "Rest"}</span>
          <span className={`stat-num text-lg ${done ? "text-good" : "text-accent"}`}>
            {done ? "Go!" : fmtClock(left)}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setLeft((l) => Math.max(0, l - 15))}
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
            >
              -15
            </button>
            <button
              onClick={() => {
                const nl = left + 15;
                setLeft(nl);
                setCap((c) => Math.max(c, nl)); // grow the bar's full mark
              }}
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
            >
              +15
            </button>
            <button
              onClick={onClose}
              aria-label="Skip rest"
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtClock(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const PHASE_CONFIG = {
  warmup: {
    title: "Warm up",
    lead: "Prime your body before the working sets.",
    primary: "Start workout",
    skip: "Skip warm-up",
    seconds: 300,
    tips: [
      "5 min light cardio: bike, row or brisk walk",
      "Dynamic stretches and mobility for today's muscles",
      "1 to 2 light ramp-up sets on your first lift",
    ],
  },
  cooldown: {
    title: "Cool down",
    lead: "Bring your heart rate down and help recovery.",
    primary: "Finish workout",
    skip: "Skip cool-down",
    seconds: 180,
    tips: [
      "3 to 5 min easy walk or light cardio",
      "Static stretches for the muscles you trained",
      "Slow nasal breathing for a minute",
    ],
  },
} as const;

function PhaseScreen({
  kind,
  onPrimary,
  onSkip,
  busy,
}: {
  kind: "warmup" | "cooldown";
  onPrimary: () => void;
  onSkip: () => void;
  busy?: boolean;
}) {
  const cfg = PHASE_CONFIG[kind];
  const Icon = kind === "warmup" ? Flame : Snowflake;
  return (
    <div className="flex min-h-[72dvh] flex-col">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Icon size={22} aria-hidden="true" />
        </span>
        <div>
          <h1 className="display text-2xl font-bold leading-tight">{cfg.title}</h1>
          <p className="text-sm text-muted">{cfg.lead}</p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {cfg.tips.map((t) => (
          <li
            key={t}
            className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 text-sm"
          >
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <PhaseTimer seconds={cfg.seconds} />

      <div className="mt-auto flex flex-col gap-2 pt-6">
        <Button variant="accent" size="lg" onClick={onPrimary} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : null}
          {cfg.primary}
          {!busy && <ChevronRight size={18} aria-hidden="true" />}
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={busy}>
          {cfg.skip}
        </Button>
      </div>
    </div>
  );
}

function PhaseTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || left === 0) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [running, left]);

  useEffect(() => {
    if (left === 0 && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(180);
    }
  }, [left]);

  const done = left === 0;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
      <Timer size={18} className={done ? "text-good" : "text-accent"} aria-hidden="true" />
      <span className={`stat-num text-2xl ${done ? "text-good" : ""}`}>
        {done ? "Done" : fmtClock(left)}
      </span>
      <div className="ml-auto flex gap-1.5">
        <button
          onClick={() => {
            if (done) {
              setLeft(seconds);
              setRunning(true);
            } else {
              setRunning((r) => !r);
            }
          }}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium active:bg-surface-3"
        >
          {done ? "Restart" : running ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setLeft(seconds);
          }}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted active:bg-surface-3"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
