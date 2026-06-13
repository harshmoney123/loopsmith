"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface RunSummary {
  ts: string;
  score: number;
  pass: boolean;
  priorLearningCount: number;
  trigger: "manual" | "scheduler";
}
interface RunsResponse {
  loopId: string;
  runs: RunSummary[];
  memoryCount: number;
  schedulerRuns: number;
}

export default function RunsPage() {
  const [loopId, setLoopId] = useState("default");
  const [data, setData] = useState<RunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [firing, setFiring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/runs?loopId=${encodeURIComponent(id)}`);
      const json = (await res.json()) as RunsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("loop");
    const id = q || "default";
    setLoopId(id);
    load(id);
  }, [load]);

  const fireScheduler = useCallback(async () => {
    setFiring(true);
    try {
      await fetch("/api/cron");
      await load(loopId);
    } finally {
      setFiring(false);
    }
  }, [loopId, load]);

  const runs = data?.runs ?? [];
  const first = runs[0]?.score;
  const last = runs[runs.length - 1]?.score;
  const delta = first != null && last != null ? last - first : null;
  const maxScore = 100;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/build" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md text-[13px] font-bold text-white" style={{ background: "var(--grad)" }}>L</span>
          <span className="text-[15px] font-semibold tracking-tight">Loopsmith</span>
        </Link>
        <button onClick={() => load(loopId)} className="btn btn-outline px-3 py-1.5">Refresh</button>
      </header>

      <div className="mb-2 flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Run history</h1>
          <p className="text-[13px] text-[var(--faint)]">
            loop <code>{loopId}</code> · self-improvement over time
          </p>
        </div>
        {delta != null && (
          <span className="rounded-md px-2.5 py-1 text-[13px] font-medium" style={{ background: "var(--grad-soft)", color: "var(--accent)" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pts since run 1
          </span>
        )}
      </div>

      {loading && <p className="py-12 text-center text-[13px] text-[var(--faint)]">Loading…</p>}
      {error && <div className="rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/10 p-3 text-[13px] text-[var(--red)]">{error}</div>}

      {!loading && runs.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <p className="text-[14px] text-[var(--muted)]">No runs yet for this loop.</p>
          <p className="mt-1 text-[13px] text-[var(--faint)]">Run it from the builder, or fire the scheduler below.</p>
          <Link href="/build" className="btn btn-primary mt-4 inline-flex px-4 py-2">Open the builder</Link>
        </div>
      )}

      {!loading && runs.length > 0 && (
        <>
          {/* improvement chart */}
          <div className="panel mt-3 p-5">
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {runs.map((r, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5" title={new Date(r.ts).toLocaleString()}>
                  <span className="font-mono text-[11px] text-[var(--muted)]">{r.score}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(6, (r.score / maxScore) * 120)}px`,
                      background: r.pass ? "var(--grad)" : "var(--red)",
                      opacity: r.trigger === "scheduler" ? 0.85 : 1,
                    }}
                  />
                  <span className="text-[10px] text-[var(--faint)]">{i + 1}</span>
                  <span className="text-[9px] uppercase tracking-wide text-[var(--faint)]">{r.trigger === "scheduler" ? "auto" : "you"}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 border-t border-[var(--border-soft)] pt-3 text-[12px] text-[var(--muted)]">
              <span>{runs.length} runs</span>
              <span>{data?.memoryCount ?? 0} memories</span>
              <span>{data?.schedulerRuns ?? 0} scheduler-fired</span>
              <span className="ml-auto inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--grad)" }} /> passed
                <span className="ml-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--red)" }} /> held
              </span>
            </div>
          </div>

          {/* run list */}
          <div className="mt-4 flex flex-col gap-1.5">
            {[...runs].reverse().map((r, i) => (
              <div key={i} className="hoverable flex items-center gap-3 rounded-lg border border-[var(--border-soft)] px-3 py-2.5 text-[13px]">
                <span className="font-mono text-[13px] font-semibold" style={{ color: r.pass ? "var(--green)" : "var(--red)" }}>{r.score}</span>
                <span className="text-[var(--muted)]">{r.pass ? "shipped" : "held for review"}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--faint)]" style={{ border: "1px solid var(--border)" }}>
                  {r.trigger}
                </span>
                <span className="ml-auto text-[12px] text-[var(--faint)]">{new Date(r.ts).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex items-center justify-center gap-3">
        <button onClick={fireScheduler} disabled={firing} className="btn btn-outline px-4 py-2">
          {firing ? "Firing…" : "Fire scheduler now"}
        </button>
        <Link href="/build" className="btn btn-ghost px-4 py-2">Back to builder</Link>
      </div>
      <p className="mt-2 text-center text-[11px] text-[var(--faint)]">
        The scheduler runs this loop automatically (every Monday 8am in production) — each run reads the last run&apos;s lessons.
      </p>
    </div>
  );
}
