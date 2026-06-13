# Loopsmith — Build Plan

> **The Chief of Staff that builds your Chief of Staff.**
> A desktop (and mobile-responsive) app that interviews any non-technical leader, designs the
> self-improving agentic workflow they actually need, and generates a working Claude Code
> repo/runbook that ingests signals → decides → acts → checks itself → learns — and then **keeps
> looping on its own, getting better every run.**

Built for the **Claude Build Day** (Shack15, SF — submissions 5:00 PM). This file is the brief,
the architecture, the UI spec, the orchestration spec, and the hour-by-hour build schedule. It is
written so that another team could re-run the setup tomorrow on a new problem.

---

## 0. TL;DR for the judges

| Rubric (weight) | How Loopsmith wins it |
|---|---|
| **Impact (35%)** | Every executive wants an "agent" but can't architect one. Loopsmith turns a 5-minute conversation into a deployed, self-improving operating loop. It's a factory for the exact thing every non-technical leader is trying to buy. Fits "the swarm" + "back-office workflow that takes weeks" problem statements. |
| **Demo (35%)** | Live: describe a workflow → watch it interview, design the 5-layer architecture on screen, generate a repo, run one full loop (ingest → decide → act → gate → learn) against **real signals** (Slack/Gmail/Fathom/Calendar via MCP), then **re-run and visibly do better** because the learning layer wrote back. Deployed to a live URL. |
| **Opus 4.8 use (15%)** | Opus 4.8 is the *architect* (interview → architecture synthesis → codegen), the *policy brain* (decides what matters each run), the *LLM-judge quality gate* (grades its own output against a rubric and refuses to ship below bar), and the *reflector* (writes durable learnings). Four distinct, non-trivial roles + multi-agent orchestration. |
| **Orchestration (15%)** | Every generated loop ships with a `rubric.md`, a test harness, and a responding `/health` URL. "Done" is model-verifiable with **no human**: the gate grades against the rubric file, the test suite must pass, the URL must answer. Re-runnable from the brief on a brand-new problem. |

**One-liner:** *Instead of building you an agent, Loopsmith builds you the system that builds and
improves your agents — without you ever seeing the architecture.*

---

## 1. The problem

Non-technical leaders (founders, GTM leads, ops heads, clinic directors, nonprofit EDs) all want
the same thing: *"Take my messy inputs — Slack, calls, emails, calendar — and run a repeatable
operating loop that produces an output I'd actually act on, and make it smarter over time."*

They cannot build it because:
1. They don't know what a **sensor / policy / tool / gate / learning** architecture is.
2. They can't write the business logic as code or prompts.
3. They have no idea how to make it **self-improving** instead of a one-shot script.
4. Off-the-shelf "AI assistants" are stateless — they never get better at *your* loop.

The gap isn't models. It's the **harness around the model**. Loopsmith generates the harness.

## 2. Who it's for

- Primary demo persona: a **GTM/founder** ("turn my Slack + customer calls + emails into a weekly
  GTM execution loop").
- Generalizes to: claims triage, loan-servicing back-office, nonprofit grant/donor loops, clinic
  intake, exec inbox-zero, weekly board-prep.
- The point: **the same builder produces all of them** from a conversation. That's the moat and the
  demo.

## 3. What "done" looks like (acceptance criteria — human-written)

These are the behavioral assertions the build must satisfy. They are also the orchestration proof:
the system grades itself against them.

1. **Interview → spec**: Given a free-text workflow description, Loopsmith conducts a ≤6-question
   interview and emits a structured `loop-spec.json` (sensors, cadence, decision policy, tools,
   gate rubric, output format, memory keys). Verify: `loop-spec.json` validates against schema.
2. **Architecture synthesis**: From the spec, it produces a named 5-layer design and renders it
   visually before any code. Verify: all 5 layers present and non-empty in the spec.
3. **Repo generation**: It writes a runnable Claude Code project (`CLAUDE.md`, `.claude/`,
   `loop.ts`, `rubric.md`, `memory/`, `tests/`, `health` endpoint). Verify: `npm test` passes on
   the generated repo and the dev server answers `GET /health` 200.
4. **One full loop**: A run ingests ≥1 real signal, decides, calls ≥1 tool, produces an output,
   and the gate scores it against `rubric.md`. Verify: run produces `runs/<ts>/output.md` +
   `runs/<ts>/gate.json` with a numeric score.
5. **Self-improvement is real, not cosmetic**: After run 1, a learning is written to `memory/`.
   Run 2 reads it and the gate score for run 2 ≥ run 1 **for the same input**, OR a new learning
   is added. Verify: diff `memory/` between runs; assert non-empty delta and `gate.json` score
   monotonic-or-improving on fixed input.
6. **Self-looping**: A scheduler fires the loop on a cadence without human action and appends to a
   visible run history. Verify: ≥2 runs appear in the timeline triggered by the scheduler, not by a
   button click.
7. **No architecture knowledge required**: The entire UX never asks the user to write a prompt,
   pick a model, or name a layer. Verify: walkthrough script has zero technical inputs.

> Agent does NOT modify assertions 1–7. If one seems wrong, ask first. (Per acceptance-test
> discipline — these are the contract, the implementation makes them pass.)

---

## 4. Architecture — the 5-layer self-improving loop

This is both **Loopsmith's own engine** and **the template it generates** for every customer loop.
It maps 1:1 to the "AI native flow" closed loop: **sensor → policy → tools → gate → learning.**

```
                          ┌─────────────────────────────────────────────┐
                          │                LOOPSMITH                      │
                          │   (meta-builder: interview → design → gen)    │
                          └───────────────────────┬───────────────────────┘
                                                  │ generates
                                                  ▼
   ┌──────────────────────────  A GENERATED OPERATING LOOP  ──────────────────────────┐
   │                                                                                    │
   │  1) SENSOR LAYER          2) BUSINESS LOGIC (POLICY)        5) TOOLS LAYER         │
   │  ───────────────          ──────────────────────────       ──────────────         │
   │  Pulls real signals       Opus 4.8 decides:                 Executes the decision: │
   │  • Slack / Gmail          • what matters this run           • Slack send / draft   │
   │  • Fathom / Granola       • which tools to call             • Gmail draft          │
   │  • Calendar / Drive       • in what order                   • Notion / ClickUp     │
   │  • Stripe / Notion        • against current learnings       • Calendar / Docs      │
   │        │                            │                              ▲               │
   │        ▼                            ▼                              │               │
   │   normalized           ┌──────────────────────────┐               │               │
   │   signal bundle  ────► │     produce OUTPUT        │ ──────────────┘               │
   │                        └────────────┬─────────────┘                                │
   │                                     ▼                                              │
   │                        3) QUALITY GATE (LLM-judge)                                 │
   │                        ─────────────────────────────                              │
   │                        Opus 4.8 grades OUTPUT vs rubric.md → score + reasons       │
   │                        • below bar → revise & retry (max N) or hold for human      │
   │                        • at/above bar → ship                                       │
   │                                     │                                              │
   │                                     ▼                                              │
   │                        4) LEARNING LAYER (memory)                                  │
   │                        ─────────────────────────────                              │
   │                        Opus 4.8 reflects: what worked / what to change             │
   │                        → writes durable, queryable memory (md + index)            │
   │                        → next run's POLICY reads it first ──► loop tightens        │
   │                                                                                    │
   └────────────────────────────────────────────────────────────────────────────────┘
                                     ▲                         │
                                     └──────── SCHEDULER ──────┘
                              (cron: fires the whole loop, "goes and goes")
```

### Layer responsibilities

| # | Layer | Job | Implementation |
|---|---|---|---|
| 1 | **Sensor** | Ingest + normalize real-world signals | MCP connectors (Slack, Gmail, Fathom, Granola, Calendar, Drive, Notion, ClickUp, Stripe). Each sensor returns a normalized `Signal{source, ts, actor, text, meta}`. |
| 2 | **Business logic / Policy** | Decide what matters and what to do | Opus 4.8 with the spec's decision policy + current memory injected. Outputs a typed `Plan{focus, toolCalls[]}`. |
| 5 | **Tools** | Carry out the plan | MCP write tools (send/draft/create/update). Dry-run mode by default for demo safety. |
| 3 | **Quality gate** | Verify the output is good *before* it ships | Opus 4.8 as judge, scoring against `rubric.md` (0–100 + per-criterion). Below threshold → revise loop or human-hold. |
| 4 | **Learning** | Make the next run better | Opus 4.8 reflects on (input, output, gate score, human edits) → writes `memory/*.md` with frontmatter (`type`, `trigger`, `lesson`). Indexed for retrieval. |

### Why this is genuinely self-improving (not a gimmick)

- **Closed loop:** gate feedback + human edits become learnings; learnings re-enter the policy.
- **Monotonic check:** the gate score on a held-fixed input is asserted non-decreasing across runs
  (acceptance criterion #5). That's a measurable improvement signal, not vibes.
- **Durable memory:** learnings are real files with retrieval, surviving restarts — the same memory
  pattern this very environment uses.

---

## 5. The meta-builder (how Loopsmith itself works)

Loopsmith is a multi-agent orchestration that runs Opus 4.8 in four distinct roles:

1. **Interviewer agent** — asks ≤6 targeted questions, adapts to answers, never asks anything
   technical. Output: filled `loop-spec.json`.
2. **Architect agent** — turns the spec into the named 5-layer design + picks sensors/tools from
   available MCP connectors + writes the `rubric.md`. Output: design graph (rendered live) +
   `rubric.md`.
3. **Codegen agent** — scaffolds the runnable Claude Code repo from the design (templated, then
   Opus fills the policy prompt, gate rubric, and tool wiring). Output: a folder of files.
4. **Runner/critic agents** — execute one loop, run the gate (judge), run the reflector. These are
   the same four-role pattern that *ships inside the generated repo*, so the builder and the build
   share one engine.

Orchestration is a **dynamic workflow** (Claude Code `Workflow` / Agent SDK): interview →
(parallel: architect + rubric) → codegen → test → first run → gate → reflect. Each stage has a
model-verifiable exit (schema valid / tests pass / URL answers / score present), so the workflow
self-verifies without a human in the loop.

---

## 6. Tech stack

Chosen for: fast in 6 hours, demos live, deploys to a real URL, wraps to desktop, responsive on
mobile.

| Concern | Choice | Why |
|---|---|---|
| Web app + API | **Next.js (App Router) + TypeScript** on **Vercel** | One repo, live URL (orchestration points), API routes for the engine. |
| UI | **React + Tailwind + shadcn/ui** + Framer Motion | Fast, clean, animated loop visualization. |
| Loop visualization | **React Flow** | Render the live 5-layer graph + pulse signals through it during a run. |
| Agent engine | **Claude Agent SDK (TypeScript)**, model `claude-opus-4-8` | Interviewer / architect / codegen / gate / reflector. Tool-use + MCP. |
| Sensors/Tools | **MCP connectors** (Slack, Gmail, Fathom, Granola, Calendar, Drive, Notion, ClickUp, Stripe) | Real signals → real "wow". |
| Memory/learning | **Markdown files + SQLite (FTS) index** (local) / Neon (web) | Durable, inspectable, the exact memory pattern judges can read. |
| Generated artifact | **Claude Code project scaffold** (`.claude/`, `CLAUDE.md`, `loop.ts`, `rubric.md`, `tests/`) | The actual deliverable the user keeps. |
| Self-loop scheduler | **Vercel Cron** (web) + **node-cron** (desktop) | "Goes and goes and goes." |
| Desktop wrapper | **Tauri** (Rust shell, ships the Next web build) | Lightweight desktop app, mac/win. |
| Mobile | **Responsive PWA** (same Next app, installable) | Covers mobile without a second codebase. |

> Decision made for you (no need to ask): **web-first on Vercel, Tauri wrapper for desktop, PWA for
> mobile.** Rationale: a live responding URL is worth orchestration points and is the fastest path
> to a working demo; the desktop/mobile shells reuse the identical build.

---

## 7. UI spec

Design language: **calm, "operations control room"** — dark slate canvas, one electric-blue accent,
generous whitespace, monospace only for the generated artifacts. The hero is the **living loop
diagram**. Nothing technical is ever asked of the user.

### 7.1 Screens

**A. Home / "Describe your workflow"** (the only input that matters)
```
┌─────────────────────────────────────────────────────────────┐
│  Loopsmith                                      ● Connected   │
│                                                               │
│   What should run itself for you?                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Turn my Slack + customer calls + emails into a       │   │
│   │ weekly GTM execution loop that tells me the 3 moves  │   │
│   │ that matter and drafts the outreach.                 │   │
│   └─────────────────────────────────────────────────────┘   │
│                                          [ Build my loop → ]  │
│                                                               │
│   Try:  ▸ Weekly GTM loop   ▸ Inbox triage   ▸ Claims intake │
└─────────────────────────────────────────────────────────────┘
```

**B. Interview** (chat, ≤6 questions, big friendly buttons + free text)
- Left: conversation. Right: a **spec card** filling in live (sensors found, cadence, output,
  "what good looks like") so the user *sees the architecture forming without reading it*.

**C. Architecture reveal** (the wow #1) — the 5-layer **React Flow** graph animates into existence,
node by node, labeled in plain English ("Listens to: Slack, Gmail" not "Sensor layer"). A toggle
flips to "Show me the engineering" for judges.

**D. Loop Run console** (the wow #2) — the live run:
```
┌──────────────  RUN  ──────────────────────────────────────────┐
│  ① LISTENING   ✓ 14 Slack msgs, 3 emails, 1 call summary       │
│  ② DECIDING    ⠿ "Of 18 signals, 3 matter: …"   (Opus 4.8)     │
│  ③ ACTING      ✓ drafted 2 emails · ✓ Notion task · ⠿ Slack    │
│  ④ CHECKING    ✓ Gate score 82/100  (clarity 9, action 7…)     │
│  ⑤ LEARNING    ✓ wrote 2 lessons → next run reads them         │
│                                                                │
│  OUTPUT  ▸ "This week's 3 GTM moves"  [open] [approve] [edit]  │
└────────────────────────────────────────────────────────────────┘
```
Signals visibly **pulse along the graph edges** as each stage fires.

**E. Run history / improvement chart** (the wow #3) — a timeline of runs with the gate score
trending up, and a "what changed" diff of the memory between runs. Proves self-improvement on
screen.

**F. The artifact** — "Here's your loop, yours to keep": file tree of the generated Claude Code
repo, a **Download repo** button, a **Deploy** button, and the cron toggle ("Run this every
Monday 8am — automatically").

### 7.2 Components (shadcn)
`Textarea` hero, `Card` spec panel, `Tabs` (Plain / Engineering), React Flow canvas, `Timeline`,
`Progress` per stage, `Badge` for gate score, `Sheet` for the artifact file tree, `Switch` for the
scheduler. Framer Motion for node entrance + edge pulse.

### 7.3 Responsive / desktop
- Mobile PWA: screens A→F stack vertically; the loop graph becomes a vertical 5-step stepper that
  still pulses.
- Tauri desktop: same UI, plus a menubar "loop is running" indicator and native notifications when
  a scheduled run finishes or the gate holds something for human review.

---

## 8. Orchestration spec (the 15% — make "done" model-verifiable)

Every generated loop, and the builder itself, ships these so a model can verify success with **no
human**:

- **`rubric.md`** — the gate's grading criteria (per-loop, generated from the interview). The judge
  agent grades output against this file and emits `gate.json {score, criteria[], pass}`.
- **`tests/`** — a generated test suite asserting acceptance criteria #1–#7. `npm test` is the
  pass/fail gate.
- **`/health`** — the deployed loop answers `200 {status, lastRun, lastScore}`. A responding URL =
  verifiable liveness.
- **`loop-spec.json`** — re-running the whole builder from this file on a *new* problem reproduces a
  new loop. That's "another team reruns it tomorrow."
- **Workflow script** (`workflow.ts`) — the deterministic builder pipeline (interview → architect →
  codegen → test → run → gate → reflect) with a verifiable exit per stage. This is the artifact
  judges read for the orchestration score.

**Self-verification chain:** schema-valid spec → tests green → URL 200 → gate score present →
memory delta non-empty. If any link fails, the workflow retries that stage (bounded) before
surfacing to a human. No step trusts the model's say-so; each checks an artifact.

---

## 9. Demo script (3 minutes, the thing judges score)

1. **(0:00) Hook.** "Every exec wants an agent. None can architect one. Watch me build a
   self-improving one by *talking*." Type the GTM sentence. Hit Build.
2. **(0:20) Interview.** Answer 4 quick questions (click the suggested chips). The spec card fills
   in live — *no technical input given*.
3. **(0:50) Architecture reveal.** The 5-layer graph animates in. "It chose my sensors, wrote my
   quality bar, and designed the loop — I never said the word 'sensor'."
4. **(1:20) Live run #1.** Real Slack/Gmail/Fathom signals ingest. Opus 4.8 decides the 3 moves,
   drafts outreach, gate scores **78**. One item held for review — *show the gate refusing to ship
   weak output.*
5. **(2:00) Self-improvement.** Approve with one small edit. **Run #2** on the same inputs — gate
   now **88** because the learning layer wrote back what I preferred. Show the run-history chart
   trending up + the memory diff.
6. **(2:30) It's real & it keeps going.** Flip the scheduler on ("every Monday 8am"). Open the
   generated repo file tree → Download. Show the live `/health` URL responding. "This isn't a demo
   agent. It's a factory that hands every exec their own self-improving one."
7. **(2:50) Close on the rubric line:** "Done is model-verified: tests green, URL live, gate scored
   — no human needed to know it worked."

**The "caught its own failure" moment (judges explicitly want this):** Run #1's gate scoring 78 and
*holding* the weak outreach draft, then Run #2 fixing it from a written learning — that's the model
catching and fixing a failure on its own, on stage.

---

## 10. Build schedule (10:30 AM → 5:00 PM)

Run this as a **self-looping Claude Code build** (see §11). Times are targets.

| Time | Milestone | Verifiable exit |
|---|---|---|
| 10:30–11:00 | Repo scaffold: Next on Vercel, shadcn, React Flow, Agent SDK wired, `claude-opus-4-8` calling. Deploy hello-world → live URL. | URL 200 |
| 11:00–12:00 | **Engine core**: the 5 layers as TS modules (`sensor`, `policy`, `tools`, `gate`, `learning`) + `loop.ts` orchestrator + `memory/` read/write. Unit tests for each. | `npm test` green |
| 12:00–1:00 | **Sensors + tools via MCP**: Slack/Gmail/Fathom/Calendar read; Gmail/Slack/Notion write (dry-run default). One real signal flows end-to-end. | one run produces `output.md` + `gate.json` |
| 1:00–1:30 | Lunch / let the build loop run on UI scaffolding. | — |
| 1:30–2:45 | **UI**: Home → Interview → Architecture reveal (React Flow animate) → Run console with edge pulses. | clickable A→D |
| 2:45–3:45 | **Self-improvement proof**: learning write-back + run-history chart + memory diff. Acceptance test #5 passes. | run2 ≥ run1 on fixed input |
| 3:45–4:15 | **Builder pipeline**: interview → spec → codegen a downloadable repo + `rubric.md` + `tests/` + scheduler toggle (Vercel Cron). | generated repo `npm test` green |
| 4:15–4:45 | Polish, seed demo data, record 1-min video, write final brief + rubric file. | video + public repo |
| 4:45–5:00 | Submit: public repo, live URL, brief, rubric, workflow script, session log. | submitted |

**Cut-line (if behind):** desktop Tauri wrapper and mobile PWA are *nice-to-have*; the web app on
the live URL is the demo. Stripe/Drive sensors are optional. Never cut: the 5-layer run + the
visible self-improvement + the generated repo download.

---

## 11. Setting up the self-looping build ("goes and goes")

Two loops to set up today:

**A. The build loop (during the hackathon):** drive Claude Code with a `Workflow` that fans out the
five engine modules + UI in parallel, runs the generated test suite after each stage, and only
advances when tests are green — re-trying failed stages. This is both how we build fast *and* an
orchestration artifact to submit. Keep `PLAN.md` (this file) as the brief the workflow reads.

**B. The product's runtime loop (what we demo):** the generated repo's scheduler (`node-cron` /
Vercel Cron) fires `loop.ts` on a cadence. Each fire: sensor → policy → gate → tools → learning →
append to run history → push a desktop/mobile notification if the gate holds something. That's the
"self looping build that goes and goes."

To kick off the build loop in this session (after the scaffold exists):
```
cd /Users/harshmoney/Desktop/AgentWeb/loopsmith
claude
# inside: use a Workflow that reads PLAN.md §3 acceptance criteria as the rubric,
# builds the 5 engine modules in parallel, and loops until `npm test` is green.
```

---

## 12. Repo layout (target)

```
loopsmith/
├── PLAN.md                      ← this file (the brief)
├── rubric.md                    ← builder's own gate rubric (acceptance #1–#7)
├── workflow.ts                  ← deterministic build pipeline (orchestration artifact)
├── app/                         ← Next.js (Home, Interview, Design, Run, History, Artifact)
├── components/                  ← shadcn UI + React Flow loop graph
├── engine/
│   ├── sensor.ts                ← MCP signal ingestion → normalized Signal[]
│   ├── policy.ts                ← Opus 4.8 decide() → Plan
│   ├── tools.ts                 ← MCP write actions (dry-run aware)
│   ├── gate.ts                  ← Opus 4.8 judge vs rubric.md → gate.json
│   ├── learning.ts              ← Opus 4.8 reflect → memory write + index
│   └── loop.ts                  ← orchestrates the 5 layers, writes runs/<ts>/
├── builder/
│   ├── interview.ts             ← Interviewer agent → loop-spec.json
│   ├── architect.ts             ← spec → 5-layer design + rubric.md
│   └── codegen.ts               ← design → generated Claude Code repo (templated)
├── templates/generated-loop/    ← scaffold emitted to the user (CLAUDE.md, loop.ts, tests, .claude/)
├── memory/                      ← durable learnings (md + SQLite FTS)
├── runs/                        ← per-run output.md + gate.json (run history source)
├── tests/                       ← asserts acceptance criteria #1–#7
└── api/                         ← /health, /run, /build, cron handler
```

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| MCP auth flaky on venue wifi | Seed a cached signal bundle (`fixtures/signals.json`) so the run works offline; live MCP is the upgrade, not the dependency. |
| Codegen of a *runnable* repo is the hardest part | Ship a fixed, tested `templates/generated-loop/` scaffold; Opus only fills 3 slots (policy prompt, rubric, tool list). Codegen = template + fill, not from-scratch. |
| "Self-improvement" looks fake | Make it measurable: fixed-input gate score must rise; show the memory diff on screen. |
| Time | Web-first; Tauri/PWA are cut-lines; never cut the run + improvement + download. |
| Demo safety (real sends) | Tools default to **dry-run** (drafts, not sends); a visible toggle for "actually send". |

## 14. Stretch (only if green by 4:00)
- Tauri desktop build + native "gate held something" notifications.
- Installable mobile PWA.
- A gallery of 3 prebuilt loops (GTM, inbox triage, claims) generated from one click each, proving
  generality.
- "Show me the engineering" toggle that reveals the actual prompts + workflow script for judges.

---

### Naming / submission checklist
- [ ] Public GitHub repo (standalone, all demo code inside)
- [ ] Live URL responding (`/health` 200)
- [ ] 1-minute demo video (the §9 script)
- [ ] Brief = this `PLAN.md`; Rubric = `rubric.md`; Workflow = `workflow.ts`
- [ ] Session log attached
- [ ] All team members on submission page
