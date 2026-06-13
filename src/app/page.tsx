"use client";

import { useCallback, useRef, useState, type ReactNode, type ReactElement } from "react";
import type { Learning, Signal, ToolOutcome } from "@/lib/types";

/* ---------------------------------- types --------------------------------- */

type StageKey = "sensor" | "policy" | "tools" | "gate" | "learning";
type StageStatus = "idle" | "active" | "done";

interface LiveState {
  signals: Signal[];
  outcomes: ToolOutcome[];
  score: number | null;
  pass: boolean | null;
  criteria: { name: string; score: number; note: string }[];
  newLearnings: Learning[];
  priorCount: number;
  text: Record<StageKey, string>;
  status: Record<StageKey, StageStatus>;
}

interface RunSummary {
  n: number;
  score: number;
  pass: boolean;
}

const STAGES: { key: StageKey; label: string; sub: string; model: boolean }[] = [
  { key: "sensor", label: "Listening", sub: "Sensor", model: false },
  { key: "policy", label: "Deciding", sub: "Policy", model: true },
  { key: "tools", label: "Acting", sub: "Tools", model: false },
  { key: "gate", label: "Checking", sub: "Quality gate", model: true },
  { key: "learning", label: "Learning", sub: "Memory", model: true },
];

const CRITERION_MAX: Record<string, number> = {
  Clarity: 20,
  Actionability: 20,
  "Signal selection": 20,
  Grounding: 15,
  "Fit to operator": 25,
};

const emptyLive = (priorCount: number): LiveState => ({
  signals: [],
  outcomes: [],
  score: null,
  pass: null,
  criteria: [],
  newLearnings: [],
  priorCount,
  text: { sensor: "", policy: "", tools: "", gate: "", learning: "" },
  status: { sensor: "idle", policy: "idle", tools: "idle", gate: "idle", learning: "idle" },
});

/* ------------------------------ tiny markdown ------------------------------ */

function inline(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}
function renderMd(src: string): string {
  const lines = src.split("\n");
  let html = "";
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) html += `</${list}>`;
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) {
      closeList();
      html += `<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`;
    } else if (/^\d+\.\s+/.test(line)) {
      if (list !== "ol") { closeList(); list = "ol"; html += "<ol>"; }
      html += `<li>${inline(line.replace(/^\d+\.\s+/, ""))}</li>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (list !== "ul") { closeList(); list = "ul"; html += "<ul>"; }
      html += `<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`;
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

/* --------------------------------- icons ---------------------------------- */

function Icon({ k, className = "h-4 w-4" }: { k: StageKey | "gear" | "spark" | "send"; className?: string }) {
  const paths: Record<string, ReactElement> = {
    sensor: <path d="M4 14a8 8 0 0 1 8-8M7 14a5 5 0 0 1 5-5M12 14h.01M12 14v6" />,
    policy: <path d="M12 3a4 4 0 0 0-4 4 3 3 0 0 0-1 5.8A3 3 0 0 0 9 18a3 3 0 0 0 6 0 3 3 0 0 0 2-5.2A3 3 0 0 0 16 7a4 4 0 0 0-4-4Z" />,
    tools: <path d="M14 7l3 3-8 8-3 1 1-3 8-8ZM13 8l3 3" />,
    gate: <path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3ZM9 12l2 2 4-4" />,
    learning: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7.6 1.6 1.6 0 0 0-1 1.5V22a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></>,
    spark: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />,
    send: <path d="M12 19V5M5 12l7-7 7 7" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[k]}
    </svg>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function Home() {
  const [live, setLive] = useState<LiveState | null>(null);
  const [running, setRunning] = useState(false);
  const [memory, setMemory] = useState<Learning[]>([]);
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const runCount = history.length;

  const run = useCallback(async () => {
    setError(null);
    setRunning(true);
    setLive(emptyLive(memory.length));
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priorLearnings: memory }),
      });
      if (!res.body) throw new Error("no response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      const apply = (ev: Record<string, unknown>) => {
        setLive((prev) => {
          if (!prev) return prev;
          const next: LiveState = { ...prev, text: { ...prev.text }, status: { ...prev.status } };
          const t = ev.type as string;
          if (t === "signals") next.signals = ev.signals as Signal[];
          else if (t === "token") {
            const st = ev.stage as StageKey;
            next.text[st] = (next.text[st] || "") + (ev.text as string);
          } else if (t === "stage") {
            const st = ev.stage as StageKey;
            const phase = ev.phase as string;
            next.status[st] = phase === "done" ? "done" : "active";
            const data = (ev.data as Record<string, unknown>) || {};
            if (st === "tools" && data.outcomes) next.outcomes = data.outcomes as ToolOutcome[];
            if (st === "gate" && phase === "done") {
              next.score = data.score as number;
              next.pass = data.pass as boolean;
              if (data.criteria) next.criteria = data.criteria as LiveState["criteria"];
            }
            if (st === "learning" && phase === "done" && data.learnings)
              next.newLearnings = data.learnings as Learning[];
          } else if (t === "done") {
            const rec = ev.record as { gate: { score: number; pass: boolean }; learnings: Learning[] };
            setHistory((h) => [...h, { n: h.length + 1, score: rec.gate.score, pass: rec.gate.pass }]);
            setMemory((m) => [...m, ...rec.learnings]);
          } else if (t === "error") setError(ev.message as string);
          return next;
        });
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) apply(JSON.parse(line));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [memory]);

  return (
    <div className="grid h-screen w-full grid-cols-1 md:grid-cols-[232px_1fr] lg:grid-cols-[232px_1fr_312px]">
      {/* ---------------- sidebar ---------------- */}
      <aside className="hidden flex-col border-r border-[var(--border)] bg-[var(--bg-tint)] p-3 md:flex">
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md text-[13px] font-bold text-white" style={{ background: "var(--grad)" }}>L</span>
          <span className="text-[15px] font-semibold tracking-tight">Loopsmith</span>
        </div>

        <button onClick={run} disabled={running} className="btn btn-outline mt-3 px-3 py-2">
          <Icon k="spark" className="h-4 w-4 text-[var(--accent)]" />
          {running ? "Running…" : "New run"}
        </button>

        <p className="mt-5 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">This session</p>
        <div className="mt-1 flex flex-col gap-0.5">
          {history.length === 0 && <p className="px-2 py-1 text-[13px] text-[var(--faint)]">No runs yet</p>}
          {history.map((h) => (
            <div key={h.n} className="hoverable flex items-center justify-between px-2 py-1.5 text-[13px]">
              <span className="text-[var(--muted)]">Run {h.n}</span>
              <span className="font-mono text-[12px]" style={{ color: h.pass ? "var(--green)" : "var(--red)" }}>{h.score}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 px-2 py-2 text-[12px] text-[var(--faint)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] pulse-dot" />
          Opus 4.8 · live
        </div>
      </aside>

      {/* ---------------- center: feed ---------------- */}
      <section className="flex min-w-0 flex-col bg-[var(--bg)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-medium">Weekly GTM Execution Loop</h1>
            <p className="truncate text-[12px] text-[var(--faint)]">Slack · Gmail · Fathom · Calendar → the moves that matter</p>
          </div>
          <span className="text-[var(--faint)]">···</span>
        </header>

        <div ref={feedRef} className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {/* task bubble (Codex-style user card) */}
            <div className="self-end rounded-2xl rounded-br-md border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--fg)] max-w-[85%]">
              Turn this week&apos;s Slack, customer calls, emails and calendar into the 2–3 moves that
              actually move revenue — and draft the outreach. Check it before it ships, and learn my
              preferences over time.
            </div>

            {error && (
              <div className="rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/10 p-3 text-[13px] text-[var(--red)]">{error}</div>
            )}

            {!live && !error && <EmptyState onRun={run} running={running} />}

            {live && (
              <>
                {(live.status.sensor !== "idle" || live.signals.length > 0) && (
                  <Turn k="sensor" status={live.status.sensor}>
                    <p className="text-[13px] text-[var(--muted)]">Ingested {live.signals.length} signals.</p>
                    <div className="mt-2 flex flex-col gap-1">
                      {live.signals.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-[12.5px] text-[var(--muted)]">
                          <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">{s.source}</span>
                          <span>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  </Turn>
                )}

                {live.status.policy !== "idle" && (
                  <Turn k="policy" status={live.status.policy}>
                    {live.priorCount > 0 && (
                      <p className="mb-2 text-[12px]" style={{ color: "var(--accent)" }}>
                        ↺ applying {live.priorCount} learned preference{live.priorCount > 1 ? "s" : ""}
                      </p>
                    )}
                    <Streamed text={live.text.policy} running={live.status.policy === "active"} />
                  </Turn>
                )}

                {live.status.tools !== "idle" && (
                  <Turn k="tools" status={live.status.tools}>
                    <div className="flex flex-col gap-1">
                      {live.outcomes.length === 0 && <p className="text-[13px] text-[var(--faint)]">preparing actions…</p>}
                      {live.outcomes.map((o, i) => (
                        <div key={i} className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                          <span style={{ color: "var(--green)" }}>✓</span>
                          <code className="text-[12px]">{o.tool}</code>
                          <span>{o.result.replace(/^dry-run · would [^:]+: /, "")}</span>
                          <span className="ml-auto rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--faint)]" style={{ border: "1px solid var(--border)" }}>dry-run</span>
                        </div>
                      ))}
                    </div>
                  </Turn>
                )}

                {live.status.gate !== "idle" && (
                  <Turn k="gate" status={live.status.gate}>
                    {live.score != null && (
                      <div className="mb-3 flex items-center gap-2.5">
                        <span className="rounded-md px-2 py-0.5 font-mono text-[13px] font-semibold" style={{ background: live.pass ? "rgba(30,166,114,0.12)" : "rgba(226,89,80,0.12)", color: live.pass ? "var(--green)" : "var(--red)" }}>{live.score}/100</span>
                        <span className="text-[12px] text-[var(--muted)]">{live.pass ? "passes the gate — ships" : "below bar — held for review"}</span>
                      </div>
                    )}
                    {live.criteria.length > 0 && (
                      <div className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {live.criteria.map((c) => {
                          const max = CRITERION_MAX[c.name] ?? 20;
                          const fit = c.name === "Fit to operator";
                          return (
                            <div key={c.name} className="flex items-center gap-2">
                              <span className="w-24 flex-shrink-0 text-[11px] text-[var(--faint)]">{c.name}</span>
                              <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(10,37,64,0.08)" }}>
                                <div className="h-full rounded-full" style={{ width: `${(c.score / max) * 100}%`, background: fit ? "var(--grad)" : "var(--green)" }} />
                              </div>
                              <span className="w-9 flex-shrink-0 text-right font-mono text-[11px] text-[var(--faint)]">{c.score}/{max}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Streamed text={live.text.gate} running={live.status.gate === "active"} muted />
                  </Turn>
                )}

                {live.status.learning !== "idle" && (
                  <Turn k="learning" status={live.status.learning}>
                    <Streamed text={live.text.learning} running={live.status.learning === "active"} muted />
                    {live.newLearnings.length > 0 && (
                      <p className="mt-2 text-[12px]" style={{ color: "var(--accent)" }}>
                        ✎ wrote {live.newLearnings.length} lesson{live.newLearnings.length > 1 ? "s" : ""} to memory — the next run reads them first
                      </p>
                    )}
                  </Turn>
                )}
              </>
            )}
          </div>
        </div>

        {/* run control bar (Codex input style) */}
        <div className="px-5 pb-5">
          <div className="mx-auto max-w-2xl">
            <div className="panel flex items-center gap-3 px-3 py-2.5">
              <button onClick={run} disabled={running} className="btn btn-outline h-7 w-7 p-0 text-base">+</button>
              <span className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-[var(--muted)]" style={{ border: "1px solid var(--border)" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                Dry-run
              </span>
              <span className="truncate text-[13px] text-[var(--faint)]">
                {running ? "Running the loop…" : runCount === 0 ? "Run the loop on this week's signals" : "Run again — memory makes it sharper"}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[12px] text-[var(--faint)]">Opus 4.8 · High</span>
                <button
                  onClick={run}
                  disabled={running}
                  className="btn btn-primary h-8 w-8 rounded-full p-0"
                  aria-label="Run loop"
                >
                  {running ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-transparent" /> : <Icon k="send" className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- right rail: Loop + Memory ---------------- */}
      <aside className="hidden flex-col gap-4 overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-tint)] p-4 lg:flex">
        {/* Loop config (Codex "Environment" analog) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[var(--fg)]">Loop</span>
            <Icon k="gear" className="h-4 w-4 text-[var(--faint)]" />
          </div>
          <div className="flex flex-col">
            <Row label="Sensors" value="Slack · Gmail · Fathom · Cal" />
            <Row label="Cadence" value="Weekly · Mon 8am" />
            <Row label="Gate" value="ships ≥ 80 / 100" />
            <Row label="Tools" value="draft · create (dry-run)" />
          </div>
        </div>

        {/* Improvement */}
        <div className="divide-line pt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">Improvement</p>
          {history.length === 0 ? (
            <p className="text-[13px] text-[var(--faint)]">Gate score per run appears here.</p>
          ) : (
            <div className="flex items-end gap-1.5" style={{ height: 76 }}>
              {history.map((h) => (
                <div key={h.n} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="font-mono text-[10px] text-[var(--muted)]">{h.score}</span>
                  <div className="w-full rounded-sm" style={{ height: `${Math.max(5, h.score * 0.6)}px`, background: h.pass ? "var(--grad)" : "var(--red)" }} />
                  <span className="text-[10px] text-[var(--faint)]">{h.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Memory */}
        <div className="divide-line flex-1 pt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">Memory · {memory.length}</p>
          {memory.length === 0 ? (
            <p className="text-[13px] text-[var(--faint)]">Durable lessons the loop writes back. They feed the next run&apos;s decision.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {memory.map((l) => (
                <div key={l.id} className="rise rounded-lg border border-[var(--border-soft)] p-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">{l.type}</span>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted)]">{l.lesson}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------- subcomponents ----------------------------- */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="hoverable flex items-center justify-between px-2 py-2 text-[12.5px]">
      <span className="text-[var(--faint)]">{label}</span>
      <span className="text-[var(--muted)]">{value}</span>
    </div>
  );
}

function Turn({ k, status, children }: { k: StageKey; status: StageStatus; children: ReactNode }) {
  const meta = STAGES.find((s) => s.key === k)!;
  return (
    <div className="rise">
      <div className="mb-2 flex items-center gap-2">
        <span className={status === "active" ? "text-[var(--accent)]" : "text-[var(--faint)]"}>
          {status === "active" ? (
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Icon k={k} className="h-3.5 w-3.5" />
          )}
        </span>
        <span className="text-[12px] font-medium text-[var(--fg)]">{meta.label}</span>
        {meta.model && <span className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--faint)]" style={{ border: "1px solid var(--border)" }}>Opus 4.8</span>}
        {status === "done" && <span className="text-[11px]" style={{ color: "var(--green)" }}>done</span>}
      </div>
      <div className="pl-[22px]">{children}</div>
    </div>
  );
}

function Streamed({ text, running, muted }: { text: string; running: boolean; muted?: boolean }) {
  if (running)
    return (
      <div className="thinking">
        <span>Thinking</span>
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    );
  return <div className={`md rise ${muted ? "opacity-90" : ""}`} dangerouslySetInnerHTML={{ __html: renderMd(text) }} />;
}

function EmptyState({ onRun, running }: { onRun: () => void; running: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="max-w-md text-[14px] leading-relaxed text-[var(--muted)]">
        A self-improving operating loop. It ingests real signals, decides what matters, drafts the
        actions, grades itself against a quality bar, and writes back what it learned — so the next
        run is better.
      </p>
      <button onClick={onRun} disabled={running} className="btn btn-primary px-4 py-2">
        {running ? "Running…" : "Run the loop"}
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-[var(--faint)]">
        {STAGES.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1.5">
            {s.label}
            {i < STAGES.length - 1 && <span className="text-[var(--border)]">→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
