import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`surface-grad rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="display text-xs font-semibold uppercase tracking-widest text-muted">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "muted";
}) {
  const tones = {
    default: "border-border bg-surface-2 text-muted-strong",
    accent: "border-accent/40 bg-accent/10 text-accent",
    muted: "border-transparent bg-surface-2 text-muted",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "accent" | "surface" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "surface",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const variants = {
    accent: "btn-accent text-accent-foreground hover:brightness-105 font-semibold shadow-[var(--shadow-accent)]",
    surface: "surface-grad bg-surface-2 text-foreground hover:bg-surface-3 border border-border",
    outline: "bg-transparent text-foreground border border-border hover:bg-surface-2",
    ghost: "bg-transparent text-muted hover:text-foreground",
    danger: "bg-transparent text-danger border border-danger/30 hover:bg-danger/10",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-[var(--radius-sm)]",
    md: "h-11 px-4 text-sm rounded-[var(--radius-md)]",
    lg: "h-14 px-5 text-base rounded-[var(--radius-lg)]",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-surface/60 px-6 py-10 text-center shadow-[var(--shadow-card)]">
      <div
        className="mb-1.5 grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-accent"
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {hint && <p className="max-w-[26ch] text-sm text-muted">{hint}</p>}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}

// Shown when a page's data fetch fails — a real message + retry, never a
// permanent skeleton. Reloads the route to re-run the fetch.
export function LoadError({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <p className="text-base font-semibold text-foreground">Couldn&apos;t load this</p>
      <p className="max-w-[28ch] text-sm text-muted">
        {message || "Something went wrong fetching your data."}
      </p>
      <Button
        variant="accent"
        size="lg"
        className="mt-2"
        onClick={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
      >
        Try again
      </Button>
    </div>
  );
}
