"use client";

import { useMemo, useState } from "react";
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
import { WeightDelta } from "./weight-delta";
import { Skeleton } from "./skeleton";
import { useApi } from "@/lib/swr";
import { api, fmtDuration, fmtWeight } from "@/lib/format";
import { weightTrend } from "@/lib/bodyweight";
import { dayLabel, parseDbDate, relativeDay, todayISO } from "@/lib/date";
import type { ExercisePoint, ProgressSummary, SessionSummary, TopLift } from "@/lib/store";
import type { Exercise } from "@/lib/exercise-library";
import { RUN_KIND_LABELS, type BodyWeightEntry, type Goal, type Run, type Unit } from "@/lib/types";

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
  const [selected, setSelected] = useState(exercises[0]?.id ?? "");
  const [drillOpen, setDrillOpen] = useState(false);
  const { data: prog, loading: progLoading } = useApi<{
    exercise: Exercise;
    points: ExercisePoint[];
  }>(drillOpen && selected ? `/api/progress/${selected}` : null);
  const points = prog?.points ?? null;
  const loading = drillOpen && Boolean(selected) && progLoading;

  const [rows, setRows] = useState(sessions);
  const [confirmId, setConfirmId] = useState<number | null>(null);

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
    setConfirmId(null);
    try {
      await api(`/api/sessions/${id}`, { method: "DELETE" });
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
  // "strength over time" that isn't tied to one lift.
  const volumeData = useMemo(
    () =>
      [...rows]
        .filter((s) => s.finishedAt && s.volume > 0)
        .reverse()
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
        <Tile icon={<Star size={17} aria-hidden="true" />} value={`Lv ${summary.level.level}`} label={summary.level.name} accent />
        <Tile icon={<Flame size={17} aria-hidden="true" />} value={summary.streak} label="wk streak" />
        <Tile icon={<Layers size={17} aria-hidden="true" />} value={summary.thisWeekSets} label="sets / wk" />
      </div>

      {/* Total work trend */}
      {volumeData.length > 1 && (
        <section>
          <SectionTitle right={<span className="text-xs text-muted">per session</span>}>
            Total work
          </SectionTitle>
          <Card>
            <p className="mb-1 text-xs text-muted">Volume moved ({unit}·reps)</p>
            <Chart data={volumeData} unit={unit} />
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
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5"
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
                  Only one session so far. Log it again to see a trend.
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
            {rows.map((s) => {
              const mins = durationMin(s);
              return (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface"
                >
                  <div className="flex items-stretch">
                    <span className="w-1 shrink-0 bg-accent/70" aria-hidden="true" />
                    <div className="min-w-0 flex-1 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {relativeDay(s.startedAt)}
                            {!s.finishedAt && (
                              <span className="ml-2 text-xs text-accent">in progress</span>
                            )}
                          </p>
                          <p className="text-xs text-muted">
                            {parseDbDate(s.startedAt).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                            })}
                            {mins ? ` · ${mins} min` : ""}
                          </p>
                        </div>
                        {s.setCount > 0 && (
                          <span className="stat-num shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                            +{s.setCount * 12} XP
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
                          sets
                        </span>
                        {s.volume > 0 && (
                          <span className="flex items-center gap-1">
                            <TrendingUp size={13} aria-hidden="true" />
                            <span className="stat-num font-semibold text-foreground">
                              {fmtWeight(Math.round(s.volume), unit)}
                            </span>
                          </span>
                        )}
                        <span className="ml-auto">
                          {confirmId === s.id ? (
                            <span className="flex items-center gap-1">
                              <button
                                onClick={() => deleteSession(s.id)}
                                className="rounded-md bg-danger/15 px-2 py-1 text-xs font-semibold text-danger active:bg-danger/25"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="rounded-md border border-border px-2 py-1 text-xs text-muted active:bg-surface-2"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmId(s.id)}
                              aria-label="Delete session"
                              className="p-1 text-muted hover:text-danger"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          )}
                        </span>
                      </div>
                      {s.note && <p className="mt-2 truncate text-xs text-muted">{s.note}</p>}
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
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[var(--radius-md)] border border-border bg-surface py-3 shadow-[var(--shadow-card)]">
      <span className={accent ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="stat-num text-lg font-bold leading-none">{value}</span>
      <span className="text-[0.55rem] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

function Chart({ data, unit }: { data: { x: string; y: number }[]; unit: Unit }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#2a313a" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
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
          formatter={(v) => [fmtWeight(Number(v), unit), ""]}
        />
        <Line
          type="monotone"
          dataKey="y"
          stroke="#c8f135"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#c8f135" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
