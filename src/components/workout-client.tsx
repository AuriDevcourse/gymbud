"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flag,
  Flame,
  Layers,
  Loader2,
  Check,
  Plus,
  Share2,
  Snowflake,
  StickyNote,
  Timer,
  Trophy,
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
import { api, fmtWeight } from "@/lib/format";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { CountUp } from "./count-up";
import { peek, poke, useApi } from "@/lib/swr";
import { parseDbDate } from "@/lib/date";
import { getAlternatives } from "@/lib/coach";
import { targetSetsFor } from "@/lib/loading";
import {
  EXERCISES_BY_ID,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from "@/lib/exercise-library";
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, MUSCLE_LABELS } from "@/lib/types";
import type {
  Difficulty,
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

// A short label for what this session is, from the muscles it trains.
function sessionTitle(exercises: SessionExercise[]): string {
  const groups = new Set<MuscleGroup>();
  for (const e of exercises) {
    const m = EXERCISES_BY_ID[e.exerciseId]?.muscleGroup;
    if (m) groups.add(m);
  }
  if (groups.size === 0) return "Workout";
  const has = (arr: MuscleGroup[]) => arr.some((m) => groups.has(m));
  const push = has(["chest", "shoulders", "triceps"]);
  const pull = has(["back", "biceps", "forearms"]);
  const legs = has(["quads", "hamstrings", "glutes", "calves"]);
  if (legs && (push || pull)) return "Full Body";
  if (push && pull) return "Upper Body";
  if (legs && !push && !pull) return "Lower Body";
  if (push && !pull) return "Push";
  if (pull && !push) return "Pull";
  if (groups.has("core")) return "Core";
  return MUSCLE_LABELS[[...groups][0]];
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

// Per-session UI state that must survive leaving /workout (it isn't a nav tab,
// so navigating away unmounts this component). Kept in sessionStorage so the
// exercise you were on and a running rest timer are restored on return.
const posKey = (id: number) => `gymbud:pos:${id}`;
const restKeyFor = (id: number) => `gymbud:rest:${id}`;
const store = {
  get(k: string): string | null {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* private mode / quota */
    }
  },
  del(k: string) {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

// Seed the exercise index / rest timer from storage for the session we already
// have cached (in-app navigation), so returning to /workout doesn't flash back
// to exercise 1. On a full reload the cache is empty here and restore happens
// once the active session is fetched (see the mount effect).
function initialPos(): number {
  const s = peek<Session>(ACTIVE_KEY);
  if (!s) return 0;
  const p = store.get(posKey(s.id));
  const n = p ? parseInt(p, 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function initialRest(): number | null {
  const s = peek<Session>(ACTIVE_KEY);
  if (!s) return null;
  const r = store.get(restKeyFor(s.id));
  if (r === null) return null;
  const ends = parseInt(r, 10);
  return Number.isFinite(ends) && ends > Date.now() ? ends : null;
}

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

  const [current, setCurrent] = useState(initialPos);
  const [lastMap, setLastMap] = useState<Record<string, LastData>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(initialRest); // wall-clock end
  const [noteOpen, setNoteOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);

  const [finishOpen, setFinishOpen] = useState(false);
  const [summary, setSummary] = useState<RecRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  // PRs the lifter set this session — powers the finish-screen celebration.
  const [prNames, setPrNames] = useState<string[]>([]);

  // bottom-bar "Next set" fires the current exercise card's add-set commit
  const commitRef = useRef<(() => void) | null>(null);
  // live composer values, so the primary button reads "Log 62.5 × 10". Guarded
  // so a no-op update can't loop; onValues is stable (empty deps).
  const [composer, setComposer] = useState<{ w: number; r: number; show: boolean } | null>(null);
  const onValues = useCallback((w: number, r: number, show: boolean) => {
    setComposer((prev) =>
      prev && prev.w === w && prev.r === r && prev.show === show ? prev : { w, r, show },
    );
  }, []);
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
        // full reload: the in-memory cache was empty, so restore the exercise
        // index + running rest timer from storage now that we know the session.
        if (s) {
          const p = store.get(posKey(s.id));
          if (p !== null) {
            const n = parseInt(p, 10);
            if (Number.isFinite(n)) setCurrent(n);
          }
          const r = store.get(restKeyFor(s.id));
          if (r !== null) {
            const ends = parseInt(r, 10);
            if (Number.isFinite(ends) && ends > Date.now()) setRestEndsAt(ends);
            else store.del(restKeyFor(s.id));
          }
        }
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

  // Persist which exercise you're on so a return trip lands where you left off.
  useEffect(() => {
    if (session) store.set(posKey(session.id), String(current));
  }, [current, session]);

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
    tapHaptic(); // physical tick the instant a set is logged
    const ends = Date.now() + restSeconds(goal) * 1000;
    setRestEndsAt(ends);
    if (session) store.set(restKeyFor(session.id), String(ends));
    try {
      const real = await api<SetLog & { pr?: boolean }>(
        `/api/session-exercises/${se.id}/sets`,
        {
          method: "POST",
          body: JSON.stringify({ weight, reps, type }),
        },
      );
      patch((s) => ({
        ...s,
        exercises: s.exercises.map((e) =>
          e.id === se.id
            ? { ...e, sets: e.sets.map((x) => (x.id === id ? real : x)) }
            : e,
        ),
      }));
      if (real.pr) {
        celebrate(true);
        successHaptic(); // strong double-pulse for a PR
        const nm = EXERCISES_BY_ID[se.exerciseId]?.name ?? "lift";
        setToast({ msg: `New PR · ${nm}` });
        setPrNames((p) => (p.includes(nm) ? p : [...p, nm]));
      }
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

  const closeRest = () => {
    setRestEndsAt(null);
    if (session) store.del(restKeyFor(session.id));
  };

  // Edit a logged set in place (fix a mistyped weight/reps/type). Optimistic.
  const editSet = async (
    se: SessionExercise,
    setId: number,
    weight: number,
    reps: number,
    type: SetType,
  ) => {
    const prev = se.sets.find((x) => x.id === setId);
    if (!prev) return;
    patch((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === se.id
          ? { ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, weight, reps, type } : x)) }
          : e,
      ),
    }));
    try {
      const real = await api<SetLog>(`/api/sets/${setId}`, {
        method: "PATCH",
        body: JSON.stringify({ weight, reps, type }),
      });
      patch((s) => ({
        ...s,
        exercises: s.exercises.map((e) =>
          e.id === se.id ? { ...e, sets: e.sets.map((x) => (x.id === setId ? real : x)) } : e,
        ),
      }));
    } catch (e) {
      patch((s) => ({
        ...s,
        exercises: s.exercises.map((el) =>
          el.id === se.id ? { ...el, sets: el.sets.map((x) => (x.id === setId ? prev : x)) } : el,
        ),
      }));
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
      store.del(posKey(session.id));
      store.del(restKeyFor(session.id));
      setRestEndsAt(null);
      const res = await api<{ recommendations: RecRow[] }>(
        `/api/sessions/${session.id}/recommendations`,
      );
      setSummary(res.recommendations);
      setFinishOpen(true);
      celebrate(true);
      successHaptic();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // RPE: rate how hard an exercise was; feeds next session's coach target.
  const rateDifficulty = async (seId: number, difficulty: Difficulty) => {
    patch((s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.id === seId ? { ...e, difficulty } : e)),
    }));
    try {
      await api(`/api/session-exercises/${seId}`, {
        method: "PATCH",
        body: JSON.stringify({ difficulty }),
      });
    } catch {
      /* non-critical */
    }
  };

  const saveNote = async (note: string) => {
    if (!session) return;
    const clean = note.trim() || null;
    patch((s) => ({ ...s, note: clean }));
    try {
      await api(`/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ note: clean }),
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
          <FinishSummary
          exercises={session.exercises}
          summary={summary}
          startedAt={session.startedAt}
          prNames={prNames}
          unit={unit}
          onNote={saveNote}
          onRate={rateDifficulty}
        />
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
  const target = se
    ? targetSetsFor(goal, EXERCISES_BY_ID[se.exerciseId]?.type ?? "compound")
    : 0;
  // warm-up sets don't count toward the working-set target
  const setsDone = se ? se.sets.filter((s) => s.type !== "warmup").length : 0;
  const setsComplete = setsDone >= target;

  return (
    <div className="pb-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="display text-2xl font-bold leading-tight">Workout</h1>
          {exercises.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">{sessionTitle(exercises)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-muted">
          <ElapsedTimer startedAt={session.startedAt} />
          <button
            onClick={() => setNoteOpen(true)}
            aria-label={session.note ? "Edit session note" : "Add session note"}
            className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 active:bg-surface-3 ${
              session.note ? "text-accent" : "text-muted"
            }`}
          >
            <StickyNote size={16} aria-hidden="true" />
          </button>
          <Button variant="surface" size="sm" onClick={() => setPhase("cooldown")} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
            Finish
          </Button>
        </div>
      </div>

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
            {restEndsAt && (
              <RestBar
                endsAt={restEndsAt}
                total={restSeconds(goal)}
                onChange={(end) => {
                  setRestEndsAt(end);
                  if (session) store.set(restKeyFor(session.id), String(end));
                }}
                onClose={closeRest}
              />
            )}
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
              Exercise {idx + 1} of {exercises.length}
            </p>
            <div key={se.id} className="animate-exercise-in">
              <ExerciseCard
                se={se}
                unit={unit}
                goal={goal}
                lastData={lastMap[se.exerciseId]}
                targetSets={target}
                commitRef={commitRef}
                onValues={onValues}
                onAddSet={(w, r, t) => addSet(se, w, r, t)}
                onDeleteSet={(id) => deleteSet(se, id)}
                onEditSet={(id, w, r, t) => editSet(se, id, w, r, t)}
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
                  <CheckCircle2 size={18} aria-hidden="true" />
                  {composer
                    ? composer.show
                      ? `Log ${fmtWeight(composer.w, unit)} × ${composer.r}`
                      : `Log ${composer.r} reps`
                    : "Log set"}
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

      <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Session note">
        <NoteEditor
          initial={session.note ?? ""}
          onSave={(n) => {
            saveNote(n);
            setNoteOpen(false);
          }}
        />
      </Sheet>

      <Sheet open={finishOpen} onClose={closeSummary} title="Session done">
        <FinishSummary
          exercises={session.exercises}
          summary={summary}
          startedAt={session.startedAt}
          prNames={prNames}
          unit={unit}
          onNote={saveNote}
          onRate={rateDifficulty}
        />
        <Button variant="accent" size="lg" className="mt-4 w-full" onClick={closeSummary}>
          <CheckCircle2 size={18} aria-hidden="true" />
          Done
        </Button>
      </Sheet>
    </div>
  );
}

// Mid-session note editor: jot down how it's going without waiting for the end.
function NoteEditor({ initial, onSave }: { initial: string; onSave: (n: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <div>
      <textarea
        rows={4}
        maxLength={500}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        placeholder="Felt strong, shoulder a bit tight..."
        className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <Button variant="accent" size="lg" className="mt-3 w-full" onClick={() => onSave(text)}>
        <CheckCircle2 size={18} aria-hidden="true" />
        Save note
      </Button>
    </div>
  );
}

function FinishSummary({
  exercises,
  summary,
  startedAt,
  prNames,
  unit,
  onNote,
  onRate,
}: {
  exercises: SessionExercise[];
  summary: RecRow[] | null;
  startedAt: string;
  prNames: string[];
  unit: Unit;
  onNote: (n: string) => void;
  onRate: (seId: number, d: Difficulty) => void;
}) {
  const logged = exercises.filter((e) => e.sets.length > 0);
  const [rated, setRated] = useState<Record<number, Difficulty>>(() =>
    Object.fromEntries(
      logged.filter((e) => e.difficulty).map((e) => [e.id, e.difficulty as Difficulty]),
    ),
  );
  const DIFFS = Object.keys(DIFFICULTY_LABELS) as Difficulty[];
  const recFor = (exId: string) => summary?.find((r) => r.exerciseId === exId)?.recommendation;
  const rate = (seId: number, d: Difficulty) => {
    setRated((m) => ({ ...m, [seId]: d }));
    onRate(seId, d);
  };

  // Celebration numbers: total load moved, working sets, and how long it took.
  // Snap "finished at" once (React 19 purity forbids Date.now() in render).
  const [finishedMs] = useState(nowMs);
  const working = logged.flatMap((e) => e.sets.filter((s) => s.type !== "warmup"));
  const volume = working.reduce((n, s) => n + s.weight * s.reps, 0);
  const totalSets = working.length;
  const durMin = Math.max(1, Math.round((finishedMs - parseDbDate(startedAt).getTime()) / 60000));

  return (
    <div>
      {logged.length > 0 ? (
        <>
          {/* The reward: what you just did, loud, before any admin. */}
          <div className="mb-4 overflow-hidden rounded-[var(--radius-lg)] border border-accent/30 bg-gradient-to-b from-accent/12 to-transparent px-4 py-4 text-center">
            <p className="display text-lg font-bold text-accent">Session done</p>
            <p className="mt-0.5 text-sm text-muted">
              {logged.length} {logged.length === 1 ? "exercise" : "exercises"} · nice work.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <HeroStat
                icon={<Dumbbell size={16} aria-hidden="true" />}
                value={<CountUp value={Math.round(volume)} format={(n) => fmtWeight(Math.round(n), unit)} />}
                label={`${unit} moved`}
              />
              <HeroStat
                icon={<Layers size={16} aria-hidden="true" />}
                value={<CountUp value={totalSets} />}
                label="sets"
              />
              <HeroStat
                icon={<Timer size={16} aria-hidden="true" />}
                value={<CountUp value={durMin} />}
                label="min"
              />
            </div>
            {prNames.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm font-semibold text-accent">
                <Trophy size={15} aria-hidden="true" />
                {prNames.length} new {prNames.length === 1 ? "PR" : "PRs"}
                <span className="font-normal text-muted-strong">· {prNames.join(", ")}</span>
              </div>
            )}
            <ShareResult
              volume={Math.round(volume)}
              sets={totalSets}
              min={durMin}
              prCount={prNames.length}
              unit={unit}
            />
          </div>
          <p className="mb-3 text-sm text-muted">
            How hard was each one? It tunes next session&apos;s weights.
          </p>
          <ul className="flex flex-col gap-2">
            {logged.map((e) => {
              const rec = recFor(e.exerciseId);
              return (
                <li
                  key={e.id}
                  className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {EXERCISES_BY_ID[e.exerciseId]?.name ?? e.exerciseId}
                    </span>
                    {rec && rec.action !== "start" && <CoachBadge action={rec.action} />}
                  </div>
                  <div className="flex gap-1.5">
                    {DIFFS.map((d) => (
                      <button
                        key={d}
                        onClick={() => rate(e.id, d)}
                        aria-pressed={rated[e.id] === d}
                        className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-medium transition ${
                          rated[e.id] === d
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-surface text-muted"
                        }`}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="py-4 text-center text-sm text-muted">No sets logged this session.</p>
      )}
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

// Share the session — the "look what I did" moment top apps use to make finishing
// feel worth showing off. Web Share where available (native sheet), clipboard
// fallback otherwise. Text-only, so nothing to render blind or get wrong.
function ShareResult({
  volume,
  sets,
  min,
  prCount,
  unit,
}: {
  volume: number;
  sets: number;
  min: number;
  prCount: number;
  unit: string;
}) {
  const [done, setDone] = useState<null | "shared" | "copied">(null);
  const text =
    `Workout done on GymBud: ${fmtWeight(volume, unit as Unit)}${unit} moved · ${sets} sets · ${min} min` +
    (prCount > 0 ? ` · ${prCount} new PR${prCount === 1 ? "" : "s"}` : "");

  const share = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "GymBud", text });
        setDone("shared");
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setDone("copied");
      }
    } catch {
      /* user dismissed the share sheet — no-op */
    }
  };

  return (
    <button
      onClick={share}
      className="mx-auto mt-3 flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-4 py-1.5 text-sm font-medium text-foreground"
    >
      {done ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
      {done === "copied" ? "Copied" : done === "shared" ? "Shared" : "Share result"}
    </button>
  );
}

// One tile in the finish-screen hero row.
function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-2/60 py-2">
      <span className="mx-auto mb-1 flex justify-center text-accent">{icon}</span>
      <p className="stat-num text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted">{label}</p>
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
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  const secs = Math.max(0, Math.floor((now - start) / 1000));
  return (
    <span className="inline-flex items-center gap-1.5">
      <Timer size={14} aria-hidden="true" />
      <span className="stat-num">{fmtClock(secs)}</span>
    </span>
  );
}

// Wall-clock rest countdown: derives the time left from a target end timestamp
// (not by decrementing a counter), so it stays correct after the tab is
// backgrounded or you leave and return to the workout.
function RestBar({
  endsAt,
  total,
  onChange,
  onClose,
}: {
  endsAt: number;
  total: number; // the goal's rest length, used as the progress-bar denominator
  onChange: (end: number) => void;
  onClose: () => void;
}) {
  // `endsAt` is the single source of truth (owned by the parent): logging the
  // next set pushes a fresh end-time down, and +/-15 flow back up via onChange.
  // Deriving from the prop — instead of a useState(endsAt) seeded once at mount —
  // is what makes the bar actually RESET when you start your next set.
  const [now, setNow] = useState(nowMs);
  const vibratedRef = useRef(false);

  useEffect(() => {
    const tick = () => setNow(nowMs());
    tick();
    const t = setInterval(tick, 1000);
    // snap back to the right time the moment the app becomes visible again
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const left = Math.max(0, Math.round((endsAt - now) / 1000));
  const done = left <= 0;
  // Bar's full mark: the goal's rest length, or the remaining time if you've
  // pushed it past that with +15. Derived, so a new set snaps it back to full.
  const cap = Math.max(1, total, left);

  useEffect(() => {
    if (done && !vibratedRef.current) {
      vibratedRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(180);
    }
    if (!done) vibratedRef.current = false;
  }, [done]);

  const adjust = (delta: number) => {
    // push the new end-time up to the parent; it flows back as `endsAt`
    onChange(endsAt + delta * 1000);
  };

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
              onClick={() => adjust(-15)}
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
            >
              -15
            </button>
            <button
              onClick={() => adjust(15)}
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

// wall-clock reader, kept out of render so the purity lint stays happy
function nowMs(): number {
  return Date.now();
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
