"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

/* nav icons (thin, 24x24) */
const ICONS: Record<string, ReactElement> = {
  console: <path d="M4 12a8 8 0 1 1 8 8M4 12H2m2 0 2.5-2.5M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />,
  build: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />,
  runs: <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7 3.4M3 4v3.4h3.4M12 8v4l3 2" />,
  memory: <path d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M6 6h12v12H6z" />,
  connect: <path d="M10 14a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1M14 10a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />,
};

function NavIcon({ k }: { k: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[k]}
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Console", icon: "console", hint: "Run the live loop" },
  { href: "/build", label: "Build", icon: "build", hint: "Design a new loop" },
  { href: "/runs", label: "Runs", icon: "runs", hint: "History & schedule" },
  { href: "/connect", label: "Connections", icon: "connect", hint: "Connect your tools" },
];

export function AppSidebar() {
  const pathname = usePathname() || "/";
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="hidden w-[228px] flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-tint)] p-3 md:flex">
      {/* brand */}
      <Link href="/" className="flex items-center gap-2 px-2 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md text-[13px] font-bold text-white" style={{ background: "var(--grad)" }}>L</span>
        <span className="text-[15px] font-semibold tracking-tight text-[var(--fg)]">Loopsmith</span>
      </Link>

      {/* primary action */}
      <Link href="/build" className="btn btn-primary mt-3 px-3 py-2">
        <NavIcon k="build" />
        New loop
      </Link>

      {/* nav */}
      <p className="mt-5 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">Workspace</p>
      <nav className="mt-1 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors"
              style={
                active
                  ? { background: "rgba(99,91,255,0.10)", color: "var(--accent)", fontWeight: 600 }
                  : { color: "var(--muted)" }
              }
            >
              <span style={{ color: active ? "var(--accent)" : "var(--faint)" }}>
                <NavIcon k={item.icon} />
              </span>
              <span className="flex-1">{item.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </Link>
          );
        })}
      </nav>

      {/* status */}
      <div className="mt-auto flex items-center gap-2 px-2.5 py-2 text-[12px] text-[var(--faint)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] pulse-dot" />
        Opus 4.8 · live
      </div>
    </aside>
  );
}
