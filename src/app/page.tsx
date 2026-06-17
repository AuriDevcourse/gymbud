import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Dumbbell, Flame, Scale, TrendingUp } from "lucide-react";
import { Button, Card, Chip, SectionTitle } from "@/components/ui";
import { StartSuggested } from "@/components/start-suggested";
import { suggestWorkout } from "@/lib/coach";
import {
  activeSession,
  daysSinceByMuscle,
  getProfile,
  latestBodyWeight,
  listSessions,
} from "@/lib/store";
import { EQUIPMENT_LABELS, GOAL_LABELS, MUSCLE_LABELS } from "@/lib/types";
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
  const [active, bw, sessions, daysSince] = await Promise.all([
    activeSession(),
    latestBodyWeight(),
    listSessions(5),
    daysSinceByMuscle(),
  ]);
  const lastDone = sessions.find((s) => s.finishedAt);

  const suggestion = suggestWorkout({
    goal: profile.goal,
    daysPerWeek: profile.daysPerWeek,
    available: profile.equipment,
    daysSince,
  });

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

      {/* Suggested workout */}
      <section>
        <SectionTitle right={<Chip tone="muted">{suggestion.exercises.length} moves</Chip>}>
          Today&apos;s suggestion
        </SectionTitle>
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Flame size={20} className="text-accent" aria-hidden="true" />
            <h3 className="display text-xl font-bold">{suggestion.title}</h3>
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {suggestion.focus.slice(0, 6).map((m) => (
              <Chip key={m} tone="muted">
                {MUSCLE_LABELS[m]}
              </Chip>
            ))}
          </div>
          <ol className="mb-4 flex flex-col">
            {suggestion.exercises.map((ex, i) => (
              <li
                key={ex.id}
                className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
              >
                <span className="stat-num w-5 text-sm text-muted">{i + 1}</span>
                <span className="flex-1 font-medium">{ex.name}</span>
                <Chip tone="muted">{EQUIPMENT_LABELS[ex.equipment]}</Chip>
              </li>
            ))}
          </ol>

          {!active && suggestion.exercises.length > 0 && (
            <StartSuggested exerciseIds={suggestion.exercises.map((e) => e.id)} />
          )}
          {!active && (
            <Link href="/workout" className="mt-2 block">
              <Button variant="ghost" className="w-full">
                Or start an empty workout
              </Button>
            </Link>
          )}
        </Card>
      </section>

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
            {bw ? (
              <>
                <p className="stat-num text-2xl font-bold">
                  {fmtWeight(bw.weight)}
                  <span className="ml-1 text-base text-muted">{profile.unit}</span>
                </p>
                <p className="text-sm text-muted">{relativeDay(bw.loggedAt)}</p>
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
