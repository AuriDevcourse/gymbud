"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronDown,
  Dumbbell,
  Flame,
  Footprints,
  Layers,
  Scale,
  Star,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button, Card, EmptyState, SectionTitle } from "./ui";
import { CountUp } from "./count-up";
import { WeightDelta } from "./weight-delta";
import { Skeleton } from "./skeleton";
import { Sheet } from "./sheet";
import { Stepper } from "./stepper";
import { drop, useApi } from "@/lib/swr";
import { api, fmtDuration, fmtWeight } from "@/lib/format";
import { weightTrend } from "@/lib/bodyweight";
import { dayLabel, parseDbDate, relativeDay, todayISO } from "@/lib/date";
import { xpForSession } from "@/lib/levels";
import { hasWeight, weightLabel, weightStep } from "@/lib/loading";
import type { ExercisePoint, ProgressSummary, SessionSummary, TopLift } from "@/lib/store";
import { EXERCISES_BY_ID, type Exercise } from "@/lib/exercise-library";
import {
  RUN_KIND_LABELS,
  SET_TYPE_BADGE,
  SET_TYPE_LABELS,
  type BodyWeightEntry,
  type Goal,
  type Run,
  type Session,
  type SetLog,
  type SetType,
  type Unit,
} from "@/lib/types";

function durationMin(s: SessionSummary): number | null {
  if (!s.finishedAt) return null;
  const ms = parseDbDate(s.finishedAt).getTime() - parseDbDate(s.startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

export function ProgressClient({
  exercises,
  bodyweight,
  sessions,
  runs,
  unit,
  goal,
  topLifts,
  summary,
}: {
  exercises: { id: string; name: string }[];
  bodyweight: BodyWeightEntry[];
  sessions: SessionSummary[];
  runs: Run[];
  unit: Unit;
  goal: Goal;
  topLifts: TopLift[];
  summary: ProgressSummary;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(exercises[0]?.id ?? "");
  const [drillOpen, setDrillOpen] = useState(false);
  const { data: prog, loading: progLoading, refresh: refreshDrill } = useApi<{
    exercise: Exercise;
    points: ExercisePoint[];
  }>(drillOpen && selected ? `/api/progress/${selected}` : null);
  const points = prog?.points ?? null;
  const loading = drillOpen && Boolean(selected) && progLoading;

  // A set edit changes numbers computed server-side (Top lifts, summary) and
  // the cached drill history — bust both so nothing keeps showing the old lift.
  const onSetsChanged = (exerciseId: string) => {
    drop(`/api/progress/${exerciseId}`);
    if (drillOpen && selected === exerciseId) refreshDrill();
    router.refresh();
  };

  const [rows, setRows] = useState(sessions);
  const [openId, setOpenId] = useState<number | null>(null); // expanded history card

  const [weights, setWeights] = useState(bodyweight);
  const [bw, setBw] = useState(
    bodyweight.length ? String(bodyweight[bodyweight.length - 1].weight) : "",
  );
  const logWeight = async () => {
    const val = parseFloat(bw);
    if (!val || val <= 0) return;
    try {
      const entry = await api<BodyWeightEntry>("/api/bodyweight", {
        method: "POST",
        body: JSON.stringify({ weight: val, loggedAt: todayISO() }),
      });
      setWeights((w) => [...w.filter((x) => x.loggedAt !== entry.loggedAt), entry]);
    } catch {
      /* keep the field; user can retry */
    }
  };

  const deleteSession = async (id: number) => {
    const snapshot = rows;
    setRows((r) => r.filter((s) => s.id !== id));
    setOpenId(null);
    try {
      await api(`/api/sessions/${id}`, { method: "DELETE" });
      // the session could have held any exercise's best lift — bust everything
      drop("/api/progress/");
      if (drillOpen) refreshDrill();
      router.refresh();
    } catch {
      setRows(snapshot);
    }
  };

  const bwData = useMemo(
    () => weights.map((b) => ({ x: dayLabel(b.loggedAt), y: b.weight })),
    [weights],
  );
  const bwTrend = useMemo(() => weightTrend(weights), [weights]);

  // Overall work trend — total volume per finished session over time. This is the
  // "strength over time" that isn't tied to one lift. Capped to the most recent
  // sessions: more points than this is unreadable at phone width.
  const volumeData = useMemo(
    () =>
      [...rows]
        .filter((s) => s.finishedAt && s.volume > 0)
        .reverse()
        .slice(-16)
        .map((s) => ({ x: dayLabel(s.startedAt), y: Math.round(s.volume) })),
    [rows],
  );

  const exData = useMemo(
    () => (points ?? []).map((p) => ({ x: dayLabel(p.date), y: p.est1rm })),
    [points],
  );

  const best = topLifts[0];

  return (
    <div className="flex flex-col gap-5 pb-4">
      <h1 className="display text-2xl font-bold">Progress</h1>

      {/* Overview — level + this week at a glance */}
      <div className="grid grid-cols-3 gap-2">
        {/* the full level card lives on /profile — this tile is the way there */}
        <Link href="/profile" className="block">
          <Tile icon={<Star size={17} aria-hidden="true" />} value={`Lv ${summary.level.level}`} label={summary.level.name} accent delay={0} />
        </Link>
        <Tile icon={<Flame size={17} aria-hidden="true" />} value={summary.streak} label="wk streak" delay={70} />
        <Tile icon={<Layers size={17} aria-hidden="true" />} value={summary.thisWeekSets} label="sets / wk" delay={140} />
      </div>

      {/* Total work trend */}
      {volumeData.length > 1 && (
        <section>
          <SectionTitle right={<span className="text-xs text-muted">per session</span>}>
            Total work
          </SectionTitle>
          <Card>
            <p className="mb-1 text-xs text-muted">Volume moved ({unit}·reps)</p>
            {/* volume isn't a weight — don't let the tooltip suffix it "kg" */}
            <Chart data={volumeData} unit={unit} format={(v) => `${fmtWeight(v)} ${unit}·reps`} />
          </Card>
        </section>
      )}

      {/* Top lifts — the real "how strong am I" */}
      <section>
        <SectionTitle>Top lifts</SectionTitle>
        {topLifts.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            Log some weighted sets and your best lifts will rank here.
          </Card>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {topLifts.map((l, i) => (
              <li
                key={l.exerciseId}
                className="animate-rise flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span
                  className={`stat-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-accent/20 text-accent" : "bg-surface-2 text-muted-strong"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-xs text-muted">
                    best {fmtWeight(l.weight, unit)} × {l.reps}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="stat-num font-bold leading-none text-accent">
                    {fmtWeight(l.est1rm, unit)}
                  </p>
                  <p className="text-[0.65rem] text-muted">est 1RM</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {best && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Trophy size={13} className="text-accent" aria-hidden="true" />
            Your strongest lift is {best.name} at {fmtWeight(best.est1rm, unit)} estimated 1RM.
          </p>
        )}
      </section>

      {/* Drill into a single lift (secondary) */}
      {exercises.length > 0 && (
        <section>
          <button
            onClick={() => setDrillOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 text-left active:bg-surface-2"
          >
            <span className="flex items-center gap-2 font-medium">
              <TrendingUp size={17} className="text-accent" aria-hidden="true" />
              Track one lift over time
            </span>
            <ChevronDown
              size={18}
              className={`text-muted transition-transform ${drillOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {drillOpen && (
            <Card className="mt-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                aria-label="Choose exercise"
                className="mb-3 h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 text-foreground outline-none focus:border-accent"
              >
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {loading ? (
                <Skeleton className="h-44 w-full" />
              ) : exData.length > 1 ? (
                <>
                  <p className="mb-1 text-xs text-muted">Estimated 1-rep max ({unit})</p>
                  <Chart data={exData} unit={unit} />
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted">
                  {exData.length === 1
                    ? "Only one session so far. Log it again to see a trend."
                    : "No weighted sets logged yet — bodyweight-only work has no est. 1RM to chart."}
                </p>
              )}
            </Card>
          )}
        </section>
      )}

      {/* Body weight (logged here) */}
      <section>
        <SectionTitle>Body weight</SectionTitle>
        <Card>
          {bwTrend.current && (
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <p className="stat-num text-3xl font-bold leading-none">
                  {fmtWeight(bwTrend.current.weight)}
                  <span className="ml-1 text-base font-medium text-muted">{unit}</span>
                </p>
                <p className="mt-1 text-xs text-muted">{relativeDay(bwTrend.current.loggedAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <WeightDelta delta={bwTrend.delta} unit={unit} goal={goal} label="vs last" />
                {bwTrend.totalDelta !== null && (
                  <WeightDelta delta={bwTrend.totalDelta} unit={unit} goal={goal} label="all time" />
                )}
              </div>
            </div>
          )}
          {bwData.length > 1 && <Chart data={bwData} unit={unit} />}
          <div className="mt-3 flex items-end gap-2 border-t border-border/60 pt-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Today ({unit})</span>
              <div className="relative">
                <Scale
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={bw}
                  onChange={(e) => setBw(e.target.value)}
                  aria-label="Body weight today"
                  className="stat-num h-12 w-full rounded-[var(--radius-md)] border border-border bg-background pl-9 pr-3 text-xl font-bold outline-none focus:border-accent"
                />
              </div>
            </label>
            <Button variant="accent" size="lg" onClick={logWeight}>
              Log
            </Button>
          </div>
        </Card>
      </section>

      {/* Runs */}
      {runs.length > 0 && (
        <section>
          <SectionTitle>Runs</SectionTitle>
          <ul className="flex flex-col gap-2">
            {runs.map((r) => (
              <li key={r.id}>
                <Card className="flex items-center gap-3 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Footprints size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {r.distance > 0 ? (
                        <>
                          <span className="stat-num">{fmtWeight(r.distance)}</span> km ·{" "}
                          {fmtDuration(r.duration)}
                        </>
                      ) : (
                        fmtDuration(r.duration)
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {RUN_KIND_LABELS[r.kind]} · {relativeDay(r.loggedAt)}
                      {r.distance > 0 ? ` · ${(r.duration / 60 / r.distance).toFixed(1)} min/km` : ""}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* History — richer cards */}
      <section>
        <SectionTitle>History</SectionTitle>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Dumbbell size={26} aria-hidden="true" />}
            title="No sessions yet"
            hint="Finish a workout and it'll show up here."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((s, i) => {
              const mins = durationMin(s);
              const open = openId === s.id;
              return (
                <li
                  key={s.id}
                  className="animate-rise overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  <div className="flex items-stretch">
                    <span className="w-1 shrink-0 bg-accent/70" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => setOpenId(open ? null : s.id)}
                        aria-expanded={open}
                        aria-label={`${open ? "Collapse" : "Expand"} session from ${relativeDay(s.startedAt)}`}
                        className="w-full p-3 text-left active:bg-surface-2"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {relativeDay(s.startedAt)}
                              {!s.finishedAt && (
                                <span className="ml-2 text-xs text-accent">in progress</span>
                              )}
                            </p>
                            <p className="text-xs text-muted">
                              {dayLabel(s.startedAt)}
                              {mins ? ` · ${mins} min` : ""}
                            </p>
                          </div>
                          {s.setCount > 0 && (
                            <span className="stat-num shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                              +{xpForSession({ workingSets: s.setCount, reps: s.reps, finished: !!s.finishedAt })} XP
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Dumbbell size={13} aria-hidden="true" />
                            <span className="stat-num font-semibold text-foreground">
                              {s.exerciseCount}
                            </span>{" "}
                            exercises
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers size={13} aria-hidden="true" />
                            <span className="stat-num font-semibold text-foreground">
                              {s.setCount}
                            </span>{" "}
                            {s.setCount === 1 ? "set" : "sets"}
                          </span>
                          {s.volume > 0 && (
                            <span className="flex items-center gap-1">
                              <TrendingUp size={13} aria-hidden="true" />
                              <span className="stat-num font-semibold text-foreground">
                                {fmtWeight(Math.round(s.volume), unit)}
                              </span>
                            </span>
                          )}
                          <ChevronDown
                            size={16}
                            className={`ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </div>
                        {s.note && <p className="mt-2 truncate text-xs text-muted">{s.note}</p>}
                      </button>
                      {open && (
                        <SessionDetail
                          id={s.id}
                          unit={unit}
                          readOnly={!s.finishedAt}
                          onChange={(detail) =>
                            setRows((r) =>
                              r.map((row) => (row.id === s.id ? applyDetail(row, detail) : row)),
                            )
                          }
                          onMutated={onSetsChanged}
                          onDelete={() => deleteSession(s.id)}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({
  icon,
  value,
  label,
  accent,
  delay = 0,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="animate-tile flex flex-col items-center gap-1 rounded-[var(--radius-md)] border border-border bg-surface py-3 shadow-[var(--shadow-card)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={accent ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="stat-num text-xl font-bold leading-none">
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </span>
      <span className="text-[0.62rem] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

function Chart({
  data,
  unit,
  format,
}: {
  data: { x: string; y: number }[];
  unit: Unit;
  /** tooltip value → text; defaults to a weight ("82.5kg") */
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => fmtWeight(v, unit));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#2a313a" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
          interval="preserveStartEnd"
          minTickGap={28}
          tick={{ fill: "#8a929d", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#2a313a" }}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "#8a929d", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip
          contentStyle={{
            background: "#14181c",
            border: "1px solid #2a313a",
            borderRadius: 12,
            color: "#f3f5f7",
          }}
          labelStyle={{ color: "#8a929d" }}
          formatter={(v) => [fmt(Number(v)), ""]}
        />
        <Line
          type="monotone"
          dataKey="y"
          stroke="#c8f135"
          strokeWidth={2.5}
          // dense series: dots per point turn into a solid smear on a phone
          dot={data.length > 15 ? false : { r: 3, fill: "#c8f135" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Re-derive a history card's numbers after sets were edited in the expanded
// view — working sets only, matching the listSessions SQL.
function applyDetail(row: SessionSummary, detail: Session): SessionSummary {
  const working = detail.exercises.flatMap((e) => e.sets.filter((x) => x.type !== "warmup"));
  return {
    ...row,
    exerciseCount: detail.exercises.length,
    setCount: working.length,
    reps: working.reduce((n, x) => n + x.reps, 0),
    volume: working.reduce((n, x) => n + x.weight * x.reps, 0),
  };
}

// Expanded history card: every exercise with its sets (tap a set to fix it),
// cardio attached to the session, and the tucked-away session delete.
// readOnly: an in-progress session is owned by the workout screen's optimistic
// state — editing it from here too would race it.
function SessionDetail({
  id,
  unit,
  readOnly,
  onChange,
  onMutated,
  onDelete,
}: {
  id: number;
  unit: Unit;
  readOnly: boolean;
  onChange: (detail: Session) => void;
  onMutated: (exerciseId: string) => void;
  onDelete: () => void;
}) {
  const { data: detail, error, mutate } = useApi<Session>(`/api/sessions/${id}`);
  const { data: sessionRuns } = useApi<Run[]>(`/api/runs?session=${id}`);
  const [editing, setEditing] = useState<{ set: SetLog; exerciseId: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const apply = (next: Session) => {
    mutate(next);
    onChange(next);
  };
  const withSet = (s: Session, setId: number, map: (sets: SetLog[]) => SetLog[]): Session => ({
    ...s,
    exercises: s.exercises.map((e) =>
      e.sets.some((x) => x.id === setId) ? { ...e, sets: map(e.sets) } : e,
    ),
  });

  // optimistic, rolled back on failure — same pattern as the workout screen
  const saveSet = async (
    setId: number,
    exerciseId: string,
    weight: number,
    reps: number,
    type: SetType,
  ) => {
    if (!detail) return;
    const snapshot = detail;
    apply(
      withSet(detail, setId, (sets) =>
        sets.map((x) => (x.id === setId ? { ...x, weight, reps, type } : x)),
      ),
    );
    try {
      await api(`/api/sets/${setId}`, {
        method: "PATCH",
        body: JSON.stringify({ weight, reps, type }),
      });
      onMutated(exerciseId);
    } catch {
      apply(snapshot);
    }
  };

  const removeSet = async (setId: number, exerciseId: string) => {
    if (!detail) return;
    const snapshot = detail;
    apply(withSet(detail, setId, (sets) => sets.filter((x) => x.id !== setId)));
    try {
      await api(`/api/sets/${setId}`, { method: "DELETE" });
      onMutated(exerciseId);
    } catch {
      apply(snapshot);
    }
  };

  if (!detail) {
    return (
      <div className="border-t border-border/60 p-3">
        {error ? (
          <p className="py-2 text-center text-xs text-muted">Couldn&apos;t load this session.</p>
        ) : (
          <Skeleton className="h-20 w-full" />
        )}
      </div>
    );
  }

  const logged = detail.exercises.filter((e) => e.sets.length > 0);

  return (
    <div className="animate-fade border-t border-border/60 p-3">
      {readOnly && (
        <p className="mb-3 text-xs text-muted">
          Workout in progress —{" "}
          <Link href="/workout" className="font-medium text-accent">
            edit it on the workout screen
          </Link>
          .
        </p>
      )}
      {logged.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted">No sets logged.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {logged.map((e) => (
            <div key={e.id}>
              <p className="mb-1.5 text-sm font-medium">
                {EXERCISES_BY_ID[e.exerciseId]?.name ?? e.exerciseId}
              </p>
              <ul className="grid grid-cols-2 gap-1.5">
                {e.sets.map((x, i) => {
                  const inner = (
                    <>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[0.65rem] font-bold text-muted-strong">
                        {i + 1}
                      </span>
                      <span className="stat-num flex-1 truncate text-sm">
                        {x.weight > 0
                          ? `${fmtWeight(x.weight, unit)} × ${x.reps}`
                          : `BW × ${x.reps}`}
                      </span>
                      {SET_TYPE_BADGE[x.type] && (
                        <span
                          className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[0.65rem] font-bold text-accent"
                          title={SET_TYPE_LABELS[x.type]}
                        >
                          {SET_TYPE_BADGE[x.type]}
                        </span>
                      )}
                    </>
                  );
                  const rowClass =
                    "flex w-full items-center gap-2 rounded-[var(--radius-md)] bg-surface-2 px-2.5 py-2 text-left";
                  return (
                    <li key={x.id}>
                      {readOnly ? (
                        <div className={rowClass}>{inner}</div>
                      ) : (
                        <button
                          onClick={() => setEditing({ set: x, exerciseId: e.exerciseId })}
                          aria-label={`Edit set ${i + 1} of ${EXERCISES_BY_ID[e.exerciseId]?.name ?? e.exerciseId}`}
                          className={`${rowClass} active:bg-surface-3`}
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* cardio logged into this session — read-only */}
      {sessionRuns && sessionRuns.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-sm font-medium">Cardio</p>
          <ul className="flex flex-col gap-1.5">
            {sessionRuns.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-[var(--radius-md)] bg-surface-2 px-2.5 py-2 text-sm"
              >
                <Footprints size={14} className="shrink-0 text-accent" aria-hidden="true" />
                <span className="stat-num">
                  {r.distance > 0 ? `${fmtWeight(r.distance)} km · ` : ""}
                  {fmtDuration(r.duration)}
                </span>
                {r.distance > 0 && (
                  <span className="ml-auto text-xs text-muted">
                    {(r.duration / 60 / r.distance).toFixed(1)} min/km
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* destructive, so tucked at the bottom of the detail — not on the card face */}
      {!readOnly && (
      <div className="mt-3 border-t border-border/60 pt-2.5 text-center">
        {confirmDelete ? (
          <span className="flex items-center justify-center gap-2 text-xs">
            <span className="text-muted">Delete this session and its sets?</span>
            <button
              onClick={onDelete}
              className="rounded-md bg-danger/15 px-2 py-1 font-semibold text-danger active:bg-danger/25"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-md border border-border px-2 py-1 text-muted active:bg-surface-2"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-1 text-xs text-muted active:text-danger"
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete this session
          </button>
        )}
      </div>
      )}

      {!readOnly && (
        <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit set">
          {editing && (
            <SetEditor
              key={editing.set.id}
              set={editing.set}
              exerciseId={editing.exerciseId}
              unit={unit}
              onSave={(w, r, t) => {
                saveSet(editing.set.id, editing.exerciseId, w, r, t);
                setEditing(null);
              }}
              onDelete={() => {
                removeSet(editing.set.id, editing.exerciseId);
                setEditing(null);
              }}
            />
          )}
        </Sheet>
      )}
    </div>
  );
}

// Same controls as the in-workout edit sheet (exercise-card), minus the
// session-only context.
function SetEditor({
  set,
  exerciseId,
  unit,
  onSave,
  onDelete,
}: {
  set: SetLog;
  exerciseId: string;
  unit: Unit;
  onSave: (weight: number, reps: number, type: SetType) => void;
  onDelete: () => void;
}) {
  const ex = EXERCISES_BY_ID[exerciseId];
  const showWeight = ex ? hasWeight(ex) : true;
  const step = ex ? weightStep(ex, unit) : unit === "kg" ? 2.5 : 5;
  const wl = ex ? weightLabel(ex, unit) : { label: `Weight (${unit})` };
  const [w, setW] = useState(set.weight);
  const [r, setR] = useState(set.reps);
  const [t, setT] = useState<SetType>(set.type);
  return (
    <div>
      <div className="flex items-start gap-2">
        {showWeight && <Stepper label={wl.label} value={w} onChange={setW} step={step} />}
        <Stepper label="Reps" value={r} onChange={setR} step={1} min={1} />
      </div>
      <div className="mt-3 flex gap-1.5">
        {(Object.keys(SET_TYPE_LABELS) as SetType[]).map((k) => (
          <button
            key={k}
            onClick={() => setT(k)}
            aria-pressed={t === k}
            className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-medium transition ${
              t === k
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-surface text-muted"
            }`}
          >
            {SET_TYPE_LABELS[k]}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="surface" size="lg" onClick={onDelete}>
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </Button>
        <Button variant="accent" size="lg" className="flex-1" onClick={() => onSave(w, r, t)}>
          Save set
        </Button>
      </div>
    </div>
  );
}
