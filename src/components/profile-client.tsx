"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Dumbbell,
  Flame,
  Layers,
  type LucideIcon,
  Settings,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Card, SectionTitle } from "./ui";
import { api } from "@/lib/format";
import { peek, poke } from "@/lib/swr";
import { PageSkeleton } from "./skeleton";
import { relativeDay } from "@/lib/date";
import type { Profile } from "@/lib/types";
import type { ProgressSummary, SessionSummary } from "@/lib/store";

// Badge icon name (from levels.ts) → lucide component.
const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Dumbbell,
  Flame,
  Shield,
  Layers,
  TrendingUp,
  Compass,
  Target,
  Star,
};

// Profile is now your IDENTITY: cosmic level, streak, achievements and recent
// activity — the stuff that makes you feel like someone who trains. The behaviour
// knobs (goal/units/equipment) live in Settings; body weight lives in Progress.
export function ProfileClient() {
  const [p, setP] = useState<Profile | null>(() => peek<Profile>("/api/profile") ?? null);
  const [stats, setStats] = useState<ProgressSummary | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Profile>("/api/profile"),
      api<ProgressSummary>("/api/stats").catch(() => null),
      api<SessionSummary[]>("/api/sessions").catch(() => []),
    ])
      .then(([prof, st, ses]) => {
        setP(prof);
        poke("/api/profile", prof);
        setName(prof.name);
        setStats(st);
        setSessions(ses.filter((s) => s.finishedAt).slice(0, 6));
      })
      .catch((e) => setError(e.message));
  }, []);

  const saveName = async (next: string) => {
    if (!p || next.trim() === p.name) return;
    const updated = { ...p, name: next.trim() };
    setP(updated);
    try {
      const saved = await api<Profile>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: updated.name,
          goal: p.goal,
          daysPerWeek: p.daysPerWeek,
          equipment: p.equipment,
          unit: p.unit,
        }),
      });
      poke("/api/profile", saved);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!p) return <PageSkeleton />;

  const level = stats?.level;
  const badges = stats?.badges ?? [];
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-2xl font-bold">Profile</h1>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-muted active:bg-surface-3"
        >
          <Settings size={18} aria-hidden="true" />
        </Link>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Level hero — the cosmic rank you've climbed to. */}
      {level && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-accent/30 bg-gradient-to-br from-accent/15 via-surface to-surface p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Star size={26} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                Level {level.level}
              </p>
              <p className="display truncate text-2xl font-bold text-accent">{level.name}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[0.7rem]">
              <span className="stat-num text-muted">{stats?.totalXp.toLocaleString()} XP</span>
              <span className="text-muted">
                {level.need - Math.round(level.into)} to {level.nextName}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round(level.progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Name — the one bit of identity you set by hand. */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => saveName(name)}
        maxLength={40}
        placeholder="Add your name"
        aria-label="Your name"
        className="h-12 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 text-foreground outline-none focus:border-accent"
      />

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={<Flame size={17} aria-hidden="true" />} value={stats.streak} label={`wk streak`} accent />
          <StatTile icon={<Dumbbell size={17} aria-hidden="true" />} value={stats.totalWorkouts} label="workouts" />
          <StatTile icon={<Layers size={17} aria-hidden="true" />} value={stats.totalSets} label="total sets" />
        </div>
      )}

      {/* Recent activity — what you've been doing, first. */}
      <section>
        <SectionTitle>Recent activity</SectionTitle>
        {sessions.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            No finished workouts yet. Your sessions will show up here.
          </Card>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{relativeDay(s.startedAt)}</p>
                  <p className="text-xs text-muted">
                    {s.exerciseCount} {s.exerciseCount === 1 ? "exercise" : "exercises"} · {s.setCount} sets
                  </p>
                </div>
                <span className="stat-num shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  +{s.setCount * 12} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Achievements */}
      <section>
        <SectionTitle right={<span className="text-xs text-muted">{earned.length}/{badges.length}</span>}>
          Achievements
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {[...earned, ...locked].map((b) => {
            const Icon = ICONS[b.icon] ?? Trophy;
            return (
              <div
                key={b.id}
                className={`flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border p-3 text-center ${
                  b.earned
                    ? "border-accent/40 bg-accent/5"
                    : "border-border bg-surface opacity-60"
                }`}
              >
                <span
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full ${
                    b.earned ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"
                  }`}
                >
                  <Icon size={20} aria-hidden="true" />
                  {!b.earned && b.progress > 0 && (
                    <span className="absolute -bottom-1 h-1 w-8 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="block h-full rounded-full bg-muted-strong"
                        style={{ width: `${Math.round(b.progress * 100)}%` }}
                      />
                    </span>
                  )}
                </span>
                <p className="text-[0.7rem] font-semibold leading-tight">{b.name}</p>
                <p className="text-[0.62rem] leading-tight text-muted">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[var(--radius-md)] border border-border bg-surface py-3 shadow-[var(--shadow-card)]">
      <span className={accent ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="stat-num text-xl font-bold leading-none">{value.toLocaleString()}</span>
      <span className="text-[0.58rem] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}
