import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Dumbbell, Flame, Scale, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui";
import { SuggestionCard } from "@/components/suggestion-card";
import { RunLogger } from "@/components/run-logger";
import { WeightDelta } from "@/components/weight-delta";
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
import { relativeDay } from "@/lib/date";

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

      {/* Quick "about me" stats — minimal, tap a card for the full picture */}
      <section className="grid grid-cols-2 gap-3">
        <Card className="h-full">
          <StatLabel icon={<Flame size={16} aria-hidden="true" />}>Streak</StatLabel>
          <p className="stat-num text-2xl font-bold">
            {stats.streak}
            <span className="ml-1 text-base font-medium text-muted">
              {stats.streak === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="text-sm text-muted">
            {stats.streak > 0 ? "Keep it going" : "Train today to start"}
          </p>
        </Card>

        <Card className="h-full">
          <StatLabel icon={<Dumbbell size={16} aria-hidden="true" />}>This week</StatLabel>
          <p className="stat-num text-2xl font-bold">
            {stats.thisWeekSets}
            <span className="ml-1 text-base font-medium text-muted">sets</span>
          </p>
          <p className="text-sm text-muted">{stats.totalWorkouts} workouts total</p>
        </Card>

        <Link href="/progress" className="block">
          <Card className="h-full">
            <StatLabel icon={<Scale size={16} aria-hidden="true" />}>Body weight</StatLabel>
            {bwTrend.current ? (
              <>
                <p className="stat-num text-2xl font-bold">
                  {fmtWeight(bwTrend.current.weight)}
                  <span className="ml-1 text-base text-muted">{profile.unit}</span>
                </p>
                {bwTrend.delta !== null ? (
                  <WeightDelta delta={bwTrend.delta} unit={profile.unit} goal={profile.goal} />
                ) : (
                  <p className="text-sm text-muted">{relativeDay(bwTrend.current.loggedAt)}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">Tap to log</p>
            )}
          </Card>
        </Link>

        <Link href="/progress" className="block">
          <Card className="h-full">
            <StatLabel icon={<TrendingUp size={16} aria-hidden="true" />}>Last session</StatLabel>
            {lastDone ? (
              <>
                <p className="stat-num text-2xl font-bold">
                  {lastDone.setCount}
                  <span className="ml-1 text-base font-medium text-muted">sets</span>
                </p>
                <p className="text-sm text-muted">{relativeDay(lastDone.startedAt)}</p>
              </>
            ) : (
              <p className="text-sm text-muted">No sessions yet</p>
            )}
          </Card>
        </Link>
      </section>

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

function StatLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-muted">
      {icon}
      <span className="text-xs font-medium uppercase tracking-wider">{children}</span>
    </div>
  );
}
