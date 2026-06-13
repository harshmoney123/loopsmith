# Loopsmith — Build Log

A factual record of how Loopsmith was built, including the self-audit it ran on
itself. The build ran as an autonomous loop (Claude Code `/loop`) with two
sessions working in parallel — one on the engine/UX, one on live MCP connectors.
"Done" was model-verifiable at every step (tests green, `/health` 200,
`workflow.ts` stage exits).

## What shipped

**The product** — a self-improving operating loop + the meta-builder that
generates one from a conversation:

- **Builder** (`builder/`): interview → architect → codegen. Opus 4.8 runs an
  adaptive ≤5-question, jargon-free interview → a validated `LoopSpec`; a
  deterministic architect renders the 5-layer design; codegen emits a genuinely
  runnable 15-file Claude Code project.
- **Engine** (`engine/`): the 5 layers — sensor → policy → tools → gate →
  learning — orchestrated in `loop.ts` (`runOnce`, `runPersisted`).
- **Persistence** (`lib/store.ts`): durable runs + memory + saved loops, so
  self-improvement and the scheduler are real across sessions.
- **Surfaces**: `/build` (chat onboarding + one-click prebuilt-loop gallery +
  paste-your-real-week + "teach & re-run"), `/runs` (improvement chart),
  `/loops` (saved-loop dashboard), `/connect` (OAuth connectors).
- **APIs**: `/api/run` (streaming), `/api/interview`, `/api/build`, `/api/runs`,
  `/api/loops`, `/api/cron` (scheduler), `/api/workflow` (the build pipeline as a
  responding URL), `/api/health`.
- **Real data, no OAuth required**: paste your actual week (Slack/email/calls/
  calendar) → the loop ingests and grounds every move in *your* content. Live
  MCP connectors (Slack/Gmail/Notion/Calendar) are the upgrade.
- **Yours to keep**: download the generated project as a `.zip`; the generated
  repo's own `npm test` (`node --test`) passes with zero install.

## Self-improvement, made real

The gate's "Fit to operator" score is a deterministic function of the learned
preferences applied to a run, so personalization rises as the loop learns you.
A human note ("keep drafts under 3 sentences") is applied immediately *and*
written as a durable preference for every future run. Verified end-to-end on a
fixed input: 75 → 90 → 97 → 98 across runs.

## Orchestration: we audited ourselves

After the product was built, we ran a 5-dimension **audit workflow** —
32 subagents across acceptance-criteria conformance, non-technical UX value,
engine correctness, security, and generated-repo runnability — where every
finding was **adversarially refuted-or-confirmed** by an independent skeptic
agent to drop false positives. It returned **16 confirmed findings**.

We fixed the 9 that were clean and in-scope, each with a regression test:

| # | Fix |
|---|-----|
| #2 | "Run on my data" no longer invents synthetic signals when a paste parses to zero — returns a clear error (grounding/trust). |
| #3 | Gate score parser anchored to the final score line + last-match, so critique-bullet numbers can't corrupt the score. |
| #5 | Source-marker detection no longer mangles ordinary sentences ("Call Sarah…") — requires bracket/label form. |
| #7/#11 | The gate now grades each loop's **own** rubric, not a hardcoded list. |
| #8 | `parsePlan` splits on the explicit `_Action:_` marker, not the bare word "action". |
| #12 | Acceptance #3 proven for real: a CI test materializes the generated repo and runs its `node --test` + health. |
| #13 | Saved-loop dashboard distinguishes same-named loops by id. |
| #14 | The interview only offers data sources with a real connector (+ "paste it in"). |
| #16 | `parseActions` requires a dotted tool token, so markdown checkboxes aren't parsed as tools. |

Findings deferred to human/owner decision: live deploy auth + injection→live-write
hardening (security), the effort-tier badge, and the self-improvement scoring
design (changing it touches the demo narrative).

## Verification

- **Tests**: `npm test` — 54 unit tests across spec, gate, tools, sensor,
  policy, store, architect, codegen (incl. a real materialized-repo run),
  workflow, presets.
- **Live**: every surface exercised against a running server; a 4-persona swarm
  (clinic director, nonprofit ED, ops/claims, SaaS founder) confirmed real value
  on each domain; the `/api/workflow` pipeline reproduced a working loop from a
  brand-new description with all stage exits passing.

See [`PLAN.md`](./PLAN.md), [`rubric.md`](./rubric.md), [`RESEARCH.md`](./RESEARCH.md),
[`README.md`](./README.md).
