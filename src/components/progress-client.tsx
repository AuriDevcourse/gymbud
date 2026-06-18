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
import { Trash2, TrendingUp } from "lucide-react";
import { Card, EmptyState, SectionTitle } from "./ui";
import { WeightDelta } from "./weight-delta";
import { Skeleton } from "./skeleton";
import { useApi } from "@/lib/swr";
import { api, fmtWeight } from "@/lib/format";
import { weightTrend } from "@/lib/bodyweight";
import { dayLabel, parseDbDate, relativeDay } from "@/lib/date";
import type { ExercisePoint, SessionSummary } from "@/lib/store";
import type { Exercise } from "@/lib/exercise-library";
import type { BodyWeightEntry, Goal, Unit } from "@/lib/types";

export function ProgressClient({
  exercises,
  bodyweight,
  sessions,
  unit,
  goal,
}: {
  exercises: { id: string; name: string }[];
  bodyweight: BodyWeightEntry[];
  sessions: SessionSummary[];
  unit: Unit;
  goal: Goal;
}) {
  const [selected, setSelected] = useState(exercises[0]?.id ?? "");
  const { data: prog, loading: progLoading } = useApi<{
    exercise: Exercise;
    points: ExercisePoint[];
  }>(selected ? `/api/progress/${selected}` : null);
  const points = prog?.points ?? null;
  const loading = Boolean(selected) && progLoading;

  // editable copy of history so deletes reflect immediately
  const [rows, setRows] = useState(sessions);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const deleteSession = async (id: number) => {
    const snapshot = rows;
    setRows((r) => r.filter((s) => s.id !== id));
    setConfirmId(null);
    try {
      await api(`/api/sessions/${id}`, { method: "DELETE" });
    } catch {
      setRows(snapshot); // restore on failure
    }
  };

  const bwData = useMemo(
    () => bodyweight.map((b) => ({ x: dayLabel(b.loggedAt), y: b.weight })),
    [bodyweight],
  );
  const bwTrend = useMemo(() => weightTrend(bodyweight), [bodyweight]);
  const exData = useMemo(
    () => (points ?? []).map((p) => ({ x: dayLabel(p.date), y: p.est1rm })),
    [points],
  );

  return (
    <div className="flex flex-col gap-5 pb-4">
      <h1 className="display text-2xl font-bold">Progress</h1>

      {/* Body weight */}
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
                <p className="mt-1 text-xs text-muted">
                  {relativeDay(bwTrend.current.loggedAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <WeightDelta delta={bwTrend.delta} unit={unit} goal={goal} label="vs last" />
                {bwTrend.totalDelta !== null && (
                  <WeightDelta
                    delta={bwTrend.totalDelta}
                    unit={unit}
                    goal={goal}
                    label="all time"
                  />
                )}
              </div>
            </div>
          )}
          {bwData.length > 1 ? (
            <Chart data={bwData} unit={unit} />
          ) : (
            <p className="py-6 text-center text-sm text-muted">
              Log your weight on a few days to see the trend.
            </p>
          )}
        </Card>
      </section>

      {/* Exercise strength */}
      <section>
        <SectionTitle>Strength over time</SectionTitle>
        {exercises.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={28} aria-hidden="true" />}
            title="No lifts logged yet"
            hint="Finish a workout and your numbers will show up here."
          />
        ) : (
          <Card>
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

      {/* History */}
      <section>
        <SectionTitle>History</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No sessions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((s) => (
              <li key={s.id}>
                <Card className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {relativeDay(s.startedAt)}
                      {!s.finishedAt && (
                        <span className="ml-2 text-xs text-accent">in progress</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {parseDbDate(s.startedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                      {s.note ? ` · ${s.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="stat-num font-bold leading-none">{s.setCount}</p>
                      <p className="text-xs text-muted">sets</p>
                    </div>
                    {confirmId === s.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteSession(s.id)}
                          className="rounded-md bg-danger/15 px-2 py-1.5 text-xs font-semibold text-danger active:bg-danger/25"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-md border border-border px-2 py-1.5 text-xs text-muted active:bg-surface-2"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(s.id)}
                        aria-label="Delete session"
                        className="p-1.5 text-muted hover:text-danger"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
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
