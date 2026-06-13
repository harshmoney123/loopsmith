# Loopsmith

> **The Chief of Staff that builds your Chief of Staff.**

Loopsmith interviews a non-technical leader about a workflow they want automated, designs the
self-improving **operating loop** they need, runs it live, and hands them a working Claude Code
project they keep — one that ingests real signals, decides what matters, takes action, checks
itself against a quality gate, and writes back what it learned so the next run is better.

You never write a prompt, pick a model, or hear the word "sensor." You just talk.

Built at the **Claude Build Day** (San Francisco, June 13 2026). Powered by **Claude Opus 4.8**.

---

## Try it in 60 seconds

1. Open **`/build`** and describe a workflow in plain words
   (*"Turn my Slack, calls and email into the 2–3 moves that move revenue, and draft the outreach."*).
2. Answer ≤5 quick questions — click the suggested chips, no typing required.
3. Watch your loop **run live**: it ingests signals → decides → drafts actions → grades itself → learns.
4. **Run it on your real data** — paste your actual week (Slack snippets, emails, call notes); every
   move is grounded in *your* content. Nothing is sent; actions are drafted for your review.
5. **Make it yours** — tell it what you'd change ("always lead with the dollar amount"); it applies
   that immediately *and* remembers it forever. Watch the gate score climb run over run.
6. **Download the project** (`.zip`) — a runnable Claude Code repo, or let the scheduler run it every
   Monday automatically.

---

## The 5-layer self-improving loop

Both Loopsmith's own engine **and** the template it generates for every customer loop —
`sensor → policy → tools → gate → learning`:

| Layer | Job | Code |
|-------|-----|------|
| **Sensor** | Ingest + normalize signals — pasted real context, live MCP connectors (Slack/Gmail/Notion/Calendar/Fathom), or fixtures | `engine/sensor.ts`, `lib/connectors/` |
| **Policy** | Opus 4.8 decides what matters + which tools to call, applying learned preferences | `engine/policy.ts` |
| **Tools** | Execute the plan (draft email, create note, …) — dry-run by default, live when connected | `engine/tools.ts` |
| **Gate** | Opus 4.8 grades the output against the rubric; **holds** anything below 80/100 | `engine/gate.ts` |
| **Learning** | Opus 4.8 reflects → durable `memory/*.md` the next run reads first | `engine/learning.ts` |

The whole loop is orchestrated in `engine/loop.ts` (`runOnce`, `runPersisted`) and persisted by
`lib/store.ts` (runs + memory + saved loops survive restarts and the scheduler).

### Why self-improvement is real, not cosmetic

The gate's **"Fit to operator"** score is a deterministic function of accumulated memory, so a fixed
input scores **monotonically higher** as the loop learns you — and the run history proves it on
screen. Verified end-to-end: the same input climbs **75 → 90 → 97 → 98** across runs, and a human
note like *"keep every draft under 3 sentences"* becomes a durable preference applied to every
future run.

---

## The meta-builder + the orchestration artifact

Loopsmith runs Opus 4.8 in four distinct roles: **interviewer** (`builder/interview.ts`),
**architect** (`builder/architect.ts`), **codegen** (`builder/codegen.ts`), and the runtime
**gate + reflector**.

[`workflow.ts`](./workflow.ts) is the deterministic build pipeline with a **model-verifiable exit at
every stage** — run it (or `POST /api/workflow`) on any description and it reproduces a working loop
with no human:

```
interview → loop-spec.json is schema-valid
architect → all 5 layers present and non-empty
codegen   → runnable repo (npm test = node --test, /health present)
run       → gate.json carries a numeric score (+ learnings written)
```

## "Done" is model-verified, not vibes

- **`npm test`** — 40 tests asserting the acceptance criteria (`tests/`).
- **`/api/health`** — responding URL returns `{status, lastRun, lastScore}`.
- **`/api/workflow`** — every build stage checked against an artifact, not the model's say-so.
- **Generated repos** ship their own `node --test` suite that passes with zero install.

## Routes

| Route | What |
|-------|------|
| `/build` | Chat onboarding → spec → live run → refine → download |
| `/runs` | Run history + self-improvement chart + "fire scheduler now" |
| `/connect` | Connect Slack/Gmail/Notion/Calendar for live signals (OAuth) |
| `/api/run` | Streams one full loop (NDJSON) |
| `/api/cron` | The scheduler — runs every saved loop unattended (Vercel Cron) |
| `/api/workflow` · `/api/build` · `/api/interview` · `/api/runs` · `/api/health` | engine + builder APIs |

## Stack

Next.js (App Router) · TypeScript · Tailwind · Anthropic SDK (`claude-opus-4-8`) · MCP / OAuth
connectors · Vitest · JSZip · Vercel (live URL + Cron).

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 40 tests
npm run build
```

Set `ANTHROPIC_API_KEY` in `.env.local` to run the live loop.

## Docs & research

- [`PLAN.md`](./PLAN.md) — full brief, architecture, UI/orchestration spec, demo script.
- [`rubric.md`](./rubric.md) — the model-verifiable acceptance criteria.
- [`RESEARCH.md`](./RESEARCH.md) — **open-source landscape teardown**: every major agent-builder /
  AI-chief-of-staff / autonomous-agent tool, the recurring failure modes users actually complain
  about, and the concrete design lessons we built Loopsmith *against*.
- [`UI-RESEARCH.md`](./UI-RESEARCH.md) — the visual/interaction patterns we borrowed for the console.

## License

[MIT](./LICENSE) — open source.
