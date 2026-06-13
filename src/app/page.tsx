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
  priorCount: number;
}

const STAGES: { key: StageKey; label: string; sub: string; model: boolean }[] = [
  { key: "sensor", label: "Listening", sub: "Sensor layer", model: false },
  { key: "policy", label: "Deciding", sub: "Policy · Opus 4.8", model: true },
  { key: "tools", label: "Acting", sub: "Tools layer", model: false },
  { key: "gate", label: "Checking", sub: "Quality gate · Opus 4.8", model: true },
  { key: "learning", label: "Learning", sub: "Memory · Opus 4.8", model: true },
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
      if (list !== "ol") {
        closeList();
        list = "ol";
        html += "<ol>";
      }
      html += `<li>${inline(line.replace(/^\d+\.\s+/, ""))}</li>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (list !== "ul") {
        closeList();
        list = "ul";
        html += "<ul>";
      }
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

function StageGlyph({ k }: { k: StageKey }) {
  const common = "h-4 w-4";
  const paths: Record<StageKey, ReactElement> = {
    sensor: (
      <path d="M4 14a8 8 0 0 1 8-8M7 14a5 5 0 0 1 5-5M12 14h.01M12 14v6" />
    ),
    policy: (
      <path d="M12 3a4 4 0 0 0-4 4 3 3 0 0 0-1 5.8A3 3 0 0 0 9 18a3 3 0 0 0 6 0 3 3 0 0 0 2-5.2A3 3 0 0 0 16 7a4 4 0 0 0-4-4Z" />
    ),
    tools: <path d="M14 7l3 3-8 8-3 1 1-3 8-8ZM13 8l3 3" />,
    gate: <path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3ZM9 12l2 2 4-4" />,
    learning: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className={common}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
    const priorCount = memory.length;
    setLive(emptyLive(priorCount));

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
          const next: LiveState = {
            ...prev,
            text: { ...prev.text },
            status: { ...prev.status },
          };
          const t = ev.type as string;
          if (t === "signals") {
            next.signals = ev.signals as Signal[];
          } else if (t === "token") {
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
            const rec = ev.record as { gate: { score: number; pass: boolean }; learnings: Learning[]; priorLearningCount: number };
            setHistory((h) => [...h, { n: h.length + 1, score: rec.gate.score, pass: rec.gate.pass, priorCount: rec.priorLearningCount }]);
            setMemory((m) => [...m, ...rec.learnings]);
          } else if (t === "error") {
            setError(ev.message as string);
          }
          return next;
        });
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
      };

      // read NDJSON
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

  const lastScore = history.length ? history[history.length - 1].score : null;
  const prevScore = history.length > 1 ? history[history.length - 2].score : null;
  const delta = lastScore != null && prevScore != null ? lastScore - prevScore : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            L
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">Loopsmith</h1>
            <p className="mt-1 text-xs text-white/50">
              the Chief of Staff that builds your Chief of Staff
            </p>
          </div>
        </div>
        <span className="glass-soft inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white/70">
          <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
          Weekly GTM Execution Loop
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* main: stage rail + chat feed */}
        <section className="flex flex-col gap-4">
          {/* stage rail */}
          <div className="glass flex items-center justify-between gap-1 rounded-2xl p-2">
            {STAGES.map((s, i) => {
              const status = live?.status[s.key] ?? "idle";
              return (
                <div key={s.key} className="flex flex-1 items-center gap-1">
                  <div
                    className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-colors ${
                      status === "active" ? "bg-[var(--accent-soft)]" : ""
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        status === "done"
                          ? "bg-emerald-400/15 text-emerald-300"
                          : status === "active"
                            ? "text-[var(--accent)]"
                            : "text-white/35"
                      }`}
                    >
                      {status === "active" ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <StageGlyph k={s.key} />
                      )}
                    </span>
                    <span className="text-[11px] font-medium leading-none">{s.label}</span>
                    <span className="hidden text-[9px] leading-none text-white/35 sm:block">{s.sub}</span>
                  </div>
                  {i < STAGES.length - 1 && <span className="text-white/15">→</span>}
                </div>
              );
            })}
          </div>

          {/* chat feed */}
          <div
            ref={feedRef}
            className="glass min-h-[52vh] flex-1 overflow-y-auto rounded-2xl p-5"
          >
            {!live && !error && <EmptyState />}
            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}
            {live && (
              <div className="flex flex-col gap-6">
                {/* sensor */}
                {(live.status.sensor !== "idle" || live.signals.length > 0) && (
                  <Turn k="sensor" running={live.status.sensor === "active"}>
                    <p className="text-sm text-white/60">
                      Ingested {live.signals.length} signals from Slack, Gmail, Fathom & Calendar.
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {live.signals.map((s, i) => (
                        <div key={i} className="glass-soft rounded-lg px-3 py-2 text-xs text-white/70">
                          <span
                            className="mr-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                            style={{ background: "var(--accent-soft)", color: "#ffd9e0" }}
                          >
                            {s.source}
                          </span>
                          {s.text}
                        </div>
                      ))}
                    </div>
                  </Turn>
                )}

                {/* policy */}
                {live.status.policy !== "idle" && (
                  <Turn k="policy" running={live.status.policy === "active"}>
                    {live.priorCount > 0 && (
                      <p className="mb-2 text-xs" style={{ color: "var(--accent)" }}>
                        ↺ applying {live.priorCount} lesson{live.priorCount > 1 ? "s" : ""} from past runs
                      </p>
                    )}
                    <Streamed text={live.text.policy} running={live.status.policy === "active"} />
                  </Turn>
                )}

                {/* tools */}
                {live.status.tools !== "idle" && (
                  <Turn k="tools" running={live.status.tools === "active"}>
                    <div className="flex flex-col gap-1.5">
                      {live.outcomes.length === 0 && (
                        <p className="text-sm text-white/40">preparing actions…</p>
                      )}
                      {live.outcomes.map((o, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-white/75">
                          <span className="text-emerald-300">✓</span>
                          <code className="text-xs">{o.tool}</code>
                          <span className="text-white/50">{o.result.replace(/^dry-run · would [^:]+: /, "")}</span>
                        </div>
                      ))}
                    </div>
                  </Turn>
                )}

                {/* gate */}
                {live.status.gate !== "idle" && (
                  <Turn k="gate" running={live.status.gate === "active"}>
                    {live.score != null && (
                      <div className="mb-2 flex items-center gap-3">
                        <span
                          className="rounded-lg px-2.5 py-1 text-sm font-semibold"
                          style={{
                            background: live.pass ? "rgba(52,211,153,0.15)" : "var(--accent-soft)",
                            color: live.pass ? "#6ee7b7" : "#ffd9e0",
                          }}
                        >
                          {live.score}/100
                        </span>
                        <span className="text-xs text-white/50">
                          {live.pass ? "passes the gate — ships" : "below bar — held for review"}
                        </span>
                      </div>
                    )}
                    {live.criteria.length > 0 && (
                      <div className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {live.criteria.map((c) => {
                          const max = CRITERION_MAX[c.name] ?? 20;
                          const fit = c.name === "Fit to operator";
                          return (
                            <div key={c.name} className="flex items-center gap-2">
                              <span className="w-28 flex-shrink-0 text-[11px] text-white/55">{c.name}</span>
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(c.score / max) * 100}%`,
                                    background: fit ? "var(--accent)" : "rgba(110,231,183,0.7)",
                                  }}
                                />
                              </div>
                              <span className="w-9 flex-shrink-0 text-right text-[11px] text-white/45">
                                {c.score}/{max}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Streamed text={live.text.gate} running={live.status.gate === "active"} muted />
                  </Turn>
                )}

                {/* learning */}
                {live.status.learning !== "idle" && (
                  <Turn k="learning" running={live.status.learning === "active"}>
                    <Streamed text={live.text.learning} running={live.status.learning === "active"} muted />
                    {live.newLearnings.length > 0 && (
                      <p className="mt-2 text-xs" style={{ color: "var(--accent)" }}>
                        ✎ wrote {live.newLearnings.length} lesson{live.newLearnings.length > 1 ? "s" : ""} to memory — the next run reads them first
                      </p>
                    )}
                  </Turn>
                )}
              </div>
            )}
          </div>

          {/* run button */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/45">
              {runCount === 0
                ? "Run the loop on a few real signals."
                : `Run ${runCount} complete. Run again — memory makes it sharper.`}
            </p>
            <button
              onClick={run}
              disabled={running}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {running ? "Running…" : runCount === 0 ? "Run loop" : "Run again"}
            </button>
          </div>
        </section>

        {/* sidebar: improvement + memory */}
        <aside className="flex flex-col gap-4">
          {/* improvement */}
          <div className="glass rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">
              Self-improvement
            </h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-white/40">
                Gate score per run shows here. Watch it climb as the loop learns.
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-end gap-2" style={{ height: 90 }}>
                  {history.map((h) => (
                    <div key={h.n} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[10px] text-white/50">{h.score}</span>
                      <div
                        className="w-full rounded-t-md"
                        style={{
                          height: `${Math.max(6, h.score * 0.72)}px`,
                          background: h.pass ? "rgba(52,211,153,0.6)" : "var(--accent)",
                        }}
                      />
                      <span className="text-[10px] text-white/35">#{h.n}</span>
                    </div>
                  ))}
                </div>
                {delta != null && (
                  <p className="mt-2 text-xs text-white/55">
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pts vs previous run
                  </p>
                )}
              </>
            )}
          </div>

          {/* memory */}
          <div className="glass flex-1 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">
              Memory · {memory.length} lesson{memory.length === 1 ? "" : "s"}
            </h2>
            {memory.length === 0 ? (
              <p className="mt-2 text-sm text-white/40">
                Durable lessons the loop writes back. They feed the next run&apos;s decision.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {memory.map((l) => (
                  <div key={l.id} className="glass-soft rounded-lg p-2.5 rise">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                      style={{ background: "var(--accent-soft)", color: "#ffd9e0" }}
                    >
                      {l.type}
                    </span>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{l.lesson}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------- subcomponents ----------------------------- */

function Turn({ k, running, children }: { k: StageKey; running: boolean; children: ReactNode }) {
  const meta = STAGES.find((s) => s.key === k)!;
  return (
    <div className="rise flex gap-3">
      <div
        className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          running ? "text-[var(--accent)]" : "text-white/45"
        }`}
        style={{ background: "var(--surface)" }}
      >
        <StageGlyph k={k} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium">{meta.label}</span>
          {meta.model && (
            <span className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/40 glass-soft">
              Opus 4.8
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function Streamed({ text, running, muted }: { text: string; running: boolean; muted?: boolean }) {
  if (!text && running) return <p className="text-sm text-white/40 caret">thinking</p>;
  return (
    <div
      className={`md ${running ? "caret" : ""} ${muted ? "opacity-90" : ""}`}
      dangerouslySetInnerHTML={{ __html: renderMd(text) }}
    />
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-white"
        style={{ background: "var(--accent)" }}
      >
        L
      </div>
      <h2 className="text-xl font-semibold">A self-improving operating loop</h2>
      <p className="mt-2 max-w-md text-sm text-white/55">
        Hit <span style={{ color: "var(--accent)" }}>Run loop</span> and watch it ingest real
        signals, decide what matters, draft the actions, grade itself against a quality bar, and
        write back what it learned — so the next run is better.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
        {STAGES.map((s) => (
          <span key={s.key} className="glass-soft rounded-full px-3 py-1">
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
