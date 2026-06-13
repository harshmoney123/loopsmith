export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Color blobs behind the glass */}
      <div className="blob" style={{ width: 420, height: 420, top: "-80px", left: "-60px", background: "#5b8cff" }} />
      <div className="blob" style={{ width: 380, height: 380, bottom: "-90px", right: "-40px", background: "#b14bff" }} />
      <div className="blob" style={{ width: 300, height: 300, top: "40%", left: "55%", background: "#19c3a6" }} />

      {/* Glass card */}
      <section className="glass rise relative z-10 w-full max-w-xl rounded-3xl px-10 py-14 text-center">
        <span className="glass-pill mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-white/80">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
          Loopsmith · live
        </span>

        <h1 className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
          Hello, World
        </h1>

        <p className="mx-auto mt-5 max-w-md text-balance text-base leading-relaxed text-white/70">
          The Chief of Staff that builds your Chief of Staff. Deployment is live — the
          self-improving operating loop comes next.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 text-xs text-white/50">
          <span className="glass-pill rounded-full px-3 py-1">Next.js</span>
          <span className="glass-pill rounded-full px-3 py-1">Opus 4.8</span>
          <span className="glass-pill rounded-full px-3 py-1">Vercel</span>
        </div>
      </section>
    </main>
  );
}
