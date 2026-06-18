"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles, Square } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string; error?: boolean };

const EXAMPLES = [
  "How do I warm up for heavy squats?",
  "What can I do instead of barbell bench press?",
  "How long should I rest between sets for muscle gain?",
  "Is my form cue for deadlifts right?",
];

export function CoachClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // keep the latest message in view as it streams
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }, { role: "assistant", text: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const appendToLast = (chunk: string) =>
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "assistant") next[next.length - 1] = { ...last, text: last.text + chunk };
        return next;
      });

    const failLast = (msg: string) =>
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", text: msg, error: true };
        return next;
      });

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? "Couldn't get an answer.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        appendToLast(decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") failLast((e as Error).message);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="flex flex-col pb-4">
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <div>
          <h1 className="display text-2xl font-bold leading-tight">Coach</h1>
          <p className="text-sm text-muted">Ask anything about training and form.</p>
        </div>
      </header>

      {/* leave room for the fixed input bar above the bottom nav */}
      <div className="flex flex-col gap-3 pb-28">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Try asking</p>
            {EXAMPLES.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 text-left text-sm active:bg-surface-2"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-accent text-accent-foreground"
                  : m.error
                    ? "border border-danger/30 bg-danger/10 text-danger"
                    : "border border-border bg-surface"
              }`}
            >
              {m.text ||
                (streaming && i === messages.length - 1 ? (
                  <Loader2 size={16} className="animate-spin text-muted" aria-label="Thinking" />
                ) : (
                  ""
                ))}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="fixed inset-x-0 z-40 mx-auto w-full max-w-md px-4"
        style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-border bg-surface p-2 shadow-lg shadow-black/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            maxLength={500}
            placeholder="Ask your coach…"
            aria-label="Ask the coach"
            className="max-h-28 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground active:bg-surface-3"
            >
              <Square size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40 active:brightness-95"
            >
              <ArrowUp size={18} strokeWidth={2.6} aria-hidden="true" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
