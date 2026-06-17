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
      className={`rounded-[var(--radius-lg)] border border-border bg-surface p-4 ${className}`}
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
    accent: "bg-accent text-accent-foreground hover:brightness-95 font-semibold",
    surface: "bg-surface-2 text-foreground hover:bg-surface-3 border border-border",
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
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
      <div className="text-muted" aria-hidden="true">
        {icon}
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="-mt-2 text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}
