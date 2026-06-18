"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, Scale } from "lucide-react";
import { Button, Card, SectionTitle } from "./ui";
import { WeightDelta } from "./weight-delta";
import { api, fmtWeight } from "@/lib/format";
import { peek, poke } from "@/lib/swr";
import { PageSkeleton } from "./skeleton";
import { weightTrend } from "@/lib/bodyweight";
import { relativeDay, todayISO } from "@/lib/date";
import type { Equipment } from "@/lib/exercise-library";
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  type BodyWeightEntry,
  type Goal,
  type Profile,
  type Unit,
} from "@/lib/types";

const GOALS = Object.keys(GOAL_LABELS) as Goal[];
const EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[];

export function ProfileClient() {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(() => peek<Profile>("/api/profile") ?? null);
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [bw, setBw] = useState("");
  const [authOn, setAuthOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Profile>("/api/profile"),
      api<BodyWeightEntry[]>("/api/bodyweight"),
      api<{ auth: boolean }>("/api/health").catch(() => ({ auth: false })),
    ])
      .then(([prof, w, health]) => {
        setP(prof);
        poke("/api/profile", prof);
        setWeights(w);
        setAuthOn(Boolean(health.auth));
        if (w.length) setBw(String(w[w.length - 1].weight));
      })
      .catch((e) => setError(e.message));
  }, []);

  const lock = async () => {
    try {
      await api("/api/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const save = async (next: Profile) => {
    setP(next);
    setSaving(true);
    setSaved(false);
    try {
      const saved = await api<Profile>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          goal: next.goal,
          daysPerWeek: next.daysPerWeek,
          equipment: next.equipment,
          unit: next.unit,
        }),
      });
      setP(saved);
      poke("/api/profile", saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const logWeight = async () => {
    const val = parseFloat(bw);
    if (!val || val <= 0) return;
    try {
      const entry = await api<BodyWeightEntry>("/api/bodyweight", {
        method: "POST",
        body: JSON.stringify({ weight: val, loggedAt: todayISO() }),
      });
      setWeights((w) => [...w.filter((x) => x.loggedAt !== entry.loggedAt), entry]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!p) return <PageSkeleton />;

  const toggleEquip = (e: Equipment) => {
    const has = p.equipment.includes(e);
    save({
      ...p,
      equipment: has ? p.equipment.filter((x) => x !== e) : [...p.equipment, e],
    });
  };

  const recent = [...weights].reverse().slice(0, 6);
  const trend = weightTrend(weights);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-2xl font-bold">Profile</h1>
        {saving ? (
          <Loader2 size={18} className="animate-spin text-muted" aria-label="Saving" />
        ) : saved ? (
          <span className="flex items-center gap-1 text-xs text-good">
            <Check size={14} aria-hidden="true" /> Saved
          </span>
        ) : null}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Body weight */}
      <section>
        <SectionTitle>Body weight</SectionTitle>
        <Card>
          {trend.current && (
            <div className="mb-4 flex items-end justify-between gap-2">
              <div>
                <p className="stat-num text-3xl font-bold leading-none">
                  {fmtWeight(trend.current.weight)}
                  <span className="ml-1 text-base font-medium text-muted">{p.unit}</span>
                </p>
                <p className="mt-1 text-xs text-muted">{relativeDay(trend.current.loggedAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <WeightDelta delta={trend.delta} unit={p.unit} goal={p.goal} label="vs last" />
                {trend.totalDelta !== null && (
                  <WeightDelta
                    delta={trend.totalDelta}
                    unit={p.unit}
                    goal={p.goal}
                    label="all time"
                  />
                )}
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Today ({p.unit})</span>
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
          {recent.length > 0 && (
            <ul className="mt-3 flex flex-col">
              {recent.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0"
                >
                  <span className="text-muted">{relativeDay(w.loggedAt)}</span>
                  <span className="stat-num font-semibold">
                    {fmtWeight(w.weight, p.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Goal */}
      <section>
        <SectionTitle>Goal</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => save({ ...p, goal: g })}
              aria-pressed={p.goal === g}
              className={`rounded-[var(--radius-md)] border px-3 py-3 text-sm font-medium transition ${
                p.goal === g
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surface text-muted-strong"
              }`}
            >
              {GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      </section>

      {/* Days per week */}
      <section>
        <SectionTitle>Days per week</SectionTitle>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button
              key={d}
              onClick={() => save({ ...p, daysPerWeek: d })}
              aria-pressed={p.daysPerWeek === d}
              className={`stat-num flex-1 rounded-[var(--radius-sm)] border py-3 text-lg font-bold transition ${
                p.daysPerWeek === d
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted-strong"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      {/* Units */}
      <section>
        <SectionTitle>Units</SectionTitle>
        <div className="flex gap-2">
          {(["kg", "lb"] as Unit[]).map((u) => (
            <button
              key={u}
              onClick={() => save({ ...p, unit: u })}
              aria-pressed={p.unit === u}
              className={`flex-1 rounded-[var(--radius-md)] border py-3 font-semibold uppercase transition ${
                p.unit === u
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted-strong"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </section>

      {/* Equipment */}
      <section>
        <SectionTitle>
          Equipment you have
        </SectionTitle>
        <p className="-mt-1 mb-2 text-xs text-muted">
          Leave all off to assume everything is available.
        </p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => {
            const on = p.equipment.includes(e);
            return (
              <button
                key={e}
                onClick={() => toggleEquip(e)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                  on
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-muted-strong"
                }`}
              >
                {EQUIPMENT_LABELS[e]}
              </button>
            );
          })}
        </div>
      </section>

      {authOn && (
        <Button variant="outline" size="lg" className="mt-2 w-full" onClick={lock}>
          <Lock size={16} aria-hidden="true" />
          Lock app
        </Button>
      )}
    </div>
  );
}
