import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Dumbbell, Scale, TrendingUp } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { SuggestionCard } from "@/components/suggestion-card";
import { WeightDelta } from "@/components/weight-delta";
import {
  activeSession,
  daysSinceByMuscle,
  getProfile,
  listBodyWeight,
  listSessions,
} from "@/lib/store";
import { weightTrend } from "@/lib/bodyweight";
import { GOAL_LABELS } from "@/lib/types";
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
  const [active, bwList, sessions, daysSince] = await Promise.all([
    activeSession(),
    listBodyWeight(),
    listSessions(5),
    daysSinceByMuscle(),
  ]);
  const lastDone = sessions.find((s) => s.finishedAt);
  const bwTrend = weightTrend(bwList);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()}</p>
          <h1 className="display text-2xl font-bold">Ready to train</h1>
        </div>
        <Chip tone="accent">{GOAL_LABELS[profile.goal]}</Chip>
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

      {/* Suggested workout (client: supports Shuffle for variety) */}
      <SuggestionCard
        goal={profile.goal}
        daysPerWeek={profile.daysPerWeek}
        available={profile.equipment}
        daysSince={daysSince}
        hasActive={!!active}
      />

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3">
        <Link href="/progress" className="block">
          <Card className="h-full">
            <div className="mb-2 flex items-center gap-1.5 text-muted">
              <TrendingUp size={16} aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Last session
              </span>
            </div>
            {lastDone ? (
              <>
                <p className="stat-num text-2xl font-bold">{lastDone.setCount} sets</p>
                <p className="text-sm text-muted">{relativeDay(lastDone.startedAt)}</p>
              </>
            ) : (
              <p className="text-sm text-muted">No sessions yet</p>
            )}
          </Card>
        </Link>

        <Link href="/profile" className="block">
          <Card className="h-full">
            <div className="mb-2 flex items-center gap-1.5 text-muted">
              <Scale size={16} aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Body weight
              </span>
            </div>
            {bwTrend.current ? (
              <>
                <p className="stat-num text-2xl font-bold">
                  {fmtWeight(bwTrend.current.weight)}
                  <span className="ml-1 text-base text-muted">{profile.unit}</span>
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  {bwTrend.delta !== null ? (
                    <WeightDelta delta={bwTrend.delta} unit={profile.unit} goal={profile.goal} />
                  ) : (
                    <p className="text-sm text-muted">{relativeDay(bwTrend.current.loggedAt)}</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Tap to log</p>
            )}
          </Card>
        </Link>
      </section>

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
