"use client";

import { useCallback, useEffect, useState } from "react";

interface ConnField { key: string; label: string; placeholder: string; required?: boolean }
interface Conn {
  source: string;
  label: string;
  method: "oauth" | "token";
  oauth?: "google" | "slack";
  blurb: string;
  fields?: ConnField[];
  configured: boolean;
  note: string;
}

export default function ConnectPage() {
  const [conns, setConns] = useState<Conn[]>([]);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [redirectBase, setRedirectBase] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/connectors").then((x) => x.json());
    setConns(r.connectors || []);
  }, []);

  useEffect(() => {
    load();
    setRedirectBase(window.location.origin);
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected")) setFlash(`✓ Connected ${q.get("connected")}`);
    if (q.get("error")) setFlash(`Couldn't connect: ${q.get("error")}`);
  }, [load]);

  const saveToken = async (c: Conn) => {
    setBusy(c.source);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: c.source, values: draft[c.source] || {} }),
      }).then((x) => x.json());
      setFlash(res.ok ? `✓ Connected ${c.label}` : `Couldn't connect: ${res.error}`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const liveCount = conns.filter((c) => c.configured).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-[16px] font-semibold">Connections</h1>
        <p className="mt-0.5 text-[13px] text-[var(--faint)]">
          Connect your tools so loops run on your real signals. {liveCount} connected.
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-6">
        {flash && (
          <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-[13px]">{flash}</div>
        )}

        <div className="flex flex-col gap-3">
          {conns.map((c) => (
            <div key={c.source} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">{c.label}</span>
                    {c.configured ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]" style={{ background: "rgba(30,166,114,0.12)", color: "var(--green)" }}>
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" /> Live
                      </span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-[11px] text-[var(--faint)]" style={{ border: "1px solid var(--border)" }}>Not connected</span>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-[var(--muted)]">{c.blurb}</p>
                </div>

                {c.method === "oauth" && !c.configured && (
                  <a href={`/api/oauth/${c.oauth}`} className="btn btn-primary px-3 py-1.5 text-[13px]">
                    Connect {c.label}
                  </a>
                )}
              </div>

              {/* token connect (works with zero console config) */}
              {c.method === "token" && !c.configured && c.fields && (
                <div className="mt-3 flex flex-col gap-2">
                  {c.fields.map((f) => (
                    <input
                      key={f.key}
                      type="text"
                      placeholder={f.label}
                      value={draft[c.source]?.[f.key] || ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [c.source]: { ...d[c.source], [f.key]: e.target.value } }))
                      }
                      className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
                    />
                  ))}
                  <button onClick={() => saveToken(c)} disabled={busy === c.source} className="btn btn-primary self-start px-3 py-1.5 text-[13px]">
                    {busy === c.source ? "Connecting…" : `Connect ${c.label}`}
                  </button>
                </div>
              )}

              {/* OAuth connectors also accept a token paste as a fallback */}
              {c.method === "oauth" && !c.configured && c.fields && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[12px] text-[var(--faint)]">…or paste a token</summary>
                  <div className="mt-2 flex flex-col gap-2">
                    {c.fields.map((f) => (
                      <input
                        key={f.key}
                        type="text"
                        placeholder={f.placeholder}
                        value={draft[c.source]?.[f.key] || ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [c.source]: { ...d[c.source], [f.key]: e.target.value } }))
                        }
                        className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
                      />
                    ))}
                    <button onClick={() => saveToken(c)} disabled={busy === c.source} className="btn btn-outline self-start px-3 py-1.5 text-[13px]">
                      Save token
                    </button>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>

        {redirectBase && (
          <p className="mt-6 text-[11px] leading-relaxed text-[var(--faint)]">
            OAuth setup (one-time): add this redirect URI to the provider app —
            <code className="ml-1 rounded bg-[var(--grad-soft)] px-1.5 py-0.5 text-[var(--accent)]">{redirectBase}/api/oauth/&lt;provider&gt;/callback</code>.
            Token paste needs no setup.
          </p>
        )}
      </div>
    </div>
  );
}
