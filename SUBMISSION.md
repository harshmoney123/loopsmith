# Loopsmith — Claude Build Day submission (paste-ready)

**Team Name:** AgentWeb
**Team Members:** Harsha Vankayalapati (harshmoney123)
**Public GitHub Repository:** https://github.com/harshmoney123/loopsmith
**Live Demo URL:** https://loopsmith-sepia.vercel.app
**Demo Video:** (paste YouTube link after recording — see DEMO.md)
**Session Log:** https://github.com/harshmoney123/loopsmith/tree/main/session-logs

---

## Project Description

Loopsmith is "the Chief of Staff that builds your Chief of Staff." Every executive wants an AI
agent for their workflow but can't architect one. Loopsmith interviews a non-technical leader in
plain language, then designs and runs a self-improving "operating loop" — and hands them a working
Claude Code repo they keep.

The loop ingests real signals (Slack / email / calls / calendar), decides what matters, drafts the
actions, grades itself against a quality gate that **holds weak output**, and writes durable
learnings so the next run is better. The self-improvement is measurable, not cosmetic: on a fixed
input the gate score climbs run-over-run (**75 → 90 → 97 → 98**) as the loop learns the operator's
preferences, and the run history proves it on screen. You never write a prompt, pick a model, or
hear the word "sensor" — you just talk. Built entirely during Claude Build Day; powered by Opus 4.8.

---

## How was Opus 4.8 used?

Opus 4.8 runs in **five distinct roles**, not one chat box:

1. **Interviewer** — drives an adaptive, jargon-free ≤5-question interview and emits a schema-valid
   loop spec (structured outputs / `output_config.format`).
2. **Policy brain** — decides what matters each run, with accumulated memory injected first.
3. **LLM-judge quality gate** — grades the output against a rubric and refuses to ship anything
   below 80/100 (it catches its own weak output, live).
4. **Reflector** — writes durable, reusable learnings to memory that bias the next run.
5. **Architect + codegen** — scaffolds the runnable Claude Code repo the user downloads.

All via the official Anthropic SDK with streaming, structured outputs, and effort control. The
standout: Opus 4.8 as an **adversarial self-grader** whose personalization sub-score is gated by a
deterministic memory function — turning "it got better" into a reproducible number, not vibes.

---

## How did you orchestrate Claude's work?

**Strategy: spec-first, model-verifiable at every step, multi-agent.**

- A written **brief** (`PLAN.md`) and a **rubric** (`rubric.md`) with human-authored acceptance
  criteria defined "done" up front — so the model implements against a contract it can't edit.
- **`workflow.ts`** is a deterministic build pipeline (interview → architect → codegen → run) where
  each stage advances only when an artifact passes a check **no human needs to read**:
  `loop-spec.json` is schema-valid → all 5 layers present → the generated repo's `node --test`
  passes and `/health` responds → `gate.json` carries a numeric score. `POST /api/workflow` reruns
  the whole thing on any new description.
- The **runtime loop** is itself a 5-agent pipeline (sensor → policy → tools → gate → learning)
  with an **adversarial gate** that holds sub-threshold output for review.
- **"Done" is verified by artifacts, not the model's say-so:** 40 Vitest tests (`npm test`), a
  responding `/api/health` URL, and the per-stage workflow checks.
- During the build I directed Claude with **parallel research + Explore subagents** (open-source
  landscape teardown → `RESEARCH.md`, UI pattern survey → `UI-RESEARCH.md`) and the Claude Code
  harness.

**Links (all in the repo):** [`PLAN.md`](./PLAN.md) · [`rubric.md`](./rubric.md) ·
[`workflow.ts`](./workflow.ts) · [`RESEARCH.md`](./RESEARCH.md)

---

## Feedback on Opus 4.8 (optional)

- Structured outputs + streaming + `effort:"low"` made the multi-stage loop fast and reliable — the
  model almost never broke schema across hundreds of runs.
- At `effort:"low"` the judge didn't reliably honor a *soft* calibration cap stated in the prompt,
  so we made the personalization sub-score deterministic and let the model grade the rest — arguably
  a better design. Higher effort followed the soft instruction more faithfully.
- Adaptive thinking + the 1M context window made long agentic edits smooth and let us keep the whole
  brief + rubric in context while generating.
