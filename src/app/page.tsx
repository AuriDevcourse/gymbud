import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Dumbbell, Flame, Scale, TrendingUp } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { SuggestionCard } from "@/components/suggestion-card";
import { ProgramHomeCard } from "@/components/program-home-card";
import { RecoveryMap } from "@/components/body-map";
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
    <div className="flex flex-col gap-6 pb-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{greeting()}</p>
          <h1 className="display text-3xl font-bold leading-tight">
            {profile.name ? profile.name : "Ready to train"}
          </h1>
          <p className="mt-1 text-sm text-muted-strong">{motivation(stats, lastDone)}</p>
        </div>
        {stats.streak > 0 && (
          <div className="flex shrink-0 flex-col items-center rounded-[var(--radius-md)] bg-accent/10 px-3 py-2 text-accent">
            <Flame size={18} aria-hidden="true" />
            <span className="stat-num text-xl font-bold leading-none">{stats.streak}</span>
            <span className="text-[0.55rem] uppercase tracking-wider">wk streak</span>
          </div>
        )}
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

      {/* Quick stats — labelled tiles, tap for the full picture */}
      <Link href="/progress" className="grid grid-cols-4 gap-2">
        <Stat icon={<Flame size={17} aria-hidden="true" />} value={String(stats.streak)} label="streak" accent />
        <Stat icon={<Dumbbell size={17} aria-hidden="true" />} value={String(stats.thisWeekSets)} label="sets wk" />
        <Stat
          icon={<Scale size={17} aria-hidden="true" />}
          value={bwTrend.current ? `${fmtWeight(bwTrend.current.weight)}` : "–"}
          label={bwTrend.current ? profile.unit : "weight"}
        />
        <Stat
          icon={<TrendingUp size={17} aria-hidden="true" />}
          value={lastDone ? shortAgo(lastDone.startedAt) : "–"}
          label="last"
        />
      </Link>

      {/* Your program — the structured "what do I do next" answer */}
      <ProgramHomeCard hasActive={!!active} />

      {/* Or a one-off suggested workout (client: supports Shuffle for variety) */}
      <SuggestionCard
        goal={profile.goal}
        daysPerWeek={profile.daysPerWeek}
        available={profile.equipment}
        daysSince={daysSince}
        hasActive={!!active}
      />

      {/* Recovery heatmap — which muscles are fresh vs still worked */}
      <Card className="px-3 py-4">
        <SectionTitle right={<span className="text-xs normal-case tracking-normal text-muted">green = ready</span>}>
          Muscle recovery
        </SectionTitle>
        <RecoveryMap daysSince={daysSince} />
      </Card>

      <RunLogger />

      <Link
        href="/exercises"
        className="group flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow-card)] transition hover:border-border/80 hover:bg-surface-2 active:scale-[0.99]"
      >
        <span className="flex items-center gap-2 font-medium">
          <Dumbbell size={18} className="text-accent" aria-hidden="true" />
          Browse exercise library
        </span>
        <ChevronRight
          className="text-muted transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

// A warm, honest one-liner under the greeting. Rewards a streak, nudges a
// return, welcomes a beginner — never fake enthusiasm.
function motivation(
  stats: { streak: number; thisWeekSets: number; totalWorkouts: number },
  lastDone: { startedAt: string } | undefined,
): string {
  if (stats.totalWorkouts === 0) return "First session's the hardest. Let's get it logged.";
  if (stats.streak >= 2) {
    const wk = stats.thisWeekSets > 0 ? ` · ${stats.thisWeekSets} sets this week` : "";
    return `${stats.streak}-week streak going${wk}. Keep it alive.`;
  }
  const days = lastDone ? calendarDaysAgo(lastDone.startedAt) : 99;
  if (days >= 4) return "Been a few days. A short session still counts.";
  if (days >= 1) return "Good to see you back. Ready when you are.";
  return "Nice work today. Come back fresh.";
}

function shortAgo(s: string): string {
  const days = calendarDaysAgo(s);
  if (days <= 0) return "today";
  return `${days}d`;
}

function Stat({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[var(--radius-md)] border border-border bg-surface py-2.5 shadow-[var(--shadow-card)]">
      <span className={accent ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="stat-num text-xl font-bold leading-none">{value}</span>
      <span className="text-[0.58rem] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}
