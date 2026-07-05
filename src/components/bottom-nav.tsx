"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Dumbbell, ClipboardList, Sparkles, TrendingUp, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Today", icon: Flame },
  { href: "/programs", label: "Programs", icon: ClipboardList },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // no nav on the lock screen or first-run setup
  if (pathname === "/login" || pathname === "/welcome") return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/90 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {/* active indicator: a small lime bar riding the top border */}
                {active && (
                  <span
                    className="absolute -top-px h-0.5 w-7 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`grid place-items-center rounded-xl px-3 py-1 transition-colors ${
                    active ? "bg-accent/10" : ""
                  }`}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
