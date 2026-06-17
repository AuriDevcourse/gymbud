"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-[1.5rem] border border-border bg-surface shadow-2xl shadow-black/50"
      >
        {/* grab handle */}
        <div className="flex justify-center pt-2.5" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-surface-3" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          <h3 className="display font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div
          className="overflow-y-auto px-4 pt-1"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
