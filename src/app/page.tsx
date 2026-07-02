import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Dumbbell, Flame, Scale, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui";
import { SuggestionCard } from "@/components/suggestion-card";
import { RunLogger } from "@/components/run-logger";
import {
  activeSession,
  daysSinceByMuscle,
  getProfile,
  listBodyWeight,
  listSessions,
  workoutStats,
} from "@/lib/store";
import { weightTrend } from "@/lib/bodyweight";
import { fmtWeight } from "@/lib/format";
import { calendarDaysAgo } from "@/lib/date";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function Home() {
  const profile = await getProfile();
  if (!profile.onboarded) redirect("/welcome");
  const [active, bwList, sessions, daysSince, stats] = await Promise.all([
    activeSession(),
    listBodyWeight(),
    listSessions(5),
    daysSinceByMuscle(),
    workoutStats(),
  ]);
  const lastDone = sessions.find((s) => s.finishedAt);
  const bwTrend = weightTrend(bwList);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header>
        <p className="text-sm text-muted">{greeting()}</p>
        <h1 className="display text-2xl font-bold">
          {profile.name ? profile.name : "Ready to train"}
        </h1>
      </header>

      {active && (
        <Link href="/workout" className="block">
          <Card className="flex items-center justify-between border-accent/40 bg-accent/10">
            <div>
              <p className="display font-semibold text-accent">Workout in progress</p>
              <p className="text-sm text-muted">
                {active.exercises.length} exercises · tap to continue
              </p>
            </div>
            <ChevronRight className="text-accent" aria-hidden="true" />
          </Card>
        </Link>
      )}

      {/* Quick stats — icons only, tap for the full picture */}
      <Link href="/progress" className="block">
        <Card className="flex items-center justify-between px-3 py-3">
          <Stat icon={<Flame size={18} aria-hidden="true" />} value={String(stats.streak)} accent />
          <Divider />
          <Stat
            icon={<Dumbbell size={18} aria-hidden="true" />}
            value={String(stats.thisWeekSets)}
          />
          <Divider />
          <Stat
            icon={<Scale size={18} aria-hidden="true" />}
            value={
              bwTrend.current ? `${fmtWeight(bwTrend.current.weight)}${profile.unit}` : "–"
            }
          />
          <Divider />
          <Stat
            icon={<TrendingUp size={18} aria-hidden="true" />}
            value={lastDone ? shortAgo(lastDone.startedAt) : "–"}
          />
        </Card>
      </Link>

      {/* Suggested workout (client: supports Shuffle for variety) */}
      <SuggestionCard
        goal={profile.goal}
        daysPerWeek={profile.daysPerWeek}
        available={profile.equipment}
        daysSince={daysSince}
        hasActive={!!active}
      />

      <RunLogger />

      <Link
        href="/exercises"
        className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3.5"
      >
        <span className="flex items-center gap-2 font-medium">
          <Dumbbell size={18} className="text-accent" aria-hidden="true" />
          Browse exercise library
        </span>
        <ChevronRight className="text-muted" aria-hidden="true" />
      </Link>
    </div>
  );
}

function shortAgo(s: string): string {
  const days = calendarDaysAgo(s);
  if (days <= 0) return "today";
  return `${days}d`;
}

function Stat({
  icon,
  value,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className={accent ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="stat-num text-lg font-bold leading-none">{value}</span>
    </div>
  );
}

function Divider() {
  return <span className="h-8 w-px shrink-0 bg-border" aria-hidden="true" />;
}
