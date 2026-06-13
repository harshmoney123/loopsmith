"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

/* Stage glyphs (24x24), shared with the diagram nodes. */
const GLYPHS: Record<string, ReactElement> = {
  sensor: <path d="M4 14a8 8 0 0 1 8-8M7 14a5 5 0 0 1 5-5M12 14h.01M12 14v6" />,
  policy: <path d="M12 3a4 4 0 0 0-4 4 3 3 0 0 0-1 5.8A3 3 0 0 0 9 18a3 3 0 0 0 6 0 3 3 0 0 0 2-5.2A3 3 0 0 0 16 7a4 4 0 0 0-4-4Z" />,
  tools: <path d="M14 7l3 3-8 8-3 1 1-3 8-8ZM13 8l3 3" />,
  gate: <path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3ZM9 12l2 2 4-4" />,
  learning: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />,
};

const NODES = [
  { key: "sensor", label: "Sense" },
  { key: "policy", label: "Decide" },
  { key: "tools", label: "Act" },
  { key: "gate", label: "Check" },
  { key: "learning", label: "Learn" },
] as const;

type Status = "idle" | "active" | "done";

/* ----------------------------- LoopDiagram ----------------------------- */
/** Always-on 5-node cycle. Active node glows; a gradient beam traces the loop. */
export function LoopDiagram({ status }: { status: Record<string, Status> }) {
  const cx = 120;
  const cy = 120;
  const r = 80;
  const anyActive = NODES.some((n) => status[n.key] === "active");
  const pts = NODES.map((n, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return { ...n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), la: a };
  });

  return (
    <svg viewBox="-14 -10 268 260" className="w-full" role="img" aria-label="Loop diagram">
      <defs>
        <linearGradient id="loopGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#635bff" />
          <stop offset="100%" stopColor="#00b8ff" />
        </linearGradient>
      </defs>

      {/* base ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(10,37,64,0.10)" strokeWidth="2" />

      {/* traveling beam (only while a stage is active) */}
      {anyActive && (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="url(#loopGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="70 432"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} ${cy}`}
            to={`360 ${cx} ${cy}`}
            dur="3.2s"
            repeatCount="indefinite"
          />
        </g>
      )}

      {/* nodes */}
      {pts.map((p) => {
        const st = status[p.key] ?? "idle";
        const lx = cx + (r + 24) * Math.cos(p.la);
        const ly = cy + (r + 24) * Math.sin(p.la);
        return (
          <g key={p.key}>
            {st === "active" && (
              <circle cx={p.x} cy={p.y} r="20" fill="url(#loopGrad)" opacity="0.18">
                <animate attributeName="r" values="18;26;18" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.22;0.05;0.22" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r="17"
              fill={st === "done" ? "url(#loopGrad)" : "#ffffff"}
              stroke={st === "idle" ? "rgba(10,37,64,0.14)" : "url(#loopGrad)"}
              strokeWidth={st === "active" ? "2.2" : "1.5"}
            />
            <g
              transform={`translate(${p.x - 8} ${p.y - 8}) scale(0.66)`}
              fill="none"
              stroke={st === "done" ? "#fff" : st === "active" ? "#635bff" : "#8792a2"}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {GLYPHS[p.key]}
            </g>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight={st === "idle" ? 400 : 600}
              fill={st === "idle" ? "#8792a2" : "#0a2540"}
            >
              {p.label}
            </text>
          </g>
        );
      })}

      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="9" letterSpacing="1.5" fill="#8792a2">
        SELF-IMPROVING
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="11" fontWeight={600} fill="#0a2540">
        operating loop
      </text>
    </svg>
  );
}

/* ------------------------------ ScoreRing ------------------------------ */
/** Animated count-up gate score as a gradient ring. */
export function ScoreRing({ score, pass, size = 116 }: { score: number; pass: boolean; size?: number }) {
  const [shown, setShown] = useState(0);
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 750;
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (score - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const offset = circ * (1 - shown / 100);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#635bff" />
            <stop offset="100%" stopColor="#00b8ff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(10,37,64,0.08)" strokeWidth="9" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pass ? "url(#ringGrad)" : "#e25950"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[26px] font-semibold leading-none text-[var(--fg)]">{shown}</span>
        <span className="mt-0.5 text-[10px] text-[var(--faint)]">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------ TrendChart ----------------------------- */
/** Score-over-time line + area. */
export function TrendChart({ history }: { history: { n: number; score: number; pass: boolean }[] }) {
  const W = 280;
  const H = 96;
  const pad = 14;
  const n = history.length;
  const x = (i: number) => (n <= 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1));
  const y = (s: number) => H - pad - (s / 100) * (H - 2 * pad);
  const line = history.map((h, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(h.score)}`).join(" ");
  const area = n > 1 ? `${line} L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z` : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 96 }}>
      <defs>
        <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(99,91,255,0.22)" />
          <stop offset="100%" stopColor="rgba(0,184,255,0.02)" />
        </linearGradient>
        <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#635bff" />
          <stop offset="100%" stopColor="#00b8ff" />
        </linearGradient>
      </defs>
      {/* 80 = pass threshold */}
      <line x1="0" x2={W} y1={y(80)} y2={y(80)} stroke="rgba(10,37,64,0.12)" strokeWidth="1" strokeDasharray="3 4" />
      {area && <path d={area} fill="url(#trendArea)" />}
      {n > 1 && <path d={line} fill="none" stroke="url(#trendLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {history.map((h, i) => (
        <circle key={h.n} cx={x(i)} cy={y(h.score)} r={i === n - 1 ? 4 : 3} fill={h.pass ? "#635bff" : "#e25950"} stroke="#fff" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/* ------------------------------ Confetti ------------------------------- */
/** Fires a burst whenever `fireKey` increments (dependency-free). */
export function Confetti({ fireKey }: { fireKey: number }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; bg: string; delay: number; rot: number; dur: number }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (fireKey <= 0) return;
    const colors = ["#635bff", "#00b8ff", "#1ea672", "#ecac5f", "#e25950"];
    const batch = Array.from({ length: 80 }, () => ({
      id: idRef.current++,
      left: Math.random() * 100,
      bg: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.25,
      rot: Math.random() * 360,
      dur: 1.6 + Math.random() * 1.2,
    }));
    setPieces(batch);
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, [fireKey]);

  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}vw`,
            background: p.bg,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
