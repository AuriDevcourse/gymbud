export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-sm)] bg-surface-2 ${className}`} />;
}

/** Placeholder for the active workout while it loads (matches the real layout). */
export function WorkoutSkeleton() {
  return (
    <div className="pb-4">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-20" />
      </div>
      <Skeleton className="mb-4 h-1.5 w-full" />
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <Skeleton className="mb-3 h-6 w-2/3" />
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="mb-2 h-12 w-full" />
        <Skeleton className="mb-2 h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

/** Generic page skeleton (progress / profile). */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-44 w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
