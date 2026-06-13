"use client";

import { useCallback, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import type { LoopSpec, Learning, Signal, ToolOutcome } from "@/lib/types";

/* ----------------------------- interview shapes ----------------------------
 * Mirrored locally (type-only) so this client bundle never imports the server
 * builder module. Kept in sync with builder/interview.ts.
 * -------------------------------------------------------------------------- */

interface InterviewQuestion {
  field: string;
  prompt: string;
  helper: string;
  kind: "single" | "multi" | "text";
  options: string[];
}
interface InterviewResult {
  done: boolean;
  reply: string;
  question: InterviewQuestion;
  spec: LoopSpec;
}
interface Turn {
  prompt: string;
  answer: string;
}

type Msg =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; question?: InterviewQuestion };

const EXAMPLES = [
  "Turn this week's Slack, calls and email into the 2–3 moves that move revenue, and draft the outreach.",
  "Triage my support inbox every morning — surface the angriest customers and draft replies for me to approve.",
  "Every Monday, review new signups and flag the ones worth a personal welcome.",
];

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

type StageKey = "sensor" | "policy" | "tools" | "gate" | "learning";

function Icon({ k, className = "h-4 w-4" }: { k: StageKey | "send" | "spark"; className?: string }) {
  const paths: Record<string, ReactElement> = {
    sensor: <path d="M4 14a8 8 0 0 1 8-8M7 14a5 5 0 0 1 5-5M12 14h.01M12 14v6" />,
    policy: <path d="M12 3a4 4 0 0 0-4 4 3 3 0 0 0-1 5.8A3 3 0 0 0 9 18a3 3 0 0 0 6 0 3 3 0 0 0 2-5.2A3 3 0 0 0 16 7a4 4 0 0 0-4-4Z" />,
    tools: <path d="M14 7l3 3-8 8-3 1 1-3 8-8ZM13 8l3 3" />,
    gate: <path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3ZM9 12l2 2 4-4" />,
    learning: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />,
    send: <path d="M12 19V5M5 12l7-7 7 7" />,
    spark: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[k]}
    </svg>
  );
}

const STAGES: { key: StageKey; label: string; model: boolean }[] = [
  { key: "sensor", label: "Listening", model: false },
  { key: "policy", label: "Deciding", model: true },
  { key: "tools", label: "Acting", model: false },
  { key: "gate", label: "Checking", model: true },
  { key: "learning", label: "Learning", model: true },
];

const CRITERION_MAX: Record<string, number> = {
  Clarity: 20,
  Actionability: 20,
  "Signal selection": 20,
  Grounding: 15,
  "Fit to operator": 25,
};

/* --------------------------- run-console live state ------------------------ */

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

/* ---------------------------------- page ---------------------------------- */

export default function BuildPage() {
  const [phase, setPhase] = useState<"intro" | "interview" | "spec" | "run">("intro");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [description, setDescription] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [currentQ, setCurrentQ] = useState<InterviewQuestion | null>(null);
  const [thinking, setThinking] = useState(false);
  const [spec, setSpec] = useState<LoopSpec | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // run-console state
  const [live, setLive] = useState<LiveState | null>(null);
  const [running, setRunning] = useState(false);
  const [history2, setHistory2] = useState<{ n: number; score: number; pass: boolean }[]>([]);
  const [memory, setMemory] = useState<Learning[]>([]);

  const feedRef = useRef<HTMLDivElement>(null);
  const scrollDown = () => {
    requestAnimationFrame(() => {
      if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    });
  };

  /* ----------------------------- interview step ---------------------------- */

  const step = useCallback(
    async (desc: string, hist: Turn[]) => {
      setThinking(true);
      setError(null);
      scrollDown();
      try {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: desc, history: hist }),
        });
        const data = (await res.json()) as InterviewResult & { error?: string };
        if (!res.ok || data.error) throw new Error(data.error || "interview failed");

        if (data.done) {
          setSpec(data.spec);
          setCurrentQ(null);
          setMessages((m) => [
            ...m,
            { role: "assistant", text: data.reply || "Here's the loop I'd build for you." },
          ]);
          setPhase("spec");
        } else {
          setCurrentQ(data.question);
          setMessages((m) => [
            ...m,
            { role: "assistant", text: data.reply || data.question.prompt, question: data.question },
          ]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setThinking(false);
        scrollDown();
      }
    },
    [],
  );

  const start = useCallback(
    (desc: string) => {
      const text = desc.trim();
      if (!text) return;
      setDescription(text);
      setMessages([{ role: "user", text }]);
      setHistory([]);
      setPhase("interview");
      setInput("");
      step(text, []);
    },
    [step],
  );

  const answer = useCallback(
    (text: string) => {
      const a = text.trim();
      if (!a || !currentQ) return;
      const turn: Turn = { prompt: currentQ.prompt, answer: a };
      const nextHist = [...history, turn];
      setHistory(nextHist);
      setMessages((m) => [...m, { role: "user", text: a }]);
      setCurrentQ(null);
      setInput("");
      step(description, nextHist);
    },
    [currentQ, history, description, step],
  );

  // multi-select chip accumulation
  const [picked, setPicked] = useState<string[]>([]);
  const togglePick = (opt: string) =>
    setPicked((p) => (p.includes(opt) ? p.filter((x) => x !== opt) : [...p, opt]));

  const onChipClick = (opt: string) => {
    if (currentQ?.kind === "multi") togglePick(opt);
    else answer(opt);
  };

  const submitInput = () => {
    if (phase === "intro") start(input);
    else if (currentQ?.kind === "multi" && picked.length) {
      answer(picked.join(", "));
      setPicked([]);
    } else answer(input);
  };

  /* -------------------------------- run loop -------------------------------- */

  const runLoop = useCallback(async (rawContext?: string, humanEdit?: string) => {
    if (!spec) return;
    setLastRaw(rawContext || "");
    setNote("");
    setPhase("run");
    setError(null);
    setRunning(true);
    setLive(emptyLive(memory.length));
    scrollDown();
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, priorLearnings: memory, rawContext: rawContext || "", humanEdit: humanEdit || "" }),
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
            const ph = ev.phase as string;
            next.status[st] = ph === "done" ? "done" : "active";
            const data = (ev.data as Record<string, unknown>) || {};
            if (st === "tools" && data.outcomes) next.outcomes = data.outcomes as ToolOutcome[];
            if (st === "gate" && ph === "done") {
              next.score = data.score as number;
              next.pass = data.pass as boolean;
              if (data.criteria) next.criteria = data.criteria as LiveState["criteria"];
            }
            if (st === "learning" && ph === "done" && data.learnings)
              next.newLearnings = data.learnings as Learning[];
          } else if (t === "done") {
            const rec = ev.record as { gate: { score: number; pass: boolean }; learnings: Learning[] };
            setHistory2((h) => [...h, { n: h.length + 1, score: rec.gate.score, pass: rec.gate.pass }]);
            setMemory((mm) => [...mm, ...rec.learnings]);
          } else if (t === "error") setError(ev.message as string);
          return next;
        });
        scrollDown();
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
      scrollDown();
    }
  }, [spec, memory]);

  const [downloading, setDownloading] = useState(false);
  const [lastRaw, setLastRaw] = useState("");
  const [note, setNote] = useState("");

  // "Yours to keep": fetch the generated runnable project and zip it client-side.
  const downloadRepo = useCallback(async () => {
    if (!spec) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const data = (await res.json()) as { files?: { path: string; content: string }[]; error?: string };
      if (!res.ok || data.error || !data.files) throw new Error(data.error || "build failed");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const f of data.files) zip.file(f.path, f.content);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = (spec.name || "operating-loop").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      a.href = url;
      a.download = `${name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  }, [spec]);

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--bg)]">
      {/* header */}
      <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md text-[13px] font-bold text-white" style={{ background: "var(--grad)" }}>L</span>
          <span className="text-[15px] font-semibold tracking-tight">Loopsmith</span>
        </Link>
        <span className="text-[12px] text-[var(--faint)]">Build a loop · Opus 4.8</span>
      </header>

      {/* feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-5 py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {phase === "intro" && messages.length === 0 && (
            <Intro onPick={start} />
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="rise self-end max-w-[85%] rounded-2xl rounded-br-md border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 text-[13.5px] leading-relaxed text-[var(--fg)]"
              >
                {m.text}
              </div>
            ) : (
              <Assistant key={i} text={m.text} question={m.question} />
            ),
          )}

          {/* active question chips (attached to the latest assistant question) */}
          {phase === "interview" && currentQ && !thinking && (
            <Chips
              q={currentQ}
              picked={picked}
              onPick={onChipClick}
              onConfirmMulti={() => {
                if (picked.length) {
                  answer(picked.join(", "));
                  setPicked([]);
                }
              }}
            />
          )}

          {thinking && <Thinking />}

          {/* spec confirmation */}
          {phase !== "intro" && phase !== "interview" && spec && (
            <SpecCard spec={spec} onRun={() => runLoop()} onRunReal={(raw) => runLoop(raw)} onDownload={downloadRepo} downloading={downloading} running={running} ran={phase === "run"} />
          )}

          {/* inline run console */}
          {phase === "run" && live && <RunLive live={live} />}

          {/* human-in-the-loop feedback — the heart of self-improvement */}
          {phase === "run" && live && !running && live.status.learning === "done" && (
            <Feedback
              note={note}
              setNote={setNote}
              newLearnings={live.newLearnings.length}
              onRefine={() => runLoop(lastRaw, note)}
              onRerun={() => runLoop(lastRaw)}
            />
          )}

          {error && (
            <div className="rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/10 p-3 text-[13px] text-[var(--red)]">{error}</div>
          )}
        </div>
      </div>

      {/* input bar — free-text fallback, always available pre-run */}
      {phase !== "run" && (
        <div className="px-5 pb-6">
          <div className="mx-auto max-w-2xl">
            <div className="panel flex items-end gap-2 px-3 py-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitInput();
                  }
                }}
                rows={1}
                disabled={thinking || (phase === "spec" && !!spec)}
                placeholder={
                  phase === "intro"
                    ? "Describe what should run itself for you…"
                    : currentQ?.kind === "multi"
                      ? "Pick options above, or type your own…"
                      : "Type your answer…"
                }
                className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[14px] text-[var(--fg)] outline-none placeholder:text-[var(--faint)]"
              />
              <button
                onClick={submitInput}
                disabled={thinking || (!input.trim() && !(currentQ?.kind === "multi" && picked.length))}
                className="btn btn-primary h-8 w-8 rounded-full p-0"
                aria-label="Send"
              >
                <Icon k="send" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-[var(--faint)]">
              {phase === "intro"
                ? "A few quick questions, then watch your loop run."
                : "You only answer business questions — Loopsmith designs the rest."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- subcomponents ----------------------------- */

function Intro({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="rise flex flex-col items-center gap-5 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-white" style={{ background: "var(--grad)" }}>L</span>
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--fg)]">What should run itself for you?</h1>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[var(--muted)]">
          Describe a workflow in plain words. Loopsmith asks a few quick questions, designs a
          self-improving operating loop, and runs it — live.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => onPick(ex)}
            className="hoverable rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-left text-[13.5px] leading-relaxed text-[var(--muted)]"
          >
            {ex}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-[var(--faint)]">…or type your own below.</p>
    </div>
  );
}

function Assistant({ text, question }: { text: string; question?: InterviewQuestion }) {
  return (
    <div className="rise flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ background: "var(--grad)" }}>L</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-relaxed text-[var(--fg)]">{text}</p>
        {question && question.helper && (
          <p className="mt-1 text-[12.5px] text-[var(--faint)]">{question.helper}</p>
        )}
      </div>
    </div>
  );
}

function Chips({
  q,
  picked,
  onPick,
  onConfirmMulti,
}: {
  q: InterviewQuestion;
  picked: string[];
  onPick: (o: string) => void;
  onConfirmMulti: () => void;
}) {
  if (!q.options.length) return null;
  const multi = q.kind === "multi";
  return (
    <div className="rise flex flex-col gap-2 pl-9">
      <div className="flex flex-wrap gap-2">
        {q.options.map((opt) => {
          const on = picked.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onPick(opt)}
              className="rounded-full border px-3 py-1.5 text-[13px] transition-colors"
              style={{
                borderColor: on ? "var(--accent)" : "var(--border)",
                background: on ? "var(--grad-soft)" : "var(--panel)",
                color: on ? "var(--accent)" : "var(--muted)",
              }}
            >
              {multi && <span className="mr-1">{on ? "✓" : "+"}</span>}
              {opt}
            </button>
          );
        })}
      </div>
      {multi && picked.length > 0 && (
        <button onClick={onConfirmMulti} className="btn btn-primary self-start px-3 py-1.5">
          Continue with {picked.length} selected
        </button>
      )}
    </div>
  );
}

function Thinking() {
  return (
    <div className="rise flex gap-3 pl-0">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ background: "var(--grad)" }}>L</span>
      <div className="thinking pt-1">
        <span>Thinking</span>
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

function SpecCard({
  spec,
  onRun,
  onRunReal,
  onDownload,
  downloading,
  running,
  ran,
}: {
  spec: LoopSpec;
  onRun: () => void;
  onRunReal: (raw: string) => void;
  onDownload: () => void;
  downloading: boolean;
  running: boolean;
  ran: boolean;
}) {
  const [paste, setPaste] = useState(false);
  const [raw, setRaw] = useState("");
  const sensors = spec.sensors.join(" · ") || "your tools";
  const cadence = spec.cadence.startsWith("weekly")
    ? "every week"
    : spec.cadence.startsWith("daily")
      ? "every day"
      : spec.cadence.startsWith("on-demand")
        ? "whenever you ask"
        : spec.cadence;
  return (
    <div className="rise panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white" style={{ background: "var(--grad)" }}>Your loop</span>
        <h2 className="text-[16px] font-semibold text-[var(--fg)]">{spec.name}</h2>
      </div>
      <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">{spec.description}</p>

      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
        <SpecRow k="sensor" label="Listens to" value={`${sensors} — ${cadence}`} />
        <SpecRow k="policy" label="Decides" value={spec.decisionPolicy} />
        <SpecRow k="tools" label="Produces" value={spec.outputFormat} />
        <SpecRow k="gate" label="Checks against" value={`${spec.rubric.length} quality standards (ships ≥ 80/100)`} />
      </div>

      <div className="mt-4 divide-line pt-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">Quality bar</p>
        <div className="flex flex-wrap gap-1.5">
          {spec.rubric.map((r) => (
            <span
              key={r.name}
              className="rounded-full border px-2.5 py-1 text-[11.5px]"
              style={{
                borderColor: r.name === "Fit to operator" ? "var(--accent)" : "var(--border)",
                color: r.name === "Fit to operator" ? "var(--accent)" : "var(--muted)",
                background: r.name === "Fit to operator" ? "var(--grad-soft)" : "transparent",
              }}
            >
              {r.name} · {r.weight}
            </span>
          ))}
        </div>
      </div>

      {!ran && (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onRun} disabled={running} className="btn btn-primary px-4 py-2">
              <Icon k="spark" className="h-4 w-4" />
              Run on a sample week
            </button>
            <button onClick={() => setPaste((v) => !v)} disabled={running} className="btn btn-outline px-3 py-2">
              {paste ? "Hide" : "Run on my real data"}
            </button>
            <button onClick={onDownload} disabled={downloading} className="btn btn-ghost px-3 py-2">
              {downloading ? "Zipping…" : "Download project (.zip)"}
            </button>
          </div>

          {paste && (
            <div className="rise rounded-xl border border-[var(--border)] bg-[var(--bg-tint)] p-3">
              <p className="mb-2 text-[12.5px] text-[var(--muted)]">
                Paste your actual week — Slack snippets, emails, call notes, calendar items. The loop
                runs on <strong>your</strong> data and grounds every move in it. Nothing is sent;
                actions are drafted for your review.
              </p>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={6}
                placeholder={"[slack] Jordan: can we get Q3 numbers before the board call?\nEmail from jane@acme.com: ready to sign once SSO is confirmed.\nCall with BetaCo — churned, cited onboarding.\nCalendar: demo with Initech Thursday 2pm."}
                className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-[13px] leading-relaxed text-[var(--fg)] outline-none placeholder:text-[var(--faint)]"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[var(--faint)]">One item per line or per paragraph. Markers like “[slack]”, “Email from…”, “Call with…” are auto-detected.</span>
                <button
                  onClick={() => onRunReal(raw)}
                  disabled={running || raw.trim().length < 3}
                  className="btn btn-primary px-4 py-2"
                >
                  <Icon k="spark" className="h-4 w-4" />
                  Run on my data
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {ran && (
        <div className="mt-5 flex flex-wrap items-center gap-3 divide-line pt-4">
          <span className="text-[12.5px] text-[var(--muted)]">This loop is yours to keep —</span>
          <button onClick={onDownload} disabled={downloading} className="btn btn-primary px-4 py-2">
            {downloading ? "Zipping…" : "Download project (.zip)"}
          </button>
          <a href={`/runs?loop=${encodeURIComponent(spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))}`} className="btn btn-outline px-4 py-2">
            View run history
          </a>
        </div>
      )}
    </div>
  );
}

function SpecRow({ k, label, value }: { k: StageKey; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[var(--accent)]"><Icon k={k} className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--faint)]">{label}</p>
        <p className="text-[13px] leading-snug text-[var(--muted)]">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------ run-live render ---------------------------- */

function RunLive({ live }: { live: LiveState }) {
  return (
    <div className="flex flex-col gap-5">
      {(live.status.sensor !== "idle" || live.signals.length > 0) && (
        <RunTurn k="sensor" status={live.status.sensor}>
          <p className="text-[13px] text-[var(--muted)]">Ingested {live.signals.length} signals.</p>
          <div className="mt-2 flex flex-col gap-1">
            {live.signals.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-[12.5px] text-[var(--muted)]">
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">{s.source}</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </RunTurn>
      )}

      {live.status.policy !== "idle" && (
        <RunTurn k="policy" status={live.status.policy}>
          {live.priorCount > 0 && (
            <p className="mb-2 text-[12px]" style={{ color: "var(--accent)" }}>
              ↺ applying {live.priorCount} learned preference{live.priorCount > 1 ? "s" : ""}
            </p>
          )}
          <Streamed text={live.text.policy} running={live.status.policy === "active"} />
        </RunTurn>
      )}

      {live.status.tools !== "idle" && (
        <RunTurn k="tools" status={live.status.tools}>
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
        </RunTurn>
      )}

      {live.status.gate !== "idle" && (
        <RunTurn k="gate" status={live.status.gate}>
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
        </RunTurn>
      )}

      {live.status.learning !== "idle" && (
        <RunTurn k="learning" status={live.status.learning}>
          <Streamed text={live.text.learning} running={live.status.learning === "active"} muted />
          {live.newLearnings.length > 0 && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--accent)" }}>
              ✎ wrote {live.newLearnings.length} lesson{live.newLearnings.length > 1 ? "s" : ""} to memory — the next run reads them first
            </p>
          )}
        </RunTurn>
      )}
    </div>
  );
}

function RunTurn({ k, status, children }: { k: StageKey; status: StageStatus; children: React.ReactNode }) {
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

function Feedback({
  note,
  setNote,
  newLearnings,
  onRefine,
  onRerun,
}: {
  note: string;
  setNote: (s: string) => void;
  newLearnings: number;
  onRefine: () => void;
  onRerun: () => void;
}) {
  return (
    <div className="rise panel p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[var(--accent)]"><Icon k="learning" className="h-4 w-4" /></span>
        <h3 className="text-[14px] font-semibold text-[var(--fg)]">Make it yours</h3>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--muted)]">
        {newLearnings > 0
          ? `This run wrote ${newLearnings} lesson${newLearnings > 1 ? "s" : ""} to memory. Tell it what you'd change — it learns your preference and the next run applies it.`
          : "Tell it what you'd change — it learns your preference and the next run applies it."}
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="e.g. Always lead with the dollar amount. Keep drafts under 4 sentences. Don't flag anything under $5k."
        className="mt-3 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-[13px] leading-relaxed text-[var(--fg)] outline-none placeholder:text-[var(--faint)]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button onClick={onRefine} disabled={note.trim().length < 3} className="btn btn-primary px-4 py-2">
          <Icon k="learning" className="h-4 w-4" />
          Teach &amp; re-run
        </button>
        <button onClick={onRerun} className="btn btn-outline px-3 py-2">
          Re-run as-is
        </button>
        <span className="text-[11px] text-[var(--faint)]">Watch “Fit to operator” climb as it learns you.</span>
      </div>
    </div>
  );
}
