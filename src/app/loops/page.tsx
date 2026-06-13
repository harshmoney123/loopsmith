"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LoopSpec } from "@/lib/types";

interface LoopSummary {
  loopId: string;
  name: string;
  description: string;
  cadence: string;
  sensors: string[];
  spec: LoopSpec | null;
  runCount: number;
  schedulerRuns: number;
  scores: number[];
  lastScore: number | null;
  lastRun: string | null;
  memoryCount: number;
}

const prettyCadence = (c: string) =>
  c.startsWith("weekly") ? "weekly" : c.startsWith("daily") ? "daily" : c.startsWith("on-demand") ? "on demand" : c || "—";

export default function LoopsPage() {
  const [loops, setLoops] = useState<LoopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/loops");
      const data = await res.json();
      setLoops(data.loops ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Run a saved loop now (consume the stream to completion, then refresh).
  const runNow = useCallback(
    async (l: LoopSummary) => {
      if (!l.spec) return;
      setBusy(l.loopId);
      setError(null);
      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec: l.spec, loopId: l.loopId }),
        });
        if (res.body) {
          const reader = res.body.getReader();
          // drain the stream; we only care that it finished
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const downloadRepo = useCallback(async (l: LoopSummary) => {
    if (!l.spec) return;
    setBusy(l.loopId);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: l.spec }),
      });
      const data = await res.json();
      if (!data.files) throw new Error(data.error || "build failed");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const f of data.files) zip.file(f.path, f.content);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${l.loopId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/build" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md text-[13px] font-bold text-white" style={{ background: "var(--grad)" }}>L</span>
          <span className="text-[15px] font-semibold tracking-tight">Loopsmith</span>
        </Link>
        <button onClick={load} className="btn btn-outline px-3 py-1.5">Refresh</button>
      </header>

      <div className="mb-5">
        <h1 className="text-[20px] font-semibold tracking-tight">Your loops</h1>
        <p className="text-[13px] text-[var(--faint)]">Every loop you&apos;ve built — running, learning, and getting better over time.</p>
      </div>

      {loading && <p className="py-12 text-center text-[13px] text-[var(--faint)]">Loading…</p>}
      {error && <div className="mb-4 rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/10 p-3 text-[13px] text-[var(--red)]">{error}</div>}

      {!loading && loops.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <p className="text-[14px] text-[var(--muted)]">No loops yet.</p>
          <p className="mt-1 text-[13px] text-[var(--faint)]">Build one and run it — it&apos;ll show up here with its history.</p>
          <Link href="/build" className="btn btn-primary mt-4 inline-flex px-4 py-2">Build your first loop</Link>
        </div>
      )}

      {!loading && loops.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {loops.map((l) => {
            const max = Math.max(100, ...l.scores);
            return (
              <div key={l.loopId} className="panel flex flex-col p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h2 className="text-[15px] font-semibold leading-tight text-[var(--fg)]">{l.name}</h2>
                  {l.lastScore != null && (
                    <span className="flex-shrink-0 rounded-md px-2 py-0.5 font-mono text-[12px] font-semibold" style={{ background: "var(--grad-soft)", color: "var(--accent)" }}>
                      {l.lastScore}
                    </span>
                  )}
                </div>
                {/* distinguishing id — shown when it differs from the name's slug,
                    so two loops that share a display name are still tellable apart (#13) */}
                {l.loopId !== l.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") && (
                  <p className="-mt-0.5 mb-1 font-mono text-[10.5px] text-[var(--faint)]">{l.loopId}</p>
                )}
                <p className="line-clamp-2 text-[12.5px] leading-snug text-[var(--muted)]">{l.description}</p>

                <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px] text-[var(--faint)]">
                  <span className="rounded px-1.5 py-0.5" style={{ border: "1px solid var(--border)" }}>{prettyCadence(l.cadence)}</span>
                  <span className="rounded px-1.5 py-0.5" style={{ border: "1px solid var(--border)" }}>{l.sensors.join(" · ") || "—"}</span>
                  <span className="rounded px-1.5 py-0.5" style={{ border: "1px solid var(--border)" }}>{l.runCount} runs</span>
                  <span className="rounded px-1.5 py-0.5" style={{ border: "1px solid var(--border)" }}>{l.memoryCount} learned</span>
                </div>

                {/* sparkline */}
                {l.scores.length > 0 && (
                  <div className="mt-3 flex items-end gap-0.5" style={{ height: 32 }}>
                    {l.scores.slice(-16).map((s, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(3, (s / max) * 32)}px`, background: s >= 80 ? "var(--grad)" : "var(--red)" }} title={`${s}`} />
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => runNow(l)} disabled={busy === l.loopId || !l.spec} className="btn btn-primary px-3 py-1.5">
                    {busy === l.loopId ? "Working…" : "Run now"}
                  </button>
                  <Link href={`/runs?loop=${encodeURIComponent(l.loopId)}`} className="btn btn-outline px-3 py-1.5">History</Link>
                  <button onClick={() => downloadRepo(l)} disabled={busy === l.loopId || !l.spec} className="btn btn-ghost px-3 py-1.5">Download</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/build" className="btn btn-primary px-4 py-2">+ New loop</Link>
      </div>
    </div>
  );
}
