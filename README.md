# Loopsmith

> **The Chief of Staff that builds your Chief of Staff.**

Loopsmith interviews a non-technical leader about a workflow they want automated, designs the
self-improving agentic **operating loop** they need, and generates a working Claude Code repo they
can actually run — one that ingests signals, decides what matters, takes action, checks itself
against a quality gate, and writes back what it learned so the next run is better.

Built at the **Claude Build Day** (San Francisco, June 13 2026). Powered by **Claude Opus 4.8**.

## The 5-layer self-improving loop

This is both Loopsmith's own engine and the template it generates for every customer loop —
`sensor → policy → tools → gate → learning`:

| Layer | Job | Code |
|-------|-----|------|
| **Sensor** | Ingest + normalize real signals (Slack, Gmail, Fathom, Calendar, …) | `engine/sensor.ts` |
| **Policy** | Opus 4.8 decides what matters + which tools to call | `engine/policy.ts` |
| **Tools** | Execute the plan (drafts/sends, Notion, Calendar …), dry-run by default | `engine/tools.ts` |
| **Gate** | Opus 4.8 grades the output vs `rubric.md`; holds weak output | `engine/gate.ts` |
| **Learning** | Opus 4.8 reflects → durable memory the next run reads first | `engine/learning.ts` |

The builder runs Opus 4.8 in four roles — `builder/interview.ts`, `builder/architect.ts`,
`builder/codegen.ts`, plus the runtime gate/reflector.

## Why it's different

Most tools hand you an agent. Loopsmith hands every executive a **factory** for their own
self-improving agent — without them ever seeing the architecture. Output is verified by the model,
not vibes: a `rubric.md`, a test suite, and a responding `/health` URL make "done" checkable with
no human in the loop.

## Stack

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · React Flow · Claude Agent SDK
(`claude-opus-4-8`) · MCP connectors · Vercel (live URL) · Tauri (desktop) · PWA (mobile).

## Develop

```bash
npm install
npm run dev        # http://localhost:3000  ·  /health for liveness
npm run build
```

See [`PLAN.md`](./PLAN.md) for the full brief, architecture, UI spec, orchestration spec, and
demo script. See [`rubric.md`](./rubric.md) for the model-verifiable acceptance criteria, and
[`RESEARCH.md`](./RESEARCH.md) for the competitive-landscape teardown.

## License

[MIT](./LICENSE) — open source.
